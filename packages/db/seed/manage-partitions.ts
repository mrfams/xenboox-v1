// ─── Partition Management Utility ───────────────────────────────────────────
//
// Manages monthly partitions for append-heavy tables.
// Run via: pnpm tsx packages/db/seed/manage-partitions.ts
//
// Commands:
//   create-next   — create the next month's partitions
//   list          — list all partitions and their sizes
//   drop-old      — drop partitions older than N months (with confirmation)

import { sql } from "drizzle-orm";
import { db } from "../index";

const PARTITIONED_TABLES = [
  "audit_log_partitioned",
  "bank_transactions_partitioned",
  "journal_entries_partitioned",
];

function getMonthName(date: Date): string {
  return `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getPartitionName(table: string, date: Date): string {
  return `${table.replace("_partitioned", "")}_partitioned_${getMonthName(date)}`;
}

function getPartitionRange(date: Date): { from: string; to: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

async function createNextPartitions() {
  const now = new Date();
  // Create partitions for next 3 months
  for (let i = 0; i < 3; i++) {
    const target = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const range = getPartitionRange(target);

    for (const table of PARTITIONED_TABLES) {
      const partitionName = getPartitionName(table, target);
      const baseTable = table.replace("_partitioned", "");

      try {
        await db.execute(
          sql.raw(`
          CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${table}
          FOR VALUES FROM ('${range.from}') TO ('${range.to}')
        `),
        );
        console.log(`✅ Created partition: ${partitionName}`);
      } catch (error: any) {
        if (error.message?.includes("already exists")) {
          console.log(`⏭️  Partition already exists: ${partitionName}`);
        } else {
          console.error(`❌ Failed to create ${partitionName}:`, error.message);
        }
      }
    }
  }
}

async function listPartitions() {
  const result = await db.execute(
    sql.raw(`
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size
    FROM pg_tables
    WHERE tablename LIKE '%_partitioned_20%'
    ORDER BY tablename
  `),
  );

  console.log("\nPartition sizes:");
  console.log("─".repeat(60));
  for (const row of result.rows as any[]) {
    console.log(`${row.tablename.padEnd(40)} ${row.size}`);
  }
}

async function dropOldPartitions(monthsToKeep: number) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsToKeep);

  console.log(
    `\n⚠️  Dropping partitions older than ${monthsToKeep} months (before ${cutoff.toISOString().split("T")[0]})`,
  );

  for (const table of PARTITIONED_TABLES) {
    // List partitions older than cutoff
    const result = await db.execute(
      sql.raw(`
      SELECT tablename
      FROM pg_tables
      WHERE tablename LIKE '${table.replace("_partitioned", "")}_partitioned_20%'
      AND tablename < '${table.replace("_partitioned", "")}_partitioned_${getMonthName(cutoff)}'
    `),
    );

    for (const row of result.rows as any[]) {
      console.log(`  Dropping: ${row.tablename}`);
      // Note: actual DROP requires manual confirmation in production
      // await db.execute(sql.raw(`DROP TABLE IF EXISTS ${row.tablename}`));
    }
  }
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  switch (command) {
    case "create-next":
      await createNextPartitions();
      break;
    case "list":
      await listPartitions();
      break;
    case "drop-old":
      await dropOldPartitions(parseInt(arg || "24", 10));
      break;
    default:
      console.log(
        "Usage: manage-partitions.ts <create-next|list|drop-old> [months]",
      );
  }
}

main().catch(console.error);
