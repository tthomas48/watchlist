const crypto = require('crypto');
const { Op } = require('sequelize');

const SESSION_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

const STATUS = {
  LOBBY: 'lobby',
  ACTIVE: 'active',
  FINAL: 'final',
  COMPLETE: 'complete',
  CANCELLED: 'cancelled',
};

const PHASE = {
  ROUND1: 'round1',
  ROUND2: 'round2',
};

function generateSessionCode(length = 6) {
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    code += SESSION_CODE_CHARS[bytes[i] % SESSION_CODE_CHARS.length];
  }
  return code;
}

function buildJoinUrl(code) {
  const base = (process.env.OAUTH_HOST || '').replace(/\/$/, '');
  return `${base}/vote/${code}`;
}

function parseJsonIds(value) {
  if (Array.isArray(value)) {
    return value.map((id) => Number(id));
  }
  return [];
}

function remainingPoolIds(session) {
  const pool = parseJsonIds(session.pool_ids);
  const excluded = new Set(parseJsonIds(session.excluded_ids));
  const finalists = new Set(parseJsonIds(session.finalist_ids));
  const current = session.current_watchable_id;
  return pool.filter((id) => !excluded.has(id) && !finalists.has(id) && id !== current);
}

function pickRandomId(ids) {
  if (!ids.length) {
    return null;
  }
  const idx = crypto.randomInt(0, ids.length);
  return ids[idx];
}

function tallyRound1Votes(casts, participantCount) {
  if (casts.length < participantCount || participantCount === 0) {
    return { ready: false };
  }
  const wants = casts.filter((c) => c.vote === 'want').length;
  const rejects = casts.filter((c) => c.vote === 'reject').length;
  if (wants + rejects < participantCount) {
    return { ready: false };
  }
  return {
    ready: true,
    unanimousWant: rejects === 0 && wants === participantCount,
  };
}

function pickPluralityWinner(casts, finalistIds) {
  const counts = new Map();
  finalistIds.forEach((id) => counts.set(id, 0));
  casts.forEach((c) => {
    if (c.vote === 'pick' && counts.has(c.watchable_id)) {
      counts.set(c.watchable_id, counts.get(c.watchable_id) + 1);
    }
  });
  let max = 0;
  const tied = [];
  counts.forEach((count, id) => {
    if (count > max) {
      max = count;
      tied.length = 0;
      tied.push(id);
    } else if (count === max && count > 0) {
      tied.push(id);
    }
  });
  if (!tied.length) {
    return finalistIds.length ? pickRandomId(finalistIds) : null;
  }
  return pickRandomId(tied);
}

function visibleWatchablesWhere(traktListId) {
  return {
    trakt_list_id: String(traktListId),
    [Op.or]: [{ hidden: false }, { hidden: null }],
  };
}

function sessionAllowsWatchable(session, watchableId) {
  const id = Number(watchableId);
  if (Number.isNaN(id)) {
    return false;
  }
  if (session.current_watchable_id === id) {
    return true;
  }
  if (session.winner_watchable_id === id) {
    return true;
  }
  const poolIds = [
    ...parseJsonIds(session.pool_ids),
    ...parseJsonIds(session.finalist_ids),
    ...parseJsonIds(session.excluded_ids),
  ];
  return poolIds.includes(id);
}

function serializeWatchable(w, sessionCode) {
  if (!w) {
    return null;
  }
  const imageUrl = sessionCode
    ? `/api/vote-sessions/${sessionCode}/img/${w.id}`
    : `/api/img/${w.id}`;
  return {
    id: w.id,
    title: w.title,
    imageUrl,
    overview: w.overview || null,
    rogerebertUrl: w.rogerebert_url || null,
    webUrl: w.web_url || null,
  };
}

class VoteSessionService {
  constructor({ models }) {
    this.models = models;
  }

  async expireIfNeeded(session) {
    if (!session) {
      return null;
    }
    if (session.status === STATUS.COMPLETE || session.status === STATUS.CANCELLED) {
      return session;
    }
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      await session.update({ status: STATUS.CANCELLED });
    }
    return session;
  }

  async findByCode(code) {
    const session = await this.models.VoteSession.findOne({ where: { code } });
    return this.expireIfNeeded(session);
  }

  async createSession({
    hostUserId, traktListId, traktListUserSlug, serviceType = 'adb-googletv',
  }) {
    const watchables = await this.models.Watchable.findAll({
      where: visibleWatchablesWhere(traktListId),
    });
    const poolIds = watchables.map((w) => w.id);
    if (!poolIds.length) {
      const err = new Error('No watchables available for voting on this list');
      err.status = 400;
      throw err;
    }
    let code;
    let existing;
    do {
      code = generateSessionCode();
      // eslint-disable-next-line no-await-in-loop
      existing = await this.models.VoteSession.findOne({ where: { code } });
    } while (existing);

    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const session = await this.models.VoteSession.create({
      code,
      trakt_list_id: traktListId,
      trakt_list_user_slug: traktListUserSlug,
      host_user_id: hostUserId,
      status: STATUS.LOBBY,
      phase: null,
      service_type: serviceType,
      current_watchable_id: null,
      finalist_ids: [],
      excluded_ids: [],
      pool_ids: poolIds,
      winner_watchable_id: null,
      expires_at: expiresAt,
    });
    return session;
  }

  async joinSession(code, displayName) {
    const session = await this.findByCode(code);
    if (!session) {
      const err = new Error('Session not found');
      err.status = 404;
      throw err;
    }
    if (session.status !== STATUS.LOBBY) {
      const err = new Error('Session is no longer accepting participants');
      err.status = 400;
      throw err;
    }
    const name = String(displayName || '').trim();
    if (!name) {
      const err = new Error('displayName is required');
      err.status = 400;
      throw err;
    }
    const participant = await this.models.VoteParticipant.create({
      vote_session_id: session.id,
      display_name: name,
      joined_at: new Date(),
    });
    return { participant, session };
  }

  async startSession(session) {
    if (session.status !== STATUS.LOBBY) {
      const err = new Error('Session has already started');
      err.status = 400;
      throw err;
    }
    const participants = await this.models.VoteParticipant.findAll({
      where: { vote_session_id: session.id },
    });
    if (!participants.length) {
      const err = new Error('At least one participant is required to start');
      err.status = 400;
      throw err;
    }
    const remaining = remainingPoolIds(session);
    const nextId = pickRandomId(remaining);
    if (!nextId) {
      const err = new Error('No candidates available');
      err.status = 400;
      throw err;
    }
    await session.update({
      status: STATUS.ACTIVE,
      phase: PHASE.ROUND1,
      current_watchable_id: nextId,
    });
    return session.reload();
  }

  async cancelSession(session) {
    if (session.status === STATUS.COMPLETE) {
      const err = new Error('Cannot cancel a completed session');
      err.status = 400;
      throw err;
    }
    await session.update({ status: STATUS.CANCELLED });
    return session.reload();
  }

  async castVote(session, participantId, vote, watchableId) {
    const participant = await this.models.VoteParticipant.findOne({
      where: { id: participantId, vote_session_id: session.id },
    });
    if (!participant) {
      const err = new Error('Participant not found');
      err.status = 404;
      throw err;
    }
    if (session.status === STATUS.LOBBY) {
      const err = new Error('Session has not started');
      err.status = 400;
      throw err;
    }
    if (session.status === STATUS.COMPLETE || session.status === STATUS.CANCELLED) {
      const err = new Error('Session is finished');
      err.status = 400;
      throw err;
    }

    const phase = session.phase;
    let targetWatchableId = watchableId;

    if (phase === PHASE.ROUND1) {
      if (vote !== 'want' && vote !== 'reject') {
        const err = new Error('Round 1 vote must be want or reject');
        err.status = 400;
        throw err;
      }
      targetWatchableId = session.current_watchable_id;
      if (!targetWatchableId) {
        const err = new Error('No candidate is being voted on');
        err.status = 400;
        throw err;
      }
    } else if (phase === PHASE.ROUND2) {
      if (vote !== 'pick') {
        const err = new Error('Round 2 vote must be pick');
        err.status = 400;
        throw err;
      }
      const finalists = parseJsonIds(session.finalist_ids);
      if (!finalists.includes(Number(targetWatchableId))) {
        const err = new Error('Invalid finalist selection');
        err.status = 400;
        throw err;
      }
    } else {
      const err = new Error('Invalid session phase');
      err.status = 400;
      throw err;
    }

    const [cast, created] = await this.models.VoteCast.findOrCreate({
      where: {
        vote_session_id: session.id,
        participant_id: participantId,
        phase,
        watchable_id: targetWatchableId,
      },
      defaults: {
        vote,
      },
    });
    if (!created) {
      await cast.update({ vote });
    }

    await this.maybeAdvanceSession(session);
    return session.reload();
  }

  async maybeAdvanceSession(session) {
    const participants = await this.models.VoteParticipant.findAll({
      where: { vote_session_id: session.id },
    });
    const participantCount = participants.length;

    if (session.phase === PHASE.ROUND1 && session.current_watchable_id) {
      const casts = await this.models.VoteCast.findAll({
        where: {
          vote_session_id: session.id,
          phase: PHASE.ROUND1,
          watchable_id: session.current_watchable_id,
        },
      });
      const tally = tallyRound1Votes(casts, participantCount);
      if (!tally.ready) {
        return session;
      }

      const finalists = parseJsonIds(session.finalist_ids);
      const excluded = parseJsonIds(session.excluded_ids);
      const currentId = session.current_watchable_id;

      if (tally.unanimousWant) {
        finalists.push(currentId);
      } else {
        excluded.push(currentId);
      }

      const updates = {
        current_watchable_id: null,
        finalist_ids: finalists,
        excluded_ids: excluded,
      };

      if (finalists.length >= 3) {
        updates.status = STATUS.FINAL;
        updates.phase = PHASE.ROUND2;
        return session.update(updates);
      }

      const remaining = remainingPoolIds({ ...session.get(), finalist_ids: finalists, excluded_ids: excluded });
      if (!remaining.length) {
        updates.status = STATUS.FINAL;
        updates.phase = PHASE.ROUND2;
        return session.update(updates);
      }

      updates.current_watchable_id = pickRandomId(remaining);
      return session.update(updates);
    }

    if (session.phase === PHASE.ROUND2) {
      const finalists = parseJsonIds(session.finalist_ids);
      const casts = await this.models.VoteCast.findAll({
        where: {
          vote_session_id: session.id,
          phase: PHASE.ROUND2,
        },
      });
      const picks = casts.filter((c) => c.vote === 'pick');
      if (picks.length < participantCount) {
        return session;
      }
      const winnerId = pickPluralityWinner(casts, finalists);
      return session.update({
        status: STATUS.COMPLETE,
        phase: PHASE.ROUND2,
        winner_watchable_id: winnerId,
        current_watchable_id: null,
      });
    }

    return session;
  }

  async buildSessionResponse(session) {
    const participants = await this.models.VoteParticipant.findAll({
      where: { vote_session_id: session.id },
      order: [['joined_at', 'ASC']],
    });

    let currentCandidate = null;
    if (session.current_watchable_id) {
      const w = await this.models.Watchable.findByPk(session.current_watchable_id);
      currentCandidate = serializeWatchable(w, session.code);
    }

    const finalistIds = parseJsonIds(session.finalist_ids);
    const finalists = finalistIds.length
      ? await this.models.Watchable.findAll({ where: { id: finalistIds } })
      : [];
    const finalistById = new Map(finalists.map((w) => [w.id, w]));
    const serializedFinalists = finalistIds
      .map((id) => serializeWatchable(finalistById.get(id), session.code))
      .filter(Boolean);

    let winner = null;
    if (session.winner_watchable_id) {
      const w = await this.models.Watchable.findByPk(session.winner_watchable_id);
      winner = serializeWatchable(w, session.code);
    }

    let voteProgress = { submitted: 0, required: participants.length };
    if (session.phase === PHASE.ROUND1 && session.current_watchable_id) {
      const casts = await this.models.VoteCast.findAll({
        where: {
          vote_session_id: session.id,
          phase: PHASE.ROUND1,
          watchable_id: session.current_watchable_id,
        },
      });
      voteProgress = { submitted: casts.length, required: participants.length };
    } else if (session.phase === PHASE.ROUND2) {
      const casts = await this.models.VoteCast.findAll({
        where: {
          vote_session_id: session.id,
          phase: PHASE.ROUND2,
          vote: 'pick',
        },
      });
      voteProgress = { submitted: casts.length, required: participants.length };
    }

    return {
      id: session.id,
      code: session.code,
      joinUrl: buildJoinUrl(session.code),
      status: session.status,
      phase: session.phase,
      serviceType: session.service_type,
      participants: participants.map((p) => ({
        id: p.id,
        displayName: p.display_name,
      })),
      currentCandidate,
      finalists: serializedFinalists,
      voteProgress,
      winner,
    };
  }
}

module.exports = {
  VoteSessionService,
  generateSessionCode,
  buildJoinUrl,
  remainingPoolIds,
  pickRandomId,
  tallyRound1Votes,
  pickPluralityWinner,
  serializeWatchable,
  sessionAllowsWatchable,
  visibleWatchablesWhere,
  STATUS,
  PHASE,
};
