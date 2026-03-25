-- Businesses table (was in schema.ts but never migrated)
CREATE TABLE IF NOT EXISTS "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(300) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"field_label_1" varchar(120) NOT NULL,
	"field_label_2" varchar(120) NOT NULL,
	"placeholder_1" varchar(400),
	"placeholder_2" varchar(400),
	"default_address" text,
	"default_phone" varchar(50),
	"default_website_url" text,
	"default_contact_email" varchar(320),
	"generate_prompt_context" text NOT NULL,
	"created_by" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
-- brand_settings: columns present in schema.ts but missing from 0000/0001
ALTER TABLE "brand_settings" ADD COLUMN IF NOT EXISTS "header_background_color" varchar(20) DEFAULT '#1E1B4B' NOT NULL;
--> statement-breakpoint
ALTER TABLE "brand_settings" ADD COLUMN IF NOT EXISTS "newsletter_page_background" varchar(20) DEFAULT '#F3F4F6' NOT NULL;
--> statement-breakpoint
ALTER TABLE "brand_settings" ADD COLUMN IF NOT EXISTS "newsletter_card_background" varchar(20) DEFAULT '#ffffff' NOT NULL;
--> statement-breakpoint
ALTER TABLE "brand_settings" ADD COLUMN IF NOT EXISTS "newsletter_text_color" varchar(20) DEFAULT '#374151' NOT NULL;
--> statement-breakpoint
ALTER TABLE "brand_settings" ADD COLUMN IF NOT EXISTS "newsletter_link_color" varchar(20) DEFAULT '#4338CA' NOT NULL;
