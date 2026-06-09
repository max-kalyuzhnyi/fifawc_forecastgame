# WC 2026 Forecast Game

Private forecasting competition for FIFA World Cup 2026 — Telegram Mini App.

## Scoring

- **3 pts** — exact score
- **2 pts** — correct goal difference
- **1 pt** — correct result (win/draw)
- **+3 pts** — correct goalscorer pick
- **x2 / x3 boost** — one of each per round (group round 1/2/3 + each knockout round)

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Telegram Mini App auth + Supabase Postgres + RLS

## Setup

### 1. Supabase

1. Create a Supabase project.
2. Copy `.env.example` → `.env.local` and fill in Supabase keys.
3. Run migrations in order via Supabase SQL editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_telegram_auth.sql`
4. Import the schedule:

```bash
npm run import:schedule
```

### 2. Telegram Bot & Mini App

1. Open [@BotFather](https://t.me/BotFather) → `/newbot` → save the **bot token**.
2. Set the Mini App URL:
   - `/newapp` (or Bot Settings → Menu Button → Configure menu button)
   - **Production:** `https://fifawc-forecastgame.vercel.app`
   - **Local dev:** use a tunnel (`cloudflared tunnel --url http://localhost:1355` or ngrok) and paste the HTTPS URL
3. Add to `.env.local` (and Vercel env vars for production):
   - `TELEGRAM_BOT_TOKEN` — from BotFather
   - `TELEGRAM_AUTH_PEPPER` — random secret: `openssl rand -hex 32`

### 3. Admin access

After your first Telegram login, promote yourself to admin (replace UUID from `profiles` table):

```sql
insert into admin_users (user_id) values ('your-auth-user-uuid');
```

### 4. Run

```bash
npm run dev
```

Open the bot in Telegram and launch the Mini App — browser-only access shows a "Open inside Telegram" message.

## Scripts

- `npm run dev` — development server
- `npm run import:schedule` — fetch OpenFootball WC 2026 fixtures
- `npm test` — unit tests for scoring logic
