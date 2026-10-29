-- GX050 offline, explicitly authorized first-owner bootstrap. NOT a migration.
-- Run only with psql --no-psqlrc as the dedicated gx01_pilot_owner DB owner.
-- No token/password argument; verify issuer/sub/permissions through trusted IdP
-- administration and a real human approval before supplying these variables.
-- This script validates bounded input; it cannot verify a human approval itself.
\set ON_ERROR_STOP on
\set ECHO none
\set VERBOSITY terse
\if :{?verified_issuer}
\else
  \echo 'VERIFIED_ISSUER_REQUIRED'
  \quit 3
\endif
\if :{?verified_subject}
\else
  \echo 'VERIFIED_SUBJECT_REQUIRED'
  \quit 3
\endif
\if :{?organization_id}
\else
  \echo 'EXPLICIT_ORGANIZATION_UUID_REQUIRED'
  \quit 3
\endif
\if :{?organization_name}
\else
  \echo 'EXPLICIT_ORGANIZATION_NAME_REQUIRED'
  \quit 3
\endif
\if :{?human_approval_reference}
\else
  \echo 'HUMAN_APPROVAL_REFERENCE_REQUIRED'
  \quit 3
\endif

BEGIN;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='3s';
DO $role_boundary$
BEGIN
  IF current_user <> 'gx01_pilot_owner'
     OR current_database() <> 'gx01_pilot'
     OR NOT EXISTS (SELECT 1 FROM pg_database WHERE datname=current_database() AND datdba=(SELECT oid FROM pg_roles WHERE rolname=current_user)) THEN
    RAISE EXCEPTION 'DEDICATED_PILOT_OWNER_CONNECTION_REQUIRED';
  END IF;
END
$role_boundary$;

-- psql quoted-literal substitution escapes quotes; never build executable SQL
-- with a subject/name. No application environment variable triggers this file.
CREATE TEMP TABLE gx050_owner_input (
  issuer text NOT NULL, subject text NOT NULL, organization_id uuid NOT NULL,
  organization_name text NOT NULL, approval_reference text NOT NULL
) ON COMMIT DROP;
INSERT INTO gx050_owner_input VALUES (
  :'verified_issuer', :'verified_subject', :'organization_id'::uuid,
  :'organization_name', :'human_approval_reference'
);
CREATE TEMP TABLE gx050_owner_receipt (
  organization_id uuid NOT NULL, user_id uuid NOT NULL, approval_reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

SELECT pg_advisory_xact_lock(hashtextextended(organization_id::text,0)) FROM gx050_owner_input;
DO $bootstrap$
DECLARE
  input gx050_owner_input%ROWTYPE;
  recipient_id uuid;
  recipient_status text;
BEGIN
  SELECT * INTO STRICT input FROM gx050_owner_input;
  IF length(input.issuer) NOT BETWEEN 12 AND 500
     OR input.issuer !~ '^https://[A-Za-z0-9.-]+(/[A-Za-z0-9._~-]+)*/?$'
     OR position('.' IN split_part(substring(input.issuer FROM 9),'/',1))=0
     OR input.subject='' OR length(input.subject)>255 OR input.subject ~ '[[:cntrl:]]'
     OR length(input.organization_name) NOT BETWEEN 3 AND 160 OR input.organization_name ~ '[[:cntrl:]]'
     OR length(input.approval_reference) NOT BETWEEN 6 AND 500
     OR input.approval_reference !~ '^[A-Za-z0-9][A-Za-z0-9._:/#-]+$' THEN
    RAISE EXCEPTION 'BOUNDED_VERIFIED_BOOTSTRAP_INPUT_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM omnix_organizations WHERE id=input.organization_id OR name=input.organization_name)
     OR EXISTS (SELECT 1 FROM omnix_memberships WHERE organization_id=input.organization_id) THEN
    RAISE EXCEPTION 'EXISTING_ORGANIZATION_OR_MEMBERSHIP_REFUSED';
  END IF;

  INSERT INTO omnix_users(issuer,subject) VALUES(input.issuer,input.subject)
    ON CONFLICT(issuer,subject) DO NOTHING;
  SELECT id,status INTO STRICT recipient_id,recipient_status FROM omnix_users
    WHERE issuer=input.issuer AND subject=input.subject FOR UPDATE;
  IF recipient_status <> 'active' THEN
    RAISE EXCEPTION 'DISABLED_BOOTSTRAP_USER_REFUSED';
  END IF;
  INSERT INTO omnix_organizations(id,name,kind,test_data)
    VALUES(input.organization_id,input.organization_name,'client',true);
  INSERT INTO omnix_memberships(organization_id,user_id,role)
    VALUES(input.organization_id,recipient_id,'owner');
  INSERT INTO gx050_owner_receipt(organization_id,user_id,approval_reference)
    VALUES(input.organization_id,recipient_id,input.approval_reference);
END
$bootstrap$;
COMMIT;

-- Preserve this small administrative receipt in the approved private evidence
-- location. No raw issuer/sub/token is printed and no fake login event is made.
SELECT json_build_object(
  'action','GX050_OFFLINE_OWNER_BOOTSTRAP', 'organizationId',organization_id,
  'userId',user_id, 'approvalReference',approval_reference, 'createdAt',created_at,
  'approvalMustBeVerifiedExternally',true, 'testData',true,
  'customerDataAllowed',false, 'credentialsIncluded',false
) FROM gx050_owner_receipt;
