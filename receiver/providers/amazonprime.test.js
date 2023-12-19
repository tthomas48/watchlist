// global test, expect
const AmazonPrime = require('./amazonprime');

test('AmazonPrime transforms url', () => {
  const uri = 'https://www.amazon.com/gp/video/detail/B0BYWHZ2FR';
  const expected = 'https://watch.amazon.com/detail?asin=B0BYWHZ2FR';
  expect(new AmazonPrime().getData(uri)).toBe(expected);
});
