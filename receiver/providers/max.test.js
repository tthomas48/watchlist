// global test, expect
const Max = require('./max');

test('Max transforms url', () => {
  let uri = 'https://play.max.com/show/59719cfb-58d6-471d-bb13-7618e5b03c7b';
  let expected = 'https://play.max.com/show/59719cfb-58d6-471d-bb13-7618e5b03c7b';
  expect(new Max().getData(uri)).toBe(expected);

  uri = 'http://play.max.com/show/64e28eee-b3cc-4e08-b071-5a795b911dd2';
  expected = 'https://play.max.com/show/64e28eee-b3cc-4e08-b071-5a795b911dd2';
  expect(new Max().getStreamingUrl(uri)).toBe(expected);

  uri = 'http://www.max.com/shows/our-flag-means-death/86312320-8f2e-4b45-b06f-376224def821';
  expected = 'https://play.max.com/show/86312320-8f2e-4b45-b06f-376224def821';

  expect(new Max().getStreamingUrl(uri)).toBe(expected);
});
