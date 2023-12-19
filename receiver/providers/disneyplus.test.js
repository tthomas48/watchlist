// global test, expect
const DisneyPlus = require('./disneyplus');

test('DisneyPlus transforms url', () => {
  const uri = 'https://www.disneyplus.com/series/never-say-never-with-jeff-jenkins/6Qsx2pH8tIly';
  const expected = 'https://www.disneyplus.com/series/never-say-never-with-jeff-jenkins/6Qsx2pH8tIly';
  expect(new DisneyPlus().getData(uri)).toBe(expected);
});
