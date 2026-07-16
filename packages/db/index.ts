import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "./schema"

// Database client — used everywhere in the app
const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })

// Re-export all table types for convenience
export type Database = typeof db
export * from "./schema"
