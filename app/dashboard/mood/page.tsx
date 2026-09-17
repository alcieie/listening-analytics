import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getMoodTrend } from "@/lib/aggregate/mood";
import { MoodRingChart } from "@/components/MoodRingChart";
import { VibeScoreLegend } from "@/components/VibeScoreLegend";

export default async function MoodPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  const timeZone = process.env.TIMEZONE ?? "UTC";
  const supabase = supabaseAdmin();
  const trend = await getMoodTrend(supabase, session.spotifyAccountId, timeZone);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Mood ring</h1>
      <VibeScoreLegend />
      <MoodRingChart byHour={trend.byHour} byWeek={trend.byWeek} />
    </div>
  );
}
