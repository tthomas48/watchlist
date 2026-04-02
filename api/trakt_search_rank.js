const { getTraktId } = require('./helpers');

const MAX_RECOMMENDATION_FETCH = 200;

/**
 * @param {unknown} items - Trakt recommendations response (array of movie/show objects).
 * @returns {Set<string>}
 */
function traktIdsFromRecommendationItems(items) {
  const set = new Set();
  if (!Array.isArray(items)) {
    return set;
  }
  for (let i = 0; i < items.length; i += 1) {
    const tid = items[i]?.ids?.trakt;
    if (tid != null) {
      set.add(String(tid));
    }
  }
  return set;
}

/**
 * Stable tier sort: hits whose Trakt id is in recIdSet first (original order within each tier).
 * @param {unknown} results - Trakt search.text rows.
 * @param {Set<string>} recIdSet
 * @param {{ preferRequested?: boolean }} [options]
 */
function sortSearchResultsByRecommendationIds(results, recIdSet, options = {}) {
  const preferRequested = Boolean(options.preferRequested);
  const list = Array.isArray(results) ? results : [];

  if (!preferRequested || !recIdSet || recIdSet.size === 0) {
    return {
      results: [...list],
      meta: {
        recommendationBoost: preferRequested && recIdSet && recIdSet.size > 0,
        boostedCount: 0,
      },
    };
  }

  const boosted = [];
  const rest = [];
  for (let i = 0; i < list.length; i += 1) {
    const r = list[i];
    const id = getTraktId(r);
    if (id != null && recIdSet.has(String(id))) {
      boosted.push(r);
    } else {
      rest.push(r);
    }
  }

  return {
    results: boosted.concat(rest),
    meta: {
      recommendationBoost: true,
      boostedCount: boosted.length,
    },
  };
}

module.exports = {
  MAX_RECOMMENDATION_FETCH,
  traktIdsFromRecommendationItems,
  sortSearchResultsByRecommendationIds,
};
