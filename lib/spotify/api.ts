const API_BASE = "https://api.spotify.com/v1";

async function spotifyFetch(url: string, accessToken: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 429) {
    const retryAfterSeconds = parseInt(res.headers.get("Retry-After") ?? "1", 10);
    await new Promise((resolve) => setTimeout(resolve, (retryAfterSeconds + 1) * 1000));
    return spotifyFetch(url, accessToken);
  }

  return res;
}

export type SpotifyMe = {
  id: string;
  display_name: string | null;
  email: string | null;
};

export async function getMe(accessToken: string): Promise<SpotifyMe> {
  const res = await spotifyFetch(`${API_BASE}/me`, accessToken);
  if (!res.ok) throw new Error(`GET /me failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export type RecentlyPlayedItem = {
  played_at: string;
  track: {
    id: string;
    name: string;
    duration_ms: number;
    popularity: number;
    explicit: boolean;
    album: {
      name: string;
      release_date: string;
      release_date_precision: string;
    };
    artists: Array<{ id: string; name: string }>;
  };
};

export type RecentlyPlayedResponse = {
  items: RecentlyPlayedItem[];
  cursors?: { after?: string; before?: string };
};

export async function getRecentlyPlayed(
  accessToken: string,
  after?: string
): Promise<RecentlyPlayedResponse> {
  const params = new URLSearchParams({ limit: "50" });
  if (after) params.set("after", after);

  const res = await spotifyFetch(
    `${API_BASE}/me/player/recently-played?${params.toString()}`,
    accessToken
  );
  if (!res.ok) {
    throw new Error(`GET /me/player/recently-played failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type SpotifyArtist = {
  id: string;
  genres: string[];
  popularity: number;
};

/**
 * Spotify removed the batch `GET /artists` endpoint (up to 50 ids at once)
 * for Development Mode apps as of February 2026 — only the single-artist
 * endpoint still works there. This fetches one artist at a time so it
 * works regardless of quota mode; the caller is responsible for only
 * calling it for artists not already in the genre cache.
 */
export async function getArtist(accessToken: string, artistId: string): Promise<SpotifyArtist> {
  const res = await spotifyFetch(`${API_BASE}/artists/${artistId}`, accessToken);
  if (!res.ok) throw new Error(`GET /artists/${artistId} failed: ${res.status} ${await res.text()}`);
  return res.json();
}
