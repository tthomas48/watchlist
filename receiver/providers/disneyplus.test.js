// global test, expect
const DisneyPlus = require('./disneyplus');

test('DisneyPlus transforms url', () => {
  let uri = 'https://www.disneyplus.com/series/never-say-never-with-jeff-jenkins/6Qsx2pH8tIly';
  let expected = 'https://www.disneyplus.com/series/never-say-never-with-jeff-jenkins/6Qsx2pH8tIly';
  expect(new DisneyPlus().getData(uri)).toBe(expected);

  uri = 'http://www.disneyplus.com/series/percy-jackson-and-the-olympians/ql33aq42HBdr';
  expected = 'https://www.disneyplus.com/series/percy-jackson-and-the-olympians/ql33aq42HBdr';
  expect(new DisneyPlus().getStreamingUrl(uri)).toBe(expected);
});
