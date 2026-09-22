import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getListeningHeatmap } from "@/lib/aggregate/heatmap";
import { getDateKeyInTimeZone } from "@/lib/spotify/timeBuckets";
import { HeatmapCalendar } from "@/components/HeatmapCalendar";

export default async function HeatmapPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  const timeZone = process.env.TIMEZONE ?? "UTC";
  const supabase = supabaseAdmin();
  const days = await getListeningHeatmap(supabase, session.spotifyAccountId, timeZone);

  return (
    <div className="w-[90%] mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Listening heatmap</h1>
      <HeatmapCalendar days={days} endDate={getDateKeyInTimeZone(new Date().toISOString(), timeZone)} />
    </div>
  );
}
