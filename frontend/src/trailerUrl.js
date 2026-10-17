/**
 * Whether a trailer URL can be embedded in-app (vs open-in-new-tab fallback).
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export function isYouTubeTrailerUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    return host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be'
      || host === 'youtube-nocookie.com';
  } catch {
    return false;
  }
}
