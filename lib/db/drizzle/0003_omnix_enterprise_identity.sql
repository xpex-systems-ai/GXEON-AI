-- GX040 additive identity boundary. Apply only to an explicitly selected isolated
-- database. Existing audit_* entities and workflow states are not duplicated.
CREATE TABLE omnix_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 3 AND 180),
  kind text NOT NULL CHECK (kind IN ('client','agency')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  test_data boolean NOT NULL DEFAULT true CHECK (test_data = true),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE omnix_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer text NOT NULL, subject text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  revoked_before bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (issuer, subject)
);
CREATE TABLE omnix_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES omnix_organizations(id),
  user_id uuid NOT NULL REFERENCES omnix_users(id),
  role text NOT NULL CHECK (role IN ('owner','admin','operator','reviewer','reader')),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (organization_id, user_id)
);
CREATE TABLE omnix_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES omnix_organizations(id),
  created_by uuid NOT NULL REFERENCES omnix_users(id),
  email_sha256 text NOT NULL CHECK (email_sha256 ~ '^[a-f0-9]{64}$'),
  token_sha256 text UNIQUE NOT NULL CHECK (token_sha256 ~ '^[a-f0-9]{64}$'),
  role text NOT NULL CHECK (role IN ('operator','reviewer','reader')),
  expires_at timestamptz NOT NULL, accepted_at timestamptz, revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE omnix_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_organization_id uuid NOT NULL REFERENCES omnix_organizations(id),
  agency_organization_id uuid NOT NULL REFERENCES omnix_organizations(id),
  created_by uuid NOT NULL REFERENCES omnix_users(id),
  scopes jsonb NOT NULL CHECK (jsonb_typeof(scopes) = 'array'),
  expires_at timestamptz NOT NULL, revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (client_organization_id <> agency_organization_id)
);
CREATE INDEX omnix_delegations_agency_client ON omnix_delegations(agency_organization_id,client_organization_id);
CREATE TABLE omnix_identity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer text NOT NULL, jti_sha256 text NOT NULL CHECK (jti_sha256 ~ '^[a-f0-9]{64}$'),
  user_id uuid NOT NULL REFERENCES omnix_users(id),
  issued_at bigint NOT NULL, expires_at timestamptz NOT NULL,
  revoked_at timestamptz, last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (issuer,jti_sha256)
);
CREATE TABLE omnix_identity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES omnix_users(id),
  organization_id uuid REFERENCES omnix_organizations(id),
  event text NOT NULL CHECK (event IN ('SESSION_SEEN','SESSION_REVOKED','ALL_SESSIONS_REVOKED','MEMBER_INVITED','INVITE_ACCEPTED','INVITE_REVOKED','MEMBERSHIP_REVOKED','DELEGATION_GRANTED','DELEGATION_REVOKED')),
  target_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX omnix_identity_events_organization_time ON omnix_identity_events(organization_id,created_at);
