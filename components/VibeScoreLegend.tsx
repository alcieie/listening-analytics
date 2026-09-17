export function VibeScoreLegend() {
  return (
    <details className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
      <summary className="cursor-pointer font-medium text-zinc-900 dark:text-zinc-100">
        ⚠️ &ldquo;Energy&rdquo; and &ldquo;valence&rdquo; here are an approximation, not real Spotify audio-features
      </summary>
      <div className="mt-2 space-y-2">
        <p>
          Spotify shut off public access to its real energy/valence/danceability endpoint
          (<code>/audio-features</code>) for all new API apps in November 2024. This app never
          had access to it, so these charts instead use a <strong>vibe-score heuristic</strong> built
          from data Spotify still exposes freely: each track&apos;s artist genres, popularity,
          release era, and explicit flag.
        </p>
        <p>
          Genre keywords do most of the work; popularity and release era are weak, speculative
          nudges. It&apos;s a reasonable proxy for &ldquo;is this loud/fast vs. mellow&rdquo; and
          &ldquo;upbeat vs. moody&rdquo; at a glance, but it is not a measurement of the actual
          audio.
        </p>
      </div>
    </details>
  );
}
