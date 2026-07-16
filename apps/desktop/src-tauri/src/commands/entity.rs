use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    pub name: String,
    pub role: String,
    pub organization_id: String,
}

#[tauri::command]
pub async fn get_entities() -> Result<Vec<Entity>, String> {
    // TODO: Fetch entities from API or local cache
    Ok(vec![])
}

#[tauri::command]
pub async fn get_current_entity() -> Result<Option<Entity>, String> {
    // TODO: Get current entity from local storage
    Ok(None)
}

#[tauri::command]
pub async fn switch_entity(entity_id: String) -> Result<Entity, String> {
    // TODO: Switch entity and update local cache
    Err(format!("Entity {} not found", entity_id))
}
