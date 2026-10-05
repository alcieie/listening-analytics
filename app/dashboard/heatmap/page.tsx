import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getPlays } from "@/lib/aggregate/shared";
import { buildHeatmap, getDayDetail, getListeningRecords } from "@/lib/aggregate/heatmap";
import { getDateKeyInTimeZone } from "@/lib/spotify/timeBuckets";
import { HeatmapCalendar } from "@/components/HeatmapCalendar";
import { ListeningRecords } from "@/components/ListeningRecords";
import { DayDetailPanel } from "@/components/DayDetailPanel";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export default async function HeatmapPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  const { day } = await searchParams;
  const selectedDate = typeof day === "string" && DATE_KEY.test(day) ? day : undefined;

  const timeZone = process.env.TIMEZONE ?? "UTC";
  const today = getDateKeyInTimeZone(new Date().toISOString(), timeZone);
  const plays = await getPlays(supabaseAdmin(), session.spotifyAccountId);
  const days = buildHeatmap(plays, timeZone);

  return (
    <div className="w-[90%] mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Listening heatmap</h1>
      <ListeningRecords records={getListeningRecords(plays, days, today, timeZone)} />
      <HeatmapCalendar days={days} endDate={today} basePath="/dashboard/heatmap" selectedDate={selectedDate} />
      {selectedDate && (
        <DayDetailPanel detail={getDayDetail(plays, selectedDate, timeZone)} basePath="/dashboard/heatmap" />
      )}
    </div>
  );
}
