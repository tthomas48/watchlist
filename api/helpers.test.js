/* global test, expect */
const { getTitle, getTraktId } = require('./helpers');

test('getTitle should return correct value', () => {
  expect(getTitle({})).toBe(null);
  expect(getTitle({ type: 'show' })).toBe(null);
  expect(getTitle({ type: 'show', show: {} })).toBe(undefined);
  expect(getTitle({ type: 'show', show: { title: null } })).toBe(null);
  expect(getTitle({ type: 'show', show: { title: 'my title' } })).toBe('my title');
  expect(getTitle({ type: 'movie', show: { title: 'my title' } })).toBe(null);
  // expect(getTitle({type: 'show', 'show': {ids: null}})).toBe(null);
  // expect(getTitle({type: 'show', 'show': {ids: 'not an array'}})).toBe(null);
  // expect(getTitle({type: 'show', 'show': {ids: p[]}})).toBe(null);
});
test('getTraktId should return correct value', () => {
  expect(getTraktId({})).toBe(null);
  expect(getTraktId({ type: 'show' })).toBe(null);
  expect(getTraktId({ type: 'show', show: {} })).toBe('undefined');
  expect(getTraktId({ type: 'show', show: { ids: null } })).toBe('undefined');
  expect(getTraktId({ type: 'show', show: { ids: {} } })).toBe('undefined');
  expect(getTraktId({ type: 'show', show: { ids: { trakt: 3434 } } })).toBe('3434');
});
