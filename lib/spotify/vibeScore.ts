/**
 * Approximate "vibe score" proxy for energy/valence, built entirely from
 * data Spotify's public API still exposes (genres, popularity, release date,
 * explicit flag). This is NOT the real /audio-features energy/valence —
 * that endpoint has been unreachable for new API apps since Nov 27, 2024.
 * Every weight below is a tunable constant, not a derived/calibrated model.
 */

export type VibeInput = {
  genres: string[];
  popularity: number | null; // 0-100
  releaseDate: string | null; // "YYYY", "YYYY-MM", or "YYYY-MM-DD"
  explicit: boolean;
};

export type VibeScore = {
  energy: number; // 0-100
  valence: number; // 0-100
};

type GenreDelta = { energy?: number; valence?: number };

// Keyword -> delta. Matched as a substring against each genre string, so
// "electropop" matches both "electro" and "pop". Order doesn't matter;
// all matching keywords' deltas are summed then the total is clamped.
const GENRE_KEYWORD_DELTAS: Record<string, GenreDelta> = {
  edm: { energy: 25 },
  techno: { energy: 25 },
  hardcore: { energy: 30 },
  metal: { energy: 30, valence: -10 },
  punk: { energy: 20, valence: -5 },
  house: { energy: 15, valence: 10 },
  dance: { energy: 15, valence: 10 },
  trap: { energy: 15 },
  rock: { energy: 10 },
  drill: { energy: 15, valence: -10 },
  ambient: { energy: -25 },
  acoustic: { energy: -20 },
  lofi: { energy: -20, valence: 5 },
  "lo-fi": { energy: -20, valence: 5 },
  classical: { energy: -20 },
  chill: { energy: -15, valence: 10 },
  sleep: { energy: -30 },
  piano: { energy: -15 },
  pop: { valence: 15 },
  disco: { energy: 15, valence: 20 },
  funk: { energy: 10, valence: 20 },
  reggae: { valence: 20 },
  soul: { valence: 10 },
  happy: { valence: 25 },
  sad: { valence: -25 },
  emo: { valence: -20 },
  doom: { energy: -10, valence: -25 },
  blues: { valence: -15 },
  gospel: { valence: 15 },
};

function scoreGenres(genres: string[]): { energy: number; valence: number } {
  let energy = 0;
  let valence = 0;
  const lowerGenres = genres.map((g) => g.toLowerCase());

  for (const genre of lowerGenres) {
    for (const [keyword, delta] of Object.entries(GENRE_KEYWORD_DELTAS)) {
      if (genre.includes(keyword)) {
        energy += delta.energy ?? 0;
        valence += delta.valence ?? 0;
      }
    }
  }

  return { energy, valence };
}

// Weakest signal: broad, stereotype-level production-era associations.
const ERA_DELTAS: Array<{ maxYear: number; energy: number; valence: number }> = [
  { maxYear: 1969, energy: -5, valence: 0 },
  { maxYear: 1979, energy: 5, valence: 10 }, // disco era
  { maxYear: 1989, energy: 5, valence: 0 },
  { maxYear: 1999, energy: 0, valence: 0 },
  { maxYear: 2009, energy: 5, valence: -5 }, // 2000s radio rock
  { maxYear: 2019, energy: 10, valence: 0 }, // 2010s EDM/trap boom
  { maxYear: 9999, energy: 0, valence: 5 }, // 2020s bedroom-pop
];

function eraDelta(releaseDate: string | null): { energy: number; valence: number } {
  if (!releaseDate) return { energy: 0, valence: 0 };
  const year = parseInt(releaseDate.slice(0, 4), 10);
  if (!Number.isFinite(year)) return { energy: 0, valence: 0 };
  const bucket = ERA_DELTAS.find((b) => year <= b.maxYear) ?? ERA_DELTAS[ERA_DELTAS.length - 1];
  return { energy: bucket.energy, valence: bucket.valence };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeVibeScore(input: VibeInput): VibeScore {
  const genreScore = scoreGenres(input.genres);
  const era = eraDelta(input.releaseDate);

  const popularityDelta =
    input.popularity == null ? 0 : ((input.popularity - 50) / 50) * 15;
  const popularityValenceDelta =
    input.popularity == null ? 0 : ((input.popularity - 50) / 50) * 10;

  const explicitDelta = input.explicit ? 5 : 0;

  const energy = clamp(
    50 +
      clamp(genreScore.energy, -40, 40) +
      clamp(popularityDelta, -15, 15) +
      clamp(era.energy, -10, 10) +
      explicitDelta,
    0,
    100
  );

  const valence = clamp(
    50 +
      clamp(genreScore.valence, -40, 40) +
      clamp(popularityValenceDelta, -10, 10) +
      clamp(era.valence, -10, 10),
    0,
    100
  );

  return { energy, valence };
}
