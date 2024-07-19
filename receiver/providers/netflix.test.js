// global test, expect
const Netflix = require('./netflix');

test('Netflix transforms url', () => {
  let uri = 'https://www.netflix.com/browse?jbv=80986854';
  let expected = '80986854';
  expect(new Netflix().getData(uri)).toBe(expected);

  uri = 'https://www.netflix.com/title/80986854';
  expected = '80986854';
  expect(new Netflix().getData(uri)).toBe(expected);

  uri = 'https://www.netflix.com/us/title/81288370?s=a&trskid=13747225&trg=cp&vlang=en&clip=81660323';
  expected = '81288370';
  expect(new Netflix().getData(uri)).toBe(expected);

  uri = 'https://www.netflix.com/search?q=90s%20show&jbv=81288370';
  expected = '81288370';
  expect(new Netflix().getData(uri)).toBe(expected);

});
