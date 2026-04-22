import { getTmdbApiKey, tmdbFetchDetails } from "@/lib/tmdb";

export type TmdbWatchRow = {
  provider: string;
  externalId: string;
  mediaType: "MOVIE" | "TV";
  title: string;
  posterPath: string | null;
};

async function localizeOneRow<T extends TmdbWatchRow>(row: T, tmdbLangFull: string): Promise<T> {
  if ((row.provider || "tmdb").trim().toLowerCase() !== "tmdb") return row;
  const d = await tmdbFetchDetails(row.mediaType, row.externalId, tmdbLangFull);
  if (!d) return row;
  return { ...row, title: d.title, posterPath: d.posterPath ?? row.posterPath };
}

export async function localizeTmdbWatchRows<T extends TmdbWatchRow>(rows: T[], tmdbLangFull: string): Promise<T[]> {
  if (!getTmdbApiKey() || rows.length === 0) return rows;
  const batchSize = 6;
  const out: T[] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    out.push(...(await Promise.all(slice.map((row) => localizeOneRow(row, tmdbLangFull)))));
  }
  return out;
}
