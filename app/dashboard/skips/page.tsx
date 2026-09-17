import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSkipStats } from "@/lib/aggregate/skips";
import { SkipBreakdown } from "@/components/SkipBreakdown";

export default async function SkipsPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  const supabase = supabaseAdmin();
  const stats = await getSkipStats(supabase, session.spotifyAccountId);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Skip rate</h1>
      <p className="text-sm text-zinc-500">
        What you think you like vs. what you actually listen to, inferred from timing gaps in
        your Recently Played history and — when you use the in-app player above — real
        skip/pause events from the Web Playback SDK.
      </p>
      <SkipBreakdown byArtist={stats.byArtist} byGenre={stats.byGenre} />
    </div>
  );
}
