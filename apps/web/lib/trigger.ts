import { TriggerClient } from "@trigger.dev/sdk"

export const triggerClient = new TriggerClient({
  secretKey: process.env.TRIGGER_SECRET_KEY!,
})
