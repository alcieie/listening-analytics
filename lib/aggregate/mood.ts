import type { SupabaseClient } from "@supabase/supabase-js";
import { computeVibeScore } from "../spotify/vibeScore";
import { getHourInTimeZone, getIsoWeekKeyInTimeZone } from "../spotify/timeBuckets";
import { getBestSkipEventByPlayId, getGenresByArtistId, getPlays, listenedFraction } from "./shared";

export type HourBucket = { hour: number; avgEnergy: number; avgValence: number; playCount: number };
export type WeekBucket = { week: string; avgEnergy: number; avgValence: number; playCount: number };

export type MoodTrend = {
  byHour: HourBucket[];
  byWeek: WeekBucket[];
};

type WeightedAccumulator = { energySum: number; valenceSum: number; weightSum: number; playCount: number };

function accumulate(map: Map<string | number, WeightedAccumulator>, key: string | number, energy: number, valence: number, weight: number) {
  const existing = map.get(key) ?? { energySum: 0, valenceSum: 0, weightSum: 0, playCount: 0 };
  existing.energySum += energy * weight;
  existing.valenceSum += valence * weight;
  existing.weightSum += weight;
  existing.playCount += 1;
  map.set(key, existing);
}

export async function getMoodTrend(
  supabase: SupabaseClient,
  accountId: string,
  timeZone: string,
  sinceIso?: string
): Promise<MoodTrend> {
  const plays = await getPlays(supabase, accountId, sinceIso);
  if (plays.length === 0) return { byHour: [], byWeek: [] };

  const allArtistIds = Array.from(new Set(plays.flatMap((p) => p.artist_ids)));
  const [genresByArtistId, skipEventsByPlayId] = await Promise.all([
    getGenresByArtistId(supabase, allArtistIds),
    getBestSkipEventByPlayId(supabase, accountId),
  ]);

  const byHour = new Map<number, WeightedAccumulator>();
  const byWeek = new Map<string, WeightedAccumulator>();

  for (const play of plays) {
    const genres = play.artist_ids.flatMap((id) => genresByArtistId.get(id) ?? []);
    const { energy, valence } = computeVibeScore({
      genres,
      popularity: play.popularity,
      releaseDate: play.release_date,
      explicit: play.explicit,
    });

    // Weight by how much of the track was actually heard, so near-instant
    // skips barely move the trend.
    const weight = listenedFraction(play, skipEventsByPlayId.get(play.id));

    const hour = getHourInTimeZone(play.played_at, timeZone);
    const weekKey = getIsoWeekKeyInTimeZone(play.played_at, timeZone);

    accumulate(byHour, hour, energy, valence, weight);
    accumulate(byWeek, weekKey, energy, valence, weight);
  }

  const toHourBucket = ([hour, acc]: [number, WeightedAccumulator]): HourBucket => ({
    hour,
    avgEnergy: acc.weightSum > 0 ? acc.energySum / acc.weightSum : 0,
    avgValence: acc.weightSum > 0 ? acc.valenceSum / acc.weightSum : 0,
    playCount: acc.playCount,
  });

  const toWeekBucket = ([week, acc]: [string, WeightedAccumulator]): WeekBucket => ({
    week,
    avgEnergy: acc.weightSum > 0 ? acc.energySum / acc.weightSum : 0,
    avgValence: acc.weightSum > 0 ? acc.valenceSum / acc.weightSum : 0,
    playCount: acc.playCount,
  });

  return {
    byHour: Array.from(byHour.entries()).map(toHourBucket).sort((a, b) => a.hour - b.hour),
    byWeek: Array.from(byWeek.entries()).map(toWeekBucket).sort((a, b) => a.week.localeCompare(b.week)),
  };
}
