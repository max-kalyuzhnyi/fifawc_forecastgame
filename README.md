# WC 2026 Forecast Game

Private forecasting competition for FIFA World Cup 2026.

## Scoring

- **3 pts** — exact score
- **2 pts** — correct goal difference
- **1 pt** — correct result (win/draw)
- **+3 pts** — correct goalscorer pick
- **x2 / x3 boost** — one of each per round (group round 1/2/3 + each knockout round)

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Supabase Auth + Postgres + RLS

## Setup

1. Create a Supabase project and enable Email auth.
2. Copy `.env.example` → `.env.local` and fill in keys.
3. Run the migration in `supabase/migrations/001_initial_schema.sql` via Supabase SQL editor.
4. Import the schedule:

```bash
npm run import:schedule
```

5. Promote yourself to admin (replace UUID):

```sql
insert into admin_users (user_id) values ('your-auth-user-uuid');
```

6. Start dev server:

```bash
npm run dev
```

## Scripts

- `npm run dev` — development server
- `npm run import:schedule` — fetch OpenFootball WC 2026 fixtures
- `npm test` — unit tests for scoring logic
