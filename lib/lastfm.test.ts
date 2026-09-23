import { describe, expect, it } from "vitest";
import { pickTags } from "./lastfm";

describe("pickTags", () => {
  it("keeps genre-like tags, strongest first, lowercased", () => {
    expect(
      pickTags([
        { name: "Electronic", count: 60 },
        { name: "Synthpop", count: 100 },
      ])
    ).toEqual(["synthpop", "electronic"]);
  });

  it("drops weak, biographical, decade and duplicate tags", () => {
    expect(
      pickTags([
        { name: "indie", count: 100 },
        { name: "seen live", count: 90 },
        { name: "British", count: 80 },
        { name: "80s", count: 70 },
        { name: "1990s", count: 70 },
        { name: "INDIE", count: 50 },
        { name: "shoegaze", count: 5 },
      ])
    ).toEqual(["indie"]);
  });

  it("caps the number of tags", () => {
    const tags = Array.from({ length: 20 }, (_, i) => ({ name: `tag${i}`, count: 100 - i }));
    expect(pickTags(tags)).toHaveLength(8);
  });
});
