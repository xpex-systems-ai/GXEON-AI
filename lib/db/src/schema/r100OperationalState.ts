import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const r100StateSnapshots = pgTable(
  "r100_state_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snapshotId: text("snapshot_id").notNull(),
    source: text("source").notNull().default("R100_DURABLE_STATE_MIRROR_P2"),
    status: text("status").notNull().default("SAFE_REDACTED"),
    schemaVersion: text("schema_version").notNull().default("R100_DB_MIRROR_P2_SAFE_SCHEMA_V1"),
    snapshotMode: text("snapshot_mode").notNull().default("SAFE_REDACTED"),
    safeRedacted: boolean("safe_redacted").notNull().default(true),
    operatorConfirmedRevenueBrl: numeric("operator_confirmed_revenue_brl", { precision: 12, scale: 2 }).notNull().default("0"),
    providerVerifiedRevenueBrl: numeric("provider_verified_revenue_brl", { precision: 12, scale: 2 }).notNull().default("0"),
    forecastRevenueBrl: numeric("forecast_revenue_brl", { precision: 12, scale: 2 }).notNull().default("0"),
    pendingReviewBrl: numeric("pending_review_brl", { precision: 12, scale: 2 }).notNull().default("0"),
    lostBrl: numeric("lost_brl", { precision: 12, scale: 2 }).notNull().default("0"),
    prospectsCount: integer("prospects_count").notNull().default(0),
    clientOffersCount: integer("client_offers_count").notNull().default(0),
    manualPaymentRequestsCount: integer("manual_payment_requests_count").notNull().default(0),
    closeLoopsCount: integer("close_loops_count").notNull().default(0),
    ledgerPreviewsCount: integer("ledger_previews_count").notNull().default(0),
    executionPacksCount: integer("execution_packs_count").notNull().default(0),
    deliveryWorkspacesCount: integer("delivery_workspaces_count").notNull().default(0),
    safetyFlagsJson: jsonb("safety_flags_json").notNull().default(sql`'{}'::jsonb`),
    summaryJson: jsonb("summary_json").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("r100_state_snapshots_snapshot_id_uq").on(table.snapshotId),
    index("r100_state_snapshots_status_idx").on(table.status),
    index("r100_state_snapshots_source_idx").on(table.source),
    index("r100_state_snapshots_created_at_idx").on(table.createdAt),
  ],
);

export const r100StateAuditEvents = pgTable(
  "r100_state_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    status: text("status").notNull().default("SAFE_REDACTED"),
    safeRedacted: boolean("safe_redacted").notNull().default(true),
    operatorAction: text("operator_action").notNull().default("NONE"),
    message: text("message").notNull().default("Safe redacted R$100 DB mirror audit event."),
    metadataJson: jsonb("metadata_json").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("r100_state_audit_events_event_id_uq").on(table.eventId),
    index("r100_state_audit_events_event_type_idx").on(table.eventType),
    index("r100_state_audit_events_status_idx").on(table.status),
    index("r100_state_audit_events_created_at_idx").on(table.createdAt),
  ],
);

export const insertR100StateSnapshotSchema = createInsertSchema(r100StateSnapshots);
export const selectR100StateSnapshotSchema = createSelectSchema(r100StateSnapshots);
export const insertR100StateAuditEventSchema = createInsertSchema(r100StateAuditEvents);
export const selectR100StateAuditEventSchema = createSelectSchema(r100StateAuditEvents);
