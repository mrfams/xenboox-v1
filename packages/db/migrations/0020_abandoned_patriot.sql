CREATE TYPE "public"."activity_type" AS ENUM('bank_reconciliation', 'ai_model_updated', 'organization_created', 'error_detected', 'invoice_processed', 'deployment', 'alert', 'agent_run', 'user_signup', 'subscription_change');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('operational', 'degraded', 'outage', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."ticket_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."agent_category" AS ENUM('accounting', 'analytics', 'hr', 'compliance', 'treasury', 'operations', 'other');--> statement-breakpoint
CREATE TYPE "public"."agent_health_status" AS ENUM('healthy', 'warning', 'critical', 'offline');--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('running', 'completed', 'review', 'failed', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."live_run_status" AS ENUM('queued', 'in_progress', 'waiting', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."llm_provider_status" AS ENUM('healthy', 'degraded', 'offline', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."llm_routing_policy_status" AS ENUM('active', 'inactive', 'draft');--> statement-breakpoint
CREATE TYPE "public"."prompt_status" AS ENUM('active', 'draft', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."review_item_action" AS ENUM('approve_match', 'create_new_record', 'request_more_info', 'escalate', 'dismiss', 'assign');--> statement-breakpoint
CREATE TYPE "public"."review_item_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."review_item_status" AS ENUM('pending', 'in_progress', 'escalated', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."review_item_type" AS ENUM('data_validation', 'entity_resolution', 'duplicate_detection', 'compliance', 'missing_data', 'approval', 'anomaly', 'review', 'configuration');--> statement-breakpoint
CREATE TYPE "public"."issue_category" AS ENUM('data_ingestion', 'agent_execution', 'reconciliation', 'integrations', 'reporting', 'other');--> statement-breakpoint
CREATE TYPE "public"."issue_severity" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('investigating', 'identified', 'monitoring', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."organization_tier" AS ENUM('enterprise', 'growth', 'starter');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('critical', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "public"."incident_severity" AS ENUM('major', 'minor', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."infrastructure_status" AS ENUM('healthy', 'degraded', 'unhealthy', 'maintenance', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('api', 'worker', 'database', 'cache', 'queue', 'storage', 'cdn', 'other');--> statement-breakpoint
CREATE TYPE "public"."log_level" AS ENUM('debug', 'info', 'warn', 'error', 'fatal');--> statement-breakpoint
CREATE TYPE "public"."span_kind" AS ENUM('internal', 'server', 'client', 'producer', 'consumer');--> statement-breakpoint
CREATE TYPE "public"."trace_status" AS ENUM('success', 'error', 'unset');--> statement-breakpoint
CREATE TYPE "public"."flag_status" AS ENUM('on', 'off', 'scheduled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."flag_type" AS ENUM('release', 'experiment', 'ops', 'internal');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('active', 'syncing', 'error', 'paused');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('notion', 'confluence', 'google_drive', 'slack', 'github', 'gmail', 'custom');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('trigger', 'ai_agent', 'action', 'condition', 'router', 'delay', 'approval', 'review');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('running', 'completed', 'failed', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."trigger_type" AS ENUM('schedule', 'webhook', 'file_upload', 'email_inbound', 'manual');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."automation_status" AS ENUM('running', 'paused', 'stopped', 'error');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger" AS ENUM('schedule', 'event', 'webhook', 'manual');--> statement-breakpoint
ALTER TYPE "public"."entity_role" ADD VALUE 'external_accountant' BEFORE 'donor';--> statement-breakpoint
CREATE TABLE "entity_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_activity_feed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"entity_name" text,
	"entity_id" uuid,
	"organization_id" uuid,
	"actor_name" text,
	"actor_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"model_id" text NOT NULL,
	"model_name" text NOT NULL,
	"provider" text NOT NULL,
	"agent_name" text,
	"request_id" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_metrics_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"active_organizations" integer DEFAULT 0 NOT NULL,
	"active_organizations_delta" integer DEFAULT 0 NOT NULL,
	"mrr" numeric(15, 2) DEFAULT '0' NOT NULL,
	"mrr_currency" text DEFAULT 'GMD' NOT NULL,
	"mrr_delta_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"ai_runs" integer DEFAULT 0 NOT NULL,
	"ai_runs_delta_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"total_cost" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_cost_delta_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"gross_margin" numeric(5, 2) DEFAULT '0' NOT NULL,
	"gross_margin_delta_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"ai_success_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"avg_response_time_ms" numeric(10, 2) DEFAULT '0' NOT NULL,
	"open_support_tickets" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_model_usage_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"model_id" text NOT NULL,
	"model_name" text NOT NULL,
	"provider" text NOT NULL,
	"run_count" integer DEFAULT 0 NOT NULL,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"total_cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
	"avg_latency_ms" integer DEFAULT 0 NOT NULL,
	"success_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" text NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"severity" "ticket_severity" DEFAULT 'medium' NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"organization_name" text,
	"organization_id" uuid,
	"assigned_to" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ops_support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "ops_system_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_name" text NOT NULL,
	"display_name" text NOT NULL,
	"status" "service_status" DEFAULT 'operational' NOT NULL,
	"uptime_percent" numeric(5, 2) DEFAULT '100.00' NOT NULL,
	"last_checked_at" timestamp DEFAULT now() NOT NULL,
	"incident_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ops_system_health_service_name_unique" UNIQUE("service_name")
);
--> statement-breakpoint
CREATE TABLE "ops_agent_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"activity_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_agent_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"alert_type" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"acknowledged" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_agent_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"display_name" text NOT NULL,
	"category" "agent_category" DEFAULT 'other' NOT NULL,
	"status" "agent_health_status" DEFAULT 'healthy' NOT NULL,
	"health_score" integer DEFAULT 100 NOT NULL,
	"success_rate" numeric(5, 2) DEFAULT '100.00' NOT NULL,
	"total_runs_24h" integer DEFAULT 0 NOT NULL,
	"errors_24h" integer DEFAULT 0 NOT NULL,
	"avg_latency_ms" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"last_error_at" timestamp,
	"last_error_message" text,
	"trend_data" jsonb DEFAULT '[]'::jsonb,
	"current_task" text,
	"current_task_progress" integer DEFAULT 0,
	"current_task_eta" text,
	"current_task_started_at" timestamp,
	"model" text,
	"tools_count" integer DEFAULT 0,
	"memory_usage_gb" numeric(5, 1),
	"tasks_running" integer DEFAULT 0,
	"tasks_completed" integer DEFAULT 0,
	"tasks_review" integer DEFAULT 0,
	"tasks_failed" integer DEFAULT 0,
	"human_review_count" integer DEFAULT 0,
	"time_saved_hours" numeric(7, 1) DEFAULT '0',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ops_agent_health_agent_name_unique" UNIQUE("agent_name")
);
--> statement-breakpoint
CREATE TABLE "ops_agent_runs_hourly" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"hour" text NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"total_latency_ms" integer DEFAULT 0 NOT NULL,
	"avg_latency_ms" integer DEFAULT 0 NOT NULL,
	"success_rate" numeric(5, 2) DEFAULT '100.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_system_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cpu_usage_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cpu_cores" integer DEFAULT 0 NOT NULL,
	"memory_usage_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"memory_total_gb" numeric(5, 1) DEFAULT '0' NOT NULL,
	"worker_queue_jobs" integer DEFAULT 0 NOT NULL,
	"all_systems_operational" boolean DEFAULT true NOT NULL,
	"active_workflows" integer DEFAULT 0,
	"queue_length" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_workload_distribution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"completed" integer DEFAULT 0,
	"in_progress" integer DEFAULT 0,
	"review" integer DEFAULT 0,
	"scheduled" integer DEFAULT 0,
	"failed" integer DEFAULT 0,
	"total_tasks" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_live_run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"event_type" text NOT NULL,
	"message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_live_run_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"step_number" integer NOT NULL,
	"name" text NOT NULL,
	"status" "step_status" DEFAULT 'pending' NOT NULL,
	"duration_ms" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_live_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"agent_name" text NOT NULL,
	"agent_display_name" text NOT NULL,
	"agent_category" text NOT NULL,
	"organization_name" text,
	"organization_id" uuid,
	"status" "live_run_status" DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"current_step" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"model" text,
	"user_id" uuid,
	"user_name" text,
	"error" text,
	"live_output" jsonb,
	"cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ops_live_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "ops_llm_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"model_id" text NOT NULL,
	"display_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_context_tokens" integer,
	"cost_per_million_input" numeric(10, 2),
	"cost_per_million_output" numeric(10, 2),
	"avg_latency_ms" integer DEFAULT 0 NOT NULL,
	"success_rate" numeric(5, 2) DEFAULT '100.00' NOT NULL,
	"requests_24h" integer DEFAULT 0 NOT NULL,
	"tokens_24h" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_llm_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"icon_url" text,
	"status" "llm_provider_status" DEFAULT 'healthy' NOT NULL,
	"model_count" integer DEFAULT 0 NOT NULL,
	"total_requests_24h" integer DEFAULT 0 NOT NULL,
	"total_tokens_24h" numeric(15, 0) DEFAULT '0' NOT NULL,
	"avg_latency_ms" integer DEFAULT 0 NOT NULL,
	"error_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cost_per_million_tokens" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ops_llm_providers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ops_llm_recent_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_type" text NOT NULL,
	"title" text NOT NULL,
	"actor_name" text NOT NULL,
	"actor_type" text DEFAULT 'admin' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_llm_routing_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"icon_type" text DEFAULT 'default' NOT NULL,
	"status" "llm_routing_policy_status" DEFAULT 'active' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ops_llm_routing_policies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ops_llm_routing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"priority" integer NOT NULL,
	"rule_name" text NOT NULL,
	"conditions" text NOT NULL,
	"target" text NOT NULL,
	"policy_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"hit_rate_24h" numeric(5, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_cost_by_model" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"model_name" text NOT NULL,
	"provider" text NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"input_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"output_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"total_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"cost_usd" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cost_per_million_tokens" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_cost_by_organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"organization_id" uuid,
	"organization_name" text NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"total_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"cost_usd" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_cost_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"total_cost_usd" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"total_requests" integer DEFAULT 0 NOT NULL,
	"cost_per_million_tokens" numeric(10, 2) DEFAULT '0' NOT NULL,
	"avg_cost_per_run" numeric(10, 4) DEFAULT '0' NOT NULL,
	"anthropic_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"openai_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"google_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"azure_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"other_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_cost_drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"driver_name" text NOT NULL,
	"percentage" numeric(5, 1) DEFAULT '0' NOT NULL,
	"cost_usd" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_cost_optimization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation" text NOT NULL,
	"potential_savings_usd" numeric(10, 2) DEFAULT '0' NOT NULL,
	"savings_period" text DEFAULT '7d' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_token_by_agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"agent_name" text NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"total_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"cost_usd" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_token_by_context" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"bucket" text NOT NULL,
	"total_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_token_by_model" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"model_name" text NOT NULL,
	"provider" text NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"input_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"output_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"total_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"cost_usd" numeric(12, 2) DEFAULT '0' NOT NULL,
	"avg_tokens_per_run" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_token_by_org" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"organization_id" uuid,
	"organization_name" text NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"total_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"cost_usd" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_token_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"total_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"input_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"output_tokens" numeric(15, 0) DEFAULT '0' NOT NULL,
	"total_cost_usd" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_runs" integer DEFAULT 0 NOT NULL,
	"avg_tokens_per_run" integer DEFAULT 0 NOT NULL,
	"avg_context_window_used" numeric(5, 1) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_token_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insight_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"badge" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_prompt_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" text NOT NULL,
	"date" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"avg_latency_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_prompt_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" text NOT NULL,
	"version" text NOT NULL,
	"prompt_content" text NOT NULL,
	"changelog" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"agent_name" text NOT NULL,
	"model" text NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"status" "prompt_status" DEFAULT 'active' NOT NULL,
	"success_rate" numeric(5, 1) DEFAULT '0' NOT NULL,
	"total_usage" integer DEFAULT 0 NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"prompt_content" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ops_prompts_prompt_id_unique" UNIQUE("prompt_id")
);
--> statement-breakpoint
CREATE TABLE "review_item_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"review_item_id" uuid NOT NULL,
	"action" "review_item_action" NOT NULL,
	"performed_by" varchar(255) NOT NULL,
	"notes" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "review_item_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"review_item_id" uuid NOT NULL,
	"evidence_type" varchar(100) NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text,
	"file_url" varchar(1000),
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "review_item_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"review_item_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"description" text,
	"performed_by" varchar(255),
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "review_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"type" "review_item_type" NOT NULL,
	"priority" "review_item_priority" DEFAULT 'medium' NOT NULL,
	"status" "review_item_status" DEFAULT 'pending' NOT NULL,
	"organization_id" uuid,
	"agent_id" varchar(255),
	"run_id" varchar(255),
	"assigned_to" varchar(255),
	"sla_deadline" timestamp,
	"sla_breached" boolean DEFAULT false,
	"ai_recommendation" text,
	"ai_reasoning_url" varchar(1000),
	"context_data" text
);
--> statement-breakpoint
CREATE TABLE "customer_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"category" "issue_category" NOT NULL,
	"severity" "issue_severity" NOT NULL,
	"status" "issue_status" DEFAULT 'investigating' NOT NULL,
	"organization_id" uuid,
	"agent_id" varchar(255),
	"workflow_id" varchar(255),
	"customers_impacted" integer DEFAULT 0,
	"identified_at" timestamp,
	"resolved_at" timestamp,
	"mttr_minutes" integer,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "diagnostics_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"insight_type" varchar(100) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"icon_type" varchar(50),
	"action_url" varchar(1000),
	"is_relevant" boolean DEFAULT true,
	"priority" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "issue_resolution_sla" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"met_sla_count" integer DEFAULT 0 NOT NULL,
	"breached_sla_count" integer DEFAULT 0 NOT NULL,
	"met_sla_percentage" numeric(5, 1) DEFAULT '0' NOT NULL,
	"period_days" integer DEFAULT 7 NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues_by_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"category" "issue_category" NOT NULL,
	"issue_count" integer DEFAULT 0 NOT NULL,
	"percentage" numeric(5, 1) DEFAULT '0' NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues_over_time" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"date" varchar(10) NOT NULL,
	"critical_count" integer DEFAULT 0 NOT NULL,
	"high_count" integer DEFAULT 0 NOT NULL,
	"medium_count" integer DEFAULT 0 NOT NULL,
	"low_count" integer DEFAULT 0 NOT NULL,
	"total_issues" integer DEFAULT 0 NOT NULL,
	"resolved_issues" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_active_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"organization_id" uuid,
	"organization_name" varchar(255) NOT NULL,
	"tier" "organization_tier" NOT NULL,
	"active_issues" integer DEFAULT 0 NOT NULL,
	"critical_issues" integer DEFAULT 0 NOT NULL,
	"mttr_minutes" integer,
	"status" "issue_status" DEFAULT 'investigating' NOT NULL,
	"last_updated" timestamp
);
--> statement-breakpoint
CREATE TABLE "top_impacted_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workflow_name" varchar(255) NOT NULL,
	"issue_count" integer DEFAULT 0 NOT NULL,
	"percentage" numeric(5, 1) DEFAULT '0' NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"severity" "alert_severity" NOT NULL,
	"service_name" varchar(255),
	"environment" varchar(100) DEFAULT 'production' NOT NULL,
	"is_acknowledged" boolean DEFAULT false,
	"acknowledged_by" varchar(255),
	"acknowledged_at" timestamp,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "infra_health_overview" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"date" varchar(10) NOT NULL,
	"overall_status" "infrastructure_status" DEFAULT 'healthy' NOT NULL,
	"uptime_percent" numeric(7, 4) DEFAULT '100' NOT NULL,
	"incident_count" integer DEFAULT 0 NOT NULL,
	"total_services" integer DEFAULT 0 NOT NULL,
	"healthy_services" integer DEFAULT 0 NOT NULL,
	"degraded_services" integer DEFAULT 0 NOT NULL,
	"unhealthy_services" integer DEFAULT 0 NOT NULL,
	"maintenance_services" integer DEFAULT 0 NOT NULL,
	"unknown_services" integer DEFAULT 0 NOT NULL,
	"active_alerts" integer DEFAULT 0 NOT NULL,
	"critical_alerts" integer DEFAULT 0 NOT NULL,
	"warning_alerts" integer DEFAULT 0 NOT NULL,
	"info_alerts" integer DEFAULT 0 NOT NULL,
	"avg_response_time_ms" integer DEFAULT 0 NOT NULL,
	"error_rate_percent" numeric(7, 4) DEFAULT '0' NOT NULL,
	"cpu_usage_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"memory_usage_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"disk_usage_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"network_in_mbps" numeric(10, 2) DEFAULT '0' NOT NULL,
	"network_out_mbps" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"severity" "incident_severity" NOT NULL,
	"started_at" timestamp NOT NULL,
	"resolved_at" timestamp,
	"duration_minutes" integer,
	"affected_services" text,
	"environment" varchar(100) DEFAULT 'production' NOT NULL,
	"status" varchar(50) DEFAULT 'investigating' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra_resource_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"environment" varchar(100) NOT NULL,
	"date" varchar(10) NOT NULL,
	"cpu_avg_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cpu_peak_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"memory_avg_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"memory_peak_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"disk_avg_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"disk_peak_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"network_in_mbps" numeric(10, 2) DEFAULT '0' NOT NULL,
	"network_out_mbps" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"type" "service_type" NOT NULL,
	"status" "infrastructure_status" DEFAULT 'healthy' NOT NULL,
	"environment" varchar(100) DEFAULT 'production' NOT NULL,
	"uptime_percent_30d" numeric(7, 4) DEFAULT '100' NOT NULL,
	"response_time_p95_ms" integer,
	"error_rate_percent_7d" numeric(7, 4),
	"response_time_delta" integer,
	"error_rate_delta" numeric(7, 4),
	"last_checked_at" timestamp,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"timestamp" timestamp NOT NULL,
	"level" "log_level" NOT NULL,
	"message" text NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"environment" varchar(100) DEFAULT 'production' NOT NULL,
	"trace_id" varchar(255),
	"span_id" varchar(255),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"date" varchar(10) NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"environment" varchar(100) DEFAULT 'production' NOT NULL,
	"p50_latency_ms" integer,
	"p95_latency_ms" integer,
	"p99_latency_ms" integer,
	"avg_latency_ms" integer,
	"request_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"error_rate_percent" numeric(7, 4) DEFAULT '0' NOT NULL,
	"log_count" integer DEFAULT 0 NOT NULL,
	"trace_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"trace_id" varchar(255) NOT NULL,
	"span_id" varchar(255) NOT NULL,
	"parent_span_id" varchar(255),
	"operation_name" varchar(500) NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"kind" "span_kind" DEFAULT 'internal' NOT NULL,
	"start_time" timestamp NOT NULL,
	"duration_ms" integer NOT NULL,
	"status" "trace_status" DEFAULT 'success' NOT NULL,
	"status_code" integer,
	"status_message" text,
	"tags" jsonb,
	"logs" jsonb
);
--> statement-breakpoint
CREATE TABLE "traces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"trace_id" varchar(255) NOT NULL,
	"root_operation" varchar(500) NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"environment" varchar(100) DEFAULT 'production' NOT NULL,
	"start_time" timestamp NOT NULL,
	"duration_ms" integer NOT NULL,
	"status" "trace_status" DEFAULT 'success' NOT NULL,
	"span_count" integer DEFAULT 1 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "traces_trace_id_unique" UNIQUE("trace_id")
);
--> statement-breakpoint
CREATE TABLE "feature_flag_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"flag_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"performed_by" varchar(255),
	"field" varchar(100),
	"old_value" text,
	"new_value" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "feature_flag_rollout_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"flag_id" uuid NOT NULL,
	"rollout_percent" integer NOT NULL,
	"changed_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"key" varchar(255) NOT NULL,
	"description" text,
	"type" "flag_type" DEFAULT 'release' NOT NULL,
	"status" "flag_status" DEFAULT 'off' NOT NULL,
	"environments" jsonb DEFAULT '["prod","stg","dev"]'::jsonb,
	"rollout_percent" integer DEFAULT 0 NOT NULL,
	"targeting_rules" jsonb,
	"owner_name" varchar(255),
	"owner_avatar" varchar(500),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"scheduled_at" timestamp,
	"remote_config" jsonb,
	"total_evaluations" integer DEFAULT 0 NOT NULL,
	"true_evaluations" integer DEFAULT 0 NOT NULL,
	"false_evaluations" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "knowledge_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"activity_type" varchar(100) NOT NULL,
	"title" varchar(500) NOT NULL,
	"source" varchar(255),
	"document_id" varchar(255),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "knowledge_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"source_node_id" varchar(255) NOT NULL,
	"target_node_id" varchar(255) NOT NULL,
	"relationship" varchar(255),
	"weight" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"confidence" numeric(5, 2),
	"sources_used" jsonb DEFAULT '[]'::jsonb,
	"user_id" varchar(255),
	"helpful" boolean,
	"feedback" text
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"source_id" uuid,
	"title" varchar(500) NOT NULL,
	"content" text,
	"url" varchar(1000),
	"category" varchar(100),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"connection_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "knowledge_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"category" varchar(100),
	"connection_count" integer DEFAULT 0 NOT NULL,
	"x" numeric(10, 2),
	"y" numeric(10, 2),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "knowledge_popular_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"question" text NOT NULL,
	"category" varchar(100),
	"ask_count" integer DEFAULT 0 NOT NULL,
	"last_asked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "knowledge_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "source_type" NOT NULL,
	"status" "source_status" DEFAULT 'active' NOT NULL,
	"document_count" integer DEFAULT 0 NOT NULL,
	"last_synced_at" timestamp,
	"sync_interval" integer,
	"config" jsonb,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "knowledge_top_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"topic" varchar(255) NOT NULL,
	"connection_count" integer DEFAULT 0 NOT NULL,
	"category" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "workflow_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"source_node_id" varchar(255) NOT NULL,
	"target_node_id" varchar(255) NOT NULL,
	"label" varchar(100),
	"condition" text
);
--> statement-breakpoint
CREATE TABLE "workflow_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "node_type" NOT NULL,
	"step_number" integer,
	"x" numeric(10, 2),
	"y" numeric(10, 2),
	"config" jsonb,
	"model" varchar(100),
	"instructions" text,
	"output_schema" jsonb,
	"confidence_threshold" integer DEFAULT 85,
	"trigger_type" "trigger_type",
	"condition" text,
	"true_branch" varchar(255),
	"false_branch" varchar(255),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"status" "run_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"duration_minutes" numeric(5, 2),
	"current_node_id" varchar(255),
	"completed_steps" integer DEFAULT 0 NOT NULL,
	"total_steps" integer DEFAULT 0 NOT NULL,
	"result" jsonb,
	"error" text,
	"confidence" numeric(5, 2),
	"fields_extracted" integer,
	"fields_total" integer,
	"triggered_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "workflow_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"template_data" jsonb,
	"usage_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"version" varchar(50) NOT NULL,
	"description" text,
	"snapshot" jsonb,
	"published_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "workflow_status" DEFAULT 'draft' NOT NULL,
	"version" varchar(50) DEFAULT '1.0' NOT NULL,
	"last_published_at" timestamp,
	"total_steps" integer DEFAULT 0 NOT NULL,
	"ai_agent_count" integer DEFAULT 0 NOT NULL,
	"human_step_count" integer DEFAULT 0 NOT NULL,
	"integration_count" integer DEFAULT 0 NOT NULL,
	"avg_duration_minutes" numeric(5, 2),
	"success_rate" numeric(5, 2),
	"total_runs" integer DEFAULT 0 NOT NULL,
	"canvas_data" jsonb,
	"settings" jsonb
);
--> statement-breakpoint
CREATE TABLE "automation_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"automation_id" uuid,
	"automation_name" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"status" varchar(50) NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "automation_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"month" varchar(7) NOT NULL,
	"total_tasks" integer DEFAULT 0 NOT NULL,
	"successful_tasks" integer DEFAULT 0 NOT NULL,
	"review_required_tasks" integer DEFAULT 0 NOT NULL,
	"failed_tasks" integer DEFAULT 0 NOT NULL,
	"skipped_tasks" integer DEFAULT 0 NOT NULL,
	"total_time_saved_minutes" integer DEFAULT 0 NOT NULL,
	"cost_savings_amount" numeric(15, 2),
	"cost_savings_currency" varchar(10) DEFAULT 'GMD'
);
--> statement-breakpoint
CREATE TABLE "automation_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"template_data" jsonb,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"tag" varchar(50),
	"icon" varchar(100),
	"icon_color" varchar(50),
	"icon_bg" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "automation_time_savings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"automation_id" uuid,
	"automation_name" varchar(255) NOT NULL,
	"time_saved_hours" numeric(5, 1) NOT NULL,
	"rank" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "automation_status" DEFAULT 'running' NOT NULL,
	"trigger_type" "automation_trigger" NOT NULL,
	"trigger_config" jsonb,
	"trigger_schedule" varchar(255),
	"last_run_at" timestamp,
	"success_rate" numeric(5, 2),
	"ai_confidence" integer,
	"tasks_automated" integer DEFAULT 0 NOT NULL,
	"time_saved_minutes" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"category" varchar(100),
	"is_template" boolean DEFAULT false,
	"template_tag" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"date_format" text DEFAULT 'YYYY-MM-DD' NOT NULL,
	"notifications" jsonb DEFAULT '{"emailInvoices":true,"emailReports":true,"emailAlerts":true,"emailReminders":true,"pushPayments":true,"pushApprovals":true,"pushDeadlines":true,"weeklyDigest":true}'::jsonb NOT NULL,
	"security" jsonb DEFAULT '{"requirePasswordChange":false,"sessionTimeout":60,"loginNotifications":true}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "entity_api_keys" ADD CONSTRAINT "entity_api_keys_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_api_keys" ADD CONSTRAINT "entity_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_live_run_events" ADD CONSTRAINT "ops_live_run_events_run_id_ops_live_runs_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ops_live_runs"("run_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_live_run_steps" ADD CONSTRAINT "ops_live_run_steps_run_id_ops_live_runs_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ops_live_runs"("run_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_llm_models" ADD CONSTRAINT "ops_llm_models_provider_id_ops_llm_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ops_llm_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_prompt_usage" ADD CONSTRAINT "ops_prompt_usage_prompt_id_ops_prompts_prompt_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."ops_prompts"("prompt_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_prompt_versions" ADD CONSTRAINT "ops_prompt_versions_prompt_id_ops_prompts_prompt_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."ops_prompts"("prompt_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_item_actions" ADD CONSTRAINT "review_item_actions_review_item_id_review_items_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_item_evidence" ADD CONSTRAINT "review_item_evidence_review_item_id_review_items_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_item_history" ADD CONSTRAINT "review_item_history_review_item_id_review_items_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_issues" ADD CONSTRAINT "customer_issues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_active_issues" ADD CONSTRAINT "org_active_issues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_audit_log" ADD CONSTRAINT "feature_flag_audit_log_flag_id_feature_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_rollout_history" ADD CONSTRAINT "feature_flag_rollout_history_flag_id_feature_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_source_id_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_source_node_id_workflow_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."workflow_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_target_node_id_workflow_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."workflow_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_nodes" ADD CONSTRAINT "workflow_nodes_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_activity" ADD CONSTRAINT "automation_activity_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_time_savings" ADD CONSTRAINT "automation_time_savings_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_entity_api_keys_entity" ON "entity_api_keys" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "idx_entity_api_keys_user" ON "entity_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ops_activity_type" ON "ops_activity_feed" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "ops_activity_created" ON "ops_activity_feed" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ops_activity_org" ON "ops_activity_feed" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ops_ai_runs_date" ON "ops_ai_runs" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ops_ai_runs_model" ON "ops_ai_runs" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "ops_ai_runs_provider" ON "ops_ai_runs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "ops_ai_runs_date_model" ON "ops_ai_runs" USING btree ("date","model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_metrics_date" ON "ops_metrics_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ops_metrics_created" ON "ops_metrics_daily" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_model_usage_daily_unique" ON "ops_model_usage_daily" USING btree ("date","model_id");--> statement-breakpoint
CREATE INDEX "ops_model_usage_date" ON "ops_model_usage_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ops_model_usage_model" ON "ops_model_usage_daily" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "ops_tickets_status" ON "ops_support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ops_tickets_severity" ON "ops_support_tickets" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "ops_tickets_created" ON "ops_support_tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ops_health_status" ON "ops_system_health" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ops_agent_activity_agent" ON "ops_agent_activity" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "ops_agent_activity_created" ON "ops_agent_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ops_agent_alerts_agent" ON "ops_agent_alerts" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "ops_agent_alerts_type" ON "ops_agent_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "ops_agent_alerts_severity" ON "ops_agent_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "ops_agent_alerts_created" ON "ops_agent_alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ops_agent_health_status" ON "ops_agent_health" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ops_agent_health_category" ON "ops_agent_health" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ops_agent_health_score" ON "ops_agent_health" USING btree ("health_score");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_agent_runs_hourly_unique" ON "ops_agent_runs_hourly" USING btree ("agent_name","hour");--> statement-breakpoint
CREATE INDEX "ops_agent_runs_hourly_hour" ON "ops_agent_runs_hourly" USING btree ("hour");--> statement-breakpoint
CREATE INDEX "ops_agent_runs_hourly_agent" ON "ops_agent_runs_hourly" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "ops_system_resources_created" ON "ops_system_resources" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ops_workload_distribution_date" ON "ops_workload_distribution" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ops_live_run_events_run" ON "ops_live_run_events" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ops_live_run_events_type" ON "ops_live_run_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "ops_live_run_events_created" ON "ops_live_run_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ops_live_run_steps_run" ON "ops_live_run_steps" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ops_live_run_steps_status" ON "ops_live_run_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ops_live_runs_status" ON "ops_live_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ops_live_runs_agent" ON "ops_live_runs" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "ops_live_runs_started" ON "ops_live_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "ops_live_runs_org" ON "ops_live_runs" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_llm_models_provider_model" ON "ops_llm_models" USING btree ("provider_id","model_id");--> statement-breakpoint
CREATE INDEX "ops_llm_models_provider" ON "ops_llm_models" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "ops_llm_models_active" ON "ops_llm_models" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ops_llm_providers_status" ON "ops_llm_providers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ops_llm_providers_active" ON "ops_llm_providers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ops_llm_changes_type" ON "ops_llm_recent_changes" USING btree ("change_type");--> statement-breakpoint
CREATE INDEX "ops_llm_changes_created" ON "ops_llm_recent_changes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ops_routing_policies_status" ON "ops_llm_routing_policies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ops_routing_policies_priority" ON "ops_llm_routing_policies" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "ops_routing_rules_priority" ON "ops_llm_routing_rules" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "ops_routing_rules_active" ON "ops_llm_routing_rules" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_cost_model_daily" ON "ops_cost_by_model" USING btree ("date","model_name");--> statement-breakpoint
CREATE INDEX "ops_cost_model_date" ON "ops_cost_by_model" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ops_cost_model_name" ON "ops_cost_by_model" USING btree ("model_name");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_cost_org_daily" ON "ops_cost_by_organization" USING btree ("date","organization_id");--> statement-breakpoint
CREATE INDEX "ops_cost_org_date" ON "ops_cost_by_organization" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ops_cost_org_name" ON "ops_cost_by_organization" USING btree ("organization_name");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_cost_daily_date" ON "ops_cost_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ops_cost_daily_created" ON "ops_cost_daily" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ops_cost_drivers_period" ON "ops_cost_drivers" USING btree ("period");--> statement-breakpoint
CREATE INDEX "ops_cost_optimization_active" ON "ops_cost_optimization" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ops_cost_optimization_priority" ON "ops_cost_optimization" USING btree ("priority");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_token_agent_daily" ON "ops_token_by_agent" USING btree ("date","agent_name");--> statement-breakpoint
CREATE INDEX "ops_token_agent_date" ON "ops_token_by_agent" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_token_context_daily" ON "ops_token_by_context" USING btree ("date","bucket");--> statement-breakpoint
CREATE INDEX "ops_token_context_date" ON "ops_token_by_context" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_token_model_daily" ON "ops_token_by_model" USING btree ("date","model_name");--> statement-breakpoint
CREATE INDEX "ops_token_model_date" ON "ops_token_by_model" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ops_token_model_name" ON "ops_token_by_model" USING btree ("model_name");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_token_org_daily" ON "ops_token_by_org" USING btree ("date","organization_id");--> statement-breakpoint
CREATE INDEX "ops_token_org_date" ON "ops_token_by_org" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_token_daily_date" ON "ops_token_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ops_token_daily_created" ON "ops_token_daily" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ops_token_insights_type" ON "ops_token_insights" USING btree ("insight_type");--> statement-breakpoint
CREATE INDEX "ops_token_insights_priority" ON "ops_token_insights" USING btree ("priority");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_prompt_usage_daily" ON "ops_prompt_usage" USING btree ("prompt_id","date");--> statement-breakpoint
CREATE INDEX "ops_prompt_usage_date" ON "ops_prompt_usage" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "ops_prompt_versions_unique" ON "ops_prompt_versions" USING btree ("prompt_id","version");--> statement-breakpoint
CREATE INDEX "ops_prompt_versions_prompt" ON "ops_prompt_versions" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "ops_prompts_status" ON "ops_prompts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ops_prompts_agent" ON "ops_prompts" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "ops_prompts_model" ON "ops_prompts" USING btree ("model");--> statement-breakpoint
CREATE INDEX "ops_prompts_favorite" ON "ops_prompts" USING btree ("is_favorite");