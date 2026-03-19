import {
  pgTable,
  text,
  uuid,
  timestamp,
  varchar,
  integer,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const contactStatusEnum = pgEnum("contact_status", [
  "active",
  "unsubscribed",
  "bounced",
  "pending_review",
]);

export const importSourceEnum = pgEnum("import_source", [
  "csv",
  "excel",
  "pdf",
  "exa_api",
  "manual",
]);

export const importStatusEnum = pgEnum("import_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
  "scheduled",
  "sending",
  "sent",
  "cancelled",
]);

export const approvalActionEnum = pgEnum("approval_action", [
  "approved",
  "changes_requested",
  "rejected",
]);

export const sendJobStatusEnum = pgEnum("send_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const recipientStatusEnum = pgEnum("recipient_status", [
  "pending",
  "sent",
  "delivered",
  "bounced",
  "failed",
]);

export const scheduleFrequencyEnum = pgEnum("schedule_frequency", [
  "once",
  "weekly",
  "biweekly",
  "monthly",
]);

// ─── Contacts ───────────────────────────────────────────────

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  company: varchar("company", { length: 200 }),
  role: varchar("role", { length: 150 }),
  geography: varchar("geography", { length: 150 }),
  projectTraining: varchar("project_training", { length: 250 }),
  status: contactStatusEnum("status").default("active").notNull(),
  importId: uuid("import_id").references(() => contactImports.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  import: one(contactImports, {
    fields: [contacts.importId],
    references: [contactImports.id],
  }),
  sendRecipients: many(sendRecipients),
}));

// ─── Contact Imports ────────────────────────────────────────

export const contactImports = pgTable("contact_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: importSourceEnum("source").notNull(),
  status: importStatusEnum("status").default("pending").notNull(),
  fileName: varchar("file_name", { length: 500 }),
  totalRows: integer("total_rows").default(0),
  importedRows: integer("imported_rows").default(0),
  failedRows: integer("failed_rows").default(0),
  errorLog: jsonb("error_log"),
  createdBy: varchar("created_by", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contactImportsRelations = relations(contactImports, ({ many }) => ({
  contacts: many(contacts),
}));

// ─── Segments ───────────────────────────────────────────────

export const segments = pgTable("segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  filters: jsonb("filters").notNull(),
  estimatedSize: integer("estimated_size").default(0),
  createdBy: varchar("created_by", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const segmentsRelations = relations(segments, ({ many }) => ({
  campaigns: many(campaigns),
}));

// ─── Canva Templates ────────────────────────────────────────

export const canvaTemplates = pgTable("canva_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 250 }).notNull(),
  description: text("description"),
  canvaDesignUrl: text("canva_design_url"),
  heroImageUrl: text("hero_image_url"),
  thumbnailUrl: text("thumbnail_url"),
  projectTraining: varchar("project_training", { length: 250 }),
  targetRole: varchar("target_role", { length: 150 }),
  geography: varchar("geography", { length: 150 }),
  campaignType: varchar("campaign_type", { length: 100 }),
  htmlContent: text("html_content"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const canvaTemplatesRelations = relations(canvaTemplates, ({ many }) => ({
  campaigns: many(campaigns),
}));

// ─── Campaigns ──────────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 300 }).notNull(),
  subjectLine: varchar("subject_line", { length: 500 }),
  previewText: varchar("preview_text", { length: 300 }),
  templateId: uuid("template_id").references(() => canvaTemplates.id),
  segmentId: uuid("segment_id").references(() => segments.id),
  status: campaignStatusEnum("status").default("draft").notNull(),
  content: jsonb("content"),
  createdBy: varchar("created_by", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  template: one(canvaTemplates, {
    fields: [campaigns.templateId],
    references: [canvaTemplates.id],
  }),
  segment: one(segments, {
    fields: [campaigns.segmentId],
    references: [segments.id],
  }),
  versions: many(campaignVersions),
  approvals: many(campaignApprovals),
  schedules: many(schedules),
  sendJobs: many(sendJobs),
}));

// ─── Campaign Versions ──────────────────────────────────────

export const campaignVersions = pgTable("campaign_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  version: integer("version").notNull(),
  subjectLine: varchar("subject_line", { length: 500 }),
  previewText: varchar("preview_text", { length: 300 }),
  content: jsonb("content").notNull(),
  snapshot: jsonb("snapshot"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const campaignVersionsRelations = relations(campaignVersions, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignVersions.campaignId],
    references: [campaigns.id],
  }),
}));

// ─── Campaign Approvals ─────────────────────────────────────

export const campaignApprovals = pgTable("campaign_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  reviewerUserId: varchar("reviewer_user_id", { length: 200 }).notNull(),
  action: approvalActionEnum("action").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const campaignApprovalsRelations = relations(campaignApprovals, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignApprovals.campaignId],
    references: [campaigns.id],
  }),
}));

// ─── Schedules ──────────────────────────────────────────────

export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  frequency: scheduleFrequencyEnum("frequency").default("once").notNull(),
  daysOfWeek: jsonb("days_of_week"),
  timeOfDay: varchar("time_of_day", { length: 10 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Kolkata").notNull(),
  nextRunAt: timestamp("next_run_at"),
  lastRunAt: timestamp("last_run_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [schedules.campaignId],
    references: [campaigns.id],
  }),
  sendJobs: many(sendJobs),
}));

// ─── Send Jobs ──────────────────────────────────────────────

export const sendJobs = pgTable("send_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  scheduleId: uuid("schedule_id").references(() => schedules.id),
  status: sendJobStatusEnum("status").default("pending").notNull(),
  totalRecipients: integer("total_recipients").default(0),
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sendJobsRelations = relations(sendJobs, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [sendJobs.campaignId],
    references: [campaigns.id],
  }),
  schedule: one(schedules, {
    fields: [sendJobs.scheduleId],
    references: [schedules.id],
  }),
  recipients: many(sendRecipients),
}));

// ─── Send Recipients ────────────────────────────────────────

export const sendRecipients = pgTable("send_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  sendJobId: uuid("send_job_id")
    .references(() => sendJobs.id)
    .notNull(),
  contactId: uuid("contact_id")
    .references(() => contacts.id)
    .notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  status: recipientStatusEnum("status").default("pending").notNull(),
  providerMessageId: varchar("provider_message_id", { length: 300 }),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sendRecipientsRelations = relations(sendRecipients, ({ one }) => ({
  sendJob: one(sendJobs, {
    fields: [sendRecipients.sendJobId],
    references: [sendJobs.id],
  }),
  contact: one(contacts, {
    fields: [sendRecipients.contactId],
    references: [contacts.id],
  }),
}));

// ─── Suppression List ───────────────────────────────────────

export const suppressionList = pgTable("suppression_list", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  reason: varchar("reason", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Brand Settings ─────────────────────────────────────────

export const brandSettings = pgTable("brand_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessSlug: varchar("business_slug", { length: 100 }).default("intellee_college"),
  companyName: varchar("company_name", { length: 300 }).default("Intellee College").notNull(),
  logoUrl: text("logo_url"),
  brandLibraryUrls: jsonb("brand_library_urls").default([]),
  primaryColor: varchar("primary_color", { length: 20 }).default("#1E1B4B").notNull(),
  accentColor: varchar("accent_color", { length: 20 }).default("#4338CA").notNull(),
  fontFamily: varchar("font_family", { length: 200 }).default("Georgia, 'Times New Roman', Times, serif"),
  address: text("address").default("Tech Park, Bangalore, India"),
  phone: varchar("phone", { length: 30 }).default("+91 98765 43210"),
  websiteUrl: text("website_url").default("https://intellee.com"),
  contactEmail: varchar("contact_email", { length: 320 }).default("admissions@intellee.com"),
  socialLinks: jsonb("social_links").default([
    { label: "LinkedIn", url: "https://linkedin.com/company/intellee" },
    { label: "Twitter", url: "https://twitter.com/intellee" },
    { label: "Instagram", url: "https://instagram.com/intellee" },
  ]),
  footerText: text("footer_text").default("You are receiving this because you expressed interest in Intellee programs."),
  brandGuidelines: text("brand_guidelines"),
  createdBy: varchar("created_by", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Email Templates ────────────────────────────────────────

export const emailTemplateCategoryEnum = pgEnum("email_template_category", [
  "announcement",
  "course_highlight",
  "monthly_digest",
  "event_invitation",
  "general",
]);

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 250 }).notNull(),
  description: text("description"),
  category: emailTemplateCategoryEnum("category").default("general").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  templateData: jsonb("template_data").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── A/B Test Variants ──────────────────────────────────────

export const abVariants = pgTable("ab_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  variantLabel: varchar("variant_label", { length: 10 }).notNull(),
  subjectLine: varchar("subject_line", { length: 500 }),
  content: jsonb("content"),
  percentage: integer("percentage").default(50).notNull(),
  sentCount: integer("sent_count").default(0),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const abVariantsRelations = relations(abVariants, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [abVariants.campaignId],
    references: [campaigns.id],
  }),
}));

// ─── Type exports ───────────────────────────────────────────

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ContactImport = typeof contactImports.$inferSelect;
export type Segment = typeof segments.$inferSelect;
export type CanvaTemplate = typeof canvaTemplates.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignVersion = typeof campaignVersions.$inferSelect;
export type CampaignApproval = typeof campaignApprovals.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type SendJob = typeof sendJobs.$inferSelect;
export type SendRecipient = typeof sendRecipients.$inferSelect;
export type BrandSettings = typeof brandSettings.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type AbVariant = typeof abVariants.$inferSelect;
