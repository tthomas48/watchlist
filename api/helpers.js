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



module.exports = {
  getTitle,
  getTraktId,
  getTraktIds,
};
