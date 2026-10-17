const { pickTrailerUrl, normalizeTrailerField } = require('./trailer');

describe('normalizeTrailerField', () => {
  it('returns trimmed string URLs and null for empties', () => {
    expect(normalizeTrailerField(' https://youtu.be/abc ')).toBe('https://youtu.be/abc');
    expect(normalizeTrailerField('')).toBeNull();
    expect(normalizeTrailerField(null)).toBeNull();
    expect(normalizeTrailerField(undefined)).toBeNull();
  });

  it('accepts object with url', () => {
    expect(normalizeTrailerField({ url: 'https://youtu.be/x' })).toBe('https://youtu.be/x');
    expect(normalizeTrailerField({ url: '  ' })).toBeNull();
  });
});

describe('pickTrailerUrl', () => {
  it('prefers official youtube trailers', () => {
    const url = pickTrailerUrl([
      { type: 'teaser', official: true, site: 'youtube', url: 'https://youtu.be/teaser' },
      { type: 'trailer', official: false, site: 'vimeo', url: 'https://vimeo.com/1' },
      { type: 'trailer', official: true, site: 'youtube', url: 'https://youtu.be/best' },
      { type: 'trailer', official: true, site: 'youtube', url: 'https://youtu.be/also' },
    ]);
    expect(url).toBe('https://youtu.be/best');
  });

  it('returns null for empty or invalid lists', () => {
    expect(pickTrailerUrl([])).toBeNull();
    expect(pickTrailerUrl(null)).toBeNull();
    expect(pickTrailerUrl([{ type: 'trailer' }])).toBeNull();
  });

  it('falls back to any URL when scoring ties on weaker matches', () => {
    expect(pickTrailerUrl([
      { type: 'clip', site: 'vimeo', url: 'https://vimeo.com/9' },
    ])).toBe('https://vimeo.com/9');
  });
});
