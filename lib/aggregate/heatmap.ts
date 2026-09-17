import type { SupabaseClient } from "@supabase/supabase-js";
import { getDateKeyInTimeZone } from "../spotify/timeBuckets";
import { getPlays } from "./shared";

export type DayBucket = { date: string; playCount: number; minutesListened: number };

export async function getListeningHeatmap(
  supabase: SupabaseClient,
  accountId: string,
  timeZone: string,
  sinceIso?: string
): Promise<DayBucket[]> {
  const plays = await getPlays(supabase, accountId, sinceIso);

  const byDate = new Map<string, { playCount: number; durationMsSum: number }>();
  for (const play of plays) {
    const dateKey = getDateKeyInTimeZone(play.played_at, timeZone);
    const existing = byDate.get(dateKey) ?? { playCount: 0, durationMsSum: 0 };
    existing.playCount += 1;
    existing.durationMsSum += play.duration_ms;
    byDate.set(dateKey, existing);
  }

  return Array.from(byDate.entries())
    .map(([date, { playCount, durationMsSum }]) => ({
      date,
      playCount,
      minutesListened: Math.round(durationMsSum / 60_000),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
