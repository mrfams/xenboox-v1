import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"

// ─── Undo Toast for Risky Settings Operations ─────────────────────────────────
// After any risky operation (reset, import, restore), show a toast with
// a "Restore backup" action that fetches the latest auto-backup and restores it.

let latestAutoBackupId: string | null = null

// ─── Store the latest auto-backup ID ──────────────────────────────────────────

export function setLatestAutoBackupId(id: string) {
  latestAutoBackupId = id
}

// ─── Show undo toast after risky operation ─────────────────────────────────────

export function showUndoToast(operationName: string) {
  toast(
    `${operationName} completed. A backup was saved automatically.`,
    {
      duration: 10000, // 10 seconds to undo
      action: {
        label: "Restore backup",
        onClick: () => {
          // Fetch latest version and restore it
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
