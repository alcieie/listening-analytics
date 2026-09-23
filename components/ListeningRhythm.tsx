"use client";

import { useState } from "react";
import type { RhythmCell } from "@/lib/aggregate/mood";

type Props = {
  cells: RhythmCell[];
};

type Metric = "plays" | "skips" | "energy";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

// A skip rate from one or two plays is mostly noise.
const MIN_PLAYS_FOR_SKIP_RATE = 3;

const METRICS: Record<Metric, { label: string; rgb: string; low: string; high: string }> = {
  plays: { label: "Plays", rgb: "29 185 84", low: "Fewer", high: "More" },
  skips: { label: "Skip rate", rgb: "225 29 72", low: "0%", high: "100%" },
  energy: { label: "Energy", rgb: "245 158 11", low: "Calmer", high: "More intense" },
};

function hourLabel(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

function skipRate(cell: RhythmCell): number | null {
  return cell.skipKnownCount >= MIN_PLAYS_FOR_SKIP_RATE ? cell.skipCount / cell.skipKnownCount : null;
}

/** Hour x weekday grid of when you listen, how restless you are, and how intense it gets. */
export function ListeningRhythm({ cells }: Props) {
  const [metric, setMetric] = useState<Metric>("plays");
  const byKey = new Map(cells.map((c) => [`${c.weekday}-${c.hour}`, c]));

  const maxPlays = Math.max(1, ...cells.map((c) => c.playCount));
  const energies = cells.map((c) => c.avgEnergy);
  const minEnergy = Math.min(...energies);
  const energyRange = Math.max(1, Math.max(...energies) - minEnergy);

  // 0-1 intensity for the cell under the current metric, or null for "no data".
  function intensity(cell: RhythmCell | undefined): number | null {
    if (!cell) return null;
    if (metric === "plays") return cell.playCount / maxPlays;
    if (metric === "skips") return skipRate(cell);
    // Relative to your own range: the heuristic rarely strays far from 50.
    return (cell.avgEnergy - minEnergy) / energyRange;
  }

  function describe(weekday: number, hour: number, cell: RhythmCell | undefined): string {
    const when = `${WEEKDAYS[weekday]} ${hourLabel(hour)}`;
    if (!cell) return `${when}: no plays`;
    const rate = skipRate(cell);
    return [
      `${when}: ${cell.playCount} ${cell.playCount === 1 ? "play" : "plays"}`,
      rate == null ? "skip rate: not enough plays" : `skip rate ${Math.round(rate * 100)}%`,
      `energy ${Math.round(cell.avgEnergy)}`,
    ].join(", ");
  }

  const { rgb, low, high } = METRICS[metric];
  const columns = { gridTemplateColumns: "repeat(24, minmax(0, 1fr))" };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Weekly rhythm</h3>
        <div className="flex rounded-md border border-zinc-200 text-xs dark:border-zinc-700">
          {(Object.keys(METRICS) as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={`px-3 py-1 first:rounded-l-md last:rounded-r-md ${
                metric === m ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {METRICS[m].label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[560px] gap-2">
          <div className="grid shrink-0 grid-rows-7 gap-[3px] pt-5 text-[10px] text-zinc-500">
            {WEEKDAYS.map((d) => (
              <div key={d} className="flex items-center leading-none">
                {d}
              </div>
            ))}
          </div>

          <div className="flex-1">
            <div className="grid h-5 gap-[3px] text-[10px] text-zinc-500" style={columns}>
              {HOURS.map((h) => (
                <div key={h}>{h % 3 === 0 ? hourLabel(h) : ""}</div>
              ))}
            </div>

            <div className="grid grid-rows-7 gap-[3px]">
              {WEEKDAYS.map((_, weekday) => (
                <div key={weekday} className="grid gap-[3px]" style={columns}>
                  {HOURS.map((hour) => {
                    const cell = byKey.get(`${weekday}-${hour}`);
                    const value = intensity(cell);
                    return (
                      <div
                        key={hour}
                        title={describe(weekday, hour, cell)}
                        className="h-4 w-full rounded-[2px] bg-zinc-100 transition-colors duration-300 dark:bg-zinc-800"
                        style={value == null ? undefined : { backgroundColor: `rgb(${rgb} / ${0.12 + 0.88 * value})` }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>
          {metric === "skips"
            ? `Grey cells have fewer than ${MIN_PLAYS_FOR_SKIP_RATE} plays with a known skip outcome.`
            : metric === "energy"
              ? "Shaded relative to your own calmest and most intense hours."
              : "Hover a cell for plays, skip rate and energy."}
        </span>
        <span className="flex items-center gap-1">
          {low}
          {[0.12, 0.34, 0.56, 0.78, 1].map((a) => (
            <span key={a} className="h-[10px] w-[10px] rounded-[2px]" style={{ backgroundColor: `rgb(${rgb} / ${a})` }} />
          ))}
          {high}
        </span>
      </div>
    </div>
  );
}
