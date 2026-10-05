import { notFound } from "next/navigation";
import { connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOwnerAccount } from "@/lib/account";
import { getPlays } from "@/lib/aggregate/shared";
import { buildHeatmap, getListeningRecords } from "@/lib/aggregate/heatmap";
import { getObsessions } from "@/lib/aggregate/onRepeat";
import { getDiscoveryWeeks } from "@/lib/aggregate/discovery";
import { getDateKeyInTimeZone } from "@/lib/spotify/timeBuckets";
import { HeatmapCalendar } from "@/components/HeatmapCalendar";
import { ListeningRecords } from "@/components/ListeningRecords";
import { ObsessionList } from "@/components/ObsessionList";
import { DiscoveryChart } from "@/components/DiscoveryChart";
import { DemoBanner } from "@/components/DemoBanner";

// Aggregates only: the per-play day view stays behind login (see README).
export default async function DemoPage() {
  // Live data: render per request, not once at build time.
  await connection();
  if (process.env.PUBLIC_DEMO_ENABLED !== "true") notFound();

  const timeZone = process.env.TIMEZONE ?? "UTC";
  const today = getDateKeyInTimeZone(new Date().toISOString(), timeZone);
  const supabase = supabaseAdmin();
  const account = await getOwnerAccount(supabase);
  const plays = account ? await getPlays(supabase, account.id) : [];
  const days = buildHeatmap(plays, timeZone);

  return (
    <div className="mx-auto w-[90%] space-y-12 py-10">
      <DemoBanner />

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Listening heatmap</h2>
        <ListeningRecords records={getListeningRecords(plays, days, today, timeZone)} />
        <HeatmapCalendar days={days} endDate={today} />
      </section>

      <section className="max-w-3xl space-y-6">
        <h2 className="text-xl font-semibold">On repeat</h2>
        <ObsessionList obsessions={getObsessions(plays, new Date(), timeZone)} />
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">New vs. familiar</h2>
        <DiscoveryChart weeks={getDiscoveryWeeks(plays, timeZone)} />
      </section>
    </div>
  );
}
