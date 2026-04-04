// global test, expect
const ProviderFactory = require('./factory');

test('resolveStreamingServiceIdFromUrl: empty and unknown', () => {
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl(null)).toBeNull();
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('')).toBeNull();
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('   ')).toBeNull();
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('https://example.com/video')).toBeNull();
});

test('resolveStreamingServiceIdFromUrl: manifest-mapped catalog ids', () => {
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('https://www.netflix.com/title/80986854')).toBe('netflix');
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('https://www.amazon.com/gp/video/detail/B0CLRSTMPQ')).toBe('prime');
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('https://www.disneyplus.com/movies/foo')).toBe('disney');
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('https://www.hulu.com/watch/123')).toBe('hulu');
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('https://play.max.com/show/abc')).toBe('hbo');
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('https://www.peacocktv.com/watch/foo')).toBe('peacock');
});

test('resolveStreamingServiceIdFromUrl: receiver key when not in manifest', () => {
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('https://www.youtube.com/watch?v=1')).toBe('youtube');
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('https://www.pbs.org/video/foo/')).toBe('pbs');
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('https://www.amcplus.com/shows/bar-99')).toBe('amcplus');
  expect(ProviderFactory.resolveStreamingServiceIdFromUrl('https://therokuchannel.roku.com/details/abc')).toBe('roku');
});
