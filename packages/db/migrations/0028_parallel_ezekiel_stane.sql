CREATE TYPE "public"."employee_tax_status" AS ENUM('resident', 'non_resident', 'citizen', 'non_citizen', 'tax_exempt');--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'property' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'capital_gains' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'customs' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'digital_services' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'payroll_tax' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'wealth' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'environmental' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'health' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'unemployment' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'tourist' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'stamp_duty' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'gift' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'inheritance' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'license_fee' BEFORE 'other';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "tax_status" "employee_tax_status" DEFAULT 'resident' NOT NULL;