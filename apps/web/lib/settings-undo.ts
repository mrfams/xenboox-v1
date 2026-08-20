import { toast } from "sonner"

// ─── Undo Toast for Risky Settings Operations ─────────────────────────────────
// After any risky operation (reset, import, restore), show a toast with
// a "Restore backup" action that fetches the latest auto-backup and restores it.
// Also registers Ctrl+Z / Cmd+Z keyboard shortcut for 10 seconds.

let undoAvailable = false
let undoTimeout: ReturnType<typeof setTimeout> | null = null

// ─── Keyboard shortcut handler ────────────────────────────────────────────────

function handleKeyDown(e: KeyboardEvent) {
  // Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault()
    if (undoAvailable) {
      restoreLatestBackup()
    }
  }
}

// ─── Register keyboard shortcut ───────────────────────────────────────────────

function registerUndoShortcut() {
  if (typeof window === "undefined") return

  // Remove any existing listener
  window.removeEventListener("keydown", handleKeyDown)

  // Add new listener
  window.addEventListener("keydown", handleKeyDown)

  // Mark undo as available
  undoAvailable = true

  // Clear any existing timeout
  if (undoTimeout) {
    clearTimeout(undoTimeout)
  }

  // Undo available for 10 seconds
  undoTimeout = setTimeout(() => {
    undoAvailable = false
    window.removeEventListener("keydown", handleKeyDown)
  }, 10_000)
}

// ─── Show undo toast after risky operation ─────────────────────────────────────

export function showUndoToast(operationName: string) {
  // Register Ctrl+Z keyboard shortcut
  registerUndoShortcut()

  toast(
    `${operationName} completed. A backup was saved automatically.`,
    {
      duration: 10000, // 10 seconds to undo
      description: "Press Ctrl+Z to undo",
      action: {
        label: "Restore backup",
        onClick: () => {
          restoreLatestBackup()
        },
      },
    }
  )
}

// ─── Restore the latest backup ────────────────────────────────────────────────

async function restoreLatestBackup() {
  try {
    // Fetch latest versions from the API
    const response = await fetch("/api/trpc/settings.getVersions?input=%7B%22limit%22%3A1%7D", {
      headers: { "Content-Type": "application/json" },
    })
    const data = await response.json()
    const latestVersion = data?.result?.data?.[0]

    if (!latestVersion) {
      toast.error("No backup found to restore")
      return
    }

    // Restore the version
    const restoreResponse = await fetch("/api/trpc/settings.restoreVersion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        json: { versionId: latestVersion.id },
      }),
    })

    const restoreData = await restoreResponse.json()

    if (restoreData?.result?.data) {
      toast.success(`Restored from ${latestVersion.label || `version ${latestVersion.version}`}`)
      // Reload the page to reflect restored settings
      window.location.reload()
    } else {
      toast.error("Failed to restore backup")
    }
  } catch {
    toast.error("Failed to restore backup")
  }
}
