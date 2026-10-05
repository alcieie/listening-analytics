// Date keys are calendar dates, so format them in UTC to keep the day as-is.
const LONG = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" });
const SHORT = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

/** "Monday, March 2, 2026" */
export function formatDateKeyLong(dateKey: string): string {
  return LONG.format(new Date(dateKey + "T00:00:00Z"));
}

/** "Mar 2" */
export function formatDateKeyShort(dateKey: string): string {
  return SHORT.format(new Date(dateKey + "T00:00:00Z"));
}

export function plural(count: number, noun: string): string {
  return `${count.toLocaleString("en-US")} ${noun}${count === 1 ? "" : "s"}`;
}
