// global test, expect
const PBS = require('./pbs');

test('PBS transforms url', () => {
  const uri = 'https://www.pbs.org/wgbh/roadshow/';
  const expected = 'https://www.pbs.org/wgbh/roadshow/';
  expect(new PBS().getData(uri)).toBe(expected);
});
