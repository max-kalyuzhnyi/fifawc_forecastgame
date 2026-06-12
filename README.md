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

## Two Supabase projects (do not mix)

This repo talks to **two separate Supabase projects** — different databases, different users, different edge function deploys.

| | **Production** | **Staging / local dev** |
|---|---|---|
| Supabase ref | `dlwpiikzuwpvbvnjupmn` (wcbot) | `qgawmjczgfbhwsdpsqly` (fifawc) |
| Used by | Vercel production, `npm run deploy:functions` | `.env.local` for local dev, `npm run deploy:functions:staging` |
| Users | Real players (~13) | Dev / test copy (~26) |

**Rule:** Vercel env vars, cron, vault secrets, and `deploy:functions` → **production only**.  
Staging is for experiments; deploying reminders there does **not** notify production users.

## Setup

### 1. Supabase

1. Use the **staging** project (`qgawmjczgfbhwsdpsqly`) for local dev, or production if you know what you're doing.
2. Copy `.env.example` → `.env.local` and fill in Supabase keys for the project you chose.
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
- `npm run deploy:functions` — deploy edge functions to **production** (`dlwpiikzuwpvbvnjupmn`)
- `npm run deploy:functions:staging` — deploy to **staging** (`qgawmjczgfbhwsdpsqly`)

## Edge functions & cron (production only)

Telegram notifications run via Supabase Edge Functions triggered by `pg_cron`:

| Function | Cron | Purpose |
|----------|------|---------|
| `sync-live-matches` | every 20s | Live scores & events |
| `send-goal-notifications` | every 30s | Goal alerts (opt-in via `notify_goals`) |
| `send-pick-reminders` | `*/5 * * * *` | Missing-pick reminders 3h before kickoff (always sent, ignores `notify_goals`) |

### Deploy pick reminders

**Production Supabase project:** `dlwpiikzuwpvbvnjupmn` (same as Vercel `NEXT_PUBLIC_SUPABASE_URL`).

1. Deploy edge functions:
   ```bash
   npm run deploy:functions
   ```
2. Set edge function secrets on **production** project (Supabase Dashboard → Edge Functions → Secrets):
   - `CRON_SECRET` — same value as in Vault `cron_secret`
   - `TELEGRAM_BOT_TOKEN` — same bot token as Vercel production
   - `MINI_APP_URL` — production Mini App URL
3. Add Vault secret (Dashboard → Project Settings → Vault):
   - `pick_reminders_edge_url` = `https://dlwpiikzuwpvbvnjupmn.supabase.co/functions/v1/send-pick-reminders`
4. Apply migration `supabase/migrations/011_pick_reminders.sql` via SQL editor or `supabase db push`.
