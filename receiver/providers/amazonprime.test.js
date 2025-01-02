// global test, expect
const AmazonPrime = require('./amazonprime');

test('AmazonPrime transforms url', () => {
  let uri = 'https://www.amazon.com/gp/video/detail/B0BYWHZ2FR';
  let expected = 'https://watch.amazon.com/detail?asin=B0BYWHZ2FR';
  expect(new AmazonPrime().getData(uri)).toBe(expected);

  uri = 'https://www.amazon.com/gp/video/detail/B0CLRSTMPQ/ref=atv_dp_share_cu_r';
  expected = 'https://watch.amazon.com/detail?asin=B0CLRSTMPQ';
  expect(new AmazonPrime().getData(uri)).toBe(expected);

  uri = 'ttps://www.amazon.com/Official-Trailer/dp/B089XXLCST/ref=sr_1_1';
  expected = 'https://watch.amazon.com/detail?asin=B089XXLCST';
  expect(new AmazonPrime().getData(uri)).toBe(expected);

  uri = 'http://www.amazon.com/dp/B0B8QRH6YG';
  expect(new AmazonPrime().getStreamingUrl(uri)).toBe('https://www.amazon.com/dp/B0B8QRH6YG')
});
