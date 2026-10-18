function getTitle(item) {
  const { type } = item;
  if (item[type] == null) {
    return null;
  }
  return item[type].title;
}

function getTraktIds(item) {
  const { type } = item;
  if (item[type] == null) {
    return null;
  }
  return item[type].ids;
}

function getTraktId(item) {
  const ids = getTraktIds(item);
  const traktId = ids?.trakt;
  if (traktId) {
    return String(traktId);
  }
  return traktId;
}

/** When a title was added to the Trakt list, or null if the payload has no usable timestamp. */
function listedAtFromTraktItem(item) {
  const raw = item?.listed_at;
  if (raw == null || raw === '') {
    return null;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

module.exports = {
  getTitle,
  getTraktId,
  getTraktIds,
  listedAtFromTraktItem,
};
