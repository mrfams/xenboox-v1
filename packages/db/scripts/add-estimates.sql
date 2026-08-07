-- Targeted migration: Sales Estimates (Quotes) feature
-- Creates only the new tables/enum; does not touch existing schema.
-- Idempotent: safe to run repeatedly.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estimate_status') THEN
    CREATE TYPE "public"."estimate_status" AS ENUM('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted', 'voided');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "sales_estimates" (
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
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sales_estimate_lines" (
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

-- Foreign keys (guarded: only add if the referenced tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_estimates') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_estimates_entity_id_entities_id_fk') THEN
      ALTER TABLE "sales_estimates"
        ADD CONSTRAINT "sales_estimates_entity_id_entities_id_fk"
        FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE cascade;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_estimates_customer_id_customers_id_fk') THEN
      ALTER TABLE "sales_estimates"
        ADD CONSTRAINT "sales_estimates_customer_id_customers_id_fk"
        FOREIGN KEY ("customer_id") REFERENCES "customers"("id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_estimates_converted_invoice_id_sales_invoices_id_fk') THEN
      ALTER TABLE "sales_estimates"
        ADD CONSTRAINT "sales_estimates_converted_invoice_id_sales_invoices_id_fk"
        FOREIGN KEY ("converted_invoice_id") REFERENCES "sales_invoices"("id");
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_estimate_lines') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_estimate_lines_sales_estimate_id_sales_estimates_id_fk') THEN
      ALTER TABLE "sales_estimate_lines"
        ADD CONSTRAINT "sales_estimate_lines_sales_estimate_id_sales_estimates_id_fk"
        FOREIGN KEY ("sales_estimate_id") REFERENCES "sales_estimates"("id") ON DELETE cascade;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_estimate_lines_account_id_chart_of_accounts_id_fk') THEN
      ALTER TABLE "sales_estimate_lines"
        ADD CONSTRAINT "sales_estimate_lines_account_id_chart_of_accounts_id_fk"
        FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id");
    END IF;
  END IF;
END $$;

-- Indexes (guarded)
CREATE INDEX IF NOT EXISTS "estimate_entity" ON "sales_estimates" ("entity_id");
CREATE INDEX IF NOT EXISTS "estimate_customer" ON "sales_estimates" ("customer_id");
CREATE INDEX IF NOT EXISTS "estimate_status" ON "sales_estimates" ("entity_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "estimate_entity_number" ON "sales_estimates" ("entity_id", "estimate_number");
CREATE INDEX IF NOT EXISTS "estimate_lines_estimate" ON "sales_estimate_lines" ("sales_estimate_id");
