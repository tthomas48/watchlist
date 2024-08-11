// global test, expect
const YouTube = require('./youtube');

test('PeacockTV transforms url', () => {
  let uri = 'https://www.youtube.com/@GrandDesignsTV';
  let expected = 'https://www.youtube.com/@GrandDesignsTV';
  expect(new YouTube().getData(uri)).toBe(expected);

  uri = 'https://www.youtube.com/playlist?list=PLHE6V8Wl8M8do2vs2PyY26nL1z6yAgGCN';
  expected = 'https://www.youtube.com/playlist?list=PLHE6V8Wl8M8do2vs2PyY26nL1z6yAgGCN';
  expect(new YouTube().getData(uri)).toBe(expected);
});
