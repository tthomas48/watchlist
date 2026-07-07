// global test, expect, describe, it
const {
  remainingPoolIds,
  tallyRound1Votes,
  pickPluralityWinner,
  pickRandomId,
  generateSessionCode,
  VoteSessionService,
  serializeWatchable,
  sessionAllowsWatchable,
  visibleWatchablesWhere,
} = require('./vote_session_service');
const { Op } = require('sequelize');

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

  it('sessionAllowsWatchable permits pool and session watchables only', () => {
    const session = {
      pool_ids: [1, 2, 3],
      finalist_ids: [4],
      excluded_ids: [5],
      current_watchable_id: 6,
      winner_watchable_id: 7,
    };
    expect(sessionAllowsWatchable(session, 1)).toBe(true);
    expect(sessionAllowsWatchable(session, 4)).toBe(true);
    expect(sessionAllowsWatchable(session, 5)).toBe(true);
    expect(sessionAllowsWatchable(session, 6)).toBe(true);
    expect(sessionAllowsWatchable(session, 7)).toBe(true);
    expect(sessionAllowsWatchable(session, 99)).toBe(false);
  });

  it('serializeWatchable uses vote-scoped image URLs when session code provided', () => {
    const watchable = {
      id: 42,
      title: 'Test',
      overview: null,
      rogerebert_url: null,
      web_url: null,
    };
    expect(serializeWatchable(watchable, 'ABC123').imageUrl)
      .toBe('/api/vote-sessions/ABC123/img/42');
    expect(serializeWatchable(watchable).imageUrl).toBe('/api/img/42');
  });
});

describe('visibleWatchablesWhere', () => {
  it('includes non-hidden and null hidden watchables', () => {
    expect(visibleWatchablesWhere('12345')).toEqual({
      trakt_list_id: '12345',
      [Op.or]: [{ hidden: false }, { hidden: null }],
    });
  });
});

describe('VoteSessionService.createSession', () => {
  it('builds pool from watchables with null hidden', async () => {
    const findAll = jest.fn().mockResolvedValue([
      { id: 1 },
      { id: 2 },
    ]);
    const create = jest.fn().mockResolvedValue({ id: 99, code: 'ABCDEF' });
    const findOne = jest.fn().mockResolvedValue(null);
    const service = new VoteSessionService({
      models: {
        Watchable: { findAll },
        VoteSession: { findOne, create },
      },
    });

    await service.createSession({
      hostUserId: 1,
      traktListId: 555,
      traktListUserSlug: 'me',
    });

    expect(findAll).toHaveBeenCalledWith({
      where: visibleWatchablesWhere('555'),
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      pool_ids: [1, 2],
      trakt_list_id: 555,
    }));
  });

  it('rejects when no visible watchables exist', async () => {
    const service = new VoteSessionService({
      models: {
        Watchable: { findAll: jest.fn().mockResolvedValue([]) },
        VoteSession: { findOne: jest.fn(), create: jest.fn() },
      },
    });

    await expect(service.createSession({
      hostUserId: 1,
      traktListId: '123',
      traktListUserSlug: 'me',
    })).rejects.toMatchObject({
      message: 'No watchables available for voting on this list',
      status: 400,
    });
  });
});
