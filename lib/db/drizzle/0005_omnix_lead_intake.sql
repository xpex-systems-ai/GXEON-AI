-- GX050: contact leads are separate from synthetic intake and technical audits.
-- Additive migration only. App may SELECT channels, never approve/create them.
-- No real channel is seeded by this migration.
CREATE TABLE omnix_lead_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id text NOT NULL,
  recipient_organization_id text NOT NULL,
  admission_mode text NOT NULL CHECK (admission_mode IN ('synthetic', 'real')),
  privacy_version text NOT NULL CHECK (privacy_version = 'gx050-lead-v1'),
  privacy_notice_url text NOT NULL CHECK (privacy_notice_url LIKE 'https://%'),
  recipient_approval_ref text NOT NULL,
  founder_approval_ref text NOT NULL,
  privacy_approval_ref text NOT NULL,
  durable_database_ref text NOT NULL,
  antispam_approval_ref text NOT NULL,
  approved_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > approved_at AND expires_at <= approved_at + interval '90 days')
);
CREATE TABLE omnix_lead_challenges (
  token_sha256 text PRIMARY KEY CHECK (token_sha256 ~ '^[a-f0-9]{64}$'),
  channel_id uuid NOT NULL REFERENCES omnix_lead_channels(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  consumed_at timestamptz
);
CREATE INDEX omnix_lead_challenge_window_idx ON omnix_lead_challenges(channel_id, created_at);
CREATE TABLE omnix_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  channel_id uuid NOT NULL REFERENCES omnix_lead_channels(id),
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  interested_name text NOT NULL CHECK (char_length(interested_name) BETWEEN 2 AND 120),
  company text NOT NULL CHECK (char_length(company) BETWEEN 2 AND 160),
  contact_email text NOT NULL CHECK (char_length(contact_email) BETWEEN 3 AND 254),
  need_type text NOT NULL CHECK (need_type IN ('configuration-integrity', 'enterprise-proposal', 'general-question')),
  general_description text NOT NULL CHECK (char_length(general_description) BETWEEN 10 AND 1000),
  privacy_version text NOT NULL CHECK (privacy_version = 'gx050-lead-v1'),
  consented_at timestamptz NOT NULL DEFAULT now(),
  data_mode text NOT NULL CHECK (data_mode IN ('synthetic', 'real')),
  delivery text NOT NULL DEFAULT 'QUEUED' CHECK (delivery IN ('QUEUED', 'ACKNOWLEDGED')),
  acknowledged_at timestamptz,
  commercial_state text NOT NULL DEFAULT 'leadReceived' CHECK (commercial_state IN
    ('leadReceived','proposalPrepared','contractSigned','accessAuthorized','auditInReview','reportDelivered','clientAccepted','paymentConfirmed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  CHECK ((delivery = 'QUEUED' AND acknowledged_at IS NULL) OR (delivery = 'ACKNOWLEDGED' AND acknowledged_at IS NOT NULL))
);
CREATE INDEX omnix_lead_channel_created_idx ON omnix_leads(channel_id, created_at DESC);
CREATE INDEX omnix_lead_expiry_idx ON omnix_leads(expires_at);
CREATE TABLE omnix_lead_events (
  id uuid PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES omnix_leads(id) ON DELETE CASCADE,
  target_state text NOT NULL CHECK (target_state IN
    ('proposalPrepared','contractSigned','accessAuthorized','auditInReview','reportDelivered','clientAccepted','paymentConfirmed')),
  actor_user_id text NOT NULL,
  actor_organization_id text NOT NULL,
  evidence_id uuid NOT NULL,
  evidence_kind text NOT NULL,
  evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  evidence_reference text NOT NULL,
  authorized_human_review_ref text NOT NULL,
  verification_mode text NOT NULL CHECK (verification_mode IN ('authorized-human-record', 'canonical-audit-record')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, target_state)
);
CREATE TABLE omnix_lead_purge_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES omnix_lead_channels(id),
  actor_user_id text NOT NULL,
  review_reference text NOT NULL,
  deleted_leads integer NOT NULL CHECK (deleted_leads >= 0),
  remaining_expired_leads integer NOT NULL CHECK (remaining_expired_leads = 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
