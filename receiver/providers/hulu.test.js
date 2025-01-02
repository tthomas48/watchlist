// global test, expect
const Hulu = require('./hulu');

test('Hulu transforms url', () => {
  let uri = 'https://www.hulu.com/series/c6ebcc8a-ed80-4bc9-9d31-31b0f0bf9798';
  let expected = 'https://www.hulu.com/series/c6ebcc8a-ed80-4bc9-9d31-31b0f0bf9798';
  expect(new Hulu().getData(uri)).toBe(expected);

  uri = 'http://www.hulu.com/series/52c074a7-5680-4f60-9b7e-a6008238207d';
  expected = 'https://www.hulu.com/series/52c074a7-5680-4f60-9b7e-a6008238207d';
  expect(new Hulu().getStreamingUrl(uri)).toBe(expected);
});
