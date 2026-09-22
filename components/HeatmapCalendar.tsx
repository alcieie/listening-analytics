import type { DayBucket } from "@/lib/aggregate/heatmap";

type Props = {
  days: DayBucket[];
  /** Today's date key ("YYYY-MM-DD") in the app's display timezone. */
  endDate: string;
};

const WEEKS = 53;
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const LEVEL_CLASSES = [
  "bg-zinc-100 dark:bg-zinc-800",
  "bg-[#1DB954]/20",
  "bg-[#1DB954]/45",
  "bg-[#1DB954]/70",
  "bg-[#1DB954]",
];

function levelForCount(count: number, max: number): number {
  if (count === 0) return 0;
  const ratio = max > 0 ? count / max : 0;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** GitHub-contributions-style grid: one column per week, one cell per day. */
export function HeatmapCalendar({ days, endDate }: Props) {
  const byDate = new Map(days.map((d) => [d.date, d]));

  // Always render a full trailing year so the grid reads like GitHub's even
  // when there are only a few days of data. The last column is the week
  // containing endDate; we walk back WEEKS-1 weeks from its Sunday.
  const lastWeekStart = new Date(endDate + "T00:00:00Z");
  lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - lastWeekStart.getUTCDay());
  const gridStart = new Date(lastWeekStart);
  gridStart.setUTCDate(gridStart.getUTCDate() - (WEEKS - 1) * 7);

  const weeks: { date: string; bucket: DayBucket | undefined }[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < WEEKS; w++) {
    const week: { date: string; bucket: DayBucket | undefined }[] = [];
    for (let d = 0; d < 7; d++) {
      const key = toKey(cursor);
      week.push({ date: key, bucket: byDate.get(key) });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  // A month label sits above the first week whose Sunday falls in that month.
  const monthStarts: { column: number; label: string }[] = [];
  let previousMonth = -1;
  weeks.forEach((week, index) => {
    const month = new Date(week[0].date + "T00:00:00Z").getUTCMonth();
    if (month === previousMonth) return;
    previousMonth = month;
    monthStarts.push({ column: index, label: MONTH_NAMES[month] });
  });

  // The grid starts mid-month, so the leading label often has only a column or
  // two before the next one. Drop it rather than the full month that follows.
  const monthLabels = monthStarts.filter((m, i) => {
    const next = monthStarts[i + 1];
    return !next || next.column - m.column >= 3;
  });

  const maxCount = Math.max(...days.map((d) => d.playCount), 1);
  const columns = { gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="flex min-w-[640px] gap-2">
          <div className="grid shrink-0 grid-rows-7 gap-[3px] pt-5 text-[10px] text-zinc-500">
            {["", "Mon", "", "Wed", "", "Fri", ""].map((label, i) => (
              <div key={i} className="flex items-center leading-none">
                {label}
              </div>
            ))}
          </div>

          <div className="flex-1">
            <div className="grid h-5 gap-[3px] text-[10px] text-zinc-500" style={columns}>
              {monthLabels.map(({ column, label }) => (
                <div key={label + column} style={{ gridColumn: column + 1 }}>
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={columns}>
              {weeks.flatMap((week) =>
                week.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${cell.bucket?.playCount ?? 0} plays, ${cell.bucket?.minutesListened ?? 0} min`}
                    className={`aspect-square w-full rounded-[2px] ${LEVEL_CLASSES[levelForCount(cell.bucket?.playCount ?? 0, maxCount)]}`}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {days.length === 0
            ? "No listening data yet — the poller only sees plays from the moment you connect Spotify forward."
            : `${days.length} ${days.length === 1 ? "day" : "days"} with listening in the last year`}
        </span>
        <span className="flex items-center gap-1">
          Less
          {LEVEL_CLASSES.map((cls, i) => (
            <span key={i} className={`h-[10px] w-[10px] rounded-[2px] ${cls}`} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
