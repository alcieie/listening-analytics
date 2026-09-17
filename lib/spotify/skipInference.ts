/**
 * Passive skip inference from consecutive Recently Played entries. Spotify's
 * API gives no direct "skipped" flag, so this compares the gap between two
 * plays' start times against the earlier track's duration: a much shorter
 * gap than the track's length means it was cut short.
 */

export type SkipInferenceInput = {
  durationMs: number;
  gapMs: number;
  sessionGapMaxMs: number;
};

export type SkipInferenceResult =
  | { excluded: true }
  | { excluded: false; isSkip: boolean; confidence: "high" | "low" };

const SKIP_THRESHOLD_RATIO = 0.9; // gap below 90% of duration => likely skipped
const LOW_CONFIDENCE_BAND_RATIO = 0.7; // 70%-90% of duration => low-confidence skip

export function inferSkip(input: SkipInferenceInput): SkipInferenceResult {
  const { durationMs, gapMs, sessionGapMaxMs } = input;

  if (gapMs > sessionGapMaxMs) {
    // Device idle / new session — the gap carries no completion signal.
    return { excluded: true };
  }

  if (gapMs >= durationMs * SKIP_THRESHOLD_RATIO) {
    return { excluded: false, isSkip: false, confidence: "high" };
  }

  if (gapMs >= durationMs * LOW_CONFIDENCE_BAND_RATIO) {
    return { excluded: false, isSkip: true, confidence: "low" };
  }

  return { excluded: false, isSkip: true, confidence: "high" };
}
