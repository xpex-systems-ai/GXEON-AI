-- GX040: bounded synthetic commercial intake, separate from client audit artifacts.
-- Apply only to the approved isolated database. No destructive schema operations.
CREATE TABLE omnix_commercial_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  interested_name text NOT NULL CHECK (char_length(interested_name) BETWEEN 2 AND 120),
  company text NOT NULL CHECK (char_length(company) BETWEEN 2 AND 160),
  contact_email text NOT NULL CHECK (char_length(contact_email) BETWEEN 3 AND 254),
  general_problem text NOT NULL CHECK (char_length(general_problem) BETWEEN 10 AND 1000),
  privacy_version text NOT NULL CHECK (privacy_version = 'gx040-commercial-v1'),
  consented_at timestamptz NOT NULL DEFAULT now(),
  test_data boolean NOT NULL DEFAULT true CHECK (test_data = true),
  recipient_user_id text NOT NULL,
  recipient_organization_id text NOT NULL,
  delivery text NOT NULL DEFAULT 'QUEUED' CHECK (delivery IN ('QUEUED', 'ACKNOWLEDGED')),
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  CHECK ((delivery = 'QUEUED' AND acknowledged_at IS NULL) OR
         (delivery = 'ACKNOWLEDGED' AND acknowledged_at IS NOT NULL))
);
CREATE INDEX omnix_commercial_recipient_created_idx ON omnix_commercial_requests
  (recipient_organization_id, recipient_user_id, created_at DESC);
CREATE INDEX omnix_commercial_expiry_idx ON omnix_commercial_requests (expires_at);
