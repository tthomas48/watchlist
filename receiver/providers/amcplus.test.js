// global test, expect
const AMCPlus = require('./amcplus');

test('AMCPlus transforms url', () => {
  const uri = 'https://www.amcplus.com/shows/lucky-hank--1061358';
  const expected = '1061358';
  expect(AMCPlus.getData(uri)).toBe(expected);
});
