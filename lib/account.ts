import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpotifyAccountRow } from "./spotify/oauth";

/**
 * Single-owner-per-deployment: there is exactly one spotify_accounts row
 * once the owner has logged in once. Everything (cron poller, dashboard,
 * public demo) reads through this same account.
 */
export async function getOwnerAccount(supabase: SupabaseClient): Promise<SpotifyAccountRow | null> {
  const { data, error } = await supabase
    .from("spotify_accounts")
    .select("id, spotify_user_id, access_token, refresh_token, expires_at")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getOwnerAccount failed: ${error.message}`);
  return data as SpotifyAccountRow | null;
}

export async function getOwnerAccountById(
  supabase: SupabaseClient,
  id: string
): Promise<SpotifyAccountRow | null> {
  const { data, error } = await supabase
    .from("spotify_accounts")
    .select("id, spotify_user_id, access_token, refresh_token, expires_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getOwnerAccountById failed: ${error.message}`);
  return data as SpotifyAccountRow | null;
}
