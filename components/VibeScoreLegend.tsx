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
          from whatever Spotify still exposes: artist genres, popularity, release era, and the
          explicit flag.
        </p>
        <p>
          <strong>As of February 2026 that heuristic is badly degraded.</strong> Spotify stopped
          returning <code>genres</code> and <code>popularity</code> for Development Mode apps, and
          genre keywords were doing most of the work. What&apos;s left is release era plus the
          explicit flag, which pins nearly every track near the neutral midpoint — so the current
          charts show very little real variation.
        </p>
        <p>
          Read them as &ldquo;not measuring much right now&rdquo; rather than &ldquo;your
          listening is uniformly average.&rdquo; Restoring the genre signal needs either extended
          API quota from Spotify or a third-party genre source.
        </p>
      </div>
    </details>
  );
}
