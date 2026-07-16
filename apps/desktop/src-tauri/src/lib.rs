mod commands;
mod db;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                db::init_database(&app_handle).await?;
                Ok(())
            })
        })
        .invoke_handler(tauri::generate_handler![
            commands::entity::get_entities,
            commands::entity::get_current_entity,
            commands::entity::switch_entity,
            commands::entity::set_auth_token,
            commands::entity::clear_auth_token,
            commands::health::check_health,
            commands::health::get_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
