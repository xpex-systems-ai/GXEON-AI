CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "r100_state_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" text NOT NULL,
	"source" text DEFAULT 'R100_DURABLE_STATE_MIRROR_P2' NOT NULL,
	"status" text DEFAULT 'SAFE_REDACTED' NOT NULL,
	"schema_version" text DEFAULT 'R100_DB_MIRROR_P2_SAFE_SCHEMA_V1' NOT NULL,
	"snapshot_mode" text DEFAULT 'SAFE_REDACTED' NOT NULL,
	"safe_redacted" boolean DEFAULT true NOT NULL,
	"operator_confirmed_revenue_brl" numeric(12,2) DEFAULT 0 NOT NULL,
	"provider_verified_revenue_brl" numeric(12,2) DEFAULT 0 NOT NULL,
	"forecast_revenue_brl" numeric(12,2) DEFAULT 0 NOT NULL,
	"pending_review_brl" numeric(12,2) DEFAULT 0 NOT NULL,
	"lost_brl" numeric(12,2) DEFAULT 0 NOT NULL,
	"prospects_count" integer DEFAULT 0 NOT NULL,
	"client_offers_count" integer DEFAULT 0 NOT NULL,
	"manual_payment_requests_count" integer DEFAULT 0 NOT NULL,
	"close_loops_count" integer DEFAULT 0 NOT NULL,
	"ledger_previews_count" integer DEFAULT 0 NOT NULL,
	"execution_packs_count" integer DEFAULT 0 NOT NULL,
	"delivery_workspaces_count" integer DEFAULT 0 NOT NULL,
	"safety_flags_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "r100_state_snapshots_snapshot_id_uq" ON "r100_state_snapshots" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "r100_state_snapshots_status_idx" ON "r100_state_snapshots" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "r100_state_snapshots_source_idx" ON "r100_state_snapshots" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "r100_state_snapshots_created_at_idx" ON "r100_state_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "r100_state_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" text DEFAULT 'SAFE_REDACTED' NOT NULL,
	"safe_redacted" boolean DEFAULT true NOT NULL,
	"operator_action" text DEFAULT 'NONE' NOT NULL,
	"message" text DEFAULT 'Safe redacted R$100 DB mirror audit event.' NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "r100_state_audit_events_event_id_uq" ON "r100_state_audit_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "r100_state_audit_events_event_type_idx" ON "r100_state_audit_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "r100_state_audit_events_status_idx" ON "r100_state_audit_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "r100_state_audit_events_created_at_idx" ON "r100_state_audit_events" USING btree ("created_at");
