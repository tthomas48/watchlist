// global test, expect
const Max = require('./max');

test('Max transforms url', () => {
  const uri = 'https://play.max.com/show/59719cfb-58d6-471d-bb13-7618e5b03c7b';
  const expected = 'https://play.max.com/show/59719cfb-58d6-471d-bb13-7618e5b03c7b';
  expect(new Max().getData(uri)).toBe(expected);
});
