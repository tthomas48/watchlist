const ErrorWithStatus = require('../../ErrorWithStatus');

function parseBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') {
    return null;
  }
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }
  const token = match[1].trim();
  return token || null;
}

/**
 * @param {import('./trakt_oauth_provider')} authProvider
 */
function createRequireAuth(authProvider) {
  return async function requireAuth(req, res, next) {
    if (req.user) {
      next();
      return;
    }
    const token = parseBearerToken(req);
    if (!token) {
      res.status(401).send('Unauthorized');
      return;
    }
    try {
      const user = await authProvider.authenticateAccessToken(req.models, token);
      req.user = user;
      next();
    } catch (e) {
      const status = e instanceof ErrorWithStatus ? e.status : 401;
      res.status(status).send('Unauthorized');
    }
  };
}

module.exports = {
  createRequireAuth,
  parseBearerToken,
};
