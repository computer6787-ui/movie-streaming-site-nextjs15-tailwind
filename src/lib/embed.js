/**
 * Embed URL construction for the player.
 *
 * Supports multiple providers with TMDB ids:
 *   movie -> /embed/movie/{tmdbId}
 *   series -> /embed/tv/{tmdbId}/{season}/{episode}
 *
 * Both builders validate their inputs and return null on bad data, so a
 * malformed id can never reach an iframe `src`.
 */

import { getDefaultProvider, getProvider } from "./providers";

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

/**
 * Generate movie embed URL for a provider.
 * @param {string|number} tmdbId - TMDB movie ID
 * @param {string} providerId - Provider ID (optional, defaults to default provider)
 * @returns {string|null} - Embed URL or null if invalid
 */
export function movieEmbedUrl(tmdbId, providerId = null) {
  const id = toId(tmdbId);
  if (!id) return null;
  
  const provider = providerId ? getProvider(providerId) : getDefaultProvider();
  return `${provider.movie}/${id}`;
}

/**
 * Generate TV embed URL for a provider.
 * @param {string|number} tmdbId - TMDB TV show ID
 * @param {string|number} season - Season number
 * @param {string|number} episode - Episode number
 * @param {string} providerId - Provider ID (optional, defaults to default provider)
 * @returns {string|null} - Embed URL or null if invalid
 */
export function tvEmbedUrl(tmdbId, season, episode, providerId = null) {
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
  
  const provider = providerId ? getProvider(providerId) : getDefaultProvider();
  
  // Handle different URL patterns for TV shows
  // VidCore uses /series/ instead of /tv/
  if (provider.id === 'vidcore') {
    return `${provider.tv}/${id}/${s}/${e}`;
  }
  
  return `${provider.tv}/${id}/${s}/${e}`;
}
