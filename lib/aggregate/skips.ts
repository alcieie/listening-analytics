import type { SupabaseClient } from "@supabase/supabase-js";
import { getBestSkipEventByPlayId, getGenresByArtistId, getPlays } from "./shared";

export type ArtistSkipStats = {
  artistId: string;
  artistName: string;
  playCount: number;
  skipCount: number;
  skipRate: number;
  sdkObservedCount: number;
};

export type GenreSkipStats = {
  genre: string;
  playCount: number;
  skipCount: number;
  skipRate: number;
};

export type SkipStats = {
  byArtist: ArtistSkipStats[];
  byGenre: GenreSkipStats[];
};

export async function getSkipStats(
  supabase: SupabaseClient,
  accountId: string,
  sinceIso?: string
): Promise<SkipStats> {
  const plays = await getPlays(supabase, accountId, sinceIso);
  if (plays.length === 0) return { byArtist: [], byGenre: [] };

  const allArtistIds = Array.from(new Set(plays.flatMap((p) => p.artist_ids)));
  const [genresByArtistId, skipEventsByPlayId] = await Promise.all([
    getGenresByArtistId(supabase, allArtistIds),
    getBestSkipEventByPlayId(supabase, accountId),
  ]);

  const artistAgg = new Map<
    string,
    { artistName: string; playCount: number; skipCount: number; sdkObservedCount: number }
  >();
  const genreAgg = new Map<string, { playCount: number; skipCount: number }>();

  for (const play of plays) {
    const skipEvent = skipEventsByPlayId.get(play.id);
    // Plays with no skip signal yet (e.g. the very latest play, still
    // playing) are excluded rather than assumed either way.
    if (!skipEvent) continue;

    const isSkip = skipEvent.is_skip;

    const artistEntry = artistAgg.get(play.primary_artist_id) ?? {
      artistName: play.primary_artist_name,
      playCount: 0,
      skipCount: 0,
      sdkObservedCount: 0,
    };
    artistEntry.playCount += 1;
    if (isSkip) artistEntry.skipCount += 1;
    if (skipEvent.source === "sdk-observed") artistEntry.sdkObservedCount += 1;
    artistAgg.set(play.primary_artist_id, artistEntry);

    const genres = genresByArtistId.get(play.primary_artist_id) ?? [];
    const effectiveGenres = genres.length > 0 ? genres : ["(unknown genre)"];
    for (const genre of effectiveGenres) {
      const genreEntry = genreAgg.get(genre) ?? { playCount: 0, skipCount: 0 };
      genreEntry.playCount += 1;
      if (isSkip) genreEntry.skipCount += 1;
      genreAgg.set(genre, genreEntry);
    }
  }

  const byArtist: ArtistSkipStats[] = Array.from(artistAgg.entries())
    .map(([artistId, v]) => ({
      artistId,
      artistName: v.artistName,
      playCount: v.playCount,
      skipCount: v.skipCount,
      skipRate: v.playCount > 0 ? v.skipCount / v.playCount : 0,
      sdkObservedCount: v.sdkObservedCount,
    }))
    .sort((a, b) => b.skipRate - a.skipRate || b.playCount - a.playCount);

  const byGenre: GenreSkipStats[] = Array.from(genreAgg.entries())
    .map(([genre, v]) => ({
      genre,
      playCount: v.playCount,
      skipCount: v.skipCount,
      skipRate: v.playCount > 0 ? v.skipCount / v.playCount : 0,
    }))
    .sort((a, b) => b.skipRate - a.skipRate || b.playCount - a.playCount);

  return { byArtist, byGenre };
}
