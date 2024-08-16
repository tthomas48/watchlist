// global test, expect
const Roku = require('./roku');

test('Roku transforms url', () => {
  const uri = 'https://therokuchannel.roku.com/details/9654710106c2c903c9de57c1e8de0187/meleah?source=bing';
  const expected = 'https://therokuchannel.roku.com/details/9654710106c2c903c9de57c1e8de0187';
  expect(new Roku().getData(uri)).toBe(expected);
});
