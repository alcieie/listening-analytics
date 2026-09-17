import { describe, expect, it } from "vitest";
import { inferSkip } from "./skipInference";

const THIRTY_MIN = 30 * 60 * 1000;

describe("inferSkip", () => {
  it("excludes gaps longer than the session gap max (new listening session)", () => {
    const result = inferSkip({
      durationMs: 200_000,
      gapMs: THIRTY_MIN + 1,
      sessionGapMaxMs: THIRTY_MIN,
    });
    expect(result.excluded).toBe(true);
  });

  it("marks a full-length play as not skipped, high confidence", () => {
    const result = inferSkip({
      durationMs: 200_000,
      gapMs: 200_000,
      sessionGapMaxMs: THIRTY_MIN,
    });
    expect(result).toEqual({ excluded: false, isSkip: false, confidence: "high" });
  });

  it("marks a near-instant skip as skipped, high confidence", () => {
    const result = inferSkip({
      durationMs: 200_000,
      gapMs: 5_000,
      sessionGapMaxMs: THIRTY_MIN,
    });
    expect(result).toEqual({ excluded: false, isSkip: true, confidence: "high" });
  });

  it("marks a gap in the 70-90% band as skipped, low confidence", () => {
    const result = inferSkip({
      durationMs: 200_000,
      gapMs: 160_000, // 80% of duration
      sessionGapMaxMs: THIRTY_MIN,
    });
    expect(result).toEqual({ excluded: false, isSkip: true, confidence: "low" });
  });

  it("treats exactly the threshold ratio as not-skipped", () => {
    const result = inferSkip({
      durationMs: 200_000,
      gapMs: 180_000, // exactly 90%
      sessionGapMaxMs: THIRTY_MIN,
    });
    expect(result).toEqual({ excluded: false, isSkip: false, confidence: "high" });
  });
});
