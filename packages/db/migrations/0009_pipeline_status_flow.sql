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
-- Update the default column value from 'uploaded' to 'detected' for new documents
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'detected';
