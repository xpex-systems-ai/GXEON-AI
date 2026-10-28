-- GX040 additive privileges, after0003 and (optionally)0004 in an isolated
-- synthetic database. Run as the administrative owner, never the app role.
-- Organizations and their first owner are bootstrapped offline by an authorized
-- administrator. No owner/admin account is minted by public registration.
GRANT SELECT ON omnix_organizations,omnix_users,omnix_memberships,omnix_invitations,
  omnix_delegations,omnix_identity_sessions TO gx01_pilot_app;
GRANT INSERT ON omnix_users,omnix_memberships,omnix_invitations,omnix_delegations,
  omnix_identity_sessions,omnix_identity_events TO gx01_pilot_app;
GRANT UPDATE(revoked_before) ON omnix_users TO gx01_pilot_app;
GRANT UPDATE(revoked_at) ON omnix_memberships TO gx01_pilot_app;
GRANT UPDATE(accepted_at,revoked_at) ON omnix_invitations TO gx01_pilot_app;
GRANT UPDATE(revoked_at) ON omnix_delegations TO gx01_pilot_app;
GRANT UPDATE(revoked_at) ON omnix_identity_sessions TO gx01_pilot_app;

-- Only when the optional synthetic commercial inbox is enabled:
GRANT SELECT,INSERT,DELETE ON omnix_commercial_requests TO gx01_pilot_app;
GRANT UPDATE(delivery,acknowledged_at) ON omnix_commercial_requests TO gx01_pilot_app;
