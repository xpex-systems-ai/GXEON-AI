import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const r100StateSnapshots = pgTable(
  "r100_state_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snapshotId: text("snapshot_id").notNull(),
    snapshotMode: text("snapshot_mode").notNull().default("SAFE_REDACTED"),
    source: text("source").notNull().default("R100_DURABLE_STATE_MIRROR_P2"),
    collectionCounts: jsonb("collection_counts").notNull().default(sql`'{}'::jsonb`),
    collections: jsonb("collections").notNull().default(sql`'{}'::jsonb`),
    safety: jsonb("safety").notNull().default(sql`'{}'::jsonb`),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("r100_state_snapshots_snapshot_id_uq").on(table.snapshotId),
    index("r100_state_snapshots_snapshot_mode_idx").on(table.snapshotMode),
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
    source: text("source").notNull().default("R100_DB_MIRROR"),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    safety: jsonb("safety").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("r100_state_audit_events_event_id_uq").on(table.eventId),
    index("r100_state_audit_events_event_type_idx").on(table.eventType),
    index("r100_state_audit_events_source_idx").on(table.source),
    index("r100_state_audit_events_created_at_idx").on(table.createdAt),
  ],
);

export const insertR100StateSnapshotSchema = createInsertSchema(r100StateSnapshots);
export const selectR100StateSnapshotSchema = createSelectSchema(r100StateSnapshots);
export const insertR100StateAuditEventSchema = createInsertSchema(r100StateAuditEvents);
export const selectR100StateAuditEventSchema = createSelectSchema(r100StateAuditEvents);
