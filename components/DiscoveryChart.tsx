import type { DiscoveryWeek } from "@/lib/aggregate/discovery";
import { addDaysToDateKey } from "@/lib/spotify/timeBuckets";
import { formatDateKeyShort, plural } from "@/lib/formatDate";
import { StatTile } from "./StatTile";

const MAX_WEEKS = 26;
const GRIDLINES = [1, 0.5, 0];

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function describe(week: DiscoveryWeek): string {
  const label = `Week of ${formatDateKeyShort(week.weekStart)}`;
  if (week.newShare == null) return `${label}: no plays tracked`;
  const base = `${label}: ${percent(week.newShare)} of ${plural(week.playCount, "play")} from new artists (${plural(week.newArtistCount, "new artist")})`;
  return week.isFirstWeek ? `${base}. Tracking started this week, so every artist counts as new.` : base;
}

export function DiscoveryChart({ weeks }: { weeks: DiscoveryWeek[] }) {
  if (weeks.length === 0) {
    return <p className="text-sm text-zinc-500">No listening data yet.</p>;
  }

  // Always lay out MAX_WEEKS columns ending at the latest week, like the
  // heatmap's trailing year, so bars keep their width as data accumulates.
  const shown: DiscoveryWeek[] = Array.from({ length: MAX_WEEKS }, (_, i) => {
    const offset = MAX_WEEKS - 1 - i;
    return (
      weeks[weeks.length - 1 - offset] ?? {
        weekStart: addDaysToDateKey(weeks[0].weekStart, -7 * (offset - weeks.length + 1)),
        playCount: 0,
        newArtistPlayCount: 0,
        newArtistCount: 0,
        newShare: null,
        isFirstWeek: false,
      }
    );
  });
  const thisWeek = weeks[weeks.length - 1];
  const totalArtists = weeks.reduce((sum, w) => sum + w.newArtistCount, 0);
  const comparable = weeks.filter((w) => !w.isFirstWeek && w.newShare != null);
  const typicalShare =
    comparable.length > 0
      ? comparable.reduce((sum, w) => sum + w.newArtistPlayCount, 0) / comparable.reduce((sum, w) => sum + w.playCount, 0)
      : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label="New artists this week"
          value={thisWeek.newShare == null ? "—" : percent(thisWeek.newShare)}
          detail={
            thisWeek.isFirstWeek
              ? "Tracking started this week"
              : `of plays · ${plural(thisWeek.newArtistCount, "new artist")}`
          }
        />
        <StatTile
          label="Typical week"
          value={typicalShare == null ? "—" : percent(typicalShare)}
          detail={typicalShare == null ? "Needs a second week of data" : "of plays from new artists"}
        />
        <StatTile label="Artists heard since tracking began" value={totalArtists.toLocaleString("en-US")} />
      </div>

      <figure className="space-y-2">
        <figcaption className="text-sm font-medium">Share of each week&apos;s plays from artists you&apos;d never played before</figcaption>
        <div className="flex gap-2">
          <div className="flex h-48 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-zinc-500">
            {GRIDLINES.map((g) => (
              <span key={g} className="leading-none">
                {percent(g)}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative h-48">
              {GRIDLINES.map((g) => (
                <div
                  key={g}
                  className="absolute inset-x-0 border-t border-zinc-200 dark:border-zinc-800"
                  style={{ bottom: `${g * 100}%` }}
                />
              ))}
              <div className="absolute inset-0 flex items-end gap-[2px]">
                {shown.map((week) => (
                  <div
                    key={week.weekStart}
                    title={describe(week)}
                    aria-label={describe(week)}
                    className="group flex h-full flex-1 items-end justify-center hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
                  >
                    {week.newShare != null && (
                      <div
                        className={`w-full max-w-6 rounded-t ${
                          week.isFirstWeek ? "bg-zinc-300 dark:bg-zinc-600" : "bg-[#1DB954] group-hover:bg-[#17a34a]"
                        }`}
                        style={{ height: `${Math.max(week.newShare * 100, 1)}%` }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-1 flex gap-[2px] text-[10px] text-zinc-500">
              {shown.map((week, i) => {
                const month = week.weekStart.slice(5, 7);
                const startsMonth = i === 0 || shown[i - 1].weekStart.slice(5, 7) !== month;
                return (
                  <div key={week.weekStart} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
                    {startsMonth ? formatDateKeyShort(week.weekStart).split(" ")[0] : ""}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Hover a week for details. The gray bar is the week tracking started, when every artist counted as
          new{weeks.length > MAX_WEEKS ? `; showing the last ${MAX_WEEKS} weeks` : ""}.
        </p>
      </figure>

      <details className="text-sm">
        <summary className="cursor-pointer text-zinc-500">Show as table</summary>
        <table className="mt-2 w-full max-w-xl text-left">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="py-1 font-normal">Week of</th>
              <th className="py-1 text-right font-normal">Plays</th>
              <th className="py-1 text-right font-normal">From new artists</th>
              <th className="py-1 text-right font-normal">New artists</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {[...weeks].reverse().map((week) => (
              <tr key={week.weekStart} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1">
                  {formatDateKeyShort(week.weekStart)}
                  {week.isFirstWeek && <span className="text-zinc-500"> (tracking started)</span>}
                </td>
                <td className="py-1 text-right">{week.playCount}</td>
                <td className="py-1 text-right">{week.newShare == null ? "—" : percent(week.newShare)}</td>
                <td className="py-1 text-right">{week.newArtistCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
