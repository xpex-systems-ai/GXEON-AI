import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const transactionStatus = pgEnum("transaction_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELED",
  "EXPIRED",
  "REFUNDED",
]);

export const paymentAttemptStatus = pgEnum("payment_attempt_status", [
  "CREATED",
  "PENDING",
  "APPROVED",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
  "CANCELED",
]);

export const walletStatus = pgEnum("wallet_status", [
  "ACTIVE",
  "SUSPENDED",
  "CLOSED",
]);

export const ledgerEntryType = pgEnum("ledger_entry_type", [
  "CREDIT",
  "DEBIT",
  "TRANSFER",
  "HOLD",
  "RELEASE",
  "REFUND",
  "COMMISSION",
  "PAYOUT",
  "ADJUSTMENT",
]);

export const ledgerSourceType = pgEnum("ledger_source_type", [
  "PAYMENT",
  "COMMISSION",
  "TASK",
  "SUBSCRIPTION",
  "MANUAL",
  "REFUND",
]);

export const webhookProcessingStatus = pgEnum("webhook_processing_status", [
  "RECEIVED",
  "PROCESSED",
  "DUPLICATE",
  "REJECTED",
  "FAILED",
]);

export const actorWallets = pgTable(
  "actor_wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").notNull(),
    actorCode: text("actor_code"),
    currency: text("currency").notNull().default("BRL"),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
    creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }).notNull().default("0"),
    totalSpent: numeric("total_spent", { precision: 14, scale: 2 }).notNull().default("0"),
    totalEarned: numeric("total_earned", { precision: 14, scale: 2 }).notNull().default("0"),
    status: walletStatus("status").notNull().default("ACTIVE"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("actor_wallets_actor_id_uq").on(table.actorId),
    index("actor_wallets_actor_code_idx").on(table.actorCode),
    index("actor_wallets_status_idx").on(table.status),
  ],
);

export const globalTransactions = pgTable(
  "global_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: text("transaction_id").notNull(),
    actorId: text("actor_id"),
    actorCode: text("actor_code"),
    baseAmount: numeric("base_amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("BRL"),
    status: transactionStatus("status").notNull().default("PENDING"),
    gatewayProvider: text("gateway_provider").notNull().default("mercado_pago"),
    externalReference: text("external_reference").notNull(),
    providerPaymentId: text("provider_payment_id"),
    description: text("description"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("global_transactions_transaction_id_uq").on(table.transactionId),
    uniqueIndex("global_transactions_external_reference_uq").on(table.externalReference),
    index("global_transactions_actor_id_idx").on(table.actorId),
    index("global_transactions_actor_code_idx").on(table.actorCode),
    index("global_transactions_status_idx").on(table.status),
    index("global_transactions_provider_payment_id_idx").on(table.providerPaymentId),
    index("global_transactions_created_at_idx").on(table.createdAt),
  ],
);

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => globalTransactions.transactionId, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("mercado_pago"),
    providerPaymentId: text("provider_payment_id"),
    status: paymentAttemptStatus("status").notNull().default("CREATED"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("BRL"),
    idempotencyKey: text("idempotency_key").notNull(),
    pixQrCode: text("pix_qr_code"),
    pixQrCodeBase64: text("pix_qr_code_base64"),
    pixCopyPaste: text("pix_copy_paste"),
    ticketUrl: text("ticket_url"),
    requestPayload: jsonb("request_payload").notNull().default(sql`'{}'::jsonb`),
    rawProviderResponse: jsonb("raw_provider_response").notNull().default(sql`'{}'::jsonb`),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_attempts_idempotency_key_uq").on(table.idempotencyKey),
    index("payment_attempts_transaction_id_idx").on(table.transactionId),
    index("payment_attempts_provider_payment_id_idx").on(table.providerPaymentId),
    index("payment_attempts_status_idx").on(table.status),
    index("payment_attempts_created_at_idx").on(table.createdAt),
  ],
);

export const financialLedger = pgTable(
  "financial_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerEntryId: text("ledger_entry_id").notNull(),
    actorId: text("actor_id").notNull(),
    walletId: uuid("wallet_id").references(() => actorWallets.id, { onDelete: "set null" }),
    transactionId: text("transaction_id").references(() => globalTransactions.transactionId, { onDelete: "set null" }),
    paymentAttemptId: uuid("payment_attempt_id").references(() => paymentAttempts.id, { onDelete: "set null" }),
    entryType: ledgerEntryType("entry_type").notNull(),
    sourceType: ledgerSourceType("source_type").notNull(),
    sourceId: text("source_id"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("BRL"),
    idempotencyKey: text("idempotency_key").notNull(),
    description: text("description"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("financial_ledger_ledger_entry_id_uq").on(table.ledgerEntryId),
    uniqueIndex("financial_ledger_idempotency_key_uq").on(table.idempotencyKey),
    index("financial_ledger_actor_id_idx").on(table.actorId),
    index("financial_ledger_wallet_id_idx").on(table.walletId),
    index("financial_ledger_transaction_id_idx").on(table.transactionId),
    index("financial_ledger_source_idx").on(table.sourceType, table.sourceId),
    index("financial_ledger_created_at_idx").on(table.createdAt),
  ],
);

export const paymentWebhookEvents = pgTable(
  "payment_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull().default("mercado_pago"),
    providerEventId: text("provider_event_id").notNull(),
    providerPaymentId: text("provider_payment_id"),
    eventType: text("event_type").notNull(),
    action: text("action"),
    signature: text("signature"),
    idempotencyKey: text("idempotency_key").notNull(),
    processingStatus: webhookProcessingStatus("processing_status").notNull().default("RECEIVED"),
    rawPayload: jsonb("raw_payload").notNull().default(sql`'{}'::jsonb`),
    normalizedPayload: jsonb("normalized_payload").notNull().default(sql`'{}'::jsonb`),
    errorMessage: text("error_message"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("payment_webhook_events_idempotency_key_uq").on(table.idempotencyKey),
    uniqueIndex("payment_webhook_events_provider_event_uq").on(
      table.provider,
      table.providerEventId,
      table.eventType,
    ),
    index("payment_webhook_events_provider_payment_id_idx").on(table.providerPaymentId),
    index("payment_webhook_events_processing_status_idx").on(table.processingStatus),
    index("payment_webhook_events_received_at_idx").on(table.receivedAt),
  ],
);

export const insertActorWalletSchema = createInsertSchema(actorWallets);
export const selectActorWalletSchema = createSelectSchema(actorWallets);
export const insertGlobalTransactionSchema = createInsertSchema(globalTransactions);
export const selectGlobalTransactionSchema = createSelectSchema(globalTransactions);
export const insertPaymentAttemptSchema = createInsertSchema(paymentAttempts);
export const selectPaymentAttemptSchema = createSelectSchema(paymentAttempts);
export const insertFinancialLedgerSchema = createInsertSchema(financialLedger);
export const selectFinancialLedgerSchema = createSelectSchema(financialLedger);
export const insertPaymentWebhookEventSchema = createInsertSchema(paymentWebhookEvents);
export const selectPaymentWebhookEventSchema = createSelectSchema(paymentWebhookEvents);

export type ActorWallet = typeof actorWallets.$inferSelect;
export type NewActorWallet = typeof actorWallets.$inferInsert;
export type GlobalTransaction = typeof globalTransactions.$inferSelect;
export type NewGlobalTransaction = typeof globalTransactions.$inferInsert;
export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type NewPaymentAttempt = typeof paymentAttempts.$inferInsert;
export type FinancialLedgerEntry = typeof financialLedger.$inferSelect;
export type NewFinancialLedgerEntry = typeof financialLedger.$inferInsert;
export type PaymentWebhookEvent = typeof paymentWebhookEvents.$inferSelect;
export type NewPaymentWebhookEvent = typeof paymentWebhookEvents.$inferInsert;
