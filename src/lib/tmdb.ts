const TMDB_BASE = "https://api.themoviedb.org/3";

export function tmdbPosterUrl(posterPath: string | null, size: "w185" | "w342" | "w500" = "w342") {
  if (!posterPath) return null;
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

export function getTmdbApiKey() {
  const key = process.env.TMDB_API_KEY?.trim();
  return key || null;
}

type TmdbSearchResult = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
};

type TmdbSearchResponse = { results?: TmdbSearchResult[] };

type TmdbMovieDetail = { id: number; title?: string; poster_path?: string | null };
type TmdbTvDetail = { id: number; name?: string; poster_path?: string | null };

export type WatchSearchHit = {
  externalId: string;
  mediaType: "MOVIE" | "TV";
  title: string;
  posterPath: string | null;
  year: string | null;
};

function yearFromDate(d: string | undefined) {
  if (!d || d.length < 4) return null;
  return d.slice(0, 4);
}

export async function tmdbSearch(query: string): Promise<WatchSearchHit[]> {
  const key = getTmdbApiKey();
  if (!key || query.trim().length < 2) return [];
  const url = new URL(`${TMDB_BASE}/search/multi`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("query", query.trim());
  url.searchParams.set("language", "uk-UA");
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return [];
  const data = (await res.json()) as TmdbSearchResponse;
  const out: WatchSearchHit[] = [];
  for (const r of data.results ?? []) {
    const mt = r.media_type;
    if (mt === "movie") {
      out.push({
        externalId: String(r.id),
        mediaType: "MOVIE",
        title: r.title || "—",
        posterPath: r.poster_path ?? null,
        year: yearFromDate(r.release_date),
      });
    } else if (mt === "tv") {
      out.push({
        externalId: String(r.id),
        mediaType: "TV",
        title: r.name || "—",
        posterPath: r.poster_path ?? null,
        year: yearFromDate(r.first_air_date),
      });
    }
    if (out.length >= 15) break;
  }
  return out;
}

export async function tmdbFetchDetails(mediaType: "MOVIE" | "TV", externalId: string) {
  const key = getTmdbApiKey();
  if (!key) return null;
  const path = mediaType === "MOVIE" ? `movie/${externalId}` : `tv/${externalId}`;
  const url = `${TMDB_BASE}/${path}?api_key=${encodeURIComponent(key)}&language=uk-UA`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  if (mediaType === "MOVIE") {
    const j = (await res.json()) as TmdbMovieDetail;
    return { title: j.title || "—", posterPath: j.poster_path ?? null };
  }
  const j = (await res.json()) as TmdbTvDetail;
  return { title: j.name || "—", posterPath: j.poster_path ?? null };
}
