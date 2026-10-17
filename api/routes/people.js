const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const multer = require('multer');
const { asyncHandler, sendError } = require('../route_helpers');
const {
  MAX_AVATAR_BYTES,
  listPeopleForUser,
  createPerson,
  updatePerson,
  deletePerson,
  savePersonAvatarFile,
  findLocalAvatarPath,
  findOwnedPerson,
} = require('../people_service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES },
});

function mountPeopleRoutes(apiRouter, { authProvider }) {
  const requireLogin = authProvider.requireLogin.bind(authProvider);

  apiRouter.get(
    '/people',
    requireLogin,
    asyncHandler(async (req, res) => {
      res.json(await listPeopleForUser(req.models, req.user.id));
    }),
  );

  apiRouter.post(
    '/people',
    requireLogin,
    asyncHandler(async (req, res) => {
      try {
        const body = req.body || {};
        const person = await createPerson(req.models, req.user.id, {
          name: body.name,
          avatarUrl: body.avatarUrl,
        });
        res.status(201).json(person);
      } catch (e) {
        if (e.status) {
          sendError(res, e);
          return;
        }
        throw e;
      }
    }),
  );

  apiRouter.patch(
    '/people/:id',
    requireLogin,
    asyncHandler(async (req, res) => {
      try {
        const person = await updatePerson(
          req.models,
          req.user.id,
          req.params.id,
          req.body || {},
        );
        if (!person) {
          res.status(404).json({ message: 'not found' });
          return;
        }
        res.json(person);
      } catch (e) {
        if (e.status) {
          sendError(res, e);
          return;
        }
        throw e;
      }
    }),
  );

  apiRouter.delete(
    '/people/:id',
    requireLogin,
    asyncHandler(async (req, res) => {
      const deleted = await deletePerson(req.models, req.user.id, req.params.id);
      if (!deleted) {
        res.status(404).json({ message: 'not found' });
        return;
      }
      res.status(204).send();
    }),
  );

  apiRouter.post(
    '/people/:id/avatar',
    requireLogin,
    (req, res, next) => {
      upload.single('avatar')(req, res, (err) => {
        if (err) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ message: 'avatar must be 2MB or smaller' });
            return;
          }
          res.status(400).json({ message: err.message || 'upload failed' });
          return;
        }
        next();
      });
    },
    asyncHandler(async (req, res) => {
      try {
        const person = await savePersonAvatarFile(
          req.models,
          req.user.id,
          req.params.id,
          req.file,
        );
        if (!person) {
          res.status(404).json({ message: 'not found' });
          return;
        }
        res.json(person);
      } catch (e) {
        if (e.status) {
          sendError(res, e);
          return;
        }
        throw e;
      }
    }),
  );

  // Must be registered before /img/:watchable_id
  apiRouter.get(
    '/img/people/:id',
    requireLogin,
    asyncHandler(async (req, res) => {
      const person = await findOwnedPerson(req.models, req.user.id, req.params.id);
      if (!person) {
        res.status(404).json({ message: 'not found' });
        return;
      }
      const filePath = findLocalAvatarPath(person.id);
      if (!filePath) {
        res.status(404).json({ message: 'not found' });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const typeByExt = {
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
      };
      res.setHeader('Content-Type', typeByExt[ext] || 'image/jpeg');
      await pipeline(fs.createReadStream(filePath), res);
    }),
  );
}

module.exports = mountPeopleRoutes;
