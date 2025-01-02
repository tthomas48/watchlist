// global test, expect
const Netflix = require('./netflix');

test('Netflix transforms url', () => {
  let uri = 'https://www.netflix.com/browse?jbv=80986854';
  let expected = 'https://www.netflix.com/title/80986854';
  expect(new Netflix().getData(uri)).toBe(expected);

  uri = 'https://www.netflix.com/browse?other=params&jbv=80986854&more=stuff';
  expected = 'https://www.netflix.com/title/80986854';
  expect(new Netflix().getData(uri)).toBe(expected);

  uri = 'https://www.netflix.com/title/80986854';
  expected = 'https://www.netflix.com/title/80986854';
  expect(new Netflix().getData(uri)).toBe(expected);

  uri = 'https://www.netflix.com/us/title/81288370?s=a&trskid=13747225&trg=cp&vlang=en&clip=81660323';
  expected = 'https://www.netflix.com/us/title/81288370';
  expect(new Netflix().getData(uri)).toBe(expected);

  uri = 'http://www.netflix.com/title/81677257';
  expected = 'https://www.netflix.com/title/81677257';
  expect(new Netflix().getStreamingUrl(uri)).toBe(expected);
});
