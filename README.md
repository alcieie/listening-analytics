# Listening Analytics

A personal Spotify listening-analytics app. Next.js (App Router) +
TypeScript + Tailwind, with Supabase Postgres for storage.

- **Heatmap** — a GitHub-contributions-style year of listening, with your
  current and longest streaks and listening records above it. Click a day
  to see every track you played that day.
- **On repeat** — songs you played 5+ times in a week, what's on heavy
  rotation now, and how long past obsessions lasted before you dropped them.
- **New vs. familiar** — week by week, how much of your listening went to
  artists you'd never played before.

## How auth works here (read this before you dig into the code)

This app does **not** use Supabase Auth. Instead it implements Spotify OAuth
(Authorization Code + PKCE) directly in Next.js route handlers
(`app/api/auth/spotify/*`), because the background poller needs a valid
Spotify token even when nobody's browser is open, and Supabase Auth's
handling of third-party provider refresh tokens isn't reliable for that. A
signed, httpOnly cookie (`SESSION_SECRET`-backed HMAC) marks a browser as
"the owner." Supabase is used purely as Postgres storage, accessed only
server-side with the service-role key — the browser never talks to Supabase
directly, and every table has Row Level Security enabled with zero
anon/authenticated grants (default-deny) as defense in depth.

This is a **single-owner-per-deployment** design: one Spotify identity per
running instance, not a multi-tenant product. If you want your own
dashboard, you self-host your own instance (see below) rather than logging
into someone else's.

## Setup

1. **Create a Spotify Developer app** at
   [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
   Add a Redirect URI matching `SPOTIFY_REDIRECT_URI` below (e.g.
   `http://127.0.0.1:3000/api/auth/spotify/callback` for local dev). As the
   app owner you're automatically allowed to log in under Development Mode —
   no review or extra allowlisting needed for personal use.

2. **Create a Supabase project** at [supabase.com](https://supabase.com),
   then run the migrations in `supabase/migrations/` against it, in order
   (via the SQL editor, or the Supabase CLI).

3. **Copy `.env.example` to `.env.local`** and fill in every value —
   `SPOTIFY_CLIENT_ID`/`SECRET`/`REDIRECT_URI`, `SUPABASE_URL`/
   `SERVICE_ROLE_KEY`, and generate `SESSION_SECRET`/`CRON_SECRET` with
   `openssl rand -base64 32`. Set `TIMEZONE` to your own IANA timezone —
   it's used for day/night and calendar-day bucketing, since Spotify's API
   gives no per-user timezone.

4. **Install and run:**

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), you'll land on
   `/login` — click "Connect with Spotify."

5. **Schedule the poller.** Spotify's Recently Played endpoint has no
   history backfill (last ~50 plays only), so a background job has to poll
   it regularly from the moment you connect onward. Recommended: Supabase
   `pg_cron` + `pg_net`, run once against your Supabase project's SQL
   editor (replace `<APP_BASE_URL>` and `<CRON_SECRET>`):

   ```sql
   select cron.schedule(
     'poll-spotify',
     '*/15 * * * *',
     $$
       select net.http_post(
         url := '<APP_BASE_URL>/api/cron/poll',
         headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
       );
     $$
   );
   ```

   If your Supabase tier doesn't have `pg_net` enabled, use a Supabase Edge
   Function with a Cron Trigger instead — have it just `fetch()` the same
   `/api/cron/poll` URL with the same header; don't duplicate the polling
   logic in the Edge Function.

6. **(Optional) Public read-only demo.** Set `PUBLIC_DEMO_ENABLED=true` and
   deploy — `/demo` (and the root `/` route) will show a live, read-only
   view of *your* data with no login required for visitors. It only ever
   shows aggregated stats; raw tokens and per-play detail (including the
   heatmap's day view) never leave the server.

7. **(Optional) Last.fm genre tags.** Spotify no longer returns artist
   genres to Development Mode apps. No page uses genres right now, but if
   you want them collected, get a free API key at
   [last.fm/api/account/create](https://www.last.fm/api/account/create) and
   set `LASTFM_API_KEY`; the poller then fills in genres from Last.fm tags,
   including backfilling artists it has already seen (25 per poll).

## Running tests

```bash
npm test
```

Covers the aggregates behind each page (streaks and records, the day
view, obsession phases, new-vs-familiar weeks), `skipInference.ts` (the
gap-based skip heuristic), and timezone bucketing.

## Key limitations (by design, not bugs)

- **No historical backfill.** Data starts accumulating the moment you
  connect Spotify; there is no way to retroactively fill in your listening
  history before that (Spotify's GDPR "Extended Streaming History" export
  has real historical timestamps, but importing it is out of scope here).
  It also means every artist counts as "new" in your first tracked week,
  so New vs. familiar grays that week out.
- **Skips are still recorded but not shown anywhere.** The poller keeps
  inferring skips from timing gaps, and the in-app Web Playback SDK player
  records real ones (Premium only), into `skip_events`.
- **Single-owner-per-deployment.** Not multi-tenant. Each self-hoster runs
  their own isolated instance with their own Spotify app credentials.

## Self-hosting your own instance

Fork/clone this repo, follow **Setup** above with your own Spotify
Developer app and Supabase project, and deploy (e.g. to Vercel). Because
you'd be the owner of your own Spotify app, Spotify's Development Mode
limits don't get in your way for personal use.

## Tech stack

Next.js (App Router) · React · TypeScript · Tailwind CSS ·
Supabase (Postgres) · Spotify Web API + Web Playback SDK · Vitest
