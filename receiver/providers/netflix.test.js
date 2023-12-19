// global test, expect
const Netflix = require('./netflix');

test('Netflix transforms url', () => {
  let uri = 'https://www.netflix.com/browse?jbv=80986854';
  let expected = 'https://www.netflix.com/title/80986854';
  expect(new Netflix().getData(uri)).toBe(expected);

  uri = 'https://www.netflix.com/title/80986854';
  expected = 'https://www.netflix.com/title/80986854';
  expect(new Netflix().getData(uri)).toBe(expected);
});
