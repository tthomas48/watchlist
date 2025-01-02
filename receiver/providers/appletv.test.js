// global test, expect
const AppleTV = require('./appletv');

test('AppleTV transforms url', () => {
  let uri = 'https://tv.apple.com/us/show/slow-horses/umc.cmc.2szz3fdt71tl1ulnbp8utgq5o';
  let expected = 'https://tv.apple.com/us/show/slow-horses/umc.cmc.2szz3fdt71tl1ulnbp8utgq5o';
  expect(new AppleTV().getData(uri)).toBe(expected);

  uri = 'http://tv.apple.com/show/umc.cmc.apzybj6eqf6pzccd97kev7bs';
  expected = 'https://tv.apple.com/show/umc.cmc.apzybj6eqf6pzccd97kev7bs';
  expect(new AppleTV().getStreamingUrl(uri)).toBe(expected);
});
