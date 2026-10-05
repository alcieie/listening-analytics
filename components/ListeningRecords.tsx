import type { ListeningRecords as Records } from "@/lib/aggregate/heatmap";
import { formatDateKeyShort, plural } from "@/lib/formatDate";
import { StatTile } from "./StatTile";

export function ListeningRecords({ records }: { records: Records }) {
  const { currentStreak, longestStreak, biggestDay, mostRepeatedInADay } = records;
  // A track played once isn't a repeat worth calling a record.
  const repeat = mostRepeatedInADay && mostRepeatedInADay.playCount > 1 ? mostRepeatedInADay : null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Current streak"
        value={plural(currentStreak, "day")}
        detail={currentStreak > 0 ? "Listening every day" : "Play something to start one"}
      />
      <StatTile
        label="Longest streak"
        value={longestStreak ? plural(longestStreak.days, "day") : "—"}
        detail={
          longestStreak
            ? longestStreak.days === 1
              ? formatDateKeyShort(longestStreak.start)
              : `${formatDateKeyShort(longestStreak.start)} – ${formatDateKeyShort(longestStreak.end)}`
            : undefined
        }
      />
      <StatTile
        label="Biggest day"
        value={biggestDay ? plural(biggestDay.playCount, "play") : "—"}
        detail={biggestDay ? `${formatDateKeyShort(biggestDay.date)} · ${biggestDay.minutesListened} min` : undefined}
      />
      <StatTile
        label="Most plays of one song in a day"
        value={repeat ? `${repeat.playCount}×` : "—"}
        detail={repeat ? `${repeat.trackName} · ${formatDateKeyShort(repeat.date)}` : "No song played twice in a day yet"}
      />
    </div>
  );
}
