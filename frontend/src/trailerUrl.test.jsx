import { isYouTubeTrailerUrl } from './trailerUrl';

describe('isYouTubeTrailerUrl', () => {
  it('accepts common YouTube hosts', () => {
    expect(isYouTubeTrailerUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isYouTubeTrailerUrl('https://youtu.be/abc')).toBe(true);
    expect(isYouTubeTrailerUrl('https://m.youtube.com/watch?v=abc')).toBe(true);
  });

  it('rejects non-YouTube and invalid values', () => {
    expect(isYouTubeTrailerUrl('https://vimeo.com/1')).toBe(false);
    expect(isYouTubeTrailerUrl(null)).toBe(false);
    expect(isYouTubeTrailerUrl('not-a-url')).toBe(false);
  });
});
