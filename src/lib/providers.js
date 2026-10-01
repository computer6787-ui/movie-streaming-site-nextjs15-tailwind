/**
 * Video embed providers configuration.
 * 
 * Each provider supports movie and TV embed URLs.
 * Some providers may have additional features like anime support.
 */

export const PROVIDERS = [
  {
    id: 'cinesrc',
    name: 'CineSrc',
    tag: 'Best • Ad-Free',
    movie: 'https://cinesrc.st/embed/movie',
    tv: 'https://cinesrc.st/embed/tv',
    default: true,
    sandbox: true,
  },
  {
    id: 'filmu',
    name: 'Filmu',
    tag: 'Vast Library',
    movie: 'https://embed.filmu.in/movie',
    tv: 'https://embed.filmu.in/tv',
    anime: 'https://embed.filmu.in/anime',
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    tag: 'HD Quality',
    movie: 'https://multiembed.cc/embed/movie',
    tv: 'https://multiembed.cc/embed/tv',
  },
  {
    id: 'vidcore',
    name: 'VidCore',
    tag: 'Modern & Interactive',
    movie: 'https://vidcore.org/embed/movie',
    tv: 'https://vidcore.org/embed/series',
  },
  {
    id: 'vidsrc',
    name: 'VidSrc',
    tag: 'Fast & Simple',
    movie: 'https://vidsrc.mov/embed/movie',
    tv: 'https://vidsrc.mov/embed/tv',
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
