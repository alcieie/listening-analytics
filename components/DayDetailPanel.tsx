import Link from "next/link";
import type { DayDetail } from "@/lib/aggregate/heatmap";
import { formatDateKeyLong, plural } from "@/lib/formatDate";

type Props = {
  detail: DayDetail;
  /** Where the close link goes: the page without ?day=. */
  basePath: string;
};

export function DayDetailPanel({ detail, basePath }: Props) {
  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{formatDateKeyLong(detail.date)}</h2>
          <p className="text-sm text-zinc-500">
            {detail.plays.length === 0
              ? "Nothing played this day."
              : [
                  plural(detail.plays.length, "play"),
                  `${detail.minutesListened} min`,
                  detail.topArtist && `mostly ${detail.topArtist.name}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>
        <Link href={basePath} scroll={false} className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Close
        </Link>
      </div>

      {detail.plays.length > 0 && (
        <ol className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
          {detail.plays.map((play) => (
            <li key={play.id} className="flex gap-4 py-2">
              <span className="w-12 shrink-0 tabular-nums text-zinc-500">{play.time}</span>
              <span className="min-w-0">
                <a
                  href={`https://open.spotify.com/track/${play.trackId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
                >
                  {play.trackName}
                </a>
                <span className="text-zinc-500"> · {play.artistName}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
