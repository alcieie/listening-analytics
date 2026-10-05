/**
 * Timezone-aware bucketing by hour, calendar day and week. played_at is
 * stored in UTC; Spotify gives no per-user timezone, so callers pass the
 * app-wide TIMEZONE env var.
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

const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Day of week in the given timezone, Monday=0 ... Sunday=6 (ISO order). */
export function getWeekdayInTimeZone(isoTimestamp: string, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
  return WEEKDAY_INDEX[formatter.format(new Date(isoTimestamp))];
}

/** Local wall-clock time, e.g. "21:05", in the given timezone. */
export function getTimeOfDayInTimeZone(isoTimestamp: string, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return formatter.format(new Date(isoTimestamp));
}

// Date keys are plain calendar dates, so their arithmetic is done at UTC
// midnight where no DST shift can move a day boundary.
function dateKeyToUtc(dateKey: string): Date {
  return new Date(dateKey + "T00:00:00Z");
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = dateKeyToUtc(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from one date key to another; negative if `to` is earlier. */
export function daysBetweenDateKeys(from: string, to: string): number {
  return Math.round((dateKeyToUtc(to).getTime() - dateKeyToUtc(from).getTime()) / 86_400_000);
}

/** The Monday on or before the given date key. */
export function getWeekStartDateKey(dateKey: string): string {
  const mondayOffset = (dateKeyToUtc(dateKey).getUTCDay() + 6) % 7;
  return addDaysToDateKey(dateKey, -mondayOffset);
}
