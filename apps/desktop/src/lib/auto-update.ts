import { invoke } from "@tauri-apps/api/core"
import { checkForUpdates, installUpdate } from "@tauri-apps/api/updater"

export async function checkForUpdates() {
  try {
    const status = await checkForUpdates()
    if (status?.available && !status.installed) {
      return {
        available: true,
        version: status.version,
        notes: status.notes,
      }
    }
    return { available: false }
  } catch (error) {
    console.error("Failed to check for updates:", error)
    return { available: false, error: String(error) }
  }
}

export function setupAutoUpdate() {
  if (typeof window === "undefined") return

  setInterval(async () => {
    const update = await checkForUpdates()
    if (update.available) {
      showUpdateNotification(update)
    }
  }, 3600000)
}

async function showUpdateNotification(update: { version: string; notes?: string }) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("Xenboox Update Available", {
      body: `Version ${update.version} is available. Click to update.`,
      icon: "/favicon.png",
    })
  }
}

export async function installUpdate() {
  try {
    await installUpdate()
    window.location.reload()
    return { success: true }
  } catch (error) {
    console.error("Failed to install update:", error)
    return { success: false, error: String(error) }
  }
}