export function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#1DB954]/10 px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200">
      <span>
        You&apos;re viewing a <strong>live, read-only demo</strong> of my own real listening data —
        no login required.
      </span>
      <a
        href={process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "#"}
        className="font-medium text-[#1DB954] underline underline-offset-2"
      >
        Deploy your own →
      </a>
    </div>
  );
}
