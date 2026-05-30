CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('CREDIT', 'DEBIT', 'TRANSFER', 'HOLD', 'RELEASE', 'REFUND', 'COMMISSION', 'PAYOUT', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."ledger_source_type" AS ENUM('PAYMENT', 'COMMISSION', 'TASK', 'SUBSCRIPTION', 'MANUAL', 'REFUND');--> statement-breakpoint
CREATE TYPE "public"."payment_attempt_status" AS ENUM('CREATED', 'PENDING', 'APPROVED', 'FAILED', 'EXPIRED', 'REFUNDED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."wallet_status" AS ENUM('ACTIVE', 'SUSPENDED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."webhook_processing_status" AS ENUM('RECEIVED', 'PROCESSED', 'DUPLICATE', 'REJECTED', 'FAILED');--> statement-breakpoint
CREATE TABLE "actor_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"actor_code" text,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"credit_limit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_spent" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_earned" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "wallet_status" DEFAULT 'ACTIVE' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_entry_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"wallet_id" uuid,
	"transaction_id" text,
	"payment_attempt_id" uuid,
	"entry_type" "ledger_entry_type" NOT NULL,
	"source_type" "ledger_source_type" NOT NULL,
	"source_id" text,
	"amount" numeric(14, 2) NOT NULL,
	"balance_after" numeric(14, 2),
	"currency" text DEFAULT 'BRL' NOT NULL,
	"idempotency_key" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" text NOT NULL,
	"actor_id" text,
	"actor_code" text,
	"base_amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"gateway_provider" text DEFAULT 'mercado_pago' NOT NULL,
	"external_reference" text NOT NULL,
	"provider_payment_id" text,
	"description" text,
	"paid_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" text NOT NULL,
	"provider" text DEFAULT 'mercado_pago' NOT NULL,
	"provider_payment_id" text,
	"status" "payment_attempt_status" DEFAULT 'CREATED' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"idempotency_key" text NOT NULL,
	"pix_qr_code" text,
	"pix_qr_code_base64" text,
	"pix_copy_paste" text,
	"ticket_url" text,
	"request_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw_provider_response" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_code" text,
	"error_message" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'mercado_pago' NOT NULL,
	"provider_event_id" text NOT NULL,
	"provider_payment_id" text,
	"event_type" text NOT NULL,
	"action" text,
	"signature" text,
	"idempotency_key" text NOT NULL,
	"processing_status" "webhook_processing_status" DEFAULT 'RECEIVED' NOT NULL,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_wallet_id_actor_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."actor_wallets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_transaction_id_global_transactions_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."global_transactions"("transaction_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_transaction_id_global_transactions_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."global_transactions"("transaction_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "actor_wallets_actor_id_uq" ON "actor_wallets" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "actor_wallets_actor_code_idx" ON "actor_wallets" USING btree ("actor_code");--> statement-breakpoint
CREATE INDEX "actor_wallets_status_idx" ON "actor_wallets" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_ledger_ledger_entry_id_uq" ON "financial_ledger" USING btree ("ledger_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_ledger_idempotency_key_uq" ON "financial_ledger" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "financial_ledger_actor_id_idx" ON "financial_ledger" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "financial_ledger_wallet_id_idx" ON "financial_ledger" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "financial_ledger_transaction_id_idx" ON "financial_ledger" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "financial_ledger_source_idx" ON "financial_ledger" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "financial_ledger_created_at_idx" ON "financial_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "global_transactions_transaction_id_uq" ON "global_transactions" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "global_transactions_external_reference_uq" ON "global_transactions" USING btree ("external_reference");--> statement-breakpoint
CREATE INDEX "global_transactions_actor_id_idx" ON "global_transactions" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "global_transactions_actor_code_idx" ON "global_transactions" USING btree ("actor_code");--> statement-breakpoint
CREATE INDEX "global_transactions_status_idx" ON "global_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "global_transactions_provider_payment_id_idx" ON "global_transactions" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE INDEX "global_transactions_created_at_idx" ON "global_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_idempotency_key_uq" ON "payment_attempts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "payment_attempts_transaction_id_idx" ON "payment_attempts" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_provider_payment_id_idx" ON "payment_attempts" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_status_idx" ON "payment_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_attempts_created_at_idx" ON "payment_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_webhook_events_idempotency_key_uq" ON "payment_webhook_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_webhook_events_provider_event_uq" ON "payment_webhook_events" USING btree ("provider","provider_event_id","event_type");--> statement-breakpoint
CREATE INDEX "payment_webhook_events_provider_payment_id_idx" ON "payment_webhook_events" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE INDEX "payment_webhook_events_processing_status_idx" ON "payment_webhook_events" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "payment_webhook_events_received_at_idx" ON "payment_webhook_events" USING btree ("received_at");