/**
 * Video embed providers configuration.
 * 
 * Each provider supports movie and TV embed URLs.
 * Some providers may have additional features like anime support.
 */

export const PROVIDERS = [
  {
    id: 'filmu',
    name: 'Filmu',
    movie: 'https://embed.filmu.in/movie',
    tv: 'https://embed.filmu.in/tv',
    anime: 'https://embed.filmu.in/anime',
    default: true,
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    movie: 'https://multiembed.cc/embed/movie',
    tv: 'https://multiembed.cc/embed/tv',
  },
  {
    id: 'vidcore',
    name: 'VidCore',
    movie: 'https://vidcore.org/embed/movie',
    tv: 'https://vidcore.org/embed/series',
  },
  {
    id: 'vidsrc',
    name: 'VidSrc',
    movie: 'https://vidsrc.mov/embed/movie',
    tv: 'https://vidsrc.mov/embed/tv',
  },
  {
    id: 'cinesrc',
    name: 'CineSrc',
    movie: 'https://cinesrc.st/embed/movie',
    tv: 'https://cinesrc.st/embed/tv',
  },
];

/** Get the default provider */
export function getDefaultProvider() {
  return PROVIDERS.find(p => p.default) || PROVIDERS[0];
}

/** Get a provider by id */
export function getProvider(id) {
  return PROVIDERS.find(p => p.id === id) || getDefaultProvider();
}
