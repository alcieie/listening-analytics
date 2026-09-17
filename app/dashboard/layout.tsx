import Link from "next/link";
import { PlaybackWidget } from "@/components/PlaybackWidget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <nav className="flex gap-5 text-sm font-medium">
          <Link href="/dashboard">Overview</Link>
          <Link href="/dashboard/mood">Mood ring</Link>
          <Link href="/dashboard/heatmap">Heatmap</Link>
          <Link href="/dashboard/skips">Skip rate</Link>
        </nav>
        <div className="flex items-center gap-4">
          <PlaybackWidget />
          <form action="/api/auth/spotify/logout" method="POST">
            <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
