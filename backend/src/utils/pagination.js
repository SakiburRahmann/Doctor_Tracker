/**
 * Shared pagination parser.
 * - page: 1-based (clamped >= 1)
 * - limit: 1..100 (bounded so a client can never request the whole collection)
 * - skip is derived, never trusted from the client
 */
const parsePagination = (query, defaults = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const rawLimit = parseInt(query.limit, 10) || defaults.limit || 10;
  const limit = Math.min(Math.max(rawLimit, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

module.exports = { parsePagination };
