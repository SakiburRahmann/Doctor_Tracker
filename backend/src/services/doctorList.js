/**
 * The doctor list query, in one place.
 *
 * Used by `GET /api/doctors`, `GET /api/doctors/:id/patients` (via the patient
 * service) and `GET /api/analytics/dashboard`, which returns the first page of
 * the list alongside the dashboard aggregates so a cold visit costs one
 * serverless invocation instead of two.
 *
 * Cost model:
 *   - filters come from a whitelist, never from raw req.query
 *   - search is index-backed (prefix tokens + collation); a substring scan only
 *     runs when the prefix pass finds nothing
 *   - count + page are issued together: one round trip
 *   - each page row resolves its patient total with an index-backed $lookup
 *   - results are memoised for a few seconds and dropped on every write
 */
const Doctor = require('../models/Doctor');
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
};

// Keep this list in sync with the collation indexes in models/Doctor.js: every
// field here must have one, or the $or falls back to a scan for that branch.
const SEARCH_FIELDS = ['name', 'specialization', 'hospital'];

/** Filter on everything except the free-text term. */
function baseDoctorFilter(query = {}) {
  const filter = {};
  const { specialization, hospital, status, createdFrom, createdTo } = query;

  if (specialization) filter.specialization = specialization;
  if (hospital) filter.hospital = hospital;
  if (status) filter.status = status;

  if (createdFrom || createdTo) {
    filter.createdAt = {};
    if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
    if (createdTo) {
      const to = new Date(createdTo);
      to.setHours(23, 59, 59, 999); // inclusive end of day
      filter.createdAt.$lte = to;
    }
  }
  return filter;
}

/**
 * One round trip per page; memoised so repeats never touch MongoDB.
 *
 * The cache key is built from the raw query values, never the filter object:
 * a Mongo filter contains RegExp instances, and JSON.stringify turns those into
 * `{}` — two different search terms would collide on one cache entry.
 */
function runPage(filter, { page, limit, skip, sortKey, collation, mode, cacheKey }) {
  const key = `doctors:${mode}:${JSON.stringify({ ...cacheKey, page, limit, sortKey })}`;

  return cache.cached(key, 3000, async () => {
    const unfiltered = Object.keys(filter).length === 0;

    const aggregate = Doctor.aggregate([
      { $match: filter },
      { $sort: SORT_MAP[sortKey] },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'patients',
          localField: '_id',
          foreignField: 'doctor',
          pipeline: [{ $count: 'count' }],
          as: 'patientTotals',
        },
      },
      { $addFields: { patientCount: { $ifNull: [{ $first: '$patientTotals.count' }, 0] } } },
      { $project: { __v: 0, patientTotals: 0 } },
    ]);
    if (collation) aggregate.collation(collation);

    const countQuery = unfiltered
      ? Doctor.estimatedDocumentCount()
      : Doctor.countDocuments(filter);

    const [total, rows] = await Promise.all([countQuery, aggregate.exec()]);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    };
  });
}

/**
 * Paginated + filtered + searched doctor list.
 * @returns {Promise<{data: object[], meta: object}>}
 */
async function listDoctors(query = {}) {
  const { page, limit, skip } = parsePagination(query, { limit: 10 });
  const sortKey = SORT_MAP[query.sort] ? query.sort : 'newest';
  const base = baseDoctorFilter(query);
  const tokens = searchTokens(query.search);
  const cacheKey = {
    search: String(query.search || '').trim().toLowerCase(),
    filter: JSON.stringify(base),
  };

  if (tokens.length === 0) {
    return runPage(base, { page, limit, skip, sortKey, mode: 'all', cacheKey });
  }

  // Pass 1: prefix tokens against a case-insensitive collation (index-backed).
  const prefix = prefixFilter(SEARCH_FIELDS, tokens);
  const first = await runPage(
    { ...base, ...prefix },
    { page, limit, skip, sortKey, collation: SEARCH_COLLATION, mode: 'prefix', cacheKey }
  );
  if (first.meta.total > 0) return first;

  // Pass 2: nothing prefixed — fall back to a substring scan so mid-word
  // fragments still resolve. This path only runs on an empty result.
  const substring = substringFilter(SEARCH_FIELDS, query.search);
  return runPage(
    { ...base, ...substring },
    { page, limit, skip, sortKey, mode: 'substring', cacheKey }
  );
}

module.exports = { listDoctors, baseDoctorFilter, SORT_MAP, SEARCH_FIELDS };
