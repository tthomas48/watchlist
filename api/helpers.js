function getTitle(item) {
  const { type } = item;
  if (item[type] == null) {
    return null;
  }
  return item[type].title;
}

function getTraktId(item) {
  const { type } = item;
  if (item[type] == null) {
    return null;
  }
  return String(item[type].ids?.trakt);
}

module.exports = {
  getTitle,
  getTraktId,
};
