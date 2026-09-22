import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOwnerAccount } from "@/lib/account";
import { getMoodTrend } from "@/lib/aggregate/mood";
import { getListeningHeatmap } from "@/lib/aggregate/heatmap";
import { getDateKeyInTimeZone } from "@/lib/spotify/timeBuckets";
import { getSkipStats } from "@/lib/aggregate/skips";
import { MoodRingChart } from "@/components/MoodRingChart";
import { VibeScoreLegend } from "@/components/VibeScoreLegend";
import { HeatmapCalendar } from "@/components/HeatmapCalendar";
import { SkipBreakdown } from "@/components/SkipBreakdown";
import { DemoBanner } from "@/components/DemoBanner";

export default async function DemoPage() {
  if (process.env.PUBLIC_DEMO_ENABLED !== "true") notFound();

  const timeZone = process.env.TIMEZONE ?? "UTC";
  const supabase = supabaseAdmin();
  const account = await getOwnerAccount(supabase);

  const [trend, days, skipStats] = account
    ? await Promise.all([
        getMoodTrend(supabase, account.id, timeZone),
        getListeningHeatmap(supabase, account.id, timeZone),
        getSkipStats(supabase, account.id),
      ])
    : [{ byHour: [], byWeek: [] }, [], { byArtist: [], byGenre: [] }];

  return (
    <div className="mx-auto w-[90%] space-y-12 py-10">
      <DemoBanner />

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Mood ring</h2>
        <VibeScoreLegend />
        <MoodRingChart byHour={trend.byHour} byWeek={trend.byWeek} />
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Listening heatmap</h2>
        <HeatmapCalendar days={days} endDate={getDateKeyInTimeZone(new Date().toISOString(), timeZone)} />
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Skip rate</h2>
        <SkipBreakdown byArtist={skipStats.byArtist} byGenre={skipStats.byGenre} />
      </section>
    </div>
  );
}
