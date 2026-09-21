# GolfGive

A subscription-driven web application combining golf performance tracking, charity fundraising, and a monthly draw-based reward engine.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Payments:** Stripe
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Stripe account (test mode)

### Setup

1. Clone and install:

```bash
git clone <repo-url>
cd golf-app
npm install
```

2. Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

3. Run the Supabase migrations in order:

```bash
# Run in Supabase SQL Editor:
# 1. supabase/schema.sql
# 2. supabase/fix_rls_recursion.sql
# 3. supabase/setup.sql (creates exec_sql function for /setup page)
# 4. supabase/storage.sql (creates storage bucket for proof uploads)
```

4. Start the dev server:

```bash
npm run dev
```

5. Visit `/setup` to create the admin account.

6. (Optional) Set up Stripe:
   - Create products & prices in Stripe Dashboard
   - Add price IDs to `.env.local`
   - Create webhook endpoint pointing to `/api/stripe/webhook`
   - Copy webhook signing secret to `.env.local`

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | Create via `/setup` page | Your choice |
| User | Sign up at `/signup` | Your choice |

## Features

### User Panel
- **Score Tracking** — Enter up to 5 Stableford scores (1-45 range)
- **Draw Entry** — Pick 5 numbers for monthly prize draws
- **Charity Selection** — Choose a charity, set contribution (10-50%)
- **Winnings** — Track prizes, upload proof, view payment status
- **Subscription** — Monthly ($9.99) or Yearly ($99) plans via Stripe

### Admin Panel (`/admin`)
- **User Management** — View/edit profiles, scores, subscriptions
- **Draw Management** — Create, simulate, publish, and settle draws
- **Charity Management** — CRUD operations for charity listings
- **Winner Verification** — Approve/reject proof submissions, mark payouts
- **Reports** — Revenue, prize pool, charity impact analytics

### Draw System
- **5-Number Match** — 40% of prize pool (jackpot rollover)
- **4-Number Match** — 35% of prize pool
- **3-Number Match** — 25% of prize pool
- Two draw modes: Random and Algorithmic (weighted by score frequency)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/callback/     # OAuth callback
│   │   ├── draw/              # Draw entry + settle
│   │   ├── seed-admin/        # Admin role promotion
│   │   └── stripe/            # Checkout, webhook, portal
│   ├── admin/                 # Admin dashboard (6 pages)
│   ├── dashboard/             # User dashboard (7 pages)
│   ├── setup/                 # First-time admin setup
│   └── (auth pages)/          # Login, signup, password reset
├── components/                # Reusable UI components
├── lib/
│   ├── stripe/                # Stripe server + client
│   └── supabase/              # Supabase client, server, middleware
└── types/                     # TypeScript database types
```

## Environment Variables

See `.env.local.example` for the full list.

## Deployment

1. Deploy to Vercel
2. Connect to a new Supabase project
3. Run all SQL migrations
4. Configure Stripe webhook URL
5. Set all environment variables
