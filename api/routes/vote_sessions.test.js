// global test, expect, describe, it, jest, beforeEach
const mountVoteSessionRoutes = require('./vote_sessions');

jest.mock('../auth/require_auth', () => ({
  createRequireAuth: () => (req, res, next) => next(),
}));

jest.mock('../vote_session_service', () => {
  const actual = jest.requireActual('../vote_session_service');
  const mocks = {
    findByCode: jest.fn(),
    startSession: jest.fn(),
    buildSessionResponse: jest.fn(),
  };
  const MockVoteSessionService = jest.fn(() => mocks);
  MockVoteSessionService.__mocks = mocks;
  return {
    ...actual,
    VoteSessionService: MockVoteSessionService,
  };
});

const { VoteSessionService } = require('../vote_session_service');
const serviceMocks = VoteSessionService.__mocks;

function captureRoutes() {
  const handlers = {};
  const post = jest.fn((path, ...fns) => {
    handlers[path] = fns[fns.length - 1];
  });
  const get = jest.fn((path, ...fns) => {
    handlers[path] = fns[fns.length - 1];
  });
  mountVoteSessionRoutes({ post, get }, {
    authProvider: { requireLogin: jest.fn() },
    receiverFactory: {},
    traktClient: {},
    playWatchable: jest.fn(),
  });
  return handlers;
}

function mockRes() {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
}

async function invokeHandler(handler, req, res) {
  handler(req, res, jest.fn());
  await new Promise((resolve) => { setImmediate(resolve); });
}

describe('vote_sessions routes', () => {
  it('registers vote session endpoints', () => {
    const post = jest.fn();
    const get = jest.fn();
    const apiRouter = { post, get };
    mountVoteSessionRoutes(apiRouter, {
      authProvider: { requireLogin: jest.fn() },
      receiverFactory: {},
      traktClient: {},
      playWatchable: jest.fn(),
    });
    expect(post).toHaveBeenCalledWith('/vote-sessions', expect.any(Function), expect.any(Function));
    expect(get).toHaveBeenCalledWith('/vote-sessions/:code', expect.any(Function));
    expect(get).toHaveBeenCalledWith('/vote-sessions/:code/img/:watchableId', expect.any(Function));
    expect(post).toHaveBeenCalledWith('/vote-sessions/:code/join', expect.any(Function));
    expect(post).toHaveBeenCalledWith('/vote-sessions/:code/start', expect.any(Function));
    expect(post).toHaveBeenCalledWith('/vote-sessions/:code/vote', expect.any(Function));
    expect(post).toHaveBeenCalledWith('/vote-sessions/:code/cancel', expect.any(Function), expect.any(Function));
    expect(post).toHaveBeenCalledWith('/vote-sessions/:code/play-winner', expect.any(Function), expect.any(Function));
  });
});

describe('POST /vote-sessions/:code/start', () => {
  let handlers;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = captureRoutes();
  });

  it('returns 400 when participantId is missing', async () => {
    const req = {
      params: { code: 'ABC123' },
      body: {},
      models: { VoteParticipant: { findOne: jest.fn() } },
    };
    const res = mockRes();
    serviceMocks.findByCode.mockResolvedValue({ id: 'session-1', code: 'ABC123' });

    await invokeHandler(handlers['/vote-sessions/:code/start'], req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'participantId is required' });
  });

  it('returns 403 when participant is not in session', async () => {
    const req = {
      params: { code: 'ABC123' },
      body: { participantId: 'p1' },
      models: {
        VoteParticipant: {
          findOne: jest.fn().mockResolvedValue(null),
        },
      },
    };
    const res = mockRes();
    serviceMocks.findByCode.mockResolvedValue({ id: 'session-1', code: 'ABC123' });

    await invokeHandler(handlers['/vote-sessions/:code/start'], req, res);

    expect(req.models.VoteParticipant.findOne).toHaveBeenCalledWith({
      where: { id: 'p1', vote_session_id: 'session-1' },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Participant not in this session' });
  });

  it('starts session for a valid participant', async () => {
    const session = { id: 'session-1', code: 'ABC123', status: 'lobby' };
    const updated = { ...session, status: 'active' };
    const req = {
      params: { code: 'ABC123' },
      body: { participantId: 'p1' },
      models: {
        VoteParticipant: {
          findOne: jest.fn().mockResolvedValue({ id: 'p1' }),
        },
      },
    };
    const res = mockRes();
    serviceMocks.findByCode.mockResolvedValue(session);
    serviceMocks.startSession.mockResolvedValue(updated);
    serviceMocks.buildSessionResponse.mockResolvedValue({ code: 'ABC123', status: 'active' });

    await invokeHandler(handlers['/vote-sessions/:code/start'], req, res);

    expect(serviceMocks.startSession).toHaveBeenCalledWith(session);
    expect(res.json).toHaveBeenCalledWith({ code: 'ABC123', status: 'active' });
  });
});
