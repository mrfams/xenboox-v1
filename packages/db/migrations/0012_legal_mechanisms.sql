-- Legal Mechanisms: ToS acceptance tracking, owner notifications, Pro-tier review
--
-- NOTE (fresh-DB fix): the three tables below are canonically created by
-- 0015_conscious_namora (drizzle-generated, exact column types). They were
-- also created here IF NOT EXISTS, but 0015 hard-creates them later, which
-- fails on a fresh database ("relation already exists"). Production never
-- executed this section (this migration was retro-inserted with a timestamp
-- below prod's __drizzle_migrations watermark), so the creates + indexes
-- below are inert comments, and the RLS policies moved to
-- 0043_rls_catchup.sql (tables must exist before policies can attach).
-- The enum types below ARE kept: 0015's columns depend on them.

DO $$ BEGIN
  CREATE TYPE legal_doc_type AS ENUM (
    'terms_of_service',
    'privacy_policy',
    'pro_agreement'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE agreement_status AS ENUM (
    'pending',
    'accepted',
    'declined'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM (
    'pending',
    'under_review',
    'approved',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notif_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Tables created in 0015_conscious_namora (canonical) ─────────
--
-- CREATE TABLE IF NOT EXISTS legal_acceptances (...);
-- CREATE TABLE IF NOT EXISTS owner_notifications (...);
-- CREATE TABLE IF NOT EXISTS pro_tier_reviews (...);
-- (indexes likewise created in 0015)
--
-- RLS policies for these tables now live in 0043_rls_catchup.sql.
