const { createRequireAuth } = require('../auth/require_auth');
const { VoteSessionService, sessionAllowsWatchable } = require('../vote_session_service');
const { asyncHandler, sendError } = require('../route_helpers');
const { serveWatchablePoster } = require('../poster_serve');

function mountVoteSessionRoutes(apiRouter, deps) {
  const {
    authProvider,
    playWatchable,
  } = deps;
  const requireAuth = createRequireAuth(authProvider);

  const getService = (req) => new VoteSessionService({ models: req.models });

  apiRouter.post(
    '/vote-sessions',
    requireAuth,
    asyncHandler(async (req, res) => {
      const {
        trakt_list_id: traktListId,
        trakt_list_user_slug: traktListUserSlug,
        service_type: serviceType,
      } = req.body || {};
      if (!traktListId || !traktListUserSlug) {
        res.status(400).json({ message: 'trakt_list_id and trakt_list_user_slug are required' });
        return;
      }
      const service = getService(req);
      const session = await service.createSession({
        hostUserId: req.user.id,
        traktListId: String(traktListId),
        traktListUserSlug: String(traktListUserSlug),
        serviceType: serviceType || 'adb-googletv',
      });
      const body = await service.buildSessionResponse(session);
      res.json({
        id: session.id,
        code: session.code,
        joinUrl: body.joinUrl,
      });
    }),
  );

  apiRouter.get(
    '/vote-sessions/:code',
    asyncHandler(async (req, res) => {
      const service = getService(req);
      const session = await service.findByCode(req.params.code);
      if (!session) {
        res.status(404).json({ message: 'Session not found' });
        return;
      }
      res.json(await service.buildSessionResponse(session));
    }),
  );

  apiRouter.get(
    '/vote-sessions/:code/img/:watchableId',
    asyncHandler(async (req, res) => {
      const service = getService(req);
      const session = await service.findByCode(req.params.code);
      if (!session) {
        res.status(404).json({ message: 'Session not found' });
        return;
      }
      if (!sessionAllowsWatchable(session, req.params.watchableId)) {
        res.status(403).json({ message: 'Watchable not in this session' });
        return;
      }
      await serveWatchablePoster(res, {
        models: req.models,
        watchableId: req.params.watchableId,
      });
    }),
  );

  apiRouter.post(
    '/vote-sessions/:code/join',
    asyncHandler(async (req, res) => {
      const service = getService(req);
      try {
        const { displayName } = req.body || {};
        const { participant, session } = await service.joinSession(req.params.code, displayName);
        res.json({
          participantId: participant.id,
          session: await service.buildSessionResponse(session),
        });
      } catch (e) {
        sendError(res, e, 500);
      }
    }),
  );

  apiRouter.post(
    '/vote-sessions/:code/start',
    asyncHandler(async (req, res) => {
      const service = getService(req);
      const session = await service.findByCode(req.params.code);
      if (!session) {
        res.status(404).json({ message: 'Session not found' });
        return;
      }
      const { participantId } = req.body || {};
      if (!participantId) {
        res.status(400).json({ message: 'participantId is required' });
        return;
      }
      const participant = await req.models.VoteParticipant.findOne({
        where: { id: participantId, vote_session_id: session.id },
      });
      if (!participant) {
        res.status(403).json({ message: 'Participant not in this session' });
        return;
      }
      try {
        const updated = await service.startSession(session);
        res.json(await service.buildSessionResponse(updated));
      } catch (e) {
        sendError(res, e, 500);
      }
    }),
  );

  apiRouter.post(
    '/vote-sessions/:code/vote',
    asyncHandler(async (req, res) => {
      const service = getService(req);
      const session = await service.findByCode(req.params.code);
      if (!session) {
        res.status(404).json({ message: 'Session not found' });
        return;
      }
      const { participantId, vote, watchableId } = req.body || {};
      if (!participantId || !vote) {
        res.status(400).json({ message: 'participantId and vote are required' });
        return;
      }
      try {
        const updated = await service.castVote(
          session,
          participantId,
          vote,
          watchableId != null ? Number(watchableId) : undefined,
        );
        res.json(await service.buildSessionResponse(updated));
      } catch (e) {
        sendError(res, e, 500);
      }
    }),
  );

  apiRouter.post(
    '/vote-sessions/:code/cancel',
    requireAuth,
    asyncHandler(async (req, res) => {
      const service = getService(req);
      const session = await service.findByCode(req.params.code);
      if (!session) {
        res.status(404).json({ message: 'Session not found' });
        return;
      }
      if (session.host_user_id !== req.user.id) {
        res.status(403).json({ message: 'Only the host can cancel this session' });
        return;
      }
      try {
        const updated = await service.cancelSession(session);
        res.json(await service.buildSessionResponse(updated));
      } catch (e) {
        sendError(res, e, 500);
      }
    }),
  );

  apiRouter.post(
    '/vote-sessions/:code/play-winner',
    requireAuth,
    asyncHandler(async (req, res) => {
      const service = getService(req);
      const session = await service.findByCode(req.params.code);
      if (!session) {
        res.status(404).json({ message: 'Session not found' });
        return;
      }
      if (session.status !== 'complete' || !session.winner_watchable_id) {
        res.status(400).json({ message: 'Session has no winner yet' });
        return;
      }
      const watchable = await req.models.Watchable.findByPk(session.winner_watchable_id);
      if (!watchable?.web_url) {
        res.status(400).json({ message: `No playable URL for ${watchable?.title || 'winner'}` });
        return;
      }
      const result = await playWatchable(req, session.service_type, watchable);
      res.json(result);
    }),
  );
}

module.exports = mountVoteSessionRoutes;
