const path = require('path');
const {
  traktPosterDiskPath,
  traktPosterApiPath,
  normalizeTraktPosterMediaType,
  parseTraktIdParam,
} = require('./poster_trakt_cache');

describe('poster_trakt_cache', () => {
  it('builds disk path under data/img/trakt', () => {
    const p = traktPosterDiskPath('movie', 1333279);
    expect(p).toContain(`${path.sep}data${path.sep}img${path.sep}trakt${path.sep}`);
    expect(path.basename(p)).toBe('movie_1333279.jpg');
  });

  it('rejects invalid media type', () => {
    expect(traktPosterDiskPath('bogus', '1')).toBe(null);
    expect(traktPosterApiPath('bogus', '1')).toBe(null);
  });

  it('rejects non-numeric trakt id', () => {
    expect(traktPosterDiskPath('movie', '../evil')).toBe(null);
  });

  it('builds API path', () => {
    expect(traktPosterApiPath('show', '42')).toBe('/api/img/trakt/show/42');
  });

  it('normalizes media type case', () => {
    expect(normalizeTraktPosterMediaType('MOVIE')).toBe('movie');
    expect(traktPosterApiPath('Movie', '1')).toBe('/api/img/trakt/movie/1');
  });

  it('parseTraktIdParam accepts string digits', () => {
    expect(parseTraktIdParam('99')).toBe('99');
    expect(parseTraktIdParam(99)).toBe('99');
  });
});
