# Revenue Sprint Safety Boundary

GXEON P0 never calls Mercado Pago APIs, Pix APIs, payment providers, wallet connectors, email senders, WhatsApp/Twilio senders, or external task submission systems.

The operator may paste their own manual Pix/Mercado Pago instructions. GXEON does not create payment links, does not guarantee revenue, does not mark provider verification, does not persist to a database, and does not run workers or schedulers.

Required flags: `manualExecutionRequired: true`, `paymentProviderApiDisabled: true`, `externalContactAutomationDisabled: true`, `realRevenueNotGuaranteed: true`, and `operatorApprovalRequired: true`.
