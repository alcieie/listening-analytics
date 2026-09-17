import { describe, expect, it } from "vitest";
import { getDateKeyInTimeZone, getHourInTimeZone, getIsoWeekKeyInTimeZone } from "./timeBuckets";

describe("timeBuckets", () => {
  it("computes the UTC hour correctly", () => {
    expect(getHourInTimeZone("2026-01-15T23:30:00Z", "UTC")).toBe(23);
  });

  it("shifts the hour for a non-UTC timezone", () => {
    // 23:30 UTC on Jan 15 is 15:30 the same day in America/Los_Angeles (PST, UTC-8).
    expect(getHourInTimeZone("2026-01-15T23:30:00Z", "America/Los_Angeles")).toBe(15);
  });

  it("can roll the date key back a day in an earlier timezone", () => {
    // 02:00 UTC on Jan 16 is 18:00 on Jan 15 in America/Los_Angeles.
    expect(getDateKeyInTimeZone("2026-01-16T02:00:00Z", "America/Los_Angeles")).toBe("2026-01-15");
    expect(getDateKeyInTimeZone("2026-01-16T02:00:00Z", "UTC")).toBe("2026-01-16");
  });

  it("computes a stable ISO week key", () => {
    // Jan 15, 2026 is a Thursday in ISO week 3 of 2026.
    expect(getIsoWeekKeyInTimeZone("2026-01-15T12:00:00Z", "UTC")).toBe("2026-W03");
  });

  it("rolls over into week 1 of the next ISO year correctly", () => {
    // Dec 31, 2025 is a Wednesday, ISO week 1 of 2026 (ISO years don't match calendar years at the boundary).
    expect(getIsoWeekKeyInTimeZone("2025-12-31T12:00:00Z", "UTC")).toBe("2026-W01");
  });
});
