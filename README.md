# Intellee Newsletter App

A full-featured newsletter management platform for Intellee College. Import contacts, segment audiences, design with Canva templates, and schedule automated newsletter delivery.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS v4
- **Auth**: Clerk
- **Database**: Neon (PostgreSQL) + Drizzle ORM
- **Email**: Resend
- **Contact Discovery**: Exa API
- **Design**: Canva template integration
- **Scheduling**: Vercel Cron

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `CLERK_SECRET_KEY` — Clerk secret key
- `RESEND_API_KEY` — Resend email API key
- `RESEND_FROM_EMAIL` — Verified sender email
- `NEXT_PUBLIC_APP_URL` — Your app URL
- `CRON_SECRET` — Secret for cron job authorization
- `EXA_API_KEY` — (Optional) Exa API key for contact discovery

### 3. Push database schema

```bash
npm run db:push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

### Contact Management
- Import contacts from Excel/CSV files
- Extract emails from PDF documents
- Discover contacts via Exa AI search API
- Deduplicate and validate email addresses
- Manual contact creation

### Audience Segmentation
- Filter by project/training, role, geography
- Save reusable segments
- Real-time audience size estimation

### Canva Template Library
- Store Canva design URLs and exported assets
- Map templates to project, role, and geography
- Use templates in campaign composition

### Campaign Composition
- Structured newsletter builder (subject, intro, highlights, CTA)
- Select audience segment and Canva template
- Email preview rendering
- Version history for each campaign

### Review & Approval
- Submit campaigns for review
- Approve or request changes with comments
- Full approval audit trail
- Only approved campaigns can be sent

### Scheduling & Sending
- One-time or recurring schedules (weekly, biweekly, monthly)
- Select days of week and time of day
- Timezone support (default: Asia/Kolkata)
- Automated sending via Vercel Cron
- Test send to verify before going live

### Reporting
- Delivery metrics: sent, failed, delivery rate
- Send job history
- Per-recipient tracking

### Compliance
- Unsubscribe page for recipients
- Suppression list management
- Automatic unsubscribe enforcement

## Database Commands

```bash
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations
npm run db:push      # Push schema directly to database
npm run db:studio    # Open Drizzle Studio
```

## Deployment

Deploy to Vercel for automatic Cron support:

```bash
vercel
```

The `vercel.json` configures a cron job to run every 5 minutes at `/api/cron/send` for schedule processing.
