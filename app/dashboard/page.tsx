import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

export default async function DashboardOverviewPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  const supabase = supabaseAdmin();
  const [{ data: account }, { data: lastPoll }, { count: playCount }] = await Promise.all([
    supabase.from("spotify_accounts").select("spotify_user_id").eq("id", session.spotifyAccountId).maybeSingle(),
    supabase.from("poll_log").select("ran_at, new_plays_count, error").order("ran_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("plays").select("id", { count: "exact", head: true }).eq("spotify_account_id", session.spotifyAccountId),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Overview</h1>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
          <dt className="text-zinc-500">Connected Spotify account</dt>
          <dd className="font-medium">{account?.spotify_user_id ?? "—"}</dd>
        </div>
        <div className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
          <dt className="text-zinc-500">Plays recorded</dt>
          <dd className="font-medium">{playCount ?? 0}</dd>
        </div>
        <div className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
          <dt className="text-zinc-500">Last poll</dt>
          <dd className="font-medium">
            {lastPoll ? new Date(lastPoll.ran_at).toLocaleString() : "Never — set up the cron job"}
          </dd>
        </div>
        {lastPoll?.error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Last poll error: {lastPoll.error}
          </div>
        )}
      </dl>
      <p className="text-xs text-zinc-500">
        Data only accumulates from the moment you connect Spotify onward — the Recently Played
        API has no historical backfill.
      </p>
    </div>
  );
}
