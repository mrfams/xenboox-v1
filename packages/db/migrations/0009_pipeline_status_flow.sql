-- Pipeline status flow: add new status values for the universal 5-stage pipeline
-- Per the Data Ingestion spec: DETECTED → PROCESSING → EXTRACTED → SYNCED → AGENT_PROCESSING → done
ALTER TYPE "public"."doc_status" ADD VALUE 'detected' BEFORE 'processing';
--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'extracted' AFTER 'processing';
--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'synced' AFTER 'extracted';
--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'agent_processing' AFTER 'synced';
--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'done' AFTER 'agent_processing';
--> statement-breakpoint
-- NOTE: the original migration also ran
-- ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'detected';
-- here. Setting a column default to an enum value added in the SAME
-- transaction fails on fresh databases (Postgres: "unsafe use of new value
-- ... of enum type") because drizzle wraps each migration in one txn. The
-- default is applied in 0042_doc_status_default_detected instead.
