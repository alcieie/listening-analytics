import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * Ingests real-time skip/pause/track-change events from the in-app Web
 * Playback SDK player (see components/PlaybackWidget.tsx). These are more
 * precise than the passive poller's inference but only cover listening
 * that happens inside this app.
 */
export async function POST(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const { trackId, trackDurationMs, listenedMs, rawEventType, isSkip } = body as {
    trackId: string;
    trackDurationMs: number;
    listenedMs: number;
    rawEventType: string;
    isSkip: boolean;
  };

  if (!trackId || typeof trackDurationMs !== "number" || typeof listenedMs !== "number") {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  // Best-effort match to a stored play row from the same track within the
  // last few minutes, so this event can out-rank the passive inference for
  // that exact play. If none is found yet (recently-played hasn't caught up
  // via polling), the event is still stored with play_id null.
  const lookbackIso = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: matchingPlay } = await supabase
    .from("plays")
    .select("id")
    .eq("spotify_account_id", session.spotifyAccountId)
    .eq("track_id", trackId)
    .gte("played_at", lookbackIso)
    .order("played_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("skip_events").upsert(
    {
      spotify_account_id: session.spotifyAccountId,
      play_id: matchingPlay?.id ?? null,
      track_id: trackId,
      source: "sdk-observed",
      is_skip: isSkip,
      raw_event_type: rawEventType,
      confidence: "high",
      listened_ms: listenedMs,
      track_duration_ms: trackDurationMs,
    },
    { onConflict: "play_id,source" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
