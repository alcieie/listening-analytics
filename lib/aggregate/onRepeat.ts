import { daysBetweenDateKeys, getDateKeyInTimeZone } from "../spotify/timeBuckets";
import type { PlayRow } from "./shared";

/** Plays of one track within any 7 days that make it an obsession. */
export const OBSESSION_PLAYS_PER_WEEK = 5;
/** A track unplayed this long has been dropped; a later play starts a new phase. */
export const PHASE_GAP_DAYS = 14;

const WEEK_MS = 7 * 86_400_000;
const PHASE_GAP_MS = PHASE_GAP_DAYS * 86_400_000;

export type Obsession = {
  trackId: string;
  trackName: string;
  artistName: string;
  playCount: number;
  /** Most plays inside any 7-day window of the phase. */
  peakWeekPlays: number;
  start: string;
  end: string;
  /** Calendar days from first to last play, inclusive. */
  lengthDays: number;
  /** Still within PHASE_GAP_DAYS of the last play, so not dropped yet. */
  ongoing: boolean;
};

function maxPlaysInAWeek(times: number[]): number {
  let best = 0;
  let windowStart = 0;
  for (let i = 0; i < times.length; i++) {
    while (times[i] - times[windowStart] >= WEEK_MS) windowStart += 1;
    best = Math.max(best, i - windowStart + 1);
  }
  return best;
}

/**
 * Each stretch where a track was played OBSESSION_PLAYS_PER_WEEK+ times in a
 * week, from its first play to the play before a PHASE_GAP_DAYS silence.
 * Ongoing phases come first, then past ones, most recent first.
 */
export function getObsessions(plays: PlayRow[], now: Date, timeZone: string): Obsession[] {
  const byTrack = new Map<string, PlayRow[]>();
  for (const play of plays) {
    const trackPlays = byTrack.get(play.track_id) ?? [];
    trackPlays.push(play);
    byTrack.set(play.track_id, trackPlays);
  }

  const obsessions: Obsession[] = [];
  for (const trackPlays of byTrack.values()) {
    trackPlays.sort((a, b) => a.played_at.localeCompare(b.played_at));

    let phase: PlayRow[] = [];
    const closePhase = () => {
      const times = phase.map((p) => new Date(p.played_at).getTime());
      const peakWeekPlays = maxPlaysInAWeek(times);
      if (peakWeekPlays >= OBSESSION_PLAYS_PER_WEEK) {
        const first = phase[0];
        const last = phase[phase.length - 1];
        const start = getDateKeyInTimeZone(first.played_at, timeZone);
        const end = getDateKeyInTimeZone(last.played_at, timeZone);
        obsessions.push({
          trackId: last.track_id,
          trackName: last.track_name,
          artistName: last.primary_artist_name,
          playCount: phase.length,
          peakWeekPlays,
          start,
          end,
          lengthDays: daysBetweenDateKeys(start, end) + 1,
          ongoing: now.getTime() - times[times.length - 1] < PHASE_GAP_MS,
        });
      }
      phase = [];
    };

    for (const play of trackPlays) {
      const previous = phase.at(-1);
      if (previous && new Date(play.played_at).getTime() - new Date(previous.played_at).getTime() >= PHASE_GAP_MS) {
        closePhase();
      }
      phase.push(play);
    }
    closePhase();
  }

  return obsessions.sort((a, b) => Number(b.ongoing) - Number(a.ongoing) || b.end.localeCompare(a.end));
}
