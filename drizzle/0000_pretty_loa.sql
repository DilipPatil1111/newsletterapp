CREATE TYPE "public"."approval_action" AS ENUM('approved', 'changes_requested', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'pending_review', 'changes_requested', 'approved', 'scheduled', 'sending', 'sent', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('active', 'unsubscribed', 'bounced', 'pending_review');--> statement-breakpoint
CREATE TYPE "public"."email_template_category" AS ENUM('announcement', 'course_highlight', 'monthly_digest', 'event_invitation', 'general');--> statement-breakpoint
CREATE TYPE "public"."import_source" AS ENUM('csv', 'excel', 'pdf', 'exa_api', 'manual');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."recipient_status" AS ENUM('pending', 'sent', 'delivered', 'bounced', 'failed');--> statement-breakpoint
CREATE TYPE "public"."schedule_frequency" AS ENUM('once', 'weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."send_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "ab_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"variant_label" varchar(10) NOT NULL,
	"subject_line" varchar(500),
	"content" jsonb,
	"percentage" integer DEFAULT 50 NOT NULL,
	"sent_count" integer DEFAULT 0,
	"open_count" integer DEFAULT 0,
	"click_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(300) DEFAULT 'Intellee College' NOT NULL,
	"logo_url" text,
	"primary_color" varchar(20) DEFAULT '#1E1B4B' NOT NULL,
	"accent_color" varchar(20) DEFAULT '#4338CA' NOT NULL,
	"font_family" varchar(200) DEFAULT 'Georgia, ''Times New Roman'', Times, serif',
	"address" text DEFAULT 'Tech Park, Bangalore, India',
	"phone" varchar(30) DEFAULT '+91 98765 43210',
	"website_url" text DEFAULT 'https://intellee.com',
	"contact_email" varchar(320) DEFAULT 'admissions@intellee.com',
	"social_links" jsonb DEFAULT '[{"label":"LinkedIn","url":"https://linkedin.com/company/intellee"},{"label":"Twitter","url":"https://twitter.com/intellee"},{"label":"Instagram","url":"https://instagram.com/intellee"}]'::jsonb,
	"footer_text" text DEFAULT 'You are receiving this because you expressed interest in Intellee programs.',
	"brand_guidelines" text,
	"created_by" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"reviewer_user_id" varchar(200) NOT NULL,
	"action" "approval_action" NOT NULL,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"subject_line" varchar(500),
	"preview_text" varchar(300),
	"content" jsonb NOT NULL,
	"snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(300) NOT NULL,
	"subject_line" varchar(500),
	"preview_text" varchar(300),
	"template_id" uuid,
	"segment_id" uuid,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"content" jsonb,
	"created_by" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canva_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(250) NOT NULL,
	"description" text,
	"canva_design_url" text,
	"hero_image_url" text,
	"thumbnail_url" text,
	"project_training" varchar(250),
	"target_role" varchar(150),
	"geography" varchar(150),
	"campaign_type" varchar(100),
	"html_content" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "import_source" NOT NULL,
	"status" "import_status" DEFAULT 'pending' NOT NULL,
	"file_name" varchar(500),
	"total_rows" integer DEFAULT 0,
	"imported_rows" integer DEFAULT 0,
	"failed_rows" integer DEFAULT 0,
	"error_log" jsonb,
	"created_by" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"company" varchar(200),
	"role" varchar(150),
	"geography" varchar(150),
	"project_training" varchar(250),
	"status" "contact_status" DEFAULT 'active' NOT NULL,
	"import_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(250) NOT NULL,
	"description" text,
	"category" "email_template_category" DEFAULT 'general' NOT NULL,
	"thumbnail_url" text,
	"template_data" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"frequency" "schedule_frequency" DEFAULT 'once' NOT NULL,
	"days_of_week" jsonb,
	"time_of_day" varchar(10) NOT NULL,
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata' NOT NULL,
	"next_run_at" timestamp,
	"last_run_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"filters" jsonb NOT NULL,
	"estimated_size" integer DEFAULT 0,
	"created_by" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "send_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"schedule_id" uuid,
	"status" "send_job_status" DEFAULT 'pending' NOT NULL,
	"total_recipients" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "send_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"send_job_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"status" "recipient_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" varchar(300),
	"error_message" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppression_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"reason" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suppression_list_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ab_variants" ADD CONSTRAINT "ab_variants_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_approvals" ADD CONSTRAINT "campaign_approvals_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_versions" ADD CONSTRAINT "campaign_versions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_canva_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."canva_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_import_id_contact_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."contact_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "send_jobs" ADD CONSTRAINT "send_jobs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "send_jobs" ADD CONSTRAINT "send_jobs_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "send_recipients" ADD CONSTRAINT "send_recipients_send_job_id_send_jobs_id_fk" FOREIGN KEY ("send_job_id") REFERENCES "public"."send_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "send_recipients" ADD CONSTRAINT "send_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;