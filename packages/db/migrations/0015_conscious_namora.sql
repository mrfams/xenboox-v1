CREATE TYPE "public"."api_key_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."api_method" AS ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."webhook_event_type" AS ENUM('close.completed', 'invoice.paid', 'invoice.overdue', 'reconciliation.flagged', 'budget.threshold_exceeded', 'transaction.created', 'expense.approved', 'payroll.completed', 'document.processed');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('active', 'paused', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."audit_package_status" AS ENUM('assembling', 'ready', 'delivered', 'acknowledged');--> statement-breakpoint
CREATE TYPE "public"."audit_sample_status" AS ENUM('sampled', 'verified', 'discrepancy', 'investigating');--> statement-breakpoint
CREATE TYPE "public"."drift_trend" AS ENUM('improving', 'stable', 'declining', 'critical');--> statement-breakpoint
CREATE TYPE "public"."portal_session_status" AS ENUM('active', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."query_status" AS ENUM('open', 'answered', 'closed');--> statement-breakpoint
CREATE TYPE "public"."cash_tx_type" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."discrepancy_severity" AS ENUM('minor', 'moderate', 'material', 'critical');--> statement-breakpoint
CREATE TYPE "public"."discrepancy_status" AS ENUM('open', 'resolved', 'investigating');--> statement-breakpoint
CREATE TYPE "public"."close_confirmation_status" AS ENUM('confirmed', 'blocked', 'pending');--> statement-breakpoint
CREATE TYPE "public"."close_session_status" AS ENUM('in_progress', 'ready', 'blocked', 'notified', 'locked', 'reopened');--> statement-breakpoint
CREATE TYPE "public"."close_trigger_source" AS ENUM('scheduled', 'manual', 'agent');--> statement-breakpoint
CREATE TYPE "public"."reopen_channel" AS ENUM('dashboard', 'email', 'chat');--> statement-breakpoint
CREATE TYPE "public"."reopen_classification" AS ENUM('simple_correction', 'missing_data', 'cascading_error');--> statement-breakpoint
CREATE TYPE "public"."model_provider" AS ENUM('anthropic', 'bedrock', 'vertex', 'openai', 'fireworks', 'together', 'deepinfra', 'openrouter');--> statement-breakpoint
CREATE TYPE "public"."model_task_type" AS ENUM('strategic_planning', 'financial_analysis', 'executive_summary', 'risk_assessment', 'approval_decision', 'cash_flow_forecast', 'payroll_calculation', 'compliance_check', 'reconciliation_review', 'invoice_matching', 'payment_scheduling', 'journal_posting', 'cash_reconciliation', 'tax_calculation', 'filing_preparation', 'report_generation', 'ocr_field_extraction', 'document_classification', 'structured_extraction', 'budget_variance_analysis', 'anomaly_detection', 'chat_response', 'summarization', 'translation');--> statement-breakpoint
CREATE TYPE "public"."report_format" AS ENUM('dashboard', 'chat', 'pdf', 'excel', 'email');--> statement-breakpoint
CREATE TYPE "public"."report_request_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."statement_lock_status" AS ENUM('draft', 'locked', 'archived');--> statement-breakpoint
CREATE TYPE "public"."statement_type" AS ENUM('profit_and_loss', 'balance_sheet', 'cash_flow', 'trial_balance', 'general_ledger', 'custom');--> statement-breakpoint
CREATE TYPE "public"."bank_connection_provider" AS ENUM('mono', 'plaid', 'stitch', 'manual');--> statement-breakpoint
CREATE TYPE "public"."bank_connection_status" AS ENUM('pending', 'active', 'error', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."inbound_email_status" AS ENUM('received', 'processing', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."agreement_status" AS ENUM('pending', 'accepted', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."legal_doc_type" AS ENUM('terms_of_service', 'privacy_policy', 'data_processing_agreement', 'sla', 'acceptable_use_policy', 'refund_policy');--> statement-breakpoint
CREATE TYPE "public"."notif_priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'in_review', 'approved', 'rejected', 'info_requested');--> statement-breakpoint
CREATE TYPE "public"."data_connection_status" AS ENUM('pending', 'processing', 'connected', 'failed', 'fallback_offered');--> statement-breakpoint
CREATE TYPE "public"."data_connection_type" AS ENUM('bank_api', 'bank_pdf', 'mobile_money', 'quickbooks', 'xero', 'excel', 'csv', 'manual_entry');--> statement-breakpoint
CREATE TYPE "public"."historical_pull_status" AS ENUM('pending', 'pulling', 'completed', 'failed', 'permission_required', 'permission_granted', 'permission_denied');--> statement-breakpoint
CREATE TYPE "public"."onboarding_routing_answer" AS ENUM('excel', 'quickbooks', 'xero', 'nothing', 'other');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."onboarding_step" AS ENUM('signup', 'routing', 'entity_setup', 'data_connections', 'historical_pull', 'coa_review', 'first_look', 'complete');--> statement-breakpoint
CREATE TYPE "public"."match_tier" AS ENUM('exact', 'strong', 'weak', 'manual');--> statement-breakpoint
CREATE TYPE "public"."provider_type" AS ENUM('bank', 'mobile_money');--> statement-breakpoint
CREATE TYPE "public"."session_recon_status" AS ENUM('open', 'review_pending', 'clean', 'failed');--> statement-breakpoint
CREATE TYPE "public"."statement_line_status" AS ENUM('matched', 'pending_settlement', 'unmatched', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."unmatched_reason" AS ENUM('no_candidate', 'multiple_candidates', 'amount_mismatch', 'below_confidence', 'pending_settlement');--> statement-breakpoint
CREATE TYPE "public"."filing_status" AS ENUM('pending', 'filed', 'overdue', 'waived');--> statement-breakpoint
CREATE TYPE "public"."tax_package_status" AS ENUM('assembling', 'reviewed', 'submitted', 'acknowledged');--> statement-breakpoint
CREATE TYPE "public"."tax_package_type" AS ENUM('vat', 'paye', 'corporate');--> statement-breakpoint
CREATE TYPE "public"."tax_rule_status" AS ENUM('draft', 'active', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."tax_rule_type" AS ENUM('vat', 'paye', 'withholding', 'corporate');--> statement-breakpoint
CREATE TYPE "public"."vat_status" AS ENUM('draft', 'calculated', 'reviewed', 'filed');--> statement-breakpoint
CREATE TYPE "public"."deduction_category" AS ENUM('pension', 'social_security', 'health_insurance', 'housing', 'training', 'other');--> statement-breakpoint
CREATE TYPE "public"."expansion_status" AS ENUM('research', 'drafted', 'reviewed', 'sandboxed', 'live', 'failed');--> statement-breakpoint
CREATE TYPE "public"."rbac_action" AS ENUM('view', 'create', 'edit', 'approve', 'post', 'delete', 'export', 'configure');--> statement-breakpoint
CREATE TYPE "public"."rbac_module" AS ENUM('general_ledger', 'chart_of_accounts', 'bank_reconciliation', 'mobile_money', 'accounts_payable', 'accounts_receivable', 'cash_imprest', 'payroll', 'invoicing', 'expense_management', 'fixed_assets', 'inventory', 'budgeting', 'financial_reporting', 'tax_compliance', 'audit_preparation', 'donor_grant_reporting', 'multi_entity', 'multi_currency', 'document_management', 'analytics_insights', 'settings_users', 'settings_entities', 'settings_billing');--> statement-breakpoint
CREATE TYPE "public"."rbac_scope" AS ENUM('full', 'scoped', 'none');--> statement-breakpoint
CREATE TABLE "agent_routing_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" text,
	"conversation_id" uuid,
	"intent_type" text NOT NULL,
	"input_summary" text NOT NULL,
	"agents_involved" text[] DEFAULT '{}' NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"threshold_used" numeric(4, 3),
	"threshold_config" text,
	"decision" text DEFAULT 'auto' NOT NULL,
	"human_response" text,
	"escalation_reason" text,
	"task_id" text,
	"duration_ms" numeric,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confidence_thresholds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"agent_id" text NOT NULL,
	"transaction_type" text NOT NULL,
	"amount_band" text DEFAULT 'any' NOT NULL,
	"min_confidence" numeric(4, 3) DEFAULT '0.900' NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"period" text NOT NULL,
	"source_pipelines" jsonb NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"data_freshness" numeric(3, 2) DEFAULT '1.0' NOT NULL,
	"generated_by" text DEFAULT 'analytics-pipeline' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anomaly_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"transaction_ref" text,
	"anomaly_type" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"description" text NOT NULL,
	"statistical_basis" jsonb,
	"routed_to" text,
	"acknowledged" boolean DEFAULT false NOT NULL,
	"acknowledged_at" timestamp,
	"acknowledged_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benchmark_cohorts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"market" text NOT NULL,
	"segment" text NOT NULL,
	"anonymization_verified" boolean DEFAULT false NOT NULL,
	"consented_org_ids" text[] DEFAULT '{}' NOT NULL,
	"consent_verified_at" timestamp,
	"active_members" numeric DEFAULT '0' NOT NULL,
	"aggregate_data" jsonb,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "detected_trends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"dimension" text NOT NULL,
	"trend_type" text NOT NULL,
	"magnitude" numeric(10, 4) NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.0' NOT NULL,
	"period" text NOT NULL,
	"comparison_period" text,
	"slice_key" text,
	"slice_value" text,
	"description" text NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forecast_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"runway_months" numeric(5, 1) NOT NULL,
	"projected_revenue" numeric(15, 2) DEFAULT '0' NOT NULL,
	"projected_expenses" numeric(15, 2) DEFAULT '0' NOT NULL,
	"projected_cash_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"assumptions" jsonb NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.7' NOT NULL,
	"period" text NOT NULL,
	"methodology" text DEFAULT 'linear_regression' NOT NULL,
	"superseded_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"period" text NOT NULL,
	"overall_score" numeric(4, 2) NOT NULL,
	"component_breakdown" jsonb NOT NULL,
	"trend" text DEFAULT 'stable' NOT NULL,
	"previous_score" numeric(4, 2),
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_call_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid,
	"entity_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"method" "api_method" NOT NULL,
	"status_code" integer NOT NULL,
	"duration_ms" integer,
	"ip_address" text,
	"user_agent" text,
	"request_body" jsonb,
	"response_preview" text,
	"error_message" text,
	"rate_limited" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_last_chars" text NOT NULL,
	"status" "api_key_status" DEFAULT 'active' NOT NULL,
	"tier" text DEFAULT 'standard' NOT NULL,
	"entity_scope" jsonb DEFAULT '[]'::jsonb,
	"role_scope" text NOT NULL,
	"created_by_id" uuid NOT NULL,
	"revoked_at" timestamp,
	"revoked_by_id" text,
	"revoked_reason" text,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"request_count" integer DEFAULT 0 NOT NULL,
	"rate_limit_per_minute" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_scopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"resource" text NOT NULL,
	"permission" text DEFAULT 'read' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_delivery_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"event_type" "webhook_event_type" NOT NULL,
	"payload" jsonb,
	"response_status" integer,
	"response_body" text,
	"duration_ms" integer,
	"success" boolean DEFAULT false NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"error_message" text,
	"delivered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"event_type" "webhook_event_type" NOT NULL,
	"target_url" text NOT NULL,
	"secret" text NOT NULL,
	"status" "webhook_status" DEFAULT 'active' NOT NULL,
	"description" text,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"retry_interval_ms" integer DEFAULT 5000 NOT NULL,
	"last_delivered_at" timestamp,
	"last_delivery_status" text,
	"delivery_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_disposal_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"fixed_asset_id" uuid NOT NULL,
	"disposal_date" text NOT NULL,
	"disposal_method" text NOT NULL,
	"disposal_proceeds" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_book_value_at_disposal" numeric(15, 2) NOT NULL,
	"gain_or_loss" numeric(15, 2) NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"journal_entry_id" uuid,
	"reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_assets" numeric(6, 0) DEFAULT '0' NOT NULL,
	"assets_scanned" numeric(6, 0) DEFAULT '0' NOT NULL,
	"depreciation_count" numeric(6, 0) DEFAULT '0' NOT NULL,
	"depreciation_total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"verification_due" numeric(4, 0) DEFAULT '0' NOT NULL,
	"disposal_flags" numeric(4, 0) DEFAULT '0' NOT NULL,
	"journal_entry_id" uuid,
	"confidence" numeric(3, 2),
	"errors" jsonb DEFAULT '[]'::jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"triggered_by" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"fixed_asset_id" uuid NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"verified_date" timestamp,
	"verified_by" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"condition_confirmed" text,
	"location_confirmed" text,
	"responsible_person_confirmed" text,
	"photo_ref" text,
	"notes" text,
	"discrepancy_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"requested_by" text NOT NULL,
	"period" text NOT NULL,
	"status" "audit_package_status" DEFAULT 'assembling' NOT NULL,
	"contents_ref" jsonb NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	"delivered_at" timestamp,
	"acknowledged_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"transaction_ref" text NOT NULL,
	"sampled_at" timestamp DEFAULT now() NOT NULL,
	"agent_checked" text NOT NULL,
	"transaction_type" text NOT NULL,
	"original_result" jsonb NOT NULL,
	"recomputed_result" jsonb NOT NULL,
	"matches_original" boolean NOT NULL,
	"discrepancy_details" jsonb,
	"confidence" numeric(3, 2) DEFAULT '1.0',
	"status" "audit_sample_status" DEFAULT 'sampled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditor_portal_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"auditor_id" text NOT NULL,
	"auditor_name" text,
	"auditor_email" text,
	"period_locked" text NOT NULL,
	"granted_by" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"status" "portal_session_status" DEFAULT 'active' NOT NULL,
	"last_access_at" timestamp,
	"access_count" numeric DEFAULT '0' NOT NULL,
	"read_only" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditor_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question" text NOT NULL,
	"evidence_ref" jsonb,
	"response" text,
	"responded_at" timestamp,
	"status" "query_status" DEFAULT 'open' NOT NULL,
	"confidence" numeric(3, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drift_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"agent_id" text NOT NULL,
	"period" text NOT NULL,
	"score" numeric(5, 4) NOT NULL,
	"sample_size" numeric DEFAULT '0' NOT NULL,
	"trend" "drift_trend" DEFAULT 'stable' NOT NULL,
	"previous_score" numeric(5, 4),
	"anomaly_count" numeric DEFAULT '0' NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "golden_dataset_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"scenario_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"input_data" jsonb NOT NULL,
	"expected_result" jsonb NOT NULL,
	"actual_result" jsonb,
	"last_tested_at" timestamp,
	"last_test_passed" boolean,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benchmark_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"period" text NOT NULL,
	"member_count" numeric NOT NULL,
	"median" numeric(15, 4) NOT NULL,
	"quartile_low" numeric(15, 4) NOT NULL,
	"quartile_high" numeric(15, 4) NOT NULL,
	"mean" numeric(15, 4),
	"min" numeric(15, 4),
	"max" numeric(15, 4),
	"std_dev" numeric(15, 4),
	"anonymization_method" text DEFAULT 'ratio_bands' NOT NULL,
	"consent_verified" boolean DEFAULT false NOT NULL,
	"minimum_size_verified" boolean DEFAULT false NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	"computed_by" text DEFAULT 'benchmarking-pipeline' NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benchmark_cohort_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"removed_at" timestamp,
	"reason_removed" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benchmark_consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"consented" boolean NOT NULL,
	"consented_at" timestamp,
	"revoked_at" timestamp,
	"consented_by" uuid,
	"ip_address" text,
	"user_agent" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_org_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verification_token" text,
	"verified_at" timestamp,
	"is_primary" boolean DEFAULT false NOT NULL,
	"ssl_provisioned" boolean DEFAULT false NOT NULL,
	"updated_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firm_branding_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_org_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"logo_url" text,
	"favicon_url" text,
	"color_scheme" jsonb DEFAULT '{}'::jsonb,
	"custom_css" text,
	"hide_xenboox_branding" boolean DEFAULT false NOT NULL,
	"footer_text" text,
	"updated_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "firm_branding_config_firm_org_id_unique" UNIQUE("firm_org_id")
);
--> statement-breakpoint
CREATE TABLE "budget_alert_thresholds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"budget_line_id" uuid NOT NULL,
	"approaching_pct" numeric(5, 2) DEFAULT '80.00' NOT NULL,
	"exceeded_pct" numeric(5, 2) DEFAULT '100.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"budget_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"line_description" text NOT NULL,
	"dimension_type" text,
	"dimension_id" text,
	"annual_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"jan" numeric(15, 2) DEFAULT '0',
	"feb" numeric(15, 2) DEFAULT '0',
	"mar" numeric(15, 2) DEFAULT '0',
	"apr" numeric(15, 2) DEFAULT '0',
	"may" numeric(15, 2) DEFAULT '0',
	"jun" numeric(15, 2) DEFAULT '0',
	"jul" numeric(15, 2) DEFAULT '0',
	"aug" numeric(15, 2) DEFAULT '0',
	"sep" numeric(15, 2) DEFAULT '0',
	"oct" numeric(15, 2) DEFAULT '0',
	"nov" numeric(15, 2) DEFAULT '0',
	"dec" numeric(15, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"budget_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"changes_summary" text,
	"lines_snapshot" jsonb,
	"approved_by_id" text,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"fiscal_year" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"multi_year" boolean DEFAULT false NOT NULL,
	"multi_year_end" integer,
	"total_budgeted" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"notes" text,
	"created_by_id" uuid,
	"approved_by_id" uuid,
	"approved_at" timestamp,
	"superseded_by_id" uuid,
	"current_version_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"budget_line_id" uuid NOT NULL,
	"period" text NOT NULL,
	"budgeted_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"actual_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"variance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"variance_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cumulative_variance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_significant" boolean DEFAULT false NOT NULL,
	"narrative_explanation" text,
	"generated_by" text DEFAULT 'agent',
	"acknowledged_by_id" uuid,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"cash_account_id" uuid,
	"responsible_user_id" text,
	"opening_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"current_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_counted_at" timestamp,
	"count_cadence_days" numeric DEFAULT '1',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"type" "cash_tx_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text NOT NULL,
	"recorded_by_user_id" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"reference" text,
	"category" text,
	"journal_entry_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discrepancy_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"location_id" uuid,
	"imprest_float_id" uuid,
	"expected" numeric(15, 2) NOT NULL,
	"counted" numeric(15, 2) NOT NULL,
	"variance" numeric(15, 2) NOT NULL,
	"variance_pct" numeric(5, 2),
	"severity" "discrepancy_severity" DEFAULT 'minor' NOT NULL,
	"counted_by_user_id" text,
	"counted_at" timestamp DEFAULT now() NOT NULL,
	"status" "discrepancy_status" DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"resolved_by_user_id" text,
	"resolved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "close_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"close_session_id" uuid NOT NULL,
	"agent_id" text NOT NULL,
	"status" "close_confirmation_status" DEFAULT 'pending' NOT NULL,
	"confidence" numeric(5, 4) DEFAULT '0',
	"open_items" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"collected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "close_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"fiscal_period_id" uuid NOT NULL,
	"period_label" text NOT NULL,
	"status" "close_session_status" DEFAULT 'in_progress' NOT NULL,
	"triggered_by" "close_trigger_source" DEFAULT 'scheduled' NOT NULL,
	"triggered_by_user_id" text,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"locked_at" timestamp,
	"overall_confidence" numeric(5, 4) DEFAULT '0',
	"errors" jsonb DEFAULT '[]'::jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "close_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"close_session_id" uuid NOT NULL,
	"version_number" numeric DEFAULT '1' NOT NULL,
	"package_ref" text,
	"report_snapshot_id" text,
	"is_correction" boolean DEFAULT false NOT NULL,
	"correction_reason" text,
	"superseded_by" uuid,
	"generated_by_user_id" text,
	"package_data" jsonb,
	"narrative_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reopen_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"close_session_id" uuid NOT NULL,
	"raised_by_user_id" text NOT NULL,
	"raised_via" "reopen_channel" DEFAULT 'dashboard' NOT NULL,
	"description" text NOT NULL,
	"classification" "reopen_classification",
	"affected_periods" jsonb DEFAULT '[]'::jsonb,
	"depth_months" numeric,
	"downstream_warning" text,
	"approved_at" timestamp,
	"approved_by_user_id" text,
	"correction_reference" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consolidation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_entity_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_subsidiaries" integer DEFAULT 0 NOT NULL,
	"subsidiaries_processed" integer DEFAULT 0 NOT NULL,
	"elimination_count" integer DEFAULT 0 NOT NULL,
	"elimination_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"translation_count" integer DEFAULT 0 NOT NULL,
	"minority_interest_count" integer DEFAULT 0 NOT NULL,
	"integrity_check_passed" boolean,
	"confidence" numeric(3, 2),
	"reviewed_by_id" text,
	"reviewed_at" timestamp,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"triggered_by" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elimination_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consolidation_run_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"counterparty_entity_id" uuid NOT NULL,
	"elimination_type" text NOT NULL,
	"account_id" uuid,
	"description" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"debit_credit" text NOT NULL,
	"source_transaction_ids" jsonb DEFAULT '[]'::jsonb,
	"source_tag_ids" jsonb DEFAULT '[]'::jsonb,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"translated_amount" numeric(15, 2),
	"exchange_rate" numeric(10, 6),
	"parent_account_id" uuid,
	"is_posted" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_entity_id" uuid NOT NULL,
	"subsidiary_entity_id" uuid NOT NULL,
	"ownership_pct" numeric(5, 2) DEFAULT '100.00' NOT NULL,
	"effective_from" text NOT NULL,
	"effective_to" text,
	"status" text DEFAULT 'active' NOT NULL,
	"consolidation_method" text DEFAULT 'full' NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "entity_relationships_subsidiary_entity_id_unique" UNIQUE("subsidiary_entity_id")
);
--> statement-breakpoint
CREATE TABLE "intercompany_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"counterparty_entity_id" uuid NOT NULL,
	"transaction_type" text NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"journal_entry_line_ids" jsonb DEFAULT '[]'::jsonb,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"description" text,
	"tagged_at" timestamp DEFAULT now() NOT NULL,
	"tagged_by_id" text,
	"reversed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "minority_interest_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consolidation_run_id" uuid NOT NULL,
	"subsidiary_entity_id" uuid NOT NULL,
	"ownership_pct" numeric(5, 2) NOT NULL,
	"minority_pct" numeric(5, 2) NOT NULL,
	"subsidiary_net_income" numeric(15, 2) DEFAULT '0' NOT NULL,
	"minority_share_income" numeric(15, 2) DEFAULT '0' NOT NULL,
	"subsidiary_equity" numeric(15, 2) DEFAULT '0' NOT NULL,
	"minority_share_equity" numeric(15, 2) DEFAULT '0' NOT NULL,
	"period" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"approver_id" text NOT NULL,
	"approver_name" text,
	"decision" text NOT NULL,
	"decided_at" timestamp,
	"note" text,
	"escalation_level" integer DEFAULT 1,
	"confidence" numeric(3, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"line_number" integer DEFAULT 1 NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0',
	"receipt_document_ref" text,
	"ocr_confidence" numeric(3, 2),
	"ocr_extracted" jsonb DEFAULT '{}'::jsonb,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text,
	"policy_rule_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"claim_number" text NOT NULL,
	"claimant_id" text NOT NULL,
	"claimant_name" text,
	"department" text,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source" text DEFAULT 'mobile' NOT NULL,
	"period" text,
	"submitted_at" timestamp,
	"flagged_reason" text,
	"approved_by_id" text,
	"approved_at" timestamp,
	"voided_reason" text,
	"voided_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"category" text NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"limit_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"requires_approval_above" numeric(15, 2) DEFAULT '0',
	"requires_receipt_above" numeric(15, 2) DEFAULT '0',
	"max_per_month" numeric(15, 2) DEFAULT '0',
	"allowed_currencies" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" text,
	"effective_to" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reimbursement_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"payment_method" text DEFAULT 'bank_transfer',
	"scheduled_date" timestamp,
	"paid_date" timestamp,
	"payment_ref" text,
	"batch_id" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_org_id" uuid NOT NULL,
	"client_entity_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"added_by_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"ended_by_id" text,
	"client_consented_at" timestamp,
	"client_consented_by_id" text,
	"engagement_type" text DEFAULT 'full' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firm_dashboard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_org_id" uuid NOT NULL,
	"client_entity_id" uuid NOT NULL,
	"health_status" text DEFAULT 'unknown' NOT NULL,
	"books_current" boolean DEFAULT false,
	"unreconciled_items" numeric(5, 0) DEFAULT '0' NOT NULL,
	"overdue_invoices" numeric(5, 0) DEFAULT '0' NOT NULL,
	"pending_approvals" numeric(5, 0) DEFAULT '0' NOT NULL,
	"days_until_close" numeric(4, 0) DEFAULT '0' NOT NULL,
	"last_close_period" text,
	"cash_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"last_refreshed_at" timestamp DEFAULT now() NOT NULL,
	"snapshot_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- IF NOT EXISTS: 0007_idempotency_keys already created this table on fresh DBs
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"route" varchar(500) NOT NULL,
	"status_code" timestamp with time zone,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"task_type" "model_task_type" NOT NULL,
	"live_model_id" text NOT NULL,
	"live_provider" "model_provider" NOT NULL,
	"fallback_model_id" text,
	"fallback_provider" "model_provider",
	"traffic_split" jsonb DEFAULT '{}'::jsonb,
	"evaluation_gate" text DEFAULT 'none',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_cost_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"model_id" text NOT NULL,
	"provider" "model_provider" NOT NULL,
	"date" text NOT NULL,
	"requests_count" text DEFAULT '0' NOT NULL,
	"input_tokens" text DEFAULT '0' NOT NULL,
	"output_tokens" text DEFAULT '0' NOT NULL,
	"cost_usd" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" text NOT NULL,
	"provider" "model_provider" NOT NULL,
	"agent_name" text NOT NULL,
	"task_type" "model_task_type" NOT NULL,
	"gate" text NOT NULL,
	"status" text NOT NULL,
	"golden_dataset_pass_rate" text,
	"shadow_mode_comparison" jsonb,
	"canary_metrics" jsonb,
	"notes" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" text NOT NULL,
	"display_name" text NOT NULL,
	"provider" "model_provider" NOT NULL,
	"capabilities" jsonb DEFAULT '{}'::jsonb,
	"cost_per_million_input_tokens" text NOT NULL,
	"cost_per_million_output_tokens" text NOT NULL,
	"endpoints" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deprecated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "model_registry_model_id_unique" UNIQUE("model_id")
);
--> statement-breakpoint
CREATE TABLE "report_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"requested_by_user_id" text,
	"statement_type" "statement_type",
	"free_text_query" text,
	"period_id" uuid,
	"comparison_period_id" uuid,
	"format" "report_format" DEFAULT 'dashboard' NOT NULL,
	"status" "report_request_status" DEFAULT 'pending' NOT NULL,
	"source" text DEFAULT 'dashboard' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"period_id" uuid,
	"period_label" text,
	"trial_balance_balanced" boolean DEFAULT false NOT NULL,
	"total_debits" numeric(15, 2) DEFAULT '0',
	"total_credits" numeric(15, 2) DEFAULT '0',
	"account_count" numeric DEFAULT '0',
	"entry_count" numeric DEFAULT '0',
	"ledger_snapshot_ref" text,
	"account_balances" jsonb DEFAULT '[]'::jsonb,
	"generated_by" text DEFAULT 'reporting-pipeline',
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statement_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"statement_type" "statement_type" NOT NULL,
	"version_number" numeric DEFAULT '1' NOT NULL,
	"lock_status" "statement_lock_status" DEFAULT 'draft' NOT NULL,
	"narrative_summary" text,
	"statement_data" jsonb,
	"generated_by_user_id" text,
	"is_latest" boolean DEFAULT true NOT NULL,
	"locked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid,
	"type" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" text,
	"read" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "bank_connection_provider" DEFAULT 'mono' NOT NULL,
	"provider_connection_id" text,
	"institution_name" text NOT NULL,
	"institution_id" text,
	"account_name" text,
	"account_number" text,
	"account_type" text,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"status" "bank_connection_status" DEFAULT 'pending' NOT NULL,
	"last_synced_at" timestamp,
	"sync_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csv_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"source_name" text NOT NULL,
	"source_label" text,
	"file_header_hash" text,
	"delimiter" text DEFAULT ',',
	"has_header_row" boolean DEFAULT true NOT NULL,
	"field_mapping" jsonb NOT NULL,
	"skip_rows" integer DEFAULT 0 NOT NULL,
	"date_format" text,
	"user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"use_count" integer DEFAULT 1 NOT NULL,
	"last_used_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_forwarding_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"email_address" text NOT NULL,
	"display_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"auto_classify" boolean DEFAULT true NOT NULL,
	"default_document_type" text DEFAULT 'invoice',
	"forward_to" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"rule_id" uuid,
	"from_address" text NOT NULL,
	"from_name" text,
	"to_address" text NOT NULL,
	"subject" text,
	"body_text" text,
	"body_html" text,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"status" "inbound_email_status" DEFAULT 'received' NOT NULL,
	"document_id" uuid,
	"attachment_count" integer DEFAULT 0 NOT NULL,
	"attachment_paths" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"processing_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- IF NOT EXISTS: 0012 historically created these tables (its creates are now
-- inert comments); IF NOT EXISTS keeps fresh-DB replay safe either way.
CREATE TABLE IF NOT EXISTS "legal_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"doc_type" "legal_doc_type" NOT NULL,
	"doc_version" text NOT NULL,
	"status" "agreement_status" DEFAULT 'pending' NOT NULL,
	"accepted_at" timestamp,
	"ip_address" text,
	"user_agent" text,
	"superseded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "owner_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"priority" "notif_priority" DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"metadata" text,
	"read_at" timestamp,
	"action_url" text,
	"emailed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pro_tier_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"company_name" text NOT NULL,
	"company_registration" text,
	"tax_id" text,
	"business_type" text,
	"expected_volume" text,
	"use_case" text,
	"reviewer_id" uuid,
	"reviewed_at" timestamp,
	"review_notes" text,
	"rejection_reason" text,
	"approved_at" timestamp,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coa_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"segment" text NOT NULL,
	"country" text,
	"market" text,
	"account_list" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"type" "data_connection_type" NOT NULL,
	"status" "data_connection_status" DEFAULT 'pending' NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"failure_reason" text,
	"fallback_offered" "data_connection_type",
	"fallback_accepted" boolean,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historical_pull_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"date_range_start" text NOT NULL,
	"date_range_end" text NOT NULL,
	"status" "historical_pull_status" DEFAULT 'pending' NOT NULL,
	"records_imported" integer DEFAULT 0 NOT NULL,
	"total_records_estimated" integer,
	"exceeds_12_months" boolean DEFAULT false NOT NULL,
	"permission_requested_at" timestamp,
	"permission_granted_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"current_step" "onboarding_step" DEFAULT 'signup' NOT NULL,
	"status" "onboarding_status" DEFAULT 'in_progress' NOT NULL,
	"routing_answer" "onboarding_routing_answer",
	"completed_steps" text[] DEFAULT '{}' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"time_to_first_value_seconds" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"reconciliation_session_id" uuid,
	"statement_line_id" uuid,
	"bank_transaction_id" uuid,
	"ledger_entry_id" uuid,
	"match_tier" "match_tier" NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"matched_by" text DEFAULT 'auto' NOT NULL,
	"match_factors" jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"period_start" text,
	"period_end" text,
	"status" "session_recon_status" DEFAULT 'open' NOT NULL,
	"accounts_included" text[] DEFAULT '{}' NOT NULL,
	"matched_count" numeric DEFAULT '0' NOT NULL,
	"unmatched_count" numeric DEFAULT '0' NOT NULL,
	"total_count" numeric DEFAULT '0' NOT NULL,
	"overall_confidence" numeric(4, 3),
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"closed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statement_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"bank_account_id" uuid,
	"provider" "provider_type" NOT NULL,
	"provider_name" text NOT NULL,
	"date" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"description" text NOT NULL,
	"reference" text,
	"running_balance" numeric(15, 2),
	"raw_source_ref" text,
	"status" "statement_line_status" DEFAULT 'unmatched' NOT NULL,
	"matched_journal_entry_id" uuid,
	"match_confidence" numeric(4, 3),
	"match_tier" "match_tier",
	"source" text DEFAULT 'manual' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filing_deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"jurisdiction" text NOT NULL,
	"filing_type" text NOT NULL,
	"name" text NOT NULL,
	"due_date" text NOT NULL,
	"period" text,
	"estimated_amount" numeric(15, 2),
	"status" "filing_status" DEFAULT 'pending' NOT NULL,
	"filed_at" timestamp,
	"filing_reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jurisdiction_tax_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"country" text NOT NULL,
	"rule_type" "tax_rule_type" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rate_or_bands" jsonb NOT NULL,
	"effective_from" text NOT NULL,
	"effective_to" text,
	"status" "tax_rule_status" DEFAULT 'draft' NOT NULL,
	"proposed_by" text,
	"approved_by" text,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"package_type" "tax_package_type" NOT NULL,
	"period" text NOT NULL,
	"status" "tax_package_status" DEFAULT 'assembling' NOT NULL,
	"format_export" jsonb,
	"compliance_checked" boolean DEFAULT false NOT NULL,
	"compliance_notes" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"submitted" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp,
	"submission_reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vat_calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"period" text NOT NULL,
	"input_vat" numeric(15, 2) DEFAULT '0' NOT NULL,
	"output_vat" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_position" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" "vat_status" DEFAULT 'draft' NOT NULL,
	"calculated_by" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"filed_at" timestamp,
	"filing_reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withholding_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"period" text NOT NULL,
	"payee_id" text NOT NULL,
	"payee_name" text,
	"payee_type" text DEFAULT 'contractor' NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"rate" numeric(5, 4) NOT NULL,
	"tax_withheld" numeric(15, 2) NOT NULL,
	"jurisdiction" text DEFAULT 'GM' NOT NULL,
	"invoice_id" uuid,
	"payroll_run_id" uuid,
	"filed" boolean DEFAULT false NOT NULL,
	"filing_reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_received_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"po_id" uuid,
	"received_date" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"condition_notes" text,
	"carrier_info" text,
	"received_by_id" text,
	"verified_by_id" text,
	"verified_at" timestamp,
	"line_items" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"items_scanned" integer DEFAULT 0 NOT NULL,
	"low_stock_count" integer DEFAULT 0 NOT NULL,
	"cogs_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discrepancy_count" integer DEFAULT 0 NOT NULL,
	"confidence" numeric(3, 2),
	"errors" jsonb DEFAULT '[]'::jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"triggered_by" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_count_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"expected_qty" integer DEFAULT 0 NOT NULL,
	"counted_qty" integer DEFAULT 0 NOT NULL,
	"variance" integer DEFAULT 0 NOT NULL,
	"variance_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"reason" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by_id" text,
	"resolved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_count_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"session_date" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"initiated_by_id" text,
	"completed_by_id" text,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jurisdiction_expansion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"country" text NOT NULL,
	"country_name" text NOT NULL,
	"status" "expansion_status" DEFAULT 'research' NOT NULL,
	"currency" text NOT NULL,
	"researched_by_id" text,
	"researched_at" timestamp,
	"sources" jsonb DEFAULT '[]'::jsonb,
	"drafted_by_id" text,
	"drafted_at" timestamp,
	"reviewed_by_id" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"sandbox_passed" boolean,
	"sandbox_run_id" text,
	"sandbox_completed_at" timestamp,
	"activated_at" timestamp,
	"activated_by_id" text,
	"grace_period_ends_at" timestamp,
	"grace_period_files_reviewed" numeric DEFAULT '0' NOT NULL,
	"grace_period_files_total" numeric DEFAULT '0' NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statutory_deduction_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"country" text NOT NULL,
	"category" "deduction_category" NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"employee_rate" numeric(6, 4) DEFAULT '0' NOT NULL,
	"employee_ceiling" numeric(15, 2),
	"employer_rate" numeric(6, 4) DEFAULT '0' NOT NULL,
	"employer_ceiling" numeric(15, 2),
	"rate_type" text DEFAULT 'percentage' NOT NULL,
	"version" numeric(5, 0) DEFAULT '1' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"effective_from" text NOT NULL,
	"effective_to" text,
	"proposed_by_id" text,
	"approved_by_id" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_user_id" uuid,
	"target_role" "entity_role",
	"module" "rbac_module",
	"action_name" "rbac_action",
	"old_scope" "rbac_scope",
	"new_scope" "rbac_scope",
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "entity_role" NOT NULL,
	"module" "rbac_module" NOT NULL,
	"action" "rbac_action" NOT NULL,
	"scope" "rbac_scope" DEFAULT 'none' NOT NULL,
	"scope_condition" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_permission_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"module" "rbac_module" NOT NULL,
	"action" "rbac_action" NOT NULL,
	"grant" boolean DEFAULT true NOT NULL,
	"granted_by" uuid,
	"reason" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"granted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"org_id" uuid,
	"entity_id" uuid,
	"role" text NOT NULL,
	"token" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"client_consented_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pending_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
-- NOTE: the "SET DEFAULT 'detected'" for documents.status was removed from
-- this spot: on a fresh database the whole chain runs in ONE transaction and
-- 'detected' is only added to doc_status in 0009 — using it as a default
-- here (before 0015's end-of-file DROP/CREATE of doc_status, where it is a
-- creation-time value) triggers "unsafe use of new value of enum type".
-- The default is applied by 0042_doc_status_default_detected instead.
ALTER TABLE "sessions" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider" text DEFAULT 'credentials' NOT NULL;--> statement-breakpoint
-- reset_password_token / reset_password_expires / failed_login_attempts /
-- lockout_until are already added by 0008_security_fields (with IF NOT
-- EXISTS) — re-adding them here hard-fails on fresh databases.
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "backup_codes" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "billing_owner_user_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_routing_logs" ADD CONSTRAINT "agent_routing_logs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confidence_thresholds" ADD CONSTRAINT "confidence_thresholds_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomaly_flags" ADD CONSTRAINT "anomaly_flags_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmark_cohorts" ADD CONSTRAINT "benchmark_cohorts_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detected_trends" ADD CONSTRAINT "detected_trends_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_models" ADD CONSTRAINT "forecast_models_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_scores" ADD CONSTRAINT "health_scores_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_scopes" ADD CONSTRAINT "api_scopes_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery_logs" ADD CONSTRAINT "webhook_delivery_logs_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_disposal_records" ADD CONSTRAINT "asset_disposal_records_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_disposal_records" ADD CONSTRAINT "asset_disposal_records_fixed_asset_id_fixed_assets_id_fk" FOREIGN KEY ("fixed_asset_id") REFERENCES "public"."fixed_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_pipeline_runs" ADD CONSTRAINT "asset_pipeline_runs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_verifications" ADD CONSTRAINT "asset_verifications_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_verifications" ADD CONSTRAINT "asset_verifications_fixed_asset_id_fixed_assets_id_fk" FOREIGN KEY ("fixed_asset_id") REFERENCES "public"."fixed_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_packages" ADD CONSTRAINT "audit_packages_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_samples" ADD CONSTRAINT "audit_samples_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditor_portal_sessions" ADD CONSTRAINT "auditor_portal_sessions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditor_queries" ADD CONSTRAINT "auditor_queries_session_id_auditor_portal_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."auditor_portal_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drift_scores" ADD CONSTRAINT "drift_scores_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "golden_dataset_scenarios" ADD CONSTRAINT "golden_dataset_scenarios_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmark_aggregates" ADD CONSTRAINT "benchmark_aggregates_cohort_id_benchmark_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."benchmark_cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmark_aggregates" ADD CONSTRAINT "benchmark_aggregates_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmark_cohort_members" ADD CONSTRAINT "benchmark_cohort_members_cohort_id_benchmark_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."benchmark_cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmark_cohort_members" ADD CONSTRAINT "benchmark_cohort_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmark_consent_records" ADD CONSTRAINT "benchmark_consent_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmark_consent_records" ADD CONSTRAINT "benchmark_consent_records_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmark_consent_records" ADD CONSTRAINT "benchmark_consent_records_consented_by_entities_id_fk" FOREIGN KEY ("consented_by") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_firm_org_id_organizations_id_fk" FOREIGN KEY ("firm_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_branding_config" ADD CONSTRAINT "firm_branding_config_firm_org_id_organizations_id_fk" FOREIGN KEY ("firm_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_alert_thresholds" ADD CONSTRAINT "budget_alert_thresholds_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_alert_thresholds" ADD CONSTRAINT "budget_alert_thresholds_budget_line_id_budget_lines_id_fk" FOREIGN KEY ("budget_line_id") REFERENCES "public"."budget_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_versions" ADD CONSTRAINT "budget_versions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_versions" ADD CONSTRAINT "budget_versions_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variance_records" ADD CONSTRAINT "variance_records_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variance_records" ADD CONSTRAINT "variance_records_budget_line_id_budget_lines_id_fk" FOREIGN KEY ("budget_line_id") REFERENCES "public"."budget_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_locations" ADD CONSTRAINT "cash_locations_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_locations" ADD CONSTRAINT "cash_locations_cash_account_id_cash_accounts_id_fk" FOREIGN KEY ("cash_account_id") REFERENCES "public"."cash_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_location_id_cash_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."cash_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discrepancy_flags" ADD CONSTRAINT "discrepancy_flags_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discrepancy_flags" ADD CONSTRAINT "discrepancy_flags_location_id_cash_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."cash_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "close_confirmations" ADD CONSTRAINT "close_confirmations_close_session_id_close_sessions_id_fk" FOREIGN KEY ("close_session_id") REFERENCES "public"."close_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "close_sessions" ADD CONSTRAINT "close_sessions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "close_sessions" ADD CONSTRAINT "close_sessions_fiscal_period_id_fiscal_periods_id_fk" FOREIGN KEY ("fiscal_period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "close_versions" ADD CONSTRAINT "close_versions_close_session_id_close_sessions_id_fk" FOREIGN KEY ("close_session_id") REFERENCES "public"."close_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reopen_requests" ADD CONSTRAINT "reopen_requests_close_session_id_close_sessions_id_fk" FOREIGN KEY ("close_session_id") REFERENCES "public"."close_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_runs" ADD CONSTRAINT "consolidation_runs_parent_entity_id_entities_id_fk" FOREIGN KEY ("parent_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elimination_entries" ADD CONSTRAINT "elimination_entries_consolidation_run_id_consolidation_runs_id_fk" FOREIGN KEY ("consolidation_run_id") REFERENCES "public"."consolidation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elimination_entries" ADD CONSTRAINT "elimination_entries_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elimination_entries" ADD CONSTRAINT "elimination_entries_counterparty_entity_id_entities_id_fk" FOREIGN KEY ("counterparty_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_parent_entity_id_entities_id_fk" FOREIGN KEY ("parent_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_subsidiary_entity_id_entities_id_fk" FOREIGN KEY ("subsidiary_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intercompany_tags" ADD CONSTRAINT "intercompany_tags_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intercompany_tags" ADD CONSTRAINT "intercompany_tags_counterparty_entity_id_entities_id_fk" FOREIGN KEY ("counterparty_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intercompany_tags" ADD CONSTRAINT "intercompany_tags_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minority_interest_records" ADD CONSTRAINT "minority_interest_records_consolidation_run_id_consolidation_runs_id_fk" FOREIGN KEY ("consolidation_run_id") REFERENCES "public"."consolidation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minority_interest_records" ADD CONSTRAINT "minority_interest_records_subsidiary_entity_id_entities_id_fk" FOREIGN KEY ("subsidiary_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_claim_id_expense_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."expense_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_line_items" ADD CONSTRAINT "claim_line_items_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_line_items" ADD CONSTRAINT "claim_line_items_claim_id_expense_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."expense_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_rules" ADD CONSTRAINT "policy_rules_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_records" ADD CONSTRAINT "reimbursement_records_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_records" ADD CONSTRAINT "reimbursement_records_claim_id_expense_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."expense_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_engagements" ADD CONSTRAINT "client_engagements_firm_org_id_organizations_id_fk" FOREIGN KEY ("firm_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_engagements" ADD CONSTRAINT "client_engagements_client_entity_id_entities_id_fk" FOREIGN KEY ("client_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_dashboard_snapshots" ADD CONSTRAINT "firm_dashboard_snapshots_firm_org_id_organizations_id_fk" FOREIGN KEY ("firm_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_dashboard_snapshots" ADD CONSTRAINT "firm_dashboard_snapshots_client_entity_id_entities_id_fk" FOREIGN KEY ("client_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_assignments" ADD CONSTRAINT "model_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_assignments" ADD CONSTRAINT "model_assignments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_requests" ADD CONSTRAINT "report_requests_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_requests" ADD CONSTRAINT "report_requests_period_id_fiscal_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_period_id_fiscal_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_versions" ADD CONSTRAINT "statement_versions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_versions" ADD CONSTRAINT "statement_versions_snapshot_id_report_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."report_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_entity_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_mappings" ADD CONSTRAINT "csv_mappings_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_mappings" ADD CONSTRAINT "csv_mappings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_forwarding_rules" ADD CONSTRAINT "email_forwarding_rules_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_forwarding_rules" ADD CONSTRAINT "email_forwarding_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD CONSTRAINT "inbound_emails_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD CONSTRAINT "inbound_emails_rule_id_email_forwarding_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."email_forwarding_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD CONSTRAINT "inbound_emails_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_notifications" ADD CONSTRAINT "owner_notifications_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_notifications" ADD CONSTRAINT "owner_notifications_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pro_tier_reviews" ADD CONSTRAINT "pro_tier_reviews_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pro_tier_reviews" ADD CONSTRAINT "pro_tier_reviews_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pro_tier_reviews" ADD CONSTRAINT "pro_tier_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_connections" ADD CONSTRAINT "data_connections_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_pull_jobs" ADD CONSTRAINT "historical_pull_jobs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_sessions" ADD CONSTRAINT "reconciliation_sessions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_lines" ADD CONSTRAINT "statement_lines_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_lines" ADD CONSTRAINT "statement_lines_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filing_deadlines" ADD CONSTRAINT "filing_deadlines_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurisdiction_tax_rules" ADD CONSTRAINT "jurisdiction_tax_rules_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_packages" ADD CONSTRAINT "tax_packages_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vat_calculations" ADD CONSTRAINT "vat_calculations_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withholding_records" ADD CONSTRAINT "withholding_records_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_pipeline_runs" ADD CONSTRAINT "inventory_pipeline_runs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_records" ADD CONSTRAINT "stock_count_records_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_records" ADD CONSTRAINT "stock_count_records_session_id_stock_count_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."stock_count_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_records" ADD CONSTRAINT "stock_count_records_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_records" ADD CONSTRAINT "stock_count_records_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurisdiction_expansion_requests" ADD CONSTRAINT "jurisdiction_expansion_requests_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statutory_deduction_rules" ADD CONSTRAINT "statutory_deduction_rules_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_roles" ADD CONSTRAINT "org_roles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_roles" ADD CONSTRAINT "org_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_roles" ADD CONSTRAINT "org_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_invites" ADD CONSTRAINT "pending_invites_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_invites" ADD CONSTRAINT "pending_invites_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_invites" ADD CONSTRAINT "pending_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_routing_logs_entity" ON "agent_routing_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "idx_routing_logs_session" ON "agent_routing_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_routing_logs_created" ON "agent_routing_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_routing_logs_intent" ON "agent_routing_logs" USING btree ("intent_type");--> statement-breakpoint
CREATE INDEX "idx_routing_logs_entity_created" ON "agent_routing_logs" USING btree ("entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_confidence_thresholds_unique" ON "confidence_thresholds" USING btree ("org_id","agent_id","transaction_type","amount_band");--> statement-breakpoint
CREATE INDEX "idx_confidence_thresholds_org" ON "confidence_thresholds" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_confidence_thresholds_agent" ON "confidence_thresholds" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "analytics_snap_entity" ON "analytics_snapshots" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "analytics_snap_period" ON "analytics_snapshots" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "analytics_snap_generated" ON "analytics_snapshots" USING btree ("entity_id","generated_at");--> statement-breakpoint
CREATE INDEX "anomaly_entity" ON "anomaly_flags" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "anomaly_type" ON "anomaly_flags" USING btree ("entity_id","anomaly_type");--> statement-breakpoint
CREATE INDEX "anomaly_severity" ON "anomaly_flags" USING btree ("entity_id","severity");--> statement-breakpoint
CREATE INDEX "anomaly_routed" ON "anomaly_flags" USING btree ("entity_id","routed_to");--> statement-breakpoint
CREATE INDEX "benchmark_entity" ON "benchmark_cohorts" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "benchmark_market_segment" ON "benchmark_cohorts" USING btree ("market","segment");--> statement-breakpoint
CREATE INDEX "benchmark_anonymized" ON "benchmark_cohorts" USING btree ("anonymization_verified");--> statement-breakpoint
CREATE INDEX "trends_entity" ON "detected_trends" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "trends_dimension" ON "detected_trends" USING btree ("entity_id","dimension");--> statement-breakpoint
CREATE INDEX "trends_type" ON "detected_trends" USING btree ("entity_id","trend_type");--> statement-breakpoint
CREATE INDEX "trends_period" ON "detected_trends" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "trends_detected" ON "detected_trends" USING btree ("entity_id","detected_at");--> statement-breakpoint
CREATE INDEX "forecast_entity" ON "forecast_models" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "forecast_active" ON "forecast_models" USING btree ("entity_id","is_active");--> statement-breakpoint
CREATE INDEX "forecast_generated" ON "forecast_models" USING btree ("entity_id","generated_at");--> statement-breakpoint
CREATE INDEX "health_entity" ON "health_scores" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "health_period" ON "health_scores" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "health_score" ON "health_scores" USING btree ("entity_id","overall_score");--> statement-breakpoint
CREATE INDEX "api_call_key" ON "api_call_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_call_entity" ON "api_call_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "api_call_endpoint" ON "api_call_logs" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "api_call_timestamp" ON "api_call_logs" USING btree ("api_key_id","timestamp");--> statement-breakpoint
CREATE INDEX "api_keys_org" ON "api_keys" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "api_keys_status" ON "api_keys" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "api_keys_prefix" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "api_scopes_key" ON "api_scopes" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_scopes_resource" ON "api_scopes" USING btree ("api_key_id","resource");--> statement-breakpoint
CREATE INDEX "webhook_delivery_sub" ON "webhook_delivery_logs" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_event" ON "webhook_delivery_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "webhook_entity" ON "webhook_subscriptions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "webhook_event" ON "webhook_subscriptions" USING btree ("entity_id","event_type");--> statement-breakpoint
CREATE INDEX "webhook_status" ON "webhook_subscriptions" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "asset_disposal_entity" ON "asset_disposal_records" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "asset_disposal_asset" ON "asset_disposal_records" USING btree ("fixed_asset_id");--> statement-breakpoint
CREATE INDEX "asset_pipeline_entity" ON "asset_pipeline_runs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "asset_pipeline_period" ON "asset_pipeline_runs" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "asset_pipeline_status" ON "asset_pipeline_runs" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "asset_verif_entity" ON "asset_verifications" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "asset_verif_asset" ON "asset_verifications" USING btree ("fixed_asset_id");--> statement-breakpoint
CREATE INDEX "asset_verif_status" ON "asset_verifications" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "asset_verif_scheduled" ON "asset_verifications" USING btree ("entity_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "audit_packages_entity" ON "audit_packages" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "audit_packages_period" ON "audit_packages" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "audit_samples_entity" ON "audit_samples" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "audit_samples_agent" ON "audit_samples" USING btree ("agent_checked");--> statement-breakpoint
CREATE INDEX "audit_samples_status" ON "audit_samples" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "audit_samples_date" ON "audit_samples" USING btree ("entity_id","sampled_at");--> statement-breakpoint
CREATE INDEX "portal_sessions_entity" ON "auditor_portal_sessions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "portal_sessions_auditor" ON "auditor_portal_sessions" USING btree ("auditor_id");--> statement-breakpoint
CREATE INDEX "portal_sessions_status" ON "auditor_portal_sessions" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "auditor_queries_session" ON "auditor_queries" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "auditor_queries_status" ON "auditor_queries" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "drift_scores_entity" ON "drift_scores" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "drift_scores_agent" ON "drift_scores" USING btree ("entity_id","agent_id");--> statement-breakpoint
CREATE INDEX "drift_scores_period" ON "drift_scores" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "golden_dataset_entity" ON "golden_dataset_scenarios" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "golden_dataset_type" ON "golden_dataset_scenarios" USING btree ("entity_id","scenario_type");--> statement-breakpoint
CREATE INDEX "ba_cohort" ON "benchmark_aggregates" USING btree ("cohort_id");--> statement-breakpoint
CREATE INDEX "ba_cohort_metric" ON "benchmark_aggregates" USING btree ("cohort_id","metric");--> statement-breakpoint
CREATE INDEX "ba_cohort_period" ON "benchmark_aggregates" USING btree ("cohort_id","period");--> statement-breakpoint
CREATE INDEX "ba_consent_verified" ON "benchmark_aggregates" USING btree ("consent_verified");--> statement-breakpoint
CREATE INDEX "ba_min_size_verified" ON "benchmark_aggregates" USING btree ("minimum_size_verified");--> statement-breakpoint
CREATE INDEX "bcm_cohort" ON "benchmark_cohort_members" USING btree ("cohort_id");--> statement-breakpoint
CREATE INDEX "bcm_org" ON "benchmark_cohort_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bcm_active" ON "benchmark_cohort_members" USING btree ("cohort_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "bcm_member" ON "benchmark_cohort_members" USING btree ("cohort_id","organization_id");--> statement-breakpoint
CREATE INDEX "bcr_org" ON "benchmark_consent_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bcr_entity" ON "benchmark_consent_records" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "bcr_consented" ON "benchmark_consent_records" USING btree ("organization_id","consented");--> statement-breakpoint
CREATE UNIQUE INDEX "bcr_org_latest" ON "benchmark_consent_records" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cd_domain" ON "custom_domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "cd_firm" ON "custom_domains" USING btree ("firm_org_id");--> statement-breakpoint
CREATE INDEX "fbc_firm_org" ON "firm_branding_config" USING btree ("firm_org_id");--> statement-breakpoint
CREATE INDEX "budget_alert_line" ON "budget_alert_thresholds" USING btree ("budget_line_id");--> statement-breakpoint
CREATE INDEX "budget_alert_active" ON "budget_alert_thresholds" USING btree ("entity_id","is_active");--> statement-breakpoint
CREATE INDEX "budget_lines_budget" ON "budget_lines" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "budget_lines_account" ON "budget_lines" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "budget_lines_dimension" ON "budget_lines" USING btree ("entity_id","dimension_type","dimension_id");--> statement-breakpoint
CREATE INDEX "budget_versions_budget" ON "budget_versions" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "budget_versions_number" ON "budget_versions" USING btree ("budget_id","version_number");--> statement-breakpoint
CREATE INDEX "budgets_entity" ON "budgets" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "budgets_fiscal_year" ON "budgets" USING btree ("entity_id","fiscal_year");--> statement-breakpoint
CREATE INDEX "budgets_status" ON "budgets" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "variance_line" ON "variance_records" USING btree ("budget_line_id");--> statement-breakpoint
CREATE INDEX "variance_period" ON "variance_records" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "variance_significant" ON "variance_records" USING btree ("entity_id","is_significant");--> statement-breakpoint
CREATE INDEX "cash_locations_entity" ON "cash_locations" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "cash_locations_active" ON "cash_locations" USING btree ("entity_id","is_active");--> statement-breakpoint
CREATE INDEX "cash_tx_entity" ON "cash_transactions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "cash_tx_location" ON "cash_transactions" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "cash_tx_date" ON "cash_transactions" USING btree ("entity_id","recorded_at");--> statement-breakpoint
CREATE INDEX "disc_flags_entity" ON "discrepancy_flags" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "disc_flags_location" ON "discrepancy_flags" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "disc_flags_status" ON "discrepancy_flags" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "close_conf_session" ON "close_confirmations" USING btree ("close_session_id");--> statement-breakpoint
CREATE INDEX "close_conf_agent" ON "close_confirmations" USING btree ("close_session_id","agent_id");--> statement-breakpoint
CREATE INDEX "close_sessions_entity" ON "close_sessions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "close_sessions_period" ON "close_sessions" USING btree ("fiscal_period_id");--> statement-breakpoint
CREATE INDEX "close_sessions_status" ON "close_sessions" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "close_sessions_lookup" ON "close_sessions" USING btree ("entity_id","fiscal_period_id");--> statement-breakpoint
CREATE INDEX "close_ver_session" ON "close_versions" USING btree ("close_session_id");--> statement-breakpoint
CREATE INDEX "close_ver_superseded" ON "close_versions" USING btree ("superseded_by");--> statement-breakpoint
CREATE INDEX "reopen_session" ON "reopen_requests" USING btree ("close_session_id");--> statement-breakpoint
CREATE INDEX "reopen_raised_by" ON "reopen_requests" USING btree ("raised_by_user_id");--> statement-breakpoint
CREATE INDEX "reopen_status" ON "reopen_requests" USING btree ("close_session_id","approved_at");--> statement-breakpoint
CREATE INDEX "cr_parent" ON "consolidation_runs" USING btree ("parent_entity_id");--> statement-breakpoint
CREATE INDEX "cr_period" ON "consolidation_runs" USING btree ("parent_entity_id","period");--> statement-breakpoint
CREATE INDEX "cr_status" ON "consolidation_runs" USING btree ("parent_entity_id","status");--> statement-breakpoint
CREATE INDEX "cr_org" ON "consolidation_runs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ee_run" ON "elimination_entries" USING btree ("consolidation_run_id");--> statement-breakpoint
CREATE INDEX "ee_entity" ON "elimination_entries" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "ee_type" ON "elimination_entries" USING btree ("elimination_type");--> statement-breakpoint
CREATE INDEX "ee_counterparty" ON "elimination_entries" USING btree ("counterparty_entity_id");--> statement-breakpoint
CREATE INDEX "er_parent" ON "entity_relationships" USING btree ("parent_entity_id");--> statement-breakpoint
CREATE INDEX "er_subsidiary" ON "entity_relationships" USING btree ("subsidiary_entity_id");--> statement-breakpoint
CREATE INDEX "er_status" ON "entity_relationships" USING btree ("parent_entity_id","status");--> statement-breakpoint
CREATE INDEX "ict_entity" ON "intercompany_tags" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "ict_counterparty" ON "intercompany_tags" USING btree ("counterparty_entity_id");--> statement-breakpoint
CREATE INDEX "ict_je" ON "intercompany_tags" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "ict_type" ON "intercompany_tags" USING btree ("entity_id","transaction_type");--> statement-breakpoint
CREATE INDEX "ict_pair" ON "intercompany_tags" USING btree ("entity_id","counterparty_entity_id");--> statement-breakpoint
CREATE INDEX "mir_run" ON "minority_interest_records" USING btree ("consolidation_run_id");--> statement-breakpoint
CREATE INDEX "mir_subsidiary" ON "minority_interest_records" USING btree ("subsidiary_entity_id");--> statement-breakpoint
CREATE INDEX "ar_claim" ON "approval_records" USING btree ("entity_id","claim_id");--> statement-breakpoint
CREATE INDEX "ar_approver" ON "approval_records" USING btree ("entity_id","approver_id");--> statement-breakpoint
CREATE INDEX "ar_decision" ON "approval_records" USING btree ("entity_id","decision");--> statement-breakpoint
CREATE INDEX "cli_claim" ON "claim_line_items" USING btree ("entity_id","claim_id");--> statement-breakpoint
CREATE INDEX "cli_flag" ON "claim_line_items" USING btree ("entity_id","is_flagged");--> statement-breakpoint
CREATE INDEX "exp_claim_entity" ON "expense_claims" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "exp_claim_claimant" ON "expense_claims" USING btree ("entity_id","claimant_id");--> statement-breakpoint
CREATE INDEX "exp_claim_status" ON "expense_claims" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "exp_claim_period" ON "expense_claims" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "exp_claim_created" ON "expense_claims" USING btree ("entity_id","created_at");--> statement-breakpoint
CREATE INDEX "pr_entity_category" ON "policy_rules" USING btree ("entity_id","category");--> statement-breakpoint
CREATE INDEX "pr_entity_role" ON "policy_rules" USING btree ("entity_id","role");--> statement-breakpoint
CREATE INDEX "pr_active" ON "policy_rules" USING btree ("entity_id","is_active");--> statement-breakpoint
CREATE INDEX "rr_claim" ON "reimbursement_records" USING btree ("entity_id","claim_id");--> statement-breakpoint
CREATE INDEX "rr_status" ON "reimbursement_records" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "rr_scheduled" ON "reimbursement_records" USING btree ("entity_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "ce_firm" ON "client_engagements" USING btree ("firm_org_id");--> statement-breakpoint
CREATE INDEX "ce_client" ON "client_engagements" USING btree ("client_entity_id");--> statement-breakpoint
CREATE INDEX "ce_status" ON "client_engagements" USING btree ("firm_org_id","status");--> statement-breakpoint
CREATE INDEX "ce_pair" ON "client_engagements" USING btree ("firm_org_id","client_entity_id");--> statement-breakpoint
CREATE INDEX "fds_firm" ON "firm_dashboard_snapshots" USING btree ("firm_org_id");--> statement-breakpoint
CREATE INDEX "fds_client" ON "firm_dashboard_snapshots" USING btree ("client_entity_id");--> statement-breakpoint
CREATE INDEX "fds_status" ON "firm_dashboard_snapshots" USING btree ("firm_org_id","health_status");--> statement-breakpoint
CREATE UNIQUE INDEX "model_assignments_agent_task" ON "model_assignments" USING btree ("agent_name","task_type");--> statement-breakpoint
CREATE INDEX "model_assignments_active" ON "model_assignments" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "model_cost_tracking_daily" ON "model_cost_tracking" USING btree ("entity_id","agent_name","model_id","date");--> statement-breakpoint
CREATE INDEX "model_cost_tracking_entity_date" ON "model_cost_tracking" USING btree ("entity_id","date");--> statement-breakpoint
CREATE INDEX "model_evaluations_model" ON "model_evaluations" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "model_evaluations_agent_task" ON "model_evaluations" USING btree ("agent_name","task_type");--> statement-breakpoint
CREATE INDEX "model_evaluations_gate" ON "model_evaluations" USING btree ("gate");--> statement-breakpoint
CREATE INDEX "model_registry_provider" ON "model_registry" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "report_reqs_entity" ON "report_requests" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "report_reqs_period" ON "report_requests" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "report_reqs_status" ON "report_requests" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "report_snaps_entity" ON "report_snapshots" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "report_snaps_period" ON "report_snapshots" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "stmt_versions_entity" ON "statement_versions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "stmt_versions_snapshot" ON "statement_versions" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "stmt_versions_type" ON "statement_versions" USING btree ("entity_id","statement_type","is_latest");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_entity_idx" ON "notifications" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bank_conn_entity" ON "bank_connections" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "bank_conn_user" ON "bank_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bank_conn_status" ON "bank_connections" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "bank_conn_provider" ON "bank_connections" USING btree ("provider","provider_connection_id");--> statement-breakpoint
CREATE INDEX "csv_map_entity" ON "csv_mappings" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "csv_map_source" ON "csv_mappings" USING btree ("entity_id","source_name");--> statement-breakpoint
CREATE UNIQUE INDEX "csv_map_entity_source" ON "csv_mappings" USING btree ("entity_id","source_name");--> statement-breakpoint
CREATE INDEX "email_rule_entity" ON "email_forwarding_rules" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "email_rule_address" ON "email_forwarding_rules" USING btree ("email_address");--> statement-breakpoint
CREATE INDEX "inbound_email_entity" ON "inbound_emails" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "inbound_email_status" ON "inbound_emails" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "inbound_email_from" ON "inbound_emails" USING btree ("from_address");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_acceptance_unique" ON "legal_acceptances" USING btree ("user_id","entity_id","doc_type","doc_version");--> statement-breakpoint
CREATE INDEX "legal_acceptance_user" ON "legal_acceptances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "legal_acceptance_entity" ON "legal_acceptances" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "legal_acceptance_doc" ON "legal_acceptances" USING btree ("doc_type","doc_version");--> statement-breakpoint
CREATE INDEX "owner_notif_entity" ON "owner_notifications" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "owner_notif_owner" ON "owner_notifications" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "owner_notif_unread" ON "owner_notifications" USING btree ("owner_id","read_at");--> statement-breakpoint
CREATE INDEX "owner_notif_event" ON "owner_notifications" USING btree ("entity_id","event_type");--> statement-breakpoint
CREATE INDEX "pro_review_entity" ON "pro_tier_reviews" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "pro_review_status" ON "pro_tier_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "coa_templates_segment_country" ON "coa_templates" USING btree ("segment","country");--> statement-breakpoint
CREATE INDEX "data_connections_entity" ON "data_connections" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "data_connections_status" ON "data_connections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "historical_pull_entity" ON "historical_pull_jobs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "historical_pull_status" ON "historical_pull_jobs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_sessions_org" ON "onboarding_sessions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_status" ON "onboarding_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "match_records_entity" ON "match_records" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "match_records_session" ON "match_records" USING btree ("reconciliation_session_id");--> statement-breakpoint
CREATE INDEX "match_records_stmt_line" ON "match_records" USING btree ("statement_line_id");--> statement-breakpoint
CREATE INDEX "match_records_ledger" ON "match_records" USING btree ("ledger_entry_id");--> statement-breakpoint
CREATE INDEX "recon_sessions_entity" ON "reconciliation_sessions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "recon_sessions_status" ON "reconciliation_sessions" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "stmt_lines_entity" ON "statement_lines" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "stmt_lines_account" ON "statement_lines" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "stmt_lines_date" ON "statement_lines" USING btree ("entity_id","date");--> statement-breakpoint
CREATE INDEX "stmt_lines_status" ON "statement_lines" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "stmt_lines_provider" ON "statement_lines" USING btree ("entity_id","provider_name");--> statement-breakpoint
CREATE INDEX "filing_deadlines_entity" ON "filing_deadlines" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "filing_deadlines_due" ON "filing_deadlines" USING btree ("entity_id","due_date");--> statement-breakpoint
CREATE INDEX "filing_deadlines_status" ON "filing_deadlines" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "tax_rules_entity" ON "jurisdiction_tax_rules" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "tax_rules_country_type" ON "jurisdiction_tax_rules" USING btree ("entity_id","country","rule_type");--> statement-breakpoint
CREATE INDEX "tax_rules_effective" ON "jurisdiction_tax_rules" USING btree ("entity_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "tax_packages_entity" ON "tax_packages" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "tax_packages_type_period" ON "tax_packages" USING btree ("entity_id","package_type","period");--> statement-breakpoint
CREATE INDEX "vat_calc_entity" ON "vat_calculations" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "vat_calc_period" ON "vat_calculations" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "wht_entity" ON "withholding_records" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "wht_period" ON "withholding_records" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "wht_payee" ON "withholding_records" USING btree ("entity_id","payee_id");--> statement-breakpoint
CREATE INDEX "grn_entity" ON "goods_received_notes" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "grn_po" ON "goods_received_notes" USING btree ("po_id");--> statement-breakpoint
CREATE INDEX "grn_status" ON "goods_received_notes" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "inv_pipeline_entity" ON "inventory_pipeline_runs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "inv_pipeline_period" ON "inventory_pipeline_runs" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "inv_pipeline_status" ON "inventory_pipeline_runs" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "scr_session" ON "stock_count_records" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "scr_item" ON "stock_count_records" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "scr_status" ON "stock_count_records" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "scr_variance" ON "stock_count_records" USING btree ("entity_id","variance");--> statement-breakpoint
CREATE INDEX "scs_entity" ON "stock_count_sessions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "scs_warehouse" ON "stock_count_sessions" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "scs_status" ON "stock_count_sessions" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "jer_entity" ON "jurisdiction_expansion_requests" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "jer_country" ON "jurisdiction_expansion_requests" USING btree ("country");--> statement-breakpoint
CREATE INDEX "jer_status" ON "jurisdiction_expansion_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sdr_entity" ON "statutory_deduction_rules" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "sdr_country_category" ON "statutory_deduction_rules" USING btree ("country","category");--> statement-breakpoint
CREATE INDEX "sdr_code" ON "statutory_deduction_rules" USING btree ("country","code");--> statement-breakpoint
CREATE INDEX "sdr_active" ON "statutory_deduction_rules" USING btree ("country","status");--> statement-breakpoint
CREATE INDEX "permission_audit_log_user" ON "permission_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_unique" ON "role_permissions" USING btree ("role","module","action");--> statement-breakpoint
CREATE INDEX "role_permissions_role" ON "role_permissions" USING btree ("role");--> statement-breakpoint
CREATE INDEX "role_permissions_module" ON "role_permissions" USING btree ("module");--> statement-breakpoint
CREATE INDEX "user_permission_overrides_user" ON "user_permission_overrides" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_permission_overrides_entity" ON "user_permission_overrides" USING btree ("entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_perm_override_unique" ON "user_permission_overrides" USING btree ("user_id","entity_id","module","action");--> statement-breakpoint
CREATE UNIQUE INDEX "org_roles_user_org" ON "org_roles" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX "org_roles_org" ON "org_roles" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_roles_user" ON "org_roles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_invites_token" ON "pending_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "pending_invites_email_status" ON "pending_invites" USING btree ("email","status");--> statement-breakpoint
CREATE INDEX "pending_invites_invited_by" ON "pending_invites" USING btree ("invited_by");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_billing_owner_user_id_users_id_fk" FOREIGN KEY ("billing_owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."documents" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."doc_status";--> statement-breakpoint
CREATE TYPE "public"."doc_status" AS ENUM('detected', 'processing', 'extracted', 'synced', 'agent_processing', 'done', 'failed', 'archived', 'uploaded', 'processed');--> statement-breakpoint
ALTER TABLE "public"."documents" ALTER COLUMN "status" SET DATA TYPE "public"."doc_status" USING "status"::"public"."doc_status";