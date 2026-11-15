/**
 * The doctor list query, in one place.
 *
 * Used by `GET /api/doctors` and by `GET /api/analytics/dashboard`, which
 * returns the first page of the list alongside the dashboard aggregates so a
 * cold visit costs one serverless invocation instead of two.
 */
const Doctor = require('../models/Doctor');
const cache = require('../utils/cache');
const { parsePagination } = require('../utils/pagination');

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
};

/** Builds the filter object from a whitelist of query params. */
function buildDoctorFilter(query = {}) {
  const filter = {};
  const { search, specialization, hospital, status, createdFrom, createdTo } = query;

  if (search && search.trim()) {
    // Escape regex metacharacters so input can't be abused as a pattern.
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: new RegExp(escaped, 'i') },
      { specialization: new RegExp(escaped, 'i') },
      { hospital: new RegExp(escaped, 'i') },
      { email: new RegExp(escaped, 'i') },
    ];
  }
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
 * One round trip: the count and the page are issued together, and each page row
 * resolves its patient total with an index-backed $lookup.
 */
function listDoctors(query = {}) {
  const filter = buildDoctorFilter(query);
  const { page, limit, skip } = parsePagination(query, { limit: 10 });
  const sortKey = SORT_MAP[query.sort] ? query.sort : 'newest';
  const sort = SORT_MAP[sortKey];

  return cache.cached(`doctors:${JSON.stringify([filter, page, limit, sortKey])}`, 3000, async () => {
    const unfiltered = Object.keys(filter).length === 0;

    const [total, rows] = await Promise.all([
      // A full count is only needed when a filter can change it.
      unfiltered ? Doctor.estimatedDocumentCount() : Doctor.countDocuments(filter),
      Doctor.aggregate([
        { $match: filter },
        { $sort: sort },
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
      ]).exec(),
    ]);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    };
  });
}

module.exports = { buildDoctorFilter, listDoctors, SORT_MAP };
