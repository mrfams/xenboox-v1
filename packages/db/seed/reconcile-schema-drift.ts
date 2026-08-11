// ─── Dev-DB Schema Drift Reconciliator ─────────────────────────────────────
//
// The dev database is maintained with `drizzle-kit push` (its migration
// journal predates the current schema, so `drizzle-kit migrate` dies on
// duplicate enums and `push` can hit PK rebuilds). When the Drizzle schema
// gains columns/enums faster than push is run, the demo seed and module
// pages fail with "column ... does not exist".
//
// This tool diffs the live database against the Drizzle schema (imported at
// runtime) and APPLIES the drift ADDITIVELY only — it never drops or alters
// existing columns/tables, so it is safe to run against a dev database that
// holds seed data. Run it after pulling schema changes:
//
//   cd packages/db && set -a && source ../../.env.local && set +a \
//     && npx tsx seed/reconcile-schema-drift.ts
//
// Missing columns are added with the schema's type, default, and nullability
// (a NOT NULL column with no schema default gets a type-appropriate
// placeholder long enough to backfill, then the default is dropped so the
// column matches the schema exactly). Missing enum types are created
// idempotently. Tables that exist in the schema but not the database are
// reported (creating whole tables needs a proper migration/push — this tool
// won't guess at FK/index shape). Unknown column types are refused.

import { neon } from "@neondatabase/serverless";
import * as schema from "../schema";

const IS_TABLE = Symbol.for("drizzle:IsDrizzleTable");
const TABLE_NAME = Symbol.for("drizzle:Name");
const COLUMNS = Symbol.for("drizzle:Columns");
const IS_ENUM = Symbol.for("drizzle:isPgEnum");

/**
 * Column DB name -> enum type name. Drizzle doesn't store the enum type on
 * the column config, so this maps the column to the pgEnum type it uses
 * (from the schema source: `<EnumConst>("<column_name>", ...)` next to
 * `pgEnum("<type_name>", ...)`). Extend when adding enum columns.
 */
const ENUM_COLUMN_TYPES: Record<string, string> = {
  tax_status: "employee_tax_status",
  source_type: "onboarding_source_type",
  detail_depth: "reconstruction_detail_depth",
};

type ColConfig = {
  name: string;
  dataType: string;
  columnType: string;
  notNull: boolean;
  hasDefault: boolean;
  default?: unknown;
  precision?: number;
  scale?: number;
  length?: number;
  withTimezone?: boolean;
};

/** Serialize a drizzle default: literals, objects (json), or query-chunks. */
function sqlExpr(d: unknown): string | null {
  if (
    typeof d === "string" ||
    typeof d === "number" ||
    typeof d === "boolean"
  ) {
    return typeof d === "string" ? `'${d.replace(/'/g, "''")}'` : String(d);
  }
  if (typeof d === "object" && d !== null) {
    // Object/array literal (e.g. jsonb default {}) — inline as a json string.
    const json = JSON.stringify(d);
    if (json !== undefined) return `'${json.replace(/'/g, "''")}'::jsonb`;
  }
  const chunks = (d as { queryChunks?: Array<{ value: unknown[] }> | null })
    ?.queryChunks;
  if (chunks && chunks.length > 0) {
    const v = chunks[0].value;
    if (v.length === 1 && typeof v[0] === "string") return v[0];
  }
  return null;
}

function pgType(cfg: ColConfig): string | null {
  switch (cfg.columnType) {
    case "PgUUID":
      return "uuid";
    case "PgText":
      return "text";
    case "PgInteger":
      return "integer";
    case "PgSmallInt":
      return "smallint";
    case "PgBigInt":
      return "bigint";
    case "PgBoolean":
      return "boolean";
    case "PgJsonb":
      return "jsonb";
    case "PgJson":
      return "json";
    case "PgTimestamp":
      return cfg.withTimezone ? "timestamptz" : "timestamp";
    case "PgDate":
    case "PgDateString":
      return "date";
    case "PgTime":
      return "time";
    case "PgNumeric": {
      const p = cfg.precision;
      const s = cfg.scale;
      return p != null && s != null ? `numeric(${p}, ${s})` : "numeric";
    }
    case "PgReal":
      return "real";
    case "PgDoublePrecision":
      return "double precision";
    case "PgVarchar":
      return cfg.length != null ? `varchar(${cfg.length})` : "varchar";
    case "PgChar":
      return cfg.length != null ? `char(${cfg.length})` : "char";
    case "PgSerial":
      return "serial";
    case "PgEnumColumn":
      return `ENUM:${ENUM_COLUMN_TYPES[cfg.name] ?? cfg.name}`;
    default:
      return null; // unknown — refuse rather than guess a wrong type
  }
}

/** Type-appropriate placeholder for a NOT NULL column with no schema default. */
function placeholderFor(sqlType: string, enumValues?: string[]): string | null {
  if (enumValues && enumValues.length > 0) {
    return `'${enumValues[0].replace(/'/g, "''")}'`;
  }
  switch (sqlType) {
    case "text":
    case "varchar":
      return "''";
    case "integer":
    case "bigint":
    case "smallint":
    case "numeric":
    case "real":
    case "double precision":
      return "0";
    case "boolean":
      return "false";
    case "uuid":
      return "'00000000-0000-0000-0000-000000000000'";
    case "jsonb":
    case "json":
      return "'{}'::jsonb";
    case "date":
      return "'1970-01-01'";
    case "timestamp":
    case "timestamptz":
      return "'1970-01-01 00:00:00'";
    case "time":
      return "'00:00:00'";
    default:
      return null;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);

  const liveTables = await sql(
    "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
  );
  const liveCols = await sql(
    "select table_name, column_name from information_schema.columns where table_schema = 'public'",
  );
  const liveEnums = await sql(
    "select t.typname from pg_type t where t.typtype = 'e'",
  );

  const liveTableSet = new Set<string>(liveTables.map((t) => t.table_name));
  const liveColMap = new Map<string, Set<string>>();
  for (const c of liveCols) {
    const t = c.table_name as string;
    if (!liveColMap.has(t)) liveColMap.set(t, new Set());
    liveColMap.get(t)!.add(c.column_name);
  }
  const liveEnumSet = new Set(liveEnums.map((e) => e.typname));

  const tables: Array<{ name: string; cols: Map<string, ColConfig> }> = [];
  const enumByName = new Map<string, string[]>();
  for (const value of Object.values(schema)) {
    const v = value as Record<PropertyKey, unknown>;
    if (v && v[IS_TABLE]) {
      const cols = v[COLUMNS] as Record<string, { config?: ColConfig }>;
      const map = new Map<string, ColConfig>();
      for (const c of Object.values(cols)) {
        if (c.config) map.set(c.config.name, c.config);
      }
      tables.push({ name: String(v[TABLE_NAME]), cols: map });
    } else if (v && v[IS_ENUM]) {
      const en = v as unknown as { enumName: string; enumValues: string[] };
      enumByName.set(en.enumName, en.enumValues);
    }
  }

  const applied: string[] = [];

  // 1. Missing enum types — created idempotently (no CREATE TYPE IF NOT EXISTS
  //    before PG 18, so guard with an existence check).
  for (const [name, values] of enumByName) {
    if (liveEnumSet.has(name)) continue;
    const ddl = `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN CREATE TYPE "${name}" AS ENUM (${values
      .map((v) => `'${v}'`)
      .join(", ")}); END IF; END $$;`;
    await sql(ddl);
    applied.push(`CREATE TYPE "${name}" AS ENUM (${values.join(", ")})`);
    console.log(`Created enum ${name}`);
    liveEnumSet.add(name);
  }

  // 2. Missing columns (additive, with type/default/nullability).
  for (const t of tables) {
    if (!liveTableSet.has(t.name)) continue;
    const live = liveColMap.get(t.name) ?? new Set<string>();
    for (const [colName, cfg] of t.cols) {
      if (live.has(colName)) continue;

      let type = pgType(cfg);
      if (type === null) {
        console.error(
          `Refusing: unknown column type "${cfg.columnType}" for ${t.name}.${colName} — add it to the mapper or create it manually.`,
        );
        continue;
      }
      const enumTypeName = type.startsWith("ENUM:") ? type.slice(5) : null;
      if (enumTypeName) {
        if (!liveEnumSet.has(enumTypeName)) {
          console.error(
            `Refusing: enum type "${enumTypeName}" for ${t.name}.${colName} is not in the DB — create it first (schema has values [${(enumByName.get(enumTypeName) ?? []).join(", ")}]).`,
          );
          continue;
        }
        type = enumTypeName;
      }

      const def = cfg.hasDefault ? sqlExpr(cfg.default) : null;
      let ddl = `ALTER TABLE "${t.name}" ADD COLUMN IF NOT EXISTS "${colName}" ${type}`;
      let usedPlaceholder = false;
      if (def !== null) {
        ddl += ` DEFAULT ${def}`;
      } else if (cfg.notNull) {
        const placeholder = placeholderFor(
          type,
          enumTypeName ? enumByName.get(enumTypeName) : undefined,
        );
        if (placeholder !== null) {
          ddl += ` DEFAULT ${placeholder}`;
          usedPlaceholder = true;
        }
      }
      if (cfg.notNull) ddl += " NOT NULL";
      await sql(ddl);
      applied.push(ddl.replace(/\s+/g, " ").trim());

      // The placeholder is only to satisfy NOT NULL while backfilling — drop it
      // so the column matches the schema (no default declared).
      if (usedPlaceholder) {
        await sql(
          `ALTER TABLE "${t.name}" ALTER COLUMN "${colName}" DROP DEFAULT`,
        );
      }
      console.log(`Added ${t.name}.${colName}`);
    }
  }

  // 3. Missing tables (report only — creation needs a migration/push).
  for (const t of tables) {
    if (!liveTableSet.has(t.name)) {
      console.warn(
        `Table "${t.name}" is in the schema but not the DB — run a proper migration/push to create it.`,
      );
    }
  }

  console.log(
    `\nReconciliation complete — ${applied.length} statements applied.`,
  );
  if (applied.length === 0) {
    console.log("Database is in sync with the schema (no drift).");
  }
}

main().catch((err) => {
  console.error("Reconciliation failed:", err);
  process.exit(1);
});
