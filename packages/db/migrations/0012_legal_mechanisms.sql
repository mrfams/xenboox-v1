-- Legal Mechanisms: ToS acceptance tracking, owner notifications, Pro-tier review
-- These tables support regulatory compliance, consent management, and account governance.

-- ─── ENUMS ───────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE legal_doc_type AS ENUM (
    'terms_of_service',
    'privacy_policy',
    'data_processing_agreement',
    'sla',
    'acceptable_use_policy',
    'refund_policy'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agreement_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM (
    'pending',
    'in_review',
    'approved',
    'rejected',
    'info_requested'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notif_priority AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── LEGAL ACCEPTANCES ───────────────────────────

CREATE TABLE IF NOT EXISTS legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  doc_type legal_doc_type NOT NULL,
  doc_version TEXT NOT NULL,
  status agreement_status NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  superseded_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS legal_acceptance_unique
  ON legal_acceptances(user_id, entity_id, doc_type, doc_version);
CREATE INDEX IF NOT EXISTS legal_acceptance_user ON legal_acceptances(user_id);
CREATE INDEX IF NOT EXISTS legal_acceptance_entity ON legal_acceptances(entity_id);
CREATE INDEX IF NOT EXISTS legal_acceptance_doc ON legal_acceptances(doc_type, doc_version);

-- ─── OWNER NOTIFICATIONS ─────────────────────────

CREATE TABLE IF NOT EXISTS owner_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  priority notif_priority NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata TEXT,
  read_at TIMESTAMP,
  action_url TEXT,
  emailed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS owner_notif_entity ON owner_notifications(entity_id);
CREATE INDEX IF NOT EXISTS owner_notif_owner ON owner_notifications(owner_id);
CREATE INDEX IF NOT EXISTS owner_notif_unread ON owner_notifications(owner_id, read_at);
CREATE INDEX IF NOT EXISTS owner_notif_event ON owner_notifications(entity_id, event_type);

-- ─── PRO-TIER REVIEWS ────────────────────────────

CREATE TABLE IF NOT EXISTS pro_tier_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  status review_status NOT NULL DEFAULT 'pending',
  company_name TEXT NOT NULL,
  company_registration TEXT,
  tax_id TEXT,
  business_type TEXT,
  expected_volume TEXT,
  use_case TEXT,
  reviewer_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMP,
  activated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pro_review_entity ON pro_tier_reviews(entity_id);
CREATE INDEX IF NOT EXISTS pro_review_status ON pro_tier_reviews(status);

-- ─── RLS POLICIES ────────────────────────────────

-- Legal acceptances: user can see own, owners can see entity-wide
ALTER TABLE legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY la_user_read ON legal_acceptances
  FOR SELECT USING (
    user_id = current_setting('app.current_user_id')::UUID
    OR EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND uea.entity_id = legal_acceptances.entity_id
      AND uea.role IN ('owner', 'admin')
    )
  );

CREATE POLICY la_user_insert ON legal_acceptances
  FOR INSERT WITH CHECK (
    user_id = current_setting('app.current_user_id')::UUID
  );

-- Owner notifications: only the target owner can read
ALTER TABLE owner_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY on_owner_read ON owner_notifications
  FOR SELECT USING (
    owner_id = current_setting('app.current_user_id')::UUID
    OR EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND uea.entity_id = owner_notifications.entity_id
      AND uea.role IN ('owner', 'admin')
    )
  );

-- Pro-tier reviews: owners/admins can read, system writes
ALTER TABLE pro_tier_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY ptr_entity_read ON pro_tier_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND uea.entity_id = pro_tier_reviews.entity_id
    )
  );

CREATE POLICY ptr_entity_write ON pro_tier_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND uea.entity_id = pro_tier_reviews.entity_id
      AND uea.role IN ('owner', 'admin')
    )
  );
