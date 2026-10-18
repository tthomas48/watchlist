/**
 * Sequelize `order` for GET /api/watchlist.
 * `recently-added` uses `added_at` (Trakt `listed_at`, else when the row was created).
 * @param {string} sort
 * @returns {Array<Array<string>>}
 */
function watchlistSortOrder(sort) {
  switch (sort) {
    case 'most-watched':
      return [['last_played', 'DESC']];
    case 'alpha-asc':
      return [['sortable_title', 'ASC']];
    case 'alpha-desc':
      return [['sortable_title', 'DESC']];
    case 'recently-added':
      return [['added_at', 'DESC'], ['id', 'DESC']];
    case 'least-watched':
    default:
      return [['last_played', 'ASC']];
  }
}

module.exports = {
  watchlistSortOrder,
};
