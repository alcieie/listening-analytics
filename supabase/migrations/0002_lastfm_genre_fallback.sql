-- When the artist was last looked up on Last.fm, whose tags fill in for the
-- genres Spotify stopped returning to Development Mode apps. Null means never
-- tried, which is what lets the poller backfill artists cached before the
-- fallback existed without re-querying ones Last.fm has no tags for.
alter table artist_genre_cache add column if not exists lastfm_checked_at timestamptz;
