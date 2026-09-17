import type { DayBucket } from "@/lib/aggregate/heatmap";

type Props = {
  days: DayBucket[];
};

function colorForCount(count: number, max: number): string {
  if (count === 0) return "bg-zinc-100 dark:bg-zinc-800";
  const ratio = max > 0 ? count / max : 0;
  if (ratio > 0.75) return "bg-[#1DB954]";
  if (ratio > 0.5) return "bg-[#1DB954]/70";
  if (ratio > 0.25) return "bg-[#1DB954]/45";
  return "bg-[#1DB954]/20";
}

/** GitHub-contributions-style grid: one column per week, one cell per day. */
export function HeatmapCalendar({ days }: Props) {
  if (days.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No listening data yet — the poller only sees plays from the moment you connect Spotify
        forward.
      </p>
    );
  }

  const byDate = new Map(days.map((d) => [d.date, d]));
  const firstDate = new Date(days[0].date + "T00:00:00Z");
  const lastDate = new Date(days[days.length - 1].date + "T00:00:00Z");

  // Align the grid start to the preceding Sunday so weeks form clean columns.
  const gridStart = new Date(firstDate);
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay());

  const cells: { date: string; bucket: DayBucket | undefined }[] = [];
  for (let d = new Date(gridStart); d <= lastDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, bucket: byDate.get(key) });
  }

  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const maxCount = Math.max(...days.map((d) => d.playCount), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((week, i) => (
          <div key={i} className="flex flex-col gap-1">
            {week.map((cell) => (
              <div key={cell.date} className="group relative h-3 w-3">
                <div
                  aria-label={`${cell.date}: ${cell.bucket?.playCount ?? 0} plays, ${cell.bucket?.minutesListened ?? 0} min`}
                  className={`h-3 w-3 rounded-sm ${colorForCount(cell.bucket?.playCount ?? 0, maxCount)}`}
                />
                <div className="pointer-events-none absolute top-full left-1/2 z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 dark:bg-zinc-950">
                  {cell.date}: {cell.bucket?.playCount ?? 0} plays, {cell.bucket?.minutesListened ?? 0} min
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
