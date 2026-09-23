"use client";

import { useState } from "react";
import {
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { HourBucket, WeekBucket } from "@/lib/aggregate/mood";

type Props = {
  byHour: HourBucket[];
  byWeek: WeekBucket[];
};

type Point = { label: string; valence: number; energy: number; playCount: number; color: string; opacity: number };

// Without a seeded size, ResponsiveContainer renders nothing until its
// ResizeObserver reports a measurement. In dev that first measurement can be
// missed entirely, leaving the chart permanently blank until an unrelated
// re-render. The observer corrects these numbers on the first frame.
const INITIAL_DIMENSION = { width: 800, height: 360 };

const DAYPARTS = [
  { name: "Night", fromHour: 0, color: "#6366f1" },
  { name: "Morning", fromHour: 6, color: "#f59e0b" },
  { name: "Afternoon", fromHour: 12, color: "#1DB954" },
  { name: "Evening", fromHour: 18, color: "#e11d48" },
];

// Corner labels. The axes are always centered on the neutral midpoint, so
// each corner of the plot is one quadrant however far the axes zoom.
const QUADRANTS = [
  { label: "Intense & dark", className: "left-14 top-2" },
  { label: "Hype", className: "right-3 top-2 text-right" },
  { label: "Low & blue", className: "left-14 bottom-12" },
  { label: "Chill & sunny", className: "right-3 bottom-12 text-right" },
];

function daypartColor(hour: number): string {
  return [...DAYPARTS].reverse().find((d) => hour >= d.fromHour)!.color;
}

function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}${period}`;
}

/**
 * Half-width of an axis domain centered on 50. Zooms in on however much the
 * data actually spreads, so a tight cluster still shows its shape, but never
 * tighter than ±10 so noise isn't blown up into drama.
 */
function halfRange(points: Point[]): number {
  const spread = Math.max(0, ...points.flatMap((p) => [Math.abs(p.valence - 50), Math.abs(p.energy - 50)]));
  return Math.min(50, Math.max(10, Math.ceil((spread + 5) / 5) * 5));
}

function MoodTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="font-semibold">{p.label}</div>
      <div>Energy {Math.round(p.energy)} · Valence {Math.round(p.valence)}</div>
      <div className="text-zinc-500">
        {p.playCount} {p.playCount === 1 ? "play" : "plays"}
      </div>
    </div>
  );
}

/** Energy x valence map; the connecting path shows how the mood drifts. */
export function MoodMap({ byHour, byWeek }: Props) {
  const [mode, setMode] = useState<"hour" | "week">("hour");

  const points: Point[] =
    mode === "hour"
      ? byHour.map((b) => ({
          label: formatHour(b.hour),
          valence: b.avgValence,
          energy: b.avgEnergy,
          playCount: b.playCount,
          color: daypartColor(b.hour),
          opacity: 0.85,
        }))
      : byWeek.map((b, i) => ({
          label: b.week,
          valence: b.avgValence,
          energy: b.avgEnergy,
          playCount: b.playCount,
          color: "#1DB954",
          // Older weeks fade out so the path reads as a trail toward now.
          opacity: byWeek.length === 1 ? 0.85 : 0.2 + (0.65 * i) / (byWeek.length - 1),
        }));

  const half = halfRange(points);
  const domain: [number, number] = [50 - half, 50 + half];
  const ticks = [50 - half, 50, 50 + half];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Mood map</h3>
        <div className="flex rounded-md border border-zinc-200 text-xs dark:border-zinc-700">
          {(
            [
              ["hour", "Through the day"],
              ["week", "Week by week"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`px-3 py-1 first:rounded-l-md last:rounded-r-md ${
                mode === value ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[360px] w-full">
        {QUADRANTS.map((q) => (
          <span
            key={q.label}
            className={`pointer-events-none absolute text-[11px] uppercase tracking-wide text-zinc-400 ${q.className}`}
          >
            {q.label}
          </span>
        ))}
        <ResponsiveContainer initialDimension={INITIAL_DIMENSION}>
          <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <XAxis
              type="number"
              dataKey="valence"
              domain={domain}
              ticks={ticks}
              allowDataOverflow
              fontSize={12}
              label={{ value: "Valence: sad → happy", position: "insideBottom", offset: -4, fontSize: 12 }}
              height={40}
            />
            <YAxis
              type="number"
              dataKey="energy"
              domain={domain}
              ticks={ticks}
              allowDataOverflow
              fontSize={12}
              width={48}
              label={{ value: "Energy: calm → intense", angle: -90, position: "insideLeft", offset: 12, fontSize: 12 }}
            />
            <ZAxis type="number" dataKey="playCount" range={[40, 480]} />
            <ReferenceLine x={50} stroke="currentColor" strokeOpacity={0.25} />
            <ReferenceLine y={50} stroke="currentColor" strokeOpacity={0.25} />
            <Tooltip content={<MoodTooltip />} cursor={false} />
            <Scatter
              data={points}
              line={{ stroke: "currentColor", strokeOpacity: 0.2, strokeWidth: 1.5 }}
              lineType="joint"
              isAnimationActive
            >
              {points.map((p) => (
                <Cell key={p.label} fill={p.color} fillOpacity={p.opacity} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        {mode === "hour" ? (
          <span className="flex flex-wrap gap-3">
            {DAYPARTS.map((d) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </span>
            ))}
          </span>
        ) : (
          <span>Faded dots are older weeks; the trail ends at this week.</span>
        )}
        <span>
          Dot size is play count. Axes zoom to your data; the crosshair is neutral (50).
        </span>
      </div>
    </div>
  );
}
