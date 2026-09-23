import type { HourBucket, RhythmCell, WeekBucket } from "@/lib/aggregate/mood";
import { ListeningRhythm } from "./ListeningRhythm";
import { MoodMap } from "./MoodMap";

type Props = {
  byHour: HourBucket[];
  byWeek: WeekBucket[];
  rhythm: RhythmCell[];
};

export function MoodRingChart({ byHour, byWeek, rhythm }: Props) {
  if (byHour.length === 0 && byWeek.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No listening data yet — the poller only sees plays from the moment you connect Spotify
        forward, so check back after some listening happens.
      </p>
    );
  }

  return (
    <div className="space-y-12">
      <MoodMap byHour={byHour} byWeek={byWeek} />
      <ListeningRhythm cells={rhythm} />
    </div>
  );
}
