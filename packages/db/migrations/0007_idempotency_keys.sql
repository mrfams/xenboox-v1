CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "key" varchar(255) PRIMARY KEY,
  "user_id" text NOT NULL,
  "entity_id" text NOT NULL,
  "route" varchar(500) NOT NULL,
  "status_code" timestamp with time zone,
  "response_body" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "locked_at" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL
);