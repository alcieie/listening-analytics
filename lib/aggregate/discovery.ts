import { addDaysToDateKey, getDateKeyInTimeZone, getWeekStartDateKey } from "../spotify/timeBuckets";
import type { PlayRow } from "./shared";

export type DiscoveryWeek = {
  /** Monday of the week, as a date key. */
  weekStart: string;
  playCount: number;
  /** Plays of artists never played in any earlier week. */
  newArtistPlayCount: number;
  newArtistCount: number;
  /** newArtistPlayCount / playCount, or null for a week with no plays. */
  newShare: number | null;
  /**
   * The week tracking started in. Every artist is "new" then, so its share
   * says nothing about exploring.
   */
  isFirstWeek: boolean;
};

/**
 * Week by week, how much listening went to artists you'd never played
 * before that week. Weeks with no plays are filled in so gaps stay visible.
 */
export function getDiscoveryWeeks(plays: PlayRow[], timeZone: string): DiscoveryWeek[] {
  const byWeek = new Map<string, PlayRow[]>();
  for (const play of plays) {
    const week = getWeekStartDateKey(getDateKeyInTimeZone(play.played_at, timeZone));
    const weekPlays = byWeek.get(week) ?? [];
    weekPlays.push(play);
    byWeek.set(week, weekPlays);
  }
  if (byWeek.size === 0) return [];

  const weekKeys = Array.from(byWeek.keys()).sort();
  const firstWeek = weekKeys[0];
  const lastWeek = weekKeys[weekKeys.length - 1];

  const seenArtists = new Set<string>();
  const weeks: DiscoveryWeek[] = [];
  for (let week = firstWeek; week <= lastWeek; week = addDaysToDateKey(week, 7)) {
    const weekPlays = byWeek.get(week) ?? [];
    const newArtists = new Set<string>();
    let newArtistPlayCount = 0;
    for (const play of weekPlays) {
      if (seenArtists.has(play.primary_artist_id)) continue;
      newArtists.add(play.primary_artist_id);
      newArtistPlayCount += 1;
    }
    for (const artistId of newArtists) seenArtists.add(artistId);

    weeks.push({
      weekStart: week,
      playCount: weekPlays.length,
      newArtistPlayCount,
      newArtistCount: newArtists.size,
      newShare: weekPlays.length > 0 ? newArtistPlayCount / weekPlays.length : null,
      isFirstWeek: week === firstWeek,
    });
  }
  return weeks;
}
