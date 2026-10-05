import { OBSESSION_PLAYS_PER_WEEK, PHASE_GAP_DAYS, type Obsession } from "@/lib/aggregate/onRepeat";
import { formatDateKeyShort, plural } from "@/lib/formatDate";

function ObsessionRow({ obsession }: { obsession: Obsession }) {
  const { trackId, trackName, artistName, playCount, peakWeekPlays, start, end, lengthDays, ongoing } = obsession;
  return (
    <li className="flex items-baseline justify-between gap-4 py-3">
      <div className="min-w-0">
        <a
          href={`https://open.spotify.com/track/${trackId}`}
          target="_blank"
          rel="noreferrer"
          className="font-medium hover:underline"
        >
          {trackName}
        </a>
        <div className="text-sm text-zinc-500">{artistName}</div>
      </div>
      <div className="shrink-0 text-right text-sm">
        <div>
          {plural(playCount, "play")} · {ongoing ? `${plural(lengthDays, "day")} so far` : `lasted ${plural(lengthDays, "day")}`}
        </div>
        <div className="text-zinc-500">
          {start === end ? formatDateKeyShort(start) : `${formatDateKeyShort(start)} – ${formatDateKeyShort(end)}`}
          {" · "}peak {peakWeekPlays}/week
        </div>
      </div>
    </li>
  );
}

export function ObsessionList({ obsessions }: { obsessions: Obsession[] }) {
  const current = obsessions.filter((o) => o.ongoing);
  const past = obsessions.filter((o) => !o.ongoing);

  return (
    <div className="space-y-8">
      <p className="text-sm text-zinc-500">
        Songs you played {OBSESSION_PLAYS_PER_WEEK}+ times in a week. A phase ends once a song goes{" "}
        {PHASE_GAP_DAYS} days without a play.
      </p>

      <section>
        <h2 className="font-semibold">On repeat now</h2>
        {current.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nothing on heavy rotation right now.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {current.map((o) => (
              <ObsessionRow key={`${o.trackId}-${o.start}`} obsession={o} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-semibold">Past obsessions</h2>
        {past.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">None yet — these show up once a phase ends.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {past.map((o) => (
              <ObsessionRow key={`${o.trackId}-${o.start}`} obsession={o} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
