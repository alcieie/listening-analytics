import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDaysToDateKey,
  daysBetweenDateKeys,
  getDateKeyInTimeZone,
  getTimeOfDayInTimeZone,
} from "../spotify/timeBuckets";
import { getPlays, type PlayRow } from "./shared";

export type DayBucket = { date: string; playCount: number; minutesListened: number };

export function buildHeatmap(plays: PlayRow[], timeZone: string): DayBucket[] {
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

export async function getListeningHeatmap(
  supabase: SupabaseClient,
  accountId: string,
  timeZone: string,
  sinceIso?: string
): Promise<DayBucket[]> {
  return buildHeatmap(await getPlays(supabase, accountId, sinceIso), timeZone);
}

export type DayPlay = {
  id: number;
  time: string;
  trackId: string;
  trackName: string;
  artistName: string;
};

export type DayDetail = {
  date: string;
  plays: DayPlay[];
  minutesListened: number;
  topArtist: { name: string; playCount: number } | null;
};

/** Everything played on one local calendar day, in play order. */
export function getDayDetail(plays: PlayRow[], date: string, timeZone: string): DayDetail {
  const dayPlays = plays.filter((p) => getDateKeyInTimeZone(p.played_at, timeZone) === date);

  const artistCounts = new Map<string, { name: string; playCount: number }>();
  for (const play of dayPlays) {
    const entry = artistCounts.get(play.primary_artist_id) ?? { name: play.primary_artist_name, playCount: 0 };
    entry.playCount += 1;
    artistCounts.set(play.primary_artist_id, entry);
  }
  // Map iteration follows first play, so ties go to whoever was played first.
  let topArtist: DayDetail["topArtist"] = null;
  for (const entry of artistCounts.values()) {
    if (!topArtist || entry.playCount > topArtist.playCount) topArtist = entry;
  }

  return {
    date,
    plays: dayPlays.map((p) => ({
      id: p.id,
      time: getTimeOfDayInTimeZone(p.played_at, timeZone),
      trackId: p.track_id,
      trackName: p.track_name,
      artistName: p.primary_artist_name,
    })),
    minutesListened: Math.round(dayPlays.reduce((sum, p) => sum + p.duration_ms, 0) / 60_000),
    topArtist,
  };
}

export type ListeningRecords = {
  /** Consecutive days with plays, ending today, or yesterday if today has none yet. */
  currentStreak: number;
  longestStreak: { days: number; start: string; end: string } | null;
  biggestDay: DayBucket | null;
  mostRepeatedInADay: { date: string; trackName: string; artistName: string; playCount: number } | null;
};

export function getListeningRecords(
  plays: PlayRow[],
  days: DayBucket[],
  today: string,
  timeZone: string
): ListeningRecords {
  // days is sorted by date, so streaks are runs of consecutive keys.
  let longestStreak: ListeningRecords["longestStreak"] = null;
  let runStart = "";
  let runLength = 0;
  let previous = "";
  for (const { date } of days) {
    if (runLength > 0 && daysBetweenDateKeys(previous, date) === 1) {
      runLength += 1;
    } else {
      runStart = date;
      runLength = 1;
    }
    previous = date;
    if (!longestStreak || runLength > longestStreak.days) {
      longestStreak = { days: runLength, start: runStart, end: date };
    }
  }

  // An empty today doesn't break the streak until the day is over.
  const lastDate = days.at(-1)?.date;
  const alive = lastDate === today || lastDate === addDaysToDateKey(today, -1);
  const currentStreak = alive ? runLength : 0;

  let biggestDay: DayBucket | null = null;
  for (const day of days) {
    if (!biggestDay || day.playCount > biggestDay.playCount) biggestDay = day;
  }

  const trackDayCounts = new Map<string, NonNullable<ListeningRecords["mostRepeatedInADay"]>>();
  let mostRepeatedInADay: ListeningRecords["mostRepeatedInADay"] = null;
  for (const play of plays) {
    const date = getDateKeyInTimeZone(play.played_at, timeZone);
    const key = `${date}|${play.track_id}`;
    const entry = trackDayCounts.get(key) ?? {
      date,
      trackName: play.track_name,
      artistName: play.primary_artist_name,
      playCount: 0,
    };
    entry.playCount += 1;
    trackDayCounts.set(key, entry);
    if (!mostRepeatedInADay || entry.playCount > mostRepeatedInADay.playCount) mostRepeatedInADay = entry;
  }

  return { currentStreak, longestStreak, biggestDay, mostRepeatedInADay };
}
