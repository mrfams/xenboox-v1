use crate::db;
use reqwest::Client;
use serde::{Deserialize, Serialize};

const API_BASE: &str = "http://localhost:3000/api/trpc";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Entity {
    pub id: String,
    pub name: String,
    pub r#type: String,
    pub currency: String,
    pub country: String,
    pub is_active: bool,
}

async fn get_auth_token() -> Result<String, String> {
    let pool = db::get_db()?;
    let row: (String,) = sqlx::query_as("SELECT value FROM local_settings WHERE key = 'auth_token'")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("No auth token stored: {e}"))?;
    Ok(row.0)
}

async fn set_local_setting(key: &str, value: &str) -> Result<(), String> {
    let pool = db::get_db()?;
    sqlx::query(
        "INSERT INTO local_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to save setting: {e}"))?;
    Ok(())
}

async fn get_local_setting(key: &str) -> Result<Option<String>, String> {
    let pool = db::get_db()?;
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT value FROM local_settings WHERE key = ?",
    )
    .bind(key)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to read setting: {e}"))?;
    Ok(row.map(|r| r.0))
}

async fn cache_entities(entities: &[Entity]) -> Result<(), String> {
    let pool = db::get_db()?;
    sqlx::query("DELETE FROM cached_entities").execute(pool).await
        .map_err(|e| format!("Failed to clear cache: {e}"))?;

    for entity in entities {
        sqlx::query(
            "INSERT OR REPLACE INTO cached_entities (id, name, role, organization_id, updated_at) VALUES (?, ?, ?, '', datetime('now'))",
        )
        .bind(&entity.id)
        .bind(&entity.name)
        .bind(&entity.r#type)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to cache entity {}: {e}", entity.id))?;
    }
    Ok(())
}

async fn fetch_entities_from_api(token: &str) -> Result<Vec<Entity>, String> {
    let client = Client::new();
    let url = format!("{}/organization.listEntities?input=%7B%22json%22%3A%7B%7D%7D", API_BASE);

    let resp = client
        .get(&url)
        .header("Authorization", format!("Bearer {token}"))
        .send()
        .await
        .map_err(|e| format!("API request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("API error {status}: {body}"));
    }

    let raw: serde_json::Value = resp.json().await
        .map_err(|e| format!("Failed to parse response: {e}"))?;

    // tRPC batch link wraps single results in an array
    let data = if raw.is_array() {
        raw[0]["result"]["data"]["json"].clone()
    } else {
        raw["result"]["data"]["json"].clone()
    };

    let entities = data
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| {
                    Some(Entity {
                        id: v["id"].as_str()?.to_string(),
                        name: v["name"].as_str()?.to_string(),
                        r#type: v["type"].as_str()?.to_string(),
                        currency: v["currency"].as_str().unwrap_or("GMD").to_string(),
                        country: v["country"].as_str().unwrap_or("GM").to_string(),
                        is_active: v["isActive"].as_bool().unwrap_or(true),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(entities)
}

// ─── TAURI COMMANDS ──────────────────────────────

#[tauri::command]
pub async fn get_entities() -> Result<Vec<Entity>, String> {
    let token = get_auth_token().await?;

    match fetch_entities_from_api(&token).await {
        Ok(entities) => {
            let _ = cache_entities(&entities).await;
            Ok(entities)
        }
        Err(_) => {
            let pool = db::get_db()?;
            let rows: Vec<(String, String, String)> = sqlx::query_as(
                "SELECT id, name, role FROM cached_entities ORDER BY name",
            )
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Failed to read cached entities: {e}"))?;

            Ok(rows
                .into_iter()
                .map(|(id, name, role)| Entity {
                    id,
                    name,
                    r#type: role,
                    currency: "GMD".into(),
                    country: "GM".into(),
                    is_active: true,
                })
                .collect())
        }
    }
}

#[tauri::command]
pub async fn get_current_entity() -> Result<Option<Entity>, String> {
    let entity_id = match get_local_setting("current_entity_id").await? {
        Some(id) => id,
        None => return Ok(None),
    };

    let entities = get_entities().await?;
    Ok(entities.into_iter().find(|e| e.id == entity_id))
}

#[tauri::command]
pub async fn switch_entity(entity_id: String) -> Result<Entity, String> {
    let entities = get_entities().await?;
    let entity = entities
        .iter()
        .find(|e| e.id == entity_id)
        .cloned()
        .ok_or_else(|| format!("Entity {entity_id} not found"))?;

    set_local_setting("current_entity_id", &entity_id).await?;
    Ok(entity)
}

#[tauri::command]
pub async fn set_auth_token(token: String) -> Result<(), String> {
    set_local_setting("auth_token", &token).await
}

#[tauri::command]
pub async fn clear_auth_token() -> Result<(), String> {
    let pool = db::get_db()?;
    sqlx::query("DELETE FROM local_settings WHERE key IN ('auth_token', 'current_entity_id')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to clear auth: {e}"))?;
    Ok(())
}
