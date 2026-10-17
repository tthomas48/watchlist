const { asyncHandler } = require('../route_helpers');
const { pickTrailerUrl } = require('../trailer');

function mountTrailerRoutes(apiRouter, { authProvider, traktClient }) {
  const requireLogin = authProvider.requireLogin.bind(authProvider);

  apiRouter.get(
    '/watchables/:id/trailer',
    requireLogin,
    asyncHandler(async (req, res) => {
      const watchable = await req.models.Watchable.findByPk(req.params.id);
      if (!watchable) {
        res.status(404).json({ message: 'not found' });
        return;
      }

      if (watchable.trailer_url) {
        res.json({ trailerUrl: watchable.trailer_url });
        return;
      }

      const mediaType = watchable.media_type;
      const traktId = watchable.trakt_id;
      if (
        (mediaType !== 'movie' && mediaType !== 'show')
        || traktId == null
        || String(traktId).trim() === ''
      ) {
        res.json({ trailerUrl: null });
        return;
      }

      if (req.user?.access_token) {
        await traktClient.importToken(req.user.access_token);
      }

      const videos = await traktClient.getVideos(mediaType, traktId);
      const trailerUrl = pickTrailerUrl(videos);
      if (trailerUrl) {
        watchable.trailer_url = trailerUrl;
        await watchable.save();
      }
      res.json({ trailerUrl: trailerUrl || null });
    }),
  );
}

module.exports = mountTrailerRoutes;
