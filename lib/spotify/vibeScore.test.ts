import { describe, expect, it } from "vitest";
import { computeVibeScore } from "./vibeScore";

describe("computeVibeScore", () => {
  it("returns neutral 50/50 for no signal at all", () => {
    const score = computeVibeScore({
      genres: [],
      popularity: null,
      releaseDate: null,
      explicit: false,
    });
    expect(score.energy).toBe(50);
    expect(score.valence).toBe(50);
  });

  it("pushes energy up and valence down for aggressive genres", () => {
    const score = computeVibeScore({
      genres: ["death metal", "hardcore techno"],
      popularity: null,
      releaseDate: null,
      explicit: false,
    });
    expect(score.energy).toBeGreaterThan(50);
    expect(score.valence).toBeLessThan(50);
  });

  it("pushes both up for upbeat genres like disco", () => {
    const score = computeVibeScore({
      genres: ["disco"],
      popularity: null,
      releaseDate: null,
      explicit: false,
    });
    expect(score.energy).toBeGreaterThan(50);
    expect(score.valence).toBeGreaterThan(50);
  });

  it("pulls energy down for ambient/acoustic genres", () => {
    const score = computeVibeScore({
      genres: ["ambient", "acoustic"],
      popularity: 50,
      releaseDate: null,
      explicit: false,
    });
    expect(score.energy).toBeLessThan(50);
  });

  it("clamps output to the 0-100 range even with many stacked signals", () => {
    const score = computeVibeScore({
      genres: ["hardcore", "metal", "punk", "drill", "edm"],
      popularity: 100,
      releaseDate: "2015-01-01",
      explicit: true,
    });
    expect(score.energy).toBeLessThanOrEqual(100);
    expect(score.energy).toBeGreaterThanOrEqual(0);
    expect(score.valence).toBeLessThanOrEqual(100);
    expect(score.valence).toBeGreaterThanOrEqual(0);
  });

  it("gives low popularity a negative nudge relative to high popularity", () => {
    const low = computeVibeScore({
      genres: [],
      popularity: 5,
      releaseDate: null,
      explicit: false,
    });
    const high = computeVibeScore({
      genres: [],
      popularity: 95,
      releaseDate: null,
      explicit: false,
    });
    expect(high.energy).toBeGreaterThan(low.energy);
  });

  it("ignores unmapped/unknown genres (falls back to neutral contribution)", () => {
    const score = computeVibeScore({
      genres: ["some-made-up-microgenre-xyz"],
      popularity: null,
      releaseDate: null,
      explicit: false,
    });
    expect(score.energy).toBe(50);
    expect(score.valence).toBe(50);
  });
});
