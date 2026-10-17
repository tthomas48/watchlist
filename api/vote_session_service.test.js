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
      year: null,
      rogerebert_url: null,
      web_url: null,
    };
    expect(serializeWatchable(watchable, 'ABC123').imageUrl)
      .toBe('/api/vote-sessions/ABC123/img/42');
    expect(serializeWatchable(watchable).imageUrl).toBe('/api/img/42');
  });

  it('serializeWatchable includes year when present and null when missing', () => {
    expect(serializeWatchable({
      id: 1,
      title: 'With Year',
      year: 2019,
      overview: null,
      rogerebert_url: null,
      web_url: null,
    }).year).toBe(2019);
    expect(serializeWatchable({
      id: 2,
      title: 'No Year',
      overview: null,
      rogerebert_url: null,
      web_url: null,
    }).year).toBeNull();
  });

  it('serializeWatchable includes trailerUrl when present and null when missing', () => {
    expect(serializeWatchable({
      id: 1,
      title: 'With Trailer',
      year: null,
      overview: null,
      rogerebert_url: null,
      trailer_url: 'https://youtu.be/abc',
      web_url: null,
    }).trailerUrl).toBe('https://youtu.be/abc');
    expect(serializeWatchable({
      id: 2,
      title: 'No Trailer',
      year: null,
      overview: null,
      rogerebert_url: null,
      web_url: null,
    }).trailerUrl).toBeNull();
  });

  it('serializeWatchable includes camelCase recommenders', () => {
    expect(serializeWatchable({
      id: 1,
      title: 'T',
      recommenders: [{ id: 9, name: 'Sam', avatar: 'https://example.com/s.jpg' }],
    }).recommenders).toEqual([
      { id: 9, name: 'Sam', avatarUrl: 'https://example.com/s.jpg' },
    ]);
    expect(serializeWatchable({ id: 1, title: 'T' }).recommenders).toEqual([]);
  });
});

describe('visibleWatchablesWhere', () => {
  it('includes non-hidden and null hidden watchables', () => {
    const where = visibleWatchablesWhere('12345');
    expect(where[Op.and]).toEqual(
      expect.arrayContaining([
        { trakt_list_id: '12345' },
        { [Op.or]: [{ hidden: false }, { hidden: null }] },
      ]),
    );
  });

  it('defaults to playable-only; video_store shows all', () => {
    const playable = visibleWatchablesWhere('12345');
    const all = visibleWatchablesWhere('12345', { video_store: true });
    expect(playable[Op.and].length).toBeGreaterThan(all[Op.and].length);
  });

  it('applies mood filter when provided', () => {
    const base = visibleWatchablesWhere('12345');
    const filtered = visibleWatchablesWhere('12345', { mood: 'comfort' });
    expect(filtered[Op.and].length).toBeGreaterThan(base[Op.and].length);
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

  it('subsets pool when use_list_filters and mood are set', async () => {
    const findAll = jest.fn().mockResolvedValue([{ id: 7 }]);
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
      traktListId: '555',
      traktListUserSlug: 'me',
      use_list_filters: true,
      mood: 'comfort',
      genre: 'comedy',
    });

    expect(findAll).toHaveBeenCalledWith({
      where: visibleWatchablesWhere('555', { mood: 'comfort', genre: 'comedy' }),
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      pool_ids: [7],
    }));
  });

  it('subsets pool when use_list_filters and personId are set', async () => {
    const findAll = jest.fn().mockResolvedValue([{ id: 3 }]);
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
      traktListId: '555',
      traktListUserSlug: 'me',
      use_list_filters: true,
      personId: 12,
    });

    expect(findAll).toHaveBeenCalledWith({
      where: visibleWatchablesWhere('555', { personId: 12 }),
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      pool_ids: [3],
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

  it('rejects with filter message when filtered pool is empty', async () => {
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
      use_list_filters: true,
      mood: 'scary',
    })).rejects.toMatchObject({
      message: 'No watchables match the selected filters for voting',
      status: 400,
    });
  });
});
