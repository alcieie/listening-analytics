-- Spotify Listening Analytics: initial schema.
--
-- Single-owner-per-deployment design: there is no auth.uid()-keyed
-- multi-tenancy here. Every table has RLS enabled with ZERO
-- anon/authenticated grants (default-deny). All application access goes
-- through the Next.js server using the service_role key, which bypasses
-- RLS entirely. This is defense-in-depth: even a leaked anon/publishable
-- key exposes nothing.

create table if not exists spotify_accounts (
  id uuid primary key default gen_random_uuid(),
  spotify_user_id text not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists plays (
  id bigserial primary key,
  spotify_account_id uuid not null references spotify_accounts(id) on delete cascade,
  played_at timestamptz not null,
  track_id text not null,
  track_name text not null,
  artist_ids text[] not null default '{}',
  primary_artist_id text not null,
  primary_artist_name text not null,
  album_name text not null,
  duration_ms integer not null,
  popularity integer,
  explicit boolean not null default false,
  release_date text,
  release_date_precision text,
  fetched_at timestamptz not null default now(),
  unique (spotify_account_id, played_at, track_id)
);

create index if not exists plays_account_played_at_idx
  on plays (spotify_account_id, played_at desc);

create table if not exists artist_genre_cache (
  artist_id text primary key,
  genres text[] not null default '{}',
  popularity integer,
  fetched_at timestamptz not null default now()
);

create table if not exists skip_events (
  id bigserial primary key,
  spotify_account_id uuid not null references spotify_accounts(id) on delete cascade,
  play_id bigint references plays(id) on delete cascade,
  track_id text not null,
  source text not null check (source in ('inferred', 'sdk-observed')),
  is_skip boolean not null,
  raw_event_type text,
  confidence text not null check (confidence in ('high', 'low')),
  listened_ms integer,
  track_duration_ms integer not null,
  occurred_at timestamptz not null default now()
);

create index if not exists skip_events_account_idx
  on skip_events (spotify_account_id, occurred_at desc);

create index if not exists skip_events_play_id_idx
  on skip_events (play_id);

-- Prevents duplicate skip rows if the poller reprocesses the same
-- consecutive pair (e.g. a retried cron run). Postgres doesn't enforce
-- uniqueness across NULLs, so sdk-observed events not tied to a stored
-- play (play_id is null) are naturally exempt from this constraint.
alter table skip_events
  add constraint skip_events_play_source_unique unique (play_id, source);

create table if not exists poll_log (
  id bigserial primary key,
  ran_at timestamptz not null default now(),
  new_plays_count integer not null default 0,
  error text
);

alter table spotify_accounts enable row level security;
alter table plays enable row level security;
alter table artist_genre_cache enable row level security;
alter table skip_events enable row level security;
alter table poll_log enable row level security;

-- Intentionally no policies: default-deny for anon/authenticated. Only the
-- service_role key (used server-side only) can read or write these tables.
