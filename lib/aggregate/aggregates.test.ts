import { describe, expect, it } from "vitest";
import { buildHeatmap, getDayDetail, getListeningRecords } from "./heatmap";
import { getObsessions } from "./onRepeat";
import { getDiscoveryWeeks } from "./discovery";
import type { PlayRow } from "./shared";

let nextId = 1;
function play(playedAt: string, trackId = "t1", artistId = "a1"): PlayRow {
  return {
    id: nextId++,
    played_at: playedAt,
    duration_ms: 180_000,
    track_id: trackId,
    track_name: `Track ${trackId}`,
    album_name: "Album",
    primary_artist_id: artistId,
    primary_artist_name: `Artist ${artistId}`,
  };
}

/** n plays of one track, one per day starting at the given date. */
function daily(startDate: string, n: number, trackId = "t1"): PlayRow[] {
  const start = new Date(startDate + "T12:00:00Z").getTime();
  return Array.from({ length: n }, (_, i) => play(new Date(start + i * 86_400_000).toISOString(), trackId));
}

describe("getListeningRecords", () => {
  it("finds the longest streak and keeps the current one alive through an empty today", () => {
    const plays = [
      ...daily("2026-03-01", 4), // Mar 1-4: 4-day streak
      ...daily("2026-03-10", 2), // Mar 10-11
    ];
    const days = buildHeatmap(plays, "UTC");

    const records = getListeningRecords(plays, days, "2026-03-12", "UTC");
    expect(records.longestStreak).toEqual({ days: 4, start: "2026-03-01", end: "2026-03-04" });
    expect(records.currentStreak).toBe(2);

    expect(getListeningRecords(plays, days, "2026-03-13", "UTC").currentStreak).toBe(0);
  });

  it("reports the biggest day and the most-repeated track within one day", () => {
    const plays = [
      play("2026-03-01T09:00:00Z", "a"),
      play("2026-03-02T09:00:00Z", "b"),
      play("2026-03-02T10:00:00Z", "b"),
      play("2026-03-02T11:00:00Z", "c"),
    ];
    const records = getListeningRecords(plays, buildHeatmap(plays, "UTC"), "2026-03-02", "UTC");
    expect(records.biggestDay?.date).toBe("2026-03-02");
    expect(records.mostRepeatedInADay).toMatchObject({ date: "2026-03-02", trackName: "Track b", playCount: 2 });
  });
});

describe("getDayDetail", () => {
  it("lists one local day's plays with the top artist", () => {
    const plays = [
      play("2026-03-01T23:30:00Z", "x", "early"), // still Mar 1 in UTC, Mar 2 in Tokyo
      play("2026-03-02T01:00:00Z", "y", "late"),
      play("2026-03-02T02:00:00Z", "z", "late"),
    ];
    const detail = getDayDetail(plays, "2026-03-02", "Asia/Tokyo");
    expect(detail.plays.map((p) => p.time)).toEqual(["08:30", "10:00", "11:00"]);
    expect(detail.topArtist).toEqual({ name: "Artist late", playCount: 2 });
  });
});

describe("getObsessions", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("needs 5 plays inside a week", () => {
    const spread = Array.from({ length: 5 }, (_, i) =>
      play(new Date(Date.UTC(2026, 4, 1 + i * 2, 12)).toISOString())
    ); // May 1-9: 5 plays over 8 days
    expect(getObsessions(spread, now, "UTC")).toEqual([]);
    expect(getObsessions(daily("2026-05-01", 5), now, "UTC")).toHaveLength(1);
  });

  it("splits phases at a two-week silence and marks the recent one ongoing", () => {
    const plays = [...daily("2026-03-01", 6), ...daily("2026-05-25", 5)];
    const [current, past] = getObsessions(plays, now, "UTC");
    expect(current).toMatchObject({ start: "2026-05-25", end: "2026-05-29", playCount: 5, ongoing: true });
    expect(past).toMatchObject({ start: "2026-03-01", end: "2026-03-06", lengthDays: 6, ongoing: false });
  });
});

describe("getDiscoveryWeeks", () => {
  it("counts plays of artists unheard before each week, filling empty weeks", () => {
    const plays = [
      play("2026-03-02T12:00:00Z", "t", "old"), // Mon, week 1
      play("2026-03-17T12:00:00Z", "t", "old"), // week 3
      play("2026-03-17T13:00:00Z", "u", "new"),
      play("2026-03-18T13:00:00Z", "u", "new"),
    ];
    const weeks = getDiscoveryWeeks(plays, "UTC");
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-03-02", "2026-03-09", "2026-03-16"]);
    expect(weeks[0]).toMatchObject({ isFirstWeek: true, newShare: 1 });
    expect(weeks[1]).toMatchObject({ playCount: 0, newShare: null });
    expect(weeks[2]).toMatchObject({ newArtistCount: 1, newArtistPlayCount: 2, newShare: 2 / 3 });
  });
});
