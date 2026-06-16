CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "r100_state_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" text NOT NULL,
	"snapshot_mode" text DEFAULT 'SAFE_REDACTED' NOT NULL,
	"source" text DEFAULT 'R100_DURABLE_STATE_MIRROR_P2' NOT NULL,
	"collection_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"collections" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"safety" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "r100_state_snapshots_snapshot_id_uq" ON "r100_state_snapshots" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "r100_state_snapshots_snapshot_mode_idx" ON "r100_state_snapshots" USING btree ("snapshot_mode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "r100_state_snapshots_source_idx" ON "r100_state_snapshots" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "r100_state_snapshots_created_at_idx" ON "r100_state_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "r100_state_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"source" text DEFAULT 'R100_DB_MIRROR' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"safety" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "r100_state_audit_events_event_id_uq" ON "r100_state_audit_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "r100_state_audit_events_event_type_idx" ON "r100_state_audit_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "r100_state_audit_events_source_idx" ON "r100_state_audit_events" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "r100_state_audit_events_created_at_idx" ON "r100_state_audit_events" USING btree ("created_at");
