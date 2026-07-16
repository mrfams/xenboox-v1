use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct HealthStatus {
    pub status: String,
    pub version: String,
    pub connected: bool,
}

#[tauri::command]
pub async fn check_health() -> Result<HealthStatus, String> {
    let connected = check_api_connection().await;

    Ok(HealthStatus {
        status: if connected { "ok" } else { "offline" }.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        connected,
    })
}

#[tauri::command]
pub async fn get_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

async fn check_api_connection() -> bool {
    reqwest::get("http://localhost:3000/api/trpc/health")
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}
