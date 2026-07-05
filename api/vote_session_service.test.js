// global test, expect, describe, it
const {
  remainingPoolIds,
  tallyRound1Votes,
  pickPluralityWinner,
  pickRandomId,
  generateSessionCode,
} = require('./vote_session_service');

describe('vote_session_service helpers', () => {
  it('generateSessionCode produces requested length', () => {
    expect(generateSessionCode(6)).toHaveLength(6);
  });

  it('remainingPoolIds excludes finalists and excluded', () => {
    const session = {
      pool_ids: [1, 2, 3, 4],
      excluded_ids: [2],
      finalist_ids: [3],
      current_watchable_id: 4,
    };
    expect(remainingPoolIds(session)).toEqual([1]);
  });

  it('tallyRound1Votes requires all participants', () => {
    expect(tallyRound1Votes([], 2)).toEqual({ ready: false });
    expect(tallyRound1Votes([{ vote: 'want' }], 2)).toEqual({ ready: false });
    expect(tallyRound1Votes([{ vote: 'want' }, { vote: 'want' }], 2)).toEqual({
      ready: true,
      unanimousWant: true,
    });
    expect(tallyRound1Votes([{ vote: 'want' }, { vote: 'reject' }], 2)).toEqual({
      ready: true,
      unanimousWant: false,
    });
  });

  it('pickPluralityWinner picks highest count', () => {
    const casts = [
      { vote: 'pick', watchable_id: 10 },
      { vote: 'pick', watchable_id: 10 },
      { vote: 'pick', watchable_id: 20 },
    ];
    expect(pickPluralityWinner(casts, [10, 20])).toBe(10);
  });

  it('pickRandomId returns null for empty', () => {
    expect(pickRandomId([])).toBeNull();
  });
});
