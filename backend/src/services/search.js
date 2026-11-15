/**
 * Search helpers shared by the doctor and patient queries.
 *
 * A case-insensitive *substring* regex (`/amrul/i`) cannot use an index — every
 * such query is a full collection scan. So search is a two-pass strategy:
 *
 *  1. Prefix pass (the common case, and what a type-ahead box actually needs):
 *     the term is split into tokens and each token must prefix one of the
 *     searchable fields. The queries run with a case-insensitive collation, which
 *     lets MongoDB answer them from a collation-matched index — no scan.
 *  2. Fallback pass: only when the prefix pass finds nothing, the original
 *     substring regex runs once. Rare, and it keeps behaviour like typing a
 *     fragment from the middle of a surname working.
 */

/** Case-insensitive comparison for both the indexes and the queries that use them. */
const SEARCH_COLLATION = { locale: 'en', strength: 2 };

/** Escapes regex metacharacters so input can never be abused as a pattern. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Splits a search term into escaped, prefix-matchable tokens. */
function searchTokens(term, max = 4) {
  if (!term || !String(term).trim()) return [];
  return String(term)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map(escapeRegex);
}

/**
 * Every token must prefix one of `fields`. Combined with a collation-matched
 * index this is an index scan per token instead of a collection scan.
 */
function prefixFilter(fields, tokens) {
  if (tokens.length === 0) return null;
  return {
    $and: tokens.map((token) => ({
      $or: fields.map((field) => ({ [field]: new RegExp(`^${token}`) })),
    })),
  };
}

/** Substring match across `fields` — the fallback, never the first attempt. */
function substringFilter(fields, term) {
  if (!term || !String(term).trim()) return null;
  const escaped = escapeRegex(String(term).trim());
  return {
    $or: fields.map((field) => ({ [field]: new RegExp(escaped, 'i') })),
  };
}

module.exports = {
  SEARCH_COLLATION,
  escapeRegex,
  searchTokens,
  prefixFilter,
  substringFilter,
};
