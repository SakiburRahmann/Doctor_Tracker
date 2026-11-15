/**
 * The patient list query, in one place.
 *
 * Same cost model as `doctorList`: whitelisted filters, index-backed search with
 * a substring fallback, count + page in one round trip, and a short-lived cache
 * so repeated views never reach MongoDB. `doctor` may be a single id (the detail
 * view) or a comma-separated list of ids.
 */
const Patient = require('../models/Patient');
const cache = require('../utils/cache');
const { parsePagination } = require('../utils/pagination');
const {
  SEARCH_COLLATION,
  searchTokens,
  prefixFilter,
  substringFilter,
} = require('./search');

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  age: { age: -1 },
};

const SEARCH_FIELDS = ['name', 'notes'];
const DOCTOR_FIELDS = 'name specialization hospital';

/** Mongo id list, ignoring anything malformed instead of throwing. */
function doctorIds(value) {
  if (!value) return null;
  const ids = String(value)
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
  return ids.length ? ids : null;
}

/** Filter on everything except the free-text term. */
function basePatientFilter(query = {}) {
  const filter = {};
  const { condition, status, createdFrom, createdTo } = query;

  if (condition) filter.condition = condition;
  if (status) filter.status = status;

  const ids = doctorIds(query.doctor);
  if (ids) filter.doctor = ids.length === 1 ? ids[0] : { $in: ids };

  if (createdFrom || createdTo) {
    filter.createdAt = {};
    if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
    if (createdTo) {
      const to = new Date(createdTo);
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }
  return filter;
}

/**
 * One round trip per page, memoised. The key holds the raw query values, not the
 * filter: a Mongo filter carries RegExp instances that JSON.stringify would
 * flatten to `{}`, letting two different searches share one cache entry.
 */
function runPage(filter, { page, limit, skip, sortKey, collation, mode, cacheKey }) {
  const key = `patients:${mode}:${JSON.stringify({ ...cacheKey, page, limit, sortKey })}`;

  return cache.cached(key, 3000, async () => {
    const unfiltered = Object.keys(filter).length === 0;

    const rows = Patient.find(filter)
      .sort(SORT_MAP[sortKey])
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .populate('doctor', DOCTOR_FIELDS)
      .lean();
    if (collation) rows.collation(collation);

    const countQuery = unfiltered
      ? Patient.estimatedDocumentCount()
      : Patient.countDocuments(filter);

    // Count and page together: one round trip for both.
    const [total, data] = await Promise.all([countQuery, rows.exec()]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    };
  });
}

async function listPatients(query = {}) {
  const { page, limit, skip } = parsePagination(query, { limit: 10 });
  const sortKey = SORT_MAP[query.sort] ? query.sort : 'newest';
  const base = basePatientFilter(query);
  const tokens = searchTokens(query.search);
  const cacheKey = {
    search: String(query.search || '').trim().toLowerCase(),
    filter: JSON.stringify(base),
  };

  if (tokens.length === 0) {
    return runPage(base, { page, limit, skip, sortKey, mode: 'all', cacheKey });
  }

  const prefix = prefixFilter(SEARCH_FIELDS, tokens);
  const first = await runPage(
    { ...base, ...prefix },
    { page, limit, skip, sortKey, collation: SEARCH_COLLATION, mode: 'prefix', cacheKey }
  );
  if (first.meta.total > 0) return first;

  const substring = substringFilter(SEARCH_FIELDS, query.search);
  return runPage(
    { ...base, ...substring },
    { page, limit, skip, sortKey, mode: 'substring', cacheKey }
  );
}

module.exports = { listPatients, basePatientFilter, SORT_MAP, SEARCH_FIELDS, doctorIds };
