// global test, expect
const PeacockTV = require('./peacocktv');

test('PeacockTV transforms url', () => {
  let uri = 'https://www.peacocktv.com/watch/asset/tv/saturday-night-live/8885992813767211112';
  let expected = 'https://www.peacocktv.com/deeplink?deeplinkData%3D%7B%22providerSeriesId%22%3A%228885992813767211112%22%2C%22type%22%3A%22SERIES%22%2C%22action%22%3A%22PDP%22%7D';
  expect(new PeacockTV().getData(uri)).toBe(expected);

  uri = 'https://www.peacocktv.com/watch/asset/movies/please-dont-destroy-the-treasure-of-foggy-mountain/95d367f5-06f1-37dd-9c9c-44a8c53faedb';
  expected = 'https://www.peacocktv.com/deeplink?deeplinkData%3D%7B%22pvid%22%3A%2295d367f5-06f1-37dd-9c9c-44a8c53faedb%22%2C%22type%22%3A%22PROGRAMME%22%2C%22action%22%3A%22PDP%22%7D';
  expect(new PeacockTV().getData(uri)).toBe(expected);
});
