/**
 * Last.fm artist tags as a stand-in for Spotify genres, which Spotify stopped
 * returning to Development Mode apps in February 2026. Tags are crowd-sourced
 * and noisier than Spotify's genres, but cover the same vocabulary ("indie
 * rock", "ambient", "synthpop") plus mood words ("mellow", "melancholic")
 * that the vibe-score keyword table can use directly.
 */

const API_BASE = "https://ws.audioscrobbler.com/2.0/";

// Last.fm's "The artist you supplied could not be found".
const ERROR_ARTIST_NOT_FOUND = 6;

// Tag counts are relative weights, 100 for the artist's top tag. Below this,
// tags are usually one-off user labels rather than consensus.
const MIN_TAG_COUNT = 10;
const MAX_TAGS = 8;

// Tags about the listener, the artist's biography or chart status rather
// than how the music sounds.
const IGNORED_TAGS = new Set([
  "seen live",
  "favorites",
  "favourites",
  "favorite",
  "favourite",
  "my favorite",
  "love",
  "awesome",
  "beautiful",
  "female vocalists",
  "male vocalists",
  "female vocalist",
  "male vocalist",
  "american",
  "british",
  "uk",
  "usa",
  "canadian",
  "australian",
  "swedish",
  "german",
  "french",
  "korean",
  "japanese",
  "spotify",
  "all",
]);

// Decades ("80s", "1990s") duplicate the release-era signal we already have.
const DECADE_TAG = /^(\d{2}|\d{4})s$/;

export type LastFmTag = { name: string; count: number };

/** Normalizes raw Last.fm tags into genre-like strings, strongest first. */
export function pickTags(tags: LastFmTag[]): string[] {
  const picked: string[] = [];
  for (const tag of [...tags].sort((a, b) => b.count - a.count)) {
    if (tag.count < MIN_TAG_COUNT) continue;
    const name = tag.name.toLowerCase().trim();
    if (!name || IGNORED_TAGS.has(name) || DECADE_TAG.test(name) || picked.includes(name)) continue;
    picked.push(name);
    if (picked.length === MAX_TAGS) break;
  }
  return picked;
}

/** Returns [] when Last.fm has no page for the artist. */
export async function getArtistTags(artistName: string, apiKey: string): Promise<string[]> {
  const params = new URLSearchParams({
    method: "artist.gettoptags",
    artist: artistName,
    autocorrect: "1",
    api_key: apiKey,
    format: "json",
  });
  const res = await fetch(`${API_BASE}?${params}`);
  const body = await res.json().catch(() => null);

  if (body?.error === ERROR_ARTIST_NOT_FOUND) return [];
  if (!res.ok || body?.error) {
    throw new Error(`Last.fm artist.gettoptags failed: ${res.status} ${body?.message ?? ""}`.trim());
  }

  const raw = body?.toptags?.tag ?? [];
  const tags: LastFmTag[] = (Array.isArray(raw) ? raw : [raw]).map((t: { name: string; count: number | string }) => ({
    name: String(t.name),
    count: Number(t.count) || 0,
  }));
  return pickTags(tags);
}
