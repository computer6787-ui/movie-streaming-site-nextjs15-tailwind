/**
 * Embed URL construction for the player.
 *
 * The provider takes TMDB ids directly:
 *   movie -> /embed/movie/{tmdbId}
 *   series -> /embed/tv/{tmdbId}/{season}/{episode}
 *
 * Both builders validate their inputs and return null on bad data, so a
 * malformed id can never reach an iframe `src`.
 */

const MOVIE = "https://multiembed.cc/embed/movie";
const TV = "https://multiembed.cc/embed/tv";

/** Accepts a number or a numeric string; rejects `1.5`, `12abc`, `null`. */
function toId(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? String(value) : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const n = Number(value);
    return n > 0 ? value : null;
  }
  return null;
}

export function movieEmbedUrl(tmdbId) {
  const id = toId(tmdbId);
  return id ? `${MOVIE}/${id}` : null;
}

export function tvEmbedUrl(tmdbId, season, episode) {
  const id = toId(tmdbId);
  const s = toId(season);
  // Episode 0 is a real thing (some shows are numbered from zero), so the
  // floor is 0 here rather than 1.
  const e =
    typeof episode === "number" && Number.isInteger(episode) && episode >= 0
      ? String(episode)
      : typeof episode === "string" && /^\d+$/.test(episode)
        ? episode
        : null;

  if (!id || !s || e === null) return null;
  return `${TV}/${id}/${s}/${e}`;
}
