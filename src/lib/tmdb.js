/**
 * Single place that talks to TMDB.
 *
 * Every page fetches through here so caching, error handling and image URL
 * building stay consistent. Responses are revalidated hourly: catalogue data
 * barely changes, so a long-lived cache would just be stale.
 */

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";
const HOUR = 60 * 60;

export const IMG = {
  poster: (path, size = "w342") =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : null,
  backdrop: (path, size = "w1280") =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : null,
  still: (path, size = "w300") =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : null,
  profile: (path, size = "w185") =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : null,
};

export class TmdbError extends Error {
  constructor(status, path) {
    super(`TMDB request failed (${status}) for ${path}`);
    this.name = "TmdbError";
    this.status = status;
  }
}

async function tmdb(path, params = {}) {
  if (!API_KEY) {
    throw new Error(
      "NEXT_PUBLIC_TMDB_API_KEY is not set. Add it to .env before starting the app.",
    );
  }

  // Join explicitly. `BASE + path` silently produced ".../3movie/550" and TMDB
  // answers that with an empty 204, which looks like a JSON parse bug.
  const url = new URL(`${BASE}/${String(path).replace(/^\/+/, "")}`);
  url.searchParams.set("api_key", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, { next: { revalidate: HOUR } });
  if (!res.ok) throw new TmdbError(res.status, path);

  // A 200 with an empty body still happens on TMDB outages; fail with a clear
  // message rather than an opaque SyntaxError from JSON.parse.
  const text = await res.text();
  if (!text.trim()) throw new TmdbError(res.status || 204, `${path} (empty body)`);

  if (process.env.TMDB_DEBUG) {
    console.log(`[tmdb] ${path} -> ${res.status} len=${text.length}`);
  }

  return JSON.parse(text);
}

/* ------------------------------------------------------------------ *
 * Genres — the filter chips
 * ------------------------------------------------------------------ */

/**
 * A curated set rather than every genre TMDB defines. The full movie list is 19
 * entries and the TV list 16, which is too many chips to scan; these are the
 * ones people actually browse by.
 */
export const MOVIE_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mystery" },
  { id: 14, name: "Fantasy" },
  { id: 16, name: "Animation" },
  { id: 10749, name: "Romance" },
  { id: 80, name: "Crime" },
  { id: 10751, name: "Family" },
  { id: 37, name: "Western" },
  { id: 10752, name: "War" },
];

export const TV_GENRES = [
  { id: 10759, name: "Action & Adventure" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 80, name: "Crime" },
  { id: 9648, name: "Mystery" },
  { id: 10768, name: "War & Politics" },
  { id: 27, name: "Horror" },
  { id: 16, name: "Animation" },
  { id: 10762, name: "Kids" },
  { id: 10751, name: "Family" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

export const GENRES = { movie: MOVIE_GENRES, tv: TV_GENRES };

/* ------------------------------------------------------------------ *
 * Sorting
 * ------------------------------------------------------------------ */

/**
 * `top_rated` is a custom mapping, not a raw `sort_by` value. Sorting purely by
 * `vote_average` surfaces near-unknown titles that happen to have one perfect
 * vote, so rating sorts also demand a minimum vote count. This mirrors what
 * TMDB's own "Top Rated" list does.
 */
export const SORTS = [
  { id: "popular", label: "Popular" },
  { id: "top_rated", label: "Top rated" },
  { id: "recent", label: "Newest" },
];

const RECENT_BY = {
  movie: { sort_by: "primary_release_date.desc" },
  tv: { sort_by: "first_air_date.desc" },
};

function sortParams(mediaType, sortId) {
  if (sortId === "recent") return RECENT_BY[mediaType];
  if (sortId === "top_rated") {
    // Series accumulate far more votes per title than a film, so a shared
    // floor is not comparable between the two.
    return {
      sort_by: "vote_average.desc",
      "vote_count.gte": mediaType === "tv" ? 500 : 200,
    };
  }
  return { sort_by: "popularity.desc" };
}

/* ------------------------------------------------------------------ *
 * Browse
 * ------------------------------------------------------------------ */

/**
 * Discover titles. `genre` is a TMDB genre id (string or number) and `sortId`
 * is one of SORTS. Returns the raw TMDB page so callers can read `total_pages`.
 */
export async function discover(mediaType, { genre, sortId = "popular", page = 1 } = {}) {
  return tmdb(`discover/${mediaType}`, {
    ...sortParams(mediaType, sortId),
    page,
    include_adult: "false",
    with_genres: genre || "",
  });
}

/** "Trending this week" — used for the homepage hero. */
export async function trending(mediaType = "all", window = "week") {
  return tmdb(`trending/${mediaType}/${window}`, { page: 1 });
}

/** Homepage rows, fetched together so the page renders in a single pass. */
export async function homeSections() {
  const [popularMovies, popularTv, topMovies, topTv] = await Promise.all([
    discover("movie", { sortId: "popular" }),
    discover("tv", { sortId: "popular" }),
    discover("movie", { sortId: "top_rated" }),
    discover("tv", { sortId: "top_rated" }),
  ]);
  return { popularMovies, popularTv, topMovies, topTv };
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

/**
 * Search movies, series, or both via `search/multi`.
 *
 * That endpoint also returns `person` results. People are dropped: this site
 * has no cast pages, so a person row would only ever be a dead link.
 */
export async function search(query, type = "all", page = 1) {
  const data = await tmdb("search/multi", { query, page, include_adult: "false" });
  const wanted =
    type === "movie" || type === "tv" ? (item) => item.media_type === type : () => true;

  const results = (data.results ?? []).filter(
    (item) => item.media_type && wanted(item) && (item.poster_path || item.backdrop_path),
  );

  return { ...data, results };
}

/* ------------------------------------------------------------------ *
 * Details
 * ------------------------------------------------------------------ */

export async function movieDetail(id) {
  return tmdb(`movie/${id}`, { append_to_response: "credits,videos,similar" });
}

export async function tvDetail(id) {
  return tmdb(`tv/${id}`, {
    append_to_response: "credits,videos,similar,content_ratings",
  });
}

export async function seasonDetail(tvId, seasonNumber) {
  return tmdb(`tv/${tvId}/season/${seasonNumber}`);
}

export async function recommendations(mediaType, id) {
  return tmdb(`${mediaType}/${id}/recommendations`);
}

/* ------------------------------------------------------------------ *
 * Presentation helpers
 * ------------------------------------------------------------------ */

/** TMDB calls a film's title `title` and a series' `name`. */
export function titleOf(item) {
  return item.title ?? item.name ?? "Untitled";
}

export function yearOf(item) {
  const date = item.release_date ?? item.first_air_date;
  return date ? Number(date.slice(0, 4)) : null;
}

export function kindOf(item) {
  return item.media_type ?? "movie";
}

export function detailHref(item) {
  return kindOf(item) === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;
}

/** `1994-09-10` -> `10 Sep 1994`; null when the date is missing or invalid. */
export function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Minutes -> `2h 16m`. */
export function formatRuntime(mins) {
  if (typeof mins !== "number" || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function scoreOf(item) {
  const v = item.vote_average;
  return typeof v === "number" && v > 0 ? v.toFixed(1) : null;
}
