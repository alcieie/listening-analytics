import type { ArtistSkipStats, GenreSkipStats } from "@/lib/aggregate/skips";
import { SourceBadge } from "./SourceBadge";

type Props = {
  byArtist: ArtistSkipStats[];
  byGenre: GenreSkipStats[];
};

function Bar({ rate }: { rate: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div
        className="h-2 rounded-full bg-red-400"
        style={{ width: `${Math.round(rate * 100)}%` }}
      />
    </div>
  );
}

export function SkipBreakdown({ byArtist, byGenre }: Props) {
  if (byArtist.length === 0 && byGenre.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No skip data yet — this needs at least two consecutive plays to infer anything.
      </p>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h3 className="mb-3 font-semibold">By artist</h3>
        <ul className="space-y-3">
          {byArtist.slice(0, 15).map((row) => (
            <li key={row.artistId}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{row.artistName}</span>
                <span className="flex items-center gap-2 text-zinc-500">
                  {Math.round(row.skipRate * 100)}% of {row.playCount}
                  {row.sdkObservedCount > 0 && <SourceBadge source="sdk-observed" confidence="high" />}
                </span>
              </div>
              <Bar rate={row.skipRate} />
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 font-semibold">By genre</h3>
        <ul className="space-y-3">
          {byGenre.slice(0, 15).map((row) => (
            <li key={row.genre}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{row.genre}</span>
                <span className="text-zinc-500">
                  {Math.round(row.skipRate * 100)}% of {row.playCount}
                </span>
              </div>
              <Bar rate={row.skipRate} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
