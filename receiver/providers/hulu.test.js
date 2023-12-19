// global test, expect
const Hulu = require('./hulu');

test('Hulu transforms url', () => {
  const uri = 'https://www.hulu.com/series/c6ebcc8a-ed80-4bc9-9d31-31b0f0bf9798';
  const expected = 'https://www.hulu.com/series/c6ebcc8a-ed80-4bc9-9d31-31b0f0bf9798';
  expect(new Hulu().getData(uri)).toBe(expected);
});
