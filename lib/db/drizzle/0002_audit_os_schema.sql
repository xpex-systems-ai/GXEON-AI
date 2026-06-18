CREATE TYPE "public"."audit_asset_type" AS ENUM('WEBSITE', 'ECOMMERCE', 'LANDING_PAGE', 'GITHUB_REPOSITORY', 'CODEBASE', 'SUPABASE_PROJECT', 'DEPLOYMENT', 'API_BACKEND', 'BUSINESS_FUNNEL', 'CONTENT_PAGE', 'OTHER');
--> statement-breakpoint
CREATE TYPE "public"."audit_case_status" AS ENUM('DRAFT', 'OPEN', 'IN_REVIEW', 'READY_FOR_REPORT', 'REPORTED', 'CLOSED', 'ARCHIVED');
--> statement-breakpoint
CREATE TYPE "public"."audit_connector_status" AS ENUM('NOT_CONFIGURED', 'DEGRADED_SAFE', 'READY_READ_ONLY', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DISABLED');
--> statement-breakpoint
CREATE TYPE "public"."audit_evidence_type" AS ENUM('URL', 'SCREENSHOT', 'LOG_EXCERPT', 'REPOSITORY_REFERENCE', 'SCHEMA_REFERENCE', 'REDACTED_CONFIG', 'WORKFLOW_REFERENCE', 'OPERATOR_NOTE', 'OTHER');
--> statement-breakpoint
CREATE TYPE "public"."audit_module_key" AS ENUM('website_audit', 'ecommerce_audit', 'ux_checkout_audit', 'seo_basic_audit', 'tracking_pixel_audit', 'security_basic_audit', 'github_repository_audit', 'codebase_audit', 'supabase_database_audit', 'deployment_audit', 'api_backend_audit', 'ai_automation_audit', 'business_offer_audit', 'funnel_audit', 'content_landing_page_audit');
--> statement-breakpoint
CREATE TYPE "public"."audit_proposal_status" AS ENUM('DRAFT', 'READY_FOR_OPERATOR', 'SENT_MANUALLY', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');
--> statement-breakpoint
CREATE TYPE "public"."audit_report_type" AS ENUM('INTERNAL_BRIEF', 'CLIENT_SUMMARY', 'TECHNICAL_REPORT', 'PROPOSAL_BRIEF', 'EXECUTION_PLAN');
--> statement-breakpoint
CREATE TYPE "public"."audit_revenue_status" AS ENUM('ESTIMATED', 'PROPOSED', 'ACCEPTED', 'PAID', 'LOST', 'REFUNDED', 'CANCELLED');
--> statement-breakpoint
CREATE TYPE "public"."audit_severity" AS ENUM('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
--> statement-breakpoint
CREATE TYPE "public"."audit_task_status" AS ENUM('BACKLOG', 'READY', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');
--> statement-breakpoint
CREATE TABLE "audit_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"type" "audit_asset_type" NOT NULL,
	"label" text NOT NULL,
	"reference_url" text,
	"external_reference" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"asset_id" uuid,
	"title" text NOT NULL,
	"status" "audit_case_status" DEFAULT 'DRAFT' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"label" text NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"external_reference" text,
	"contact_reference" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_connector_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"connector_key" text NOT NULL,
	"status" "audit_connector_status" DEFAULT 'NOT_CONFIGURED' NOT NULL,
	"read_only" boolean DEFAULT true NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_evidences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"finding_id" uuid,
	"type" "audit_evidence_type" NOT NULL,
	"title" text NOT NULL,
	"reference_url" text,
	"redacted_text" text,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"module_key" "audit_module_key",
	"title" text NOT NULL,
	"severity" "audit_severity" DEFAULT 'MEDIUM' NOT NULL,
	"summary" text NOT NULL,
	"recommendation" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" "audit_module_key" NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"default_weight" integer DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"safe_mode" boolean DEFAULT true NOT NULL,
	"checklist_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_evidence_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_operator_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"finding_id" uuid,
	"note" text NOT NULL,
	"operator_reference" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"task_id" uuid,
	"title" text NOT NULL,
	"status" "audit_proposal_status" DEFAULT 'DRAFT' NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"amount" numeric(14, 2),
	"manual_delivery_reference" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"type" "audit_report_type" NOT NULL,
	"title" text NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_by" text DEFAULT 'operator' NOT NULL,
	"published_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_revenue_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid,
	"case_id" uuid,
	"status" "audit_revenue_status" NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"external_proof_reference" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"module_key" "audit_module_key",
	"score" numeric(5, 2) NOT NULL,
	"max_score" numeric(5, 2) DEFAULT '100' NOT NULL,
	"rationale" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"finding_id" uuid,
	"title" text NOT NULL,
	"status" "audit_task_status" DEFAULT 'BACKLOG' NOT NULL,
	"owner_reference" text,
	"due_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_assets" ADD CONSTRAINT "audit_assets_client_id_audit_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."audit_clients"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_cases" ADD CONSTRAINT "audit_cases_client_id_audit_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."audit_clients"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_cases" ADD CONSTRAINT "audit_cases_asset_id_audit_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."audit_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_checklists" ADD CONSTRAINT "audit_checklists_module_id_audit_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."audit_modules"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_connector_runs" ADD CONSTRAINT "audit_connector_runs_case_id_audit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."audit_cases"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_evidences" ADD CONSTRAINT "audit_evidences_case_id_audit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."audit_cases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_evidences" ADD CONSTRAINT "audit_evidences_finding_id_audit_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."audit_findings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_case_id_audit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."audit_cases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_operator_notes" ADD CONSTRAINT "audit_operator_notes_case_id_audit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."audit_cases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_operator_notes" ADD CONSTRAINT "audit_operator_notes_finding_id_audit_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."audit_findings"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_proposals" ADD CONSTRAINT "audit_proposals_case_id_audit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."audit_cases"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_proposals" ADD CONSTRAINT "audit_proposals_task_id_audit_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."audit_tasks"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_case_id_audit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."audit_cases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_revenue_events" ADD CONSTRAINT "audit_revenue_events_proposal_id_audit_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."audit_proposals"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_revenue_events" ADD CONSTRAINT "audit_revenue_events_case_id_audit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."audit_cases"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_scores" ADD CONSTRAINT "audit_scores_case_id_audit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."audit_cases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_tasks" ADD CONSTRAINT "audit_tasks_case_id_audit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."audit_cases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_tasks" ADD CONSTRAINT "audit_tasks_finding_id_audit_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."audit_findings"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "audit_assets_client_id_idx" ON "audit_assets" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "audit_assets_type_idx" ON "audit_assets" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "audit_assets_reference_url_idx" ON "audit_assets" USING btree ("reference_url");
--> statement-breakpoint
CREATE INDEX "audit_cases_client_id_idx" ON "audit_cases" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "audit_cases_asset_id_idx" ON "audit_cases" USING btree ("asset_id");
--> statement-breakpoint
CREATE INDEX "audit_cases_status_idx" ON "audit_cases" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "audit_cases_opened_at_idx" ON "audit_cases" USING btree ("opened_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "audit_checklists_module_item_uq" ON "audit_checklists" USING btree ("module_id","item_key");
--> statement-breakpoint
CREATE INDEX "audit_checklists_module_id_idx" ON "audit_checklists" USING btree ("module_id");
--> statement-breakpoint
CREATE INDEX "audit_clients_display_name_idx" ON "audit_clients" USING btree ("display_name");
--> statement-breakpoint
CREATE INDEX "audit_clients_external_reference_idx" ON "audit_clients" USING btree ("external_reference");
--> statement-breakpoint
CREATE INDEX "audit_connector_runs_case_id_idx" ON "audit_connector_runs" USING btree ("case_id");
--> statement-breakpoint
CREATE INDEX "audit_connector_runs_connector_key_idx" ON "audit_connector_runs" USING btree ("connector_key");
--> statement-breakpoint
CREATE INDEX "audit_connector_runs_status_idx" ON "audit_connector_runs" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "audit_evidences_case_id_idx" ON "audit_evidences" USING btree ("case_id");
--> statement-breakpoint
CREATE INDEX "audit_evidences_finding_id_idx" ON "audit_evidences" USING btree ("finding_id");
--> statement-breakpoint
CREATE INDEX "audit_evidences_type_idx" ON "audit_evidences" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "audit_findings_case_id_idx" ON "audit_findings" USING btree ("case_id");
--> statement-breakpoint
CREATE INDEX "audit_findings_module_key_idx" ON "audit_findings" USING btree ("module_key");
--> statement-breakpoint
CREATE INDEX "audit_findings_severity_idx" ON "audit_findings" USING btree ("severity");
--> statement-breakpoint
CREATE UNIQUE INDEX "audit_modules_key_uq" ON "audit_modules" USING btree ("key");
--> statement-breakpoint
CREATE INDEX "audit_modules_enabled_idx" ON "audit_modules" USING btree ("enabled");
--> statement-breakpoint
CREATE INDEX "audit_modules_category_idx" ON "audit_modules" USING btree ("category");
--> statement-breakpoint
CREATE INDEX "audit_operator_notes_case_id_idx" ON "audit_operator_notes" USING btree ("case_id");
--> statement-breakpoint
CREATE INDEX "audit_operator_notes_finding_id_idx" ON "audit_operator_notes" USING btree ("finding_id");
--> statement-breakpoint
CREATE INDEX "audit_proposals_case_id_idx" ON "audit_proposals" USING btree ("case_id");
--> statement-breakpoint
CREATE INDEX "audit_proposals_task_id_idx" ON "audit_proposals" USING btree ("task_id");
--> statement-breakpoint
CREATE INDEX "audit_proposals_status_idx" ON "audit_proposals" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "audit_reports_case_id_idx" ON "audit_reports" USING btree ("case_id");
--> statement-breakpoint
CREATE INDEX "audit_reports_type_idx" ON "audit_reports" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "audit_revenue_events_proposal_id_idx" ON "audit_revenue_events" USING btree ("proposal_id");
--> statement-breakpoint
CREATE INDEX "audit_revenue_events_case_id_idx" ON "audit_revenue_events" USING btree ("case_id");
--> statement-breakpoint
CREATE INDEX "audit_revenue_events_status_idx" ON "audit_revenue_events" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "audit_scores_case_id_idx" ON "audit_scores" USING btree ("case_id");
--> statement-breakpoint
CREATE INDEX "audit_scores_module_key_idx" ON "audit_scores" USING btree ("module_key");
--> statement-breakpoint
CREATE INDEX "audit_tasks_case_id_idx" ON "audit_tasks" USING btree ("case_id");
--> statement-breakpoint
CREATE INDEX "audit_tasks_finding_id_idx" ON "audit_tasks" USING btree ("finding_id");
--> statement-breakpoint
CREATE INDEX "audit_tasks_status_idx" ON "audit_tasks" USING btree ("status");
--> statement-breakpoint
