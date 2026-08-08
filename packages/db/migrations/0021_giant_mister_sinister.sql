CREATE TYPE "public"."artifact_kind" AS ENUM('report', 'export', 'invoice_pdf', 'credit_note', 'filing', 'statement', 'contract', 'custom');--> statement-breakpoint
CREATE TYPE "public"."artifact_status" AS ENUM('generating', 'ready', 'expired', 'failed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."estimate_status" AS ENUM('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted', 'voided');--> statement-breakpoint
CREATE TYPE "public"."fx_revaluation_status" AS ENUM('draft', 'completed');--> statement-breakpoint
CREATE TYPE "public"."tool_grant_action" AS ENUM('execute', 'read', '*');--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'validated' BEFORE 'synced';--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'resolving' BEFORE 'agent_processing';--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'classifying_workflow' BEFORE 'agent_processing';--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'mapping_accounts' BEFORE 'agent_processing';--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'calculating_tax' BEFORE 'agent_processing';--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'generating_journal' BEFORE 'agent_processing';--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'validating_entry' BEFORE 'agent_processing';--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'deciding_post' BEFORE 'agent_processing';--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'posting' BEFORE 'agent_processing';--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'propagating' BEFORE 'agent_processing';--> statement-breakpoint
ALTER TYPE "public"."doc_status" ADD VALUE 'persisted' BEFORE 'done';--> statement-breakpoint
CREATE TABLE "artifact_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"kind" "artifact_kind" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"mime_type" text NOT NULL,
	"size_bytes" integer,
	"r2_key" text NOT NULL,
	"r2_bucket" text NOT NULL,
	"created_by" uuid,
	"created_by_name" text,
	"agent_name" text,
	"source_document_id" uuid,
	"source_journal_entry_id" uuid,
	"report_config_id" uuid,
	"parameters" jsonb DEFAULT '{}'::jsonb,
	"status" "artifact_status" DEFAULT 'generating' NOT NULL,
	"ttl" integer,
	"expires_at" timestamp,
	"pinned" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_estimate_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_estimate_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_estimates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"estimate_number" text NOT NULL,
	"estimate_date" text NOT NULL,
	"expiry_date" text,
	"status" "estimate_status" DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"notes" text,
	"terms" text,
	"converted_invoice_id" uuid,
	"sent_at" timestamp,
	"accepted_at" timestamp,
	"declined_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" numeric(15, 6) NOT NULL,
	"as_of" date NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_revaluation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"period" text NOT NULL,
	"base_currency" text NOT NULL,
	"totals" jsonb DEFAULT '[]'::jsonb,
	"status" "fx_revaluation_status" DEFAULT 'draft' NOT NULL,
	"run_by" text,
	"run_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"tool_name" text NOT NULL,
	"action" "tool_grant_action" DEFAULT 'execute' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"granted_by" text DEFAULT 'system' NOT NULL,
	"conditions" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"source_type" text DEFAULT 'knowledge_document' NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"embedding" text,
	"embedding_vector" text,
	"metadata" jsonb,
	"is_embedded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" text,
	"embedding" text,
	"embedding_vector" text,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"fully_embedded" boolean DEFAULT false NOT NULL,
	"embedding_model" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"query" text NOT NULL,
	"agent_name" text NOT NULL,
	"chunk_ids" jsonb DEFAULT '[]'::jsonb,
	"scores" jsonb DEFAULT '[]'::jsonb,
	"cited_chunk_ids" jsonb DEFAULT '[]'::jsonb,
	"total_chunks" integer DEFAULT 0 NOT NULL,
	"retrieval_method" text DEFAULT 'hybrid' NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD COLUMN "currency" text DEFAULT 'GMD' NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD COLUMN "exchange_rate" numeric(15, 6);--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD COLUMN "base_currency" text;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD COLUMN "base_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_used_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "tool_calls" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "citations" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "agent_activity" ADD COLUMN "model_id" text;--> statement-breakpoint
ALTER TABLE "agent_activity" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "agent_activity" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "agent_activity" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "agent_activity" ADD COLUMN "from_cache" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "model_assignments" ADD COLUMN "supports_embeddings" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "model_assignments" ADD COLUMN "embedding_dimensions" integer;--> statement-breakpoint
ALTER TABLE "model_assignments" ADD COLUMN "system_prompt_override" text;--> statement-breakpoint
ALTER TABLE "model_assignments" ADD COLUMN "temperature_override" text;--> statement-breakpoint
ALTER TABLE "model_assignments" ADD COLUMN "retry_policy" jsonb;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "profile" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "artifact_registry" ADD CONSTRAINT "artifact_registry_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_registry" ADD CONSTRAINT "artifact_registry_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_estimate_lines" ADD CONSTRAINT "sales_estimate_lines_sales_estimate_id_sales_estimates_id_fk" FOREIGN KEY ("sales_estimate_id") REFERENCES "public"."sales_estimates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_estimate_lines" ADD CONSTRAINT "sales_estimate_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_estimates" ADD CONSTRAINT "sales_estimates_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_estimates" ADD CONSTRAINT "sales_estimates_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_estimates" ADD CONSTRAINT "sales_estimates_converted_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("converted_invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_revaluation_runs" ADD CONSTRAINT "fx_revaluation_runs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_grants" ADD CONSTRAINT "tool_grants_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_embeddings" ADD CONSTRAINT "knowledge_embeddings_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_citations" ADD CONSTRAINT "rag_citations_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifact_entity" ON "artifact_registry" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "artifact_kind" ON "artifact_registry" USING btree ("entity_id","kind");--> statement-breakpoint
CREATE INDEX "artifact_status" ON "artifact_registry" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "artifact_created" ON "artifact_registry" USING btree ("entity_id","created_at");--> statement-breakpoint
CREATE INDEX "artifact_expires" ON "artifact_registry" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "artifact_source_doc" ON "artifact_registry" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "estimate_lines_estimate" ON "sales_estimate_lines" USING btree ("sales_estimate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "estimate_entity_number" ON "sales_estimates" USING btree ("entity_id","estimate_number");--> statement-breakpoint
CREATE INDEX "estimate_entity" ON "sales_estimates" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "estimate_customer" ON "sales_estimates" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "estimate_status" ON "sales_estimates" USING btree ("entity_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "fx_rates_pair_date" ON "fx_rates" USING btree ("entity_id","from_currency","to_currency","as_of");--> statement-breakpoint
CREATE INDEX "fx_rates_entity" ON "fx_rates" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "fx_rates_pair" ON "fx_rates" USING btree ("entity_id","from_currency","to_currency");--> statement-breakpoint
CREATE INDEX "fx_reval_entity" ON "fx_revaluation_runs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "fx_reval_period" ON "fx_revaluation_runs" USING btree ("entity_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "tool_grants_unique" ON "tool_grants" USING btree ("entity_id","agent_name","tool_name","action");--> statement-breakpoint
CREATE INDEX "tool_grants_agent" ON "tool_grants" USING btree ("entity_id","agent_name");--> statement-breakpoint
CREATE INDEX "tool_grants_tool" ON "tool_grants" USING btree ("tool_name");--> statement-breakpoint
CREATE INDEX "tool_grants_active" ON "tool_grants" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "doc_chunks_entity" ON "document_chunks" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "doc_chunks_document" ON "document_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_chunks_source" ON "document_chunks" USING btree ("entity_id","source_type");--> statement-breakpoint
CREATE INDEX "doc_chunks_embedded" ON "document_chunks" USING btree ("is_embedded");--> statement-breakpoint
CREATE INDEX "doc_chunks_entity_embedded" ON "document_chunks" USING btree ("entity_id","is_embedded");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_emb_doc" ON "knowledge_embeddings" USING btree ("entity_id","document_id");--> statement-breakpoint
CREATE INDEX "knowledge_emb_entity" ON "knowledge_embeddings" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "knowledge_emb_category" ON "knowledge_embeddings" USING btree ("entity_id","category");--> statement-breakpoint
CREATE INDEX "knowledge_emb_embedded" ON "knowledge_embeddings" USING btree ("fully_embedded");--> statement-breakpoint
CREATE INDEX "rag_citations_entity" ON "rag_citations" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "rag_citations_agent" ON "rag_citations" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "rag_citations_query" ON "rag_citations" USING btree ("entity_id","agent_name");--> statement-breakpoint
CREATE INDEX "rag_citations_created" ON "rag_citations" USING btree ("entity_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_activity_model" ON "agent_activity" USING btree ("model_id","provider");