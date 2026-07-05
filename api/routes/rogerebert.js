const { asyncHandler } = require('../route_helpers');
const { lookupRogerEbertReview } = require('../rogerebert_lookup');

function mountRogerEbertRoutes(apiRouter, { authProvider }) {
  const requireLogin = authProvider.requireLogin.bind(authProvider);

  apiRouter.post(
    '/watchables/:id/rogerebert-lookup',
    requireLogin,
    asyncHandler(async (req, res) => {
      const watchable = await req.models.Watchable.findByPk(req.params.id);
      if (!watchable) {
        res.status(404).json({ message: 'not found' });
        return;
      }
      const url = await lookupRogerEbertReview({
        title: watchable.title,
        year: watchable.year,
      });
      if (url) {
        watchable.rogerebert_url = url;
        await watchable.save();
      }
      res.json({ url });
    }),
  );
}

module.exports = mountRogerEbertRoutes;
