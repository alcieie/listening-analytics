import type { SupabaseClient } from "@supabase/supabase-js";

export type PlayRow = {
  id: number;
  played_at: string;
  duration_ms: number;
  track_id: string;
  track_name: string;
  album_name: string;
  primary_artist_id: string;
  primary_artist_name: string;
};

/** All of an account's plays, oldest first. */
export async function getPlays(
  supabase: SupabaseClient,
  accountId: string,
  sinceIso?: string
): Promise<PlayRow[]> {
  let query = supabase
    .from("plays")
    .select("id, played_at, duration_ms, track_id, track_name, album_name, primary_artist_id, primary_artist_name")
    .eq("spotify_account_id", accountId)
    .order("played_at", { ascending: true });

  if (sinceIso) {
    query = query.gte("played_at", sinceIso);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getPlays failed: ${error.message}`);
  return (data ?? []) as PlayRow[];
}
