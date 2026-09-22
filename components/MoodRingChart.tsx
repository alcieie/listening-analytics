"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HourBucket, WeekBucket } from "@/lib/aggregate/mood";

type Props = {
  byHour: HourBucket[];
  byWeek: WeekBucket[];
};

// Without a seeded size, ResponsiveContainer renders nothing until its
// ResizeObserver reports a measurement. In dev that first measurement can be
// missed entirely, leaving the chart permanently blank until an unrelated
// re-render. The observer corrects these numbers on the first frame.
const INITIAL_DIMENSION = { width: 800, height: 256 };

function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}${period}`;
}

export function MoodRingChart({ byHour, byWeek }: Props) {
  const hourData = byHour.map((b) => ({ ...b, label: formatHour(b.hour) }));

  if (byHour.length === 0 && byWeek.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No listening data yet — the poller only sees plays from the moment you connect Spotify
        forward, so check back after some listening happens.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h3 className="mb-2 font-semibold">Day/night pattern</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer initialDimension={INITIAL_DIMENSION}>
            <LineChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgEnergy" name="Energy (proxy)" stroke="#1DB954" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="avgValence" name="Valence (proxy)" stroke="#8884d8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Weekly trend</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer initialDimension={INITIAL_DIMENSION}>
            <LineChart data={byWeek}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="week" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgEnergy" name="Energy (proxy)" stroke="#1DB954" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="avgValence" name="Valence (proxy)" stroke="#8884d8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
