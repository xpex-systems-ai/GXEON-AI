-- GX050: apply0005 only in the explicitly selected database, as its owner.
-- This grants operational access; it creates/approves NO lead channel.
GRANT SELECT ON omnix_lead_channels TO gx01_pilot_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON omnix_lead_challenges TO gx01_pilot_app;
GRANT SELECT,INSERT,DELETE ON omnix_leads TO gx01_pilot_app;
GRANT UPDATE(delivery,acknowledged_at,commercial_state) ON omnix_leads TO gx01_pilot_app;
GRANT SELECT,INSERT ON omnix_lead_events TO gx01_pilot_app;
GRANT SELECT,INSERT,DELETE ON omnix_lead_purge_receipts TO gx01_pilot_app;
