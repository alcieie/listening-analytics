import type { SupabaseClient } from "@supabase/supabase-js";

export type PlayRow = {
  id: number;
  played_at: string;
  duration_ms: number;
  popularity: number | null;
  explicit: boolean;
  release_date: string | null;
  primary_artist_id: string;
  primary_artist_name: string;
  artist_ids: string[];
};

export type SkipEventRow = {
  play_id: number | null;
  source: "inferred" | "sdk-observed";
  is_skip: boolean;
  listened_ms: number | null;
  track_duration_ms: number;
};

export async function getPlays(
  supabase: SupabaseClient,
  accountId: string,
  sinceIso?: string
): Promise<PlayRow[]> {
  let query = supabase
    .from("plays")
    .select(
      "id, played_at, duration_ms, popularity, explicit, release_date, primary_artist_id, primary_artist_name, artist_ids"
    )
    .eq("spotify_account_id", accountId)
    .order("played_at", { ascending: true });

  if (sinceIso) {
    query = query.gte("played_at", sinceIso);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getPlays failed: ${error.message}`);
  return (data ?? []) as PlayRow[];
}

export async function getGenresByArtistId(
  supabase: SupabaseClient,
  artistIds: string[]
): Promise<Map<string, string[]>> {
  if (artistIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("artist_genre_cache")
    .select("artist_id, genres")
    .in("artist_id", artistIds);

  if (error) throw new Error(`getGenresByArtistId failed: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.artist_id as string, (row.genres ?? []) as string[]]));
}

/**
 * One "best" skip event per play, preferring sdk-observed ground truth over
 * the passive inference heuristic whenever both exist for the same play.
 */
export async function getBestSkipEventByPlayId(
  supabase: SupabaseClient,
  accountId: string
): Promise<Map<number, SkipEventRow>> {
  const { data, error } = await supabase
    .from("skip_events")
    .select("play_id, source, is_skip, listened_ms, track_duration_ms")
    .eq("spotify_account_id", accountId)
    .not("play_id", "is", null);

  if (error) throw new Error(`getBestSkipEventByPlayId failed: ${error.message}`);

  const byPlayId = new Map<number, SkipEventRow>();
  for (const row of (data ?? []) as SkipEventRow[]) {
    const playId = row.play_id as number;
    const existing = byPlayId.get(playId);
    if (!existing || (row.source === "sdk-observed" && existing.source !== "sdk-observed")) {
      byPlayId.set(playId, row);
    }
  }
  return byPlayId;
}

/** How much of the track was actually listened to, as a 0-1 fraction. */
export function listenedFraction(play: PlayRow, skipEvent: SkipEventRow | undefined): number {
  if (!skipEvent || skipEvent.listened_ms == null || play.duration_ms === 0) return 1;
  return Math.max(0, Math.min(1, skipEvent.listened_ms / play.duration_ms));
}
