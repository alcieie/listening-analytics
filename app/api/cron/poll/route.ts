import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOwnerAccount } from "@/lib/account";
import { getValidAccessToken } from "@/lib/spotify/oauth";
import { getArtist, getRecentlyPlayed, type RecentlyPlayedItem } from "@/lib/spotify/api";
import { inferSkip } from "@/lib/spotify/skipInference";

const DEFAULT_SESSION_GAP_MAX_MINUTES = 45;

// Spotify's Dev Mode artist object currently omits `genres` entirely, so a
// cached row can be empty through no fault of ours. Retry those on a slow
// cadence so they backfill if the field comes back, without re-fetching
// every artist on every poll.
const EMPTY_GENRE_RETRY_MS = 7 * 24 * 60 * 60 * 1000;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  const supabase = supabaseAdmin();

  try {
    const account = await getOwnerAccount(supabase);
    if (!account) {
      await supabase.from("poll_log").insert({ new_plays_count: 0, error: "no spotify_accounts row yet" });
      return NextResponse.json({ ok: true, newPlays: 0, note: "no account connected yet" });
    }

    const accessToken = await getValidAccessToken(supabase, account);

    // The play immediately preceding whatever new plays we're about to
    // fetch, used as the start of the gap-inference chain below.
    const { data: previousLastPlayRows, error: previousLastPlayError } = await supabase
      .from("plays")
      .select("id, played_at, duration_ms, track_id")
      .eq("spotify_account_id", account.id)
      .order("played_at", { ascending: false })
      .limit(1);
    if (previousLastPlayError) throw new Error(previousLastPlayError.message);
    const previousLastPlay = previousLastPlayRows?.[0] ?? null;

    const after = previousLastPlay ? new Date(previousLastPlay.played_at).getTime() : undefined;
    const recentlyPlayed = await getRecentlyPlayed(accessToken, after ? String(after) : undefined);

    const newItems = [...recentlyPlayed.items].sort(
      (a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime()
    );

    if (newItems.length === 0) {
      await supabase.from("poll_log").insert({ new_plays_count: 0 });
      return NextResponse.json({ ok: true, newPlays: 0 });
    }

    const playRows = newItems.map((item: RecentlyPlayedItem) => ({
      spotify_account_id: account.id,
      played_at: item.played_at,
      track_id: item.track.id,
      track_name: item.track.name,
      artist_ids: item.track.artists.map((a) => a.id),
      primary_artist_id: item.track.artists[0]?.id ?? "",
      primary_artist_name: item.track.artists[0]?.name ?? "",
      album_name: item.track.album.name,
      duration_ms: item.track.duration_ms,
      popularity: item.track.popularity ?? null,
      explicit: item.track.explicit,
      release_date: item.track.album.release_date,
      release_date_precision: item.track.album.release_date_precision,
    }));

    const { data: insertedPlays, error: insertError } = await supabase
      .from("plays")
      .upsert(playRows, { onConflict: "spotify_account_id,played_at,track_id", ignoreDuplicates: true })
      .select("id, played_at, duration_ms, artist_ids, track_id");
    if (insertError) throw new Error(insertError.message);

    // Refresh the artist genre cache for any artists we haven't seen before,
    // plus any cached with no genres that are due for a retry.
    const allArtistIds = Array.from(new Set(newItems.flatMap((item) => item.track.artists.map((a) => a.id))));
    const { data: cachedArtists, error: cacheError } = await supabase
      .from("artist_genre_cache")
      .select("artist_id, genres, fetched_at")
      .in("artist_id", allArtistIds);
    if (cacheError) throw new Error(cacheError.message);

    const retryBefore = Date.now() - EMPTY_GENRE_RETRY_MS;
    const freshIds = new Set(
      (cachedArtists ?? [])
        .filter(
          (r) =>
            ((r.genres ?? []) as string[]).length > 0 ||
            new Date(r.fetched_at as string).getTime() > retryBefore
        )
        .map((r) => r.artist_id as string)
    );
    const missingArtistIds = allArtistIds.filter((id) => !freshIds.has(id));

    // Spotify removed the batch artists endpoint for Dev Mode apps
    // (Feb 2026) — fetch one at a time instead.
    for (const artistId of missingArtistIds) {
      const artist = await getArtist(accessToken, artistId);
      const { error } = await supabase.from("artist_genre_cache").upsert(
        {
          artist_id: artist.id,
          genres: artist.genres ?? [],
          popularity: artist.popularity ?? null,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "artist_id" }
      );
      if (error) throw new Error(error.message);
    }

    // Passive skip inference over the chain: [previous last play, ...new plays].
    const sessionGapMaxMs =
      (parseInt(process.env.SESSION_GAP_MAX_MINUTES ?? "", 10) || DEFAULT_SESSION_GAP_MAX_MINUTES) * 60_000;

    const chain = [
      ...(previousLastPlay ? [previousLastPlay] : []),
      ...(insertedPlays ?? []).sort(
        (a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime()
      ),
    ];

    const skipEventRows = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const current = chain[i];
      const next = chain[i + 1];
      const gapMs = new Date(next.played_at).getTime() - new Date(current.played_at).getTime();
      const result = inferSkip({ durationMs: current.duration_ms, gapMs, sessionGapMaxMs });
      if (result.excluded) continue;

      skipEventRows.push({
        spotify_account_id: account.id,
        play_id: current.id,
        track_id: current.track_id,
        source: "inferred" as const,
        is_skip: result.isSkip,
        confidence: result.confidence,
        listened_ms: Math.min(gapMs, current.duration_ms),
        track_duration_ms: current.duration_ms,
      });
    }

    if (skipEventRows.length > 0) {
      const { error } = await supabase
        .from("skip_events")
        .upsert(skipEventRows, { onConflict: "play_id,source", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }

    await supabase.from("poll_log").insert({ new_plays_count: insertedPlays?.length ?? 0 });

    return NextResponse.json({ ok: true, newPlays: insertedPlays?.length ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Poll failed", err);
    await supabase.from("poll_log").insert({ new_plays_count: 0, error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
