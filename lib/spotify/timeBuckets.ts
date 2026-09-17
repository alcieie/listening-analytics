/**
 * Timezone-aware bucketing for the mood trend (hour-of-day, ISO week) and
 * heatmap (calendar day). played_at is stored in UTC; Spotify gives no
 * per-user timezone, so callers pass the app-wide TIMEZONE env var.
 */

export function getHourInTimeZone(isoTimestamp: string, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  });
  return parseInt(formatter.format(new Date(isoTimestamp)), 10);
}

export function getDateKeyInTimeZone(isoTimestamp: string, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA formats as YYYY-MM-DD, which is what we want as a stable key.
  return formatter.format(new Date(isoTimestamp));
}

/** ISO 8601 week key, e.g. "2026-W07", computed in the given timezone. */
export function getIsoWeekKeyInTimeZone(isoTimestamp: string, timeZone: string): string {
  const dateKey = getDateKeyInTimeZone(isoTimestamp, timeZone);
  const [year, month, day] = dateKey.split("-").map((n) => parseInt(n, 10));
  // Use noon UTC on the local calendar date to avoid DST/timezone edge cases
  // when computing the ISO week number.
  const date = new Date(Date.UTC(year, month - 1, day, 12));

  const dayNumber = date.getUTCDay() || 7; // Monday=1 ... Sunday=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNumber);
  const isoYearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((date.getTime() - isoYearStart.getTime()) / 86_400_000 + 1) / 7);

  return `${date.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}
