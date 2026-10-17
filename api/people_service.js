const fs = require('fs');
const path = require('path');

let peopleImageDir = path.join(__dirname, '../data/img/people/');
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function getPeopleImageDir() {
  return peopleImageDir;
}

function setPeopleImageDir(dir) {
  peopleImageDir = dir;
}

function ensurePeopleImageDir() {
  if (!fs.existsSync(peopleImageDir)) {
    fs.mkdirSync(peopleImageDir, { recursive: true });
  }
}

function localAvatarPath(personId, ext = '.jpg') {
  return path.join(peopleImageDir, `${personId}${ext}`);
}

function findLocalAvatarPath(personId) {
  const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  return extensions
    .map((ext) => localAvatarPath(personId, ext))
    .find((candidate) => fs.existsSync(candidate)) || null;
}

function isExternalAvatarUrl(value) {
  if (!value || typeof value !== 'string') return false;
  return /^https?:\/\//i.test(value.trim());
}

/**
 * Public avatar URL for browse (snake) or vote (camel) payloads.
 * Prefer local file → `/api/img/people/:id`; else stored http(s) URL; else null.
 */
function resolveAvatarUrl(person) {
  if (!person) return null;
  const { id } = person;
  if (id != null && findLocalAvatarPath(id)) {
    return `/api/img/people/${id}`;
  }
  if (isExternalAvatarUrl(person.avatar)) {
    return person.avatar.trim();
  }
  return null;
}

function serializePerson(person) {
  return {
    id: person.id,
    name: person.name,
    avatarUrl: resolveAvatarUrl(person),
    avatar: person.avatar || null,
  };
}

function serializeRecommenderSnake(person) {
  return {
    id: person.id,
    name: person.name,
    avatar_url: resolveAvatarUrl(person),
  };
}

function serializeRecommenderCamel(person) {
  return {
    id: person.id,
    name: person.name,
    avatarUrl: resolveAvatarUrl(person),
  };
}

function normalizePersonIds(personIds) {
  if (personIds == null) return null;
  if (!Array.isArray(personIds)) {
    const err = new Error('personIds must be an array');
    err.status = 400;
    throw err;
  }
  const ids = [...new Set(
    personIds.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0),
  )];
  return ids.map((n) => Math.trunc(n));
}

/**
 * Replace recommenders on a watchable. Validates all personIds belong to userId.
 */
async function setWatchablePeople(models, watchableId, personIds, userId) {
  const ids = normalizePersonIds(personIds);
  if (ids === null) {
    return;
  }
  if (ids.length) {
    const owned = await models.Person.findAll({
      where: { id: ids, userId },
      attributes: ['id'],
    });
    if (owned.length !== ids.length) {
      const err = new Error('one or more personIds are invalid');
      err.status = 400;
      throw err;
    }
  }
  await models.WatchablePerson.destroy({ where: { watchableId } });
  if (ids.length) {
    await models.WatchablePerson.bulkCreate(
      ids.map((personId) => ({ watchableId, personId })),
    );
  }
}

async function listPeopleForUser(models, userId) {
  const rows = await models.Person.findAll({
    where: { userId },
    order: [['name', 'ASC'], ['id', 'ASC']],
  });
  return rows.map(serializePerson);
}

async function findOwnedPerson(models, userId, personId) {
  return models.Person.findOne({
    where: { id: personId, userId },
  });
}

async function createPerson(models, userId, { name, avatarUrl }) {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    const err = new Error('name is required');
    err.status = 400;
    throw err;
  }
  const avatar = isExternalAvatarUrl(avatarUrl) ? String(avatarUrl).trim() : null;
  const person = await models.Person.create({
    userId,
    name: trimmed,
    avatar,
  });
  return serializePerson(person);
}

async function updatePerson(models, userId, personId, patch = {}) {
  const person = await findOwnedPerson(models, userId, personId);
  if (!person) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
    const trimmed = String(patch.name || '').trim();
    if (!trimmed) {
      const err = new Error('name is required');
      err.status = 400;
      throw err;
    }
    person.name = trimmed;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'avatarUrl')) {
    const { avatarUrl } = patch;
    if (avatarUrl === null || avatarUrl === '') {
      person.avatar = null;
    } else if (isExternalAvatarUrl(avatarUrl)) {
      person.avatar = String(avatarUrl).trim();
    } else {
      const err = new Error('avatarUrl must be an http(s) URL');
      err.status = 400;
      throw err;
    }
  }
  await person.save();
  return serializePerson(person);
}

async function deletePerson(models, userId, personId) {
  const person = await findOwnedPerson(models, userId, personId);
  if (!person) {
    return false;
  }
  const localPath = findLocalAvatarPath(personId);
  await models.WatchablePerson.destroy({ where: { personId } });
  await person.destroy();
  if (localPath && fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
  }
  return true;
}

function extForMime(mime) {
  switch (mime) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'image/jpeg':
    default:
      return '.jpg';
  }
}

async function savePersonAvatarFile(models, userId, personId, file) {
  const person = await findOwnedPerson(models, userId, personId);
  if (!person) {
    return null;
  }
  if (!file || !file.buffer) {
    const err = new Error('avatar file is required');
    err.status = 400;
    throw err;
  }
  if (!ALLOWED_AVATAR_MIME.has(file.mimetype)) {
    const err = new Error('avatar must be jpeg, png, webp, or gif');
    err.status = 400;
    throw err;
  }
  if (file.size > MAX_AVATAR_BYTES) {
    const err = new Error('avatar must be 2MB or smaller');
    err.status = 400;
    throw err;
  }
  ensurePeopleImageDir();
  // Remove any prior extension variants
  const existing = findLocalAvatarPath(personId);
  if (existing) {
    fs.unlinkSync(existing);
  }
  const ext = extForMime(file.mimetype);
  const dest = localAvatarPath(personId, ext);
  fs.writeFileSync(dest, file.buffer);
  person.avatar = `people/${personId}${ext}`;
  await person.save();
  return serializePerson(person);
}

function recommendersInclude(models) {
  return {
    model: models.Person,
    as: 'recommenders',
    attributes: ['id', 'name', 'avatar'],
    through: { attributes: [] },
  };
}

function attachRecommendersSnake(watchableJson, recommenders) {
  return {
    ...watchableJson,
    recommenders: (recommenders || []).map(serializeRecommenderSnake),
  };
}

function watchableToBrowseJson(watchable) {
  // Lazy require avoids circular init with streaming_snapshot → filter → …
  // eslint-disable-next-line global-require
  const { streamingSummaryFromWatchable } = require('./streaming_snapshot');
  const json = typeof watchable.toJSON === 'function' ? watchable.toJSON() : { ...watchable };
  const recommenders = json.recommenders || watchable.recommenders || [];
  delete json.WatchablePeople;
  const streaming = streamingSummaryFromWatchable(json);
  delete json.streaming_options_json;
  delete json.streaming_checked_at;
  return {
    ...attachRecommendersSnake(json, recommenders),
    streaming,
  };
}

module.exports = {
  getPeopleImageDir,
  setPeopleImageDir,
  MAX_AVATAR_BYTES,
  ALLOWED_AVATAR_MIME,
  ensurePeopleImageDir,
  findLocalAvatarPath,
  localAvatarPath,
  resolveAvatarUrl,
  serializePerson,
  serializeRecommenderSnake,
  serializeRecommenderCamel,
  normalizePersonIds,
  setWatchablePeople,
  listPeopleForUser,
  findOwnedPerson,
  createPerson,
  updatePerson,
  deletePerson,
  savePersonAvatarFile,
  recommendersInclude,
  watchableToBrowseJson,
};
