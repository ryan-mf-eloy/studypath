/**
 * Embed provider registry — decoupled list of services whose URLs can be
 * rendered as inline iframes instead of link-preview cards. Adding a new
 * provider is a single entry in the `PROVIDERS` array; no other file needs
 * to change.
 *
 * Each provider defines:
 *   match(url)      — fast regex test: does this URL belong here?
 *   toEmbedUrl(url) — convert a page URL to an embeddable iframe src.
 *                      Returns null if the URL structure is unrecognised
 *                      (malformed short link, etc.).
 */

export interface EmbedProvider {
  id: string;
  name: string;
  match: (url: string) => boolean;
  toEmbedUrl: (url: string) => string | null;
}

const PROVIDERS: EmbedProvider[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    match: (url) => /(?:youtube\.com|youtu\.be)\//i.test(url),
    toEmbedUrl: (url) => {
      const m = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      );
      return m ? `https://www.youtube.com/embed/${m[1]}` : null;
    },
  },
  {
    id: 'vimeo',
    name: 'Vimeo',
    match: (url) => /vimeo\.com\//i.test(url),
    toEmbedUrl: (url) => {
      const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      return m ? `https://player.vimeo.com/video/${m[1]}` : null;
    },
  },
  {
    id: 'loom',
    name: 'Loom',
    match: (url) => /loom\.com\/share\//i.test(url),
    toEmbedUrl: (url) => {
      const m = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
      return m ? `https://www.loom.com/embed/${m[1]}` : null;
    },
  },
  {
    id: 'spotify',
    name: 'Spotify',
    match: (url) => /open\.spotify\.com\//i.test(url),
    toEmbedUrl: (url) => {
      const m = url.match(
        /open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/,
      );
      return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
    },
  },
  {
    id: 'codepen',
    name: 'CodePen',
    match: (url) => /codepen\.io\//i.test(url),
    toEmbedUrl: (url) => {
      const m = url.match(/codepen\.io\/([^/]+)\/(?:pen|full)\/([a-zA-Z0-9]+)/);
      return m
        ? `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result`
        : null;
    },
  },
  {
    id: 'figma',
    name: 'Figma',
    match: (url) => /figma\.com\/(file|design|proto)\//i.test(url),
    toEmbedUrl: (url) => {
      if (!/figma\.com\/(file|design|proto)\//i.test(url)) return null;
      return `https://www.figma.com/embed?embed_host=studypath&url=${encodeURIComponent(url)}`;
    },
  },
  {
    id: 'direct-video',
    name: 'Direct video',
    match: (url) => /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url),
    toEmbedUrl: () => null,
  },
];

/**
 * Find the first provider whose `match` returns true for the given URL.
 * Returns `null` for URLs that should render as a link-preview card instead.
 */
export function findEmbedProvider(url: string): EmbedProvider | null {
  return PROVIDERS.find((p) => p.match(url)) ?? null;
}

/**
 * Returns true if the URL belongs to any known embed provider.
 * Used by the paste handler to decide embed vs link-preview.
 */
export function isEmbeddableUrl(url: string): boolean {
  return findEmbedProvider(url) !== null;
}

/**
 * Convert a page URL to an embeddable iframe src via the matching provider.
 * Returns `null` if no provider matches or the URL structure is unrecognised.
 */
export function toEmbedUrl(url: string): string | null {
  const provider = findEmbedProvider(url);
  return provider?.toEmbedUrl(url) ?? null;
}

/**
 * Direct video detection (mp4, webm, etc.) — these render as `<video>`
 * instead of `<iframe>`.
 */
export function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}
