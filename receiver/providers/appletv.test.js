// global test, expect
const AppleTV = require('./appletv');

test('AppleTV transforms url', () => {
  const uri = 'https://tv.apple.com/us/show/slow-horses/umc.cmc.2szz3fdt71tl1ulnbp8utgq5o';
  const expected = 'https://tv.apple.com/us/show/slow-horses/umc.cmc.2szz3fdt71tl1ulnbp8utgq5o';
  expect(new AppleTV().getData(uri)).toBe(expected);
});
