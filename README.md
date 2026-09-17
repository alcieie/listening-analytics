# Listening Analytics

A personal Spotify listening-analytics app: a "mood ring" trend chart, a
GitHub-contributions-style listening heatmap, and skip-rate analysis by
genre/artist. Next.js (App Router) + TypeScript + Tailwind, with Supabase
Postgres for storage.

**Important:** Spotify shut off public access to its real audio-features
endpoint (energy/valence/danceability) for all new API apps in November
2024, with no way back for a new app. This app cannot use that endpoint —
instead, "mood ring" uses an approximate **vibe-score heuristic** built from
genres, popularity, release era, and the explicit flag (see
`lib/spotify/vibeScore.ts` and the in-app disclaimer). It is a proxy, not a
measurement of the actual audio.

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
   then run the migration in `supabase/migrations/0001_init.sql` against it
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
   reads pre-aggregated stats; raw tokens and per-play detail never leave
   the server.

## Running tests

```bash
npm test
```

Covers the pure heuristics: `vibeScore.ts` (genre/popularity/era scoring)
and `skipInference.ts` (the gap-based skip heuristic), plus timezone
bucketing.

## Key limitations (by design, not bugs)

- **Vibe score is an approximation**, not real Spotify audio-features —
  see the disclaimer on the mood ring page and `lib/spotify/vibeScore.ts`
  for the exact formula and its weaknesses (coarse genre keyword matching,
  global-not-personal popularity, no tempo signal at all, era mapping is
  stereotype-level).
- **No historical backfill.** Data starts accumulating the moment you
  connect Spotify; there is no way to retroactively fill in your listening
  history before that (Spotify's GDPR "Extended Streaming History" export
  has real historical timestamps but no audio-features either way — out of
  scope here).
- **Skip detection combines two signals**: a passive gap-based heuristic
  from Recently Played (covers all your listening, but approximate) and
  real events from the in-app Web Playback SDK player (precise, but only
  for listening sessions that happen inside this app, and requires Spotify
  Premium). Both are visible in the UI, tagged by source.
- **Single-owner-per-deployment.** Not multi-tenant. Each self-hoster runs
  their own isolated instance with their own Spotify app credentials.

## Self-hosting your own instance

Fork/clone this repo, follow **Setup** above with your own Spotify
Developer app and Supabase project, and deploy (e.g. to Vercel). Because
you'd be the owner of your own Spotify app, Spotify's Development Mode
limits don't get in your way for personal use.

## Tech stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Recharts ·
Supabase (Postgres) · Spotify Web API + Web Playback SDK · Vitest
