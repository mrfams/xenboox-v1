import { uuid, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

/**
 * UUID primary key with random default
 */
export const uuidId = () => uuid("id").primaryKey().defaultRandom()

/**
 * Foreign key to entities table — entity scoping is non-negotiable
 */
export const entityId = uuid("entity_id").notNull()

/**
 * Standard timestamps — every table gets these
 */
export const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}

/**
 * Helper for numeric money columns (15 digits, 2 decimal places)
 */
export const money = (name: string) =>
  uuid(name) // placeholder — actual usage: numeric(name, { precision: 15, scale: 2 })

/**
 * Now timestamp for default values
 */
export const now = sql`now()`
