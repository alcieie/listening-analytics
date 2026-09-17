"use client";

import { useEffect, useRef, useState } from "react";

// Minimal shape of the bits of the Web Playback SDK this widget uses.
type SpotifyTrack = { id: string; name: string; duration_ms: number };

type SpotifyPlaybackState = {
  paused: boolean;
  position: number;
  duration: number;
  track_window: { current_track: SpotifyTrack };
};

type SpotifyPlayerInstance = {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (arg: unknown) => void): void;
  getOAuthToken(cb: (token: string) => void): void;
  togglePlay(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
};

type SpotifyPlayerConstructor = new (options: {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume?: number;
}) => SpotifyPlayerInstance;

declare global {
  interface Window {
    Spotify?: { Player: SpotifyPlayerConstructor };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

type TrackRef = { trackId: string; lastPositionMs: number; durationMs: number } | null;

const SDK_SCRIPT_ID = "spotify-web-playback-sdk";
const COMPLETION_RATIO = 0.95;

export function PlaybackWidget() {
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable" | "not-premium">("loading");
  const [isPaused, setIsPaused] = useState(true);
  const [trackName, setTrackName] = useState<string | null>(null);
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const lastTrackRef = useRef<TrackRef>(null);
  const explicitSkipPendingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const tokenRes = await fetch("/api/playback/token");
      if (!tokenRes.ok) {
        if (!cancelled) setStatus("unavailable");
        return;
      }
      const { accessToken } = await tokenRes.json();

      if (!document.getElementById(SDK_SCRIPT_ID)) {
        const script = document.createElement("script");
        script.id = SDK_SCRIPT_ID;
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }

      window.onSpotifyWebPlaybackSDKReady = () => {
        if (cancelled || !window.Spotify) return;

        const player = new window.Spotify.Player({
          name: "Listening Analytics Web Player",
          getOAuthToken: (cb) => cb(accessToken),
          volume: 0.5,
        });

        player.addListener("initialization_error", () => setStatus("unavailable"));
        player.addListener("authentication_error", () => setStatus("unavailable"));
        player.addListener("account_error", () => setStatus("not-premium"));

        player.addListener("player_state_changed", (arg: unknown) => {
          const state = arg as SpotifyPlaybackState | null;
          if (!state) return;

          const current = state.track_window.current_track;
          const previous = lastTrackRef.current;

          if (previous && previous.trackId !== current.id) {
            const listenedMs = previous.lastPositionMs;
            const isSkip = listenedMs < previous.durationMs * COMPLETION_RATIO;
            const rawEventType = explicitSkipPendingRef.current ? "skip_forward" : "track_change";

            fetch("/api/playback/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                trackId: previous.trackId,
                trackDurationMs: previous.durationMs,
                listenedMs,
                isSkip,
                rawEventType,
              }),
            }).catch(() => {});

            explicitSkipPendingRef.current = false;
          }

          lastTrackRef.current = {
            trackId: current.id,
            lastPositionMs: state.position,
            durationMs: current.duration_ms ?? state.duration,
          };

          setTrackName(current.name);
          setIsPaused(state.paused);
          setStatus("ready");
        });

        player.connect();
        playerRef.current = player;
      };
    }

    init();

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
    };
  }, []);

  if (status === "loading") return null;

  if (status === "unavailable") {
    return (
      <p className="text-xs text-zinc-500">In-app player unavailable right now.</p>
    );
  }

  if (status === "not-premium") {
    return (
      <p className="text-xs text-zinc-500">
        The in-app player (for precise skip detection) requires Spotify Premium. Skip stats will
        still populate from the passive heuristic based on your listening everywhere else.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
      <button
        onClick={() => playerRef.current?.previousTrack()}
        className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        aria-label="Previous"
      >
        ⏮
      </button>
      <button
        onClick={() => playerRef.current?.togglePlay()}
        className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        aria-label={isPaused ? "Play" : "Pause"}
      >
        {isPaused ? "▶" : "⏸"}
      </button>
      <button
        onClick={() => {
          explicitSkipPendingRef.current = true;
          playerRef.current?.nextTrack();
        }}
        className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        aria-label="Skip"
      >
        ⏭
      </button>
      <span className="truncate text-zinc-600 dark:text-zinc-400">
        {trackName ?? "Nothing playing on this device"}
      </span>
    </div>
  );
}
