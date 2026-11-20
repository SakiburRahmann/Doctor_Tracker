/**
 * Analytics routes: /api/analytics
 *
 * Cost model — the dashboard is the hottest path, so the work is arranged to
 * cost the fewest possible MongoDB round trips:
 *
 *   1. Aggregations are grouped with $facet, one round trip per collection
 *      instead of one per metric.
 *   2. Independent collections run in parallel (Promise.all), so the wall time
 *      is one round trip, not the sum of them.
 *   3. Results are memoised for a few seconds in-process; a warm instance
 *      answers a repeat load without touching the database at all.
 *
 * GET /dashboard  -> everything the dashboard needs, in one request
 * GET /overview   -> totals + per-specialization + patients-per-doctor + status
 * GET /monthly    -> patients & doctors created per calendar month
 * GET /daily      -> patients & doctors created per day for the last N days
 * GET /conditions -> condition distribution
 */
const express = require('express');

const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth');
const sendResponse = require('../utils/sendResponse');
const cache = require('../utils/cache');
const { listDoctors } = require('../services/doctorList');
const validate = require('../middleware/validate');
const { doctorListRules } = require('../utils/listQuery');
const { monthWindowStart, monthKeys, dayWindowStart } = require('../utils/time');

const router = express.Router();
router.use(protect);

const TTL_MS = 5000; // short enough that edits show up almost immediately

const MONTH_FORMAT = '%Y-%m';

/** Fills the gaps so a chart always gets a continuous month series (UTC keys). */
function monthSeries(months, patientCounts, doctorCounts) {
  return monthKeys(months).map(({ key, label }) => ({
    key,
    label,
    patients: patientCounts.get(key) || 0,
    doctors: doctorCounts.get(key) || 0,
  }));
}

/**
 * One aggregation over patients: totals, status mix, condition mix, the busiest
 * doctors and the monthly intake series.
 *
 * $facet keeps this to a single round trip. The doctors lookup runs *after* the
 * top-10 limit, so it resolves ten _id lookups instead of joining every patient
 * into every doctor.
 */
function patientsFacet(since) {
  return Patient.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        statuses: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, status: '$_id', count: 1 } },
        ],
        conditions: [
          { $group: { _id: '$condition', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, condition: '$_id', count: 1 } },
        ],
        busiestDoctors: [
          { $group: { _id: '$doctor', patientCount: { $sum: 1 } } },
          { $sort: { patientCount: -1, _id: 1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'doctors',
              localField: '_id',
              foreignField: '_id',
              pipeline: [{ $project: { name: 1, specialization: 1 } }],
              as: 'doctor',
            },
          },
          { $unwind: '$doctor' },
          {
            $project: {
              _id: 1,
              name: '$doctor.name',
              specialization: '$doctor.specialization',
              patientCount: 1,
            },
          },
        ],
        monthly: [
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: MONTH_FORMAT, date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
        ],
      },
    },
  ]).exec();
}

/** One aggregation over doctors: totals, active count, specialization mix, filter options, monthly intake. */
function doctorsFacet(since) {
  return Doctor.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        active: [{ $match: { status: 'active' } }, { $count: 'count' }],
        monthly: [
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: MONTH_FORMAT, date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
        ],
        specializations: [
          { $group: { _id: '$specialization', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $project: { _id: 0, specialization: '$_id', count: 1 } },
        ],
        specializationOptions: [{ $group: { _id: '$specialization' } }, { $sort: { _id: 1 } }],
        hospitalOptions: [{ $group: { _id: '$hospital' } }, { $sort: { _id: 1 } }],
      },
    },
  ]).exec();
}

const firstCount = (bucket) => (bucket[0] ? bucket[0].count : 0);

/** Builds the dashboard payload from the two facet results (pure, cacheable). */
function buildDashboard(months, doctorBuckets, patientBuckets) {
  const d = doctorBuckets[0];
  const p = patientBuckets[0];

  return {
    overview: {
      totalDoctors: firstCount(d.total),
      activeDoctors: firstCount(d.active),
      totalPatients: firstCount(p.total),
      bySpecialization: d.specializations,
      patientsPerDoctor: p.busiestDoctors,
      patientsByStatus: p.statuses,
    },
    monthly: {
      months,
      series: monthSeries(
        months,
        new Map(p.monthly.map((m) => [m._id, m.count])),
        new Map(d.monthly.map((m) => [m._id, m.count]))
      ),
    },
    conditions: p.conditions,
    // Named `filters` (not `meta`) because the list carries its own pagination meta.
    filters: {
      specializations: d.specializationOptions.map((o) => o._id),
      hospitals: d.hospitalOptions.map((o) => o._id),
    },
    generatedAt: new Date().toISOString(),
  };
}

// Everything the dashboard renders, in a single request.
router.get(
  '/dashboard',
  doctorListRules, // the payload includes the list, so it takes the same contract
  validate,
  asyncHandler(async (req, res) => {
    const months = Math.min(Math.max(parseInt(req.query.months, 10) || 12, 1), 24);
    const since = monthWindowStart(months);

    // Two things in flight: the aggregates (cached for a few seconds, so filter
    // churn does not recompute them) and the list page for the current filters.
    const [analytics, doctors] = await Promise.all([
      cache.cached(`dashboard:${months}`, TTL_MS, async () => {
        const [doctorBuckets, patientBuckets] = await Promise.all([
          doctorsFacet(since),
          patientsFacet(since),
        ]);
        return buildDashboard(months, doctorBuckets, patientBuckets);
      }),
      listDoctors(req.query),
    ]);

    const payload = { ...analytics, doctors };

    // A short private cache lets back/forward navigation reuse the payload.
    res.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=30');
    return sendResponse(res, { data: payload });
  })
);

router.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const payload = await cache.cached('overview', TTL_MS, async () => {
      const since = monthWindowStart(12);
      const [doctorBuckets, patientBuckets] = await Promise.all([doctorsFacet(since), patientsFacet(since)]);
      const d = doctorBuckets[0];
      const p = patientBuckets[0];
      return {
        totalDoctors: firstCount(d.total),
        activeDoctors: firstCount(d.active),
        totalPatients: firstCount(p.total),
        bySpecialization: d.specializations,
        patientsPerDoctor: p.busiestDoctors,
        patientsByStatus: p.statuses,
      };
    });

    res.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=30');
    return sendResponse(res, { data: payload });
  })
);

// Monthly series (patients + doctors added per calendar month).
router.get(
  '/monthly',
  asyncHandler(async (req, res) => {
    const months = Math.min(Math.max(parseInt(req.query.months, 10) || 12, 1), 24);
    const since = monthWindowStart(months);

    const payload = await cache.cached(`monthly:${months}`, TTL_MS, async () => {
      const grouped = (Model) =>
        Model.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: MONTH_FORMAT, date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
        ]).exec();

      const [patientsByMonth, doctorsByMonth] = await Promise.all([grouped(Patient), grouped(Doctor)]);
      return {
        months,
        series: monthSeries(
          months,
          new Map(patientsByMonth.map((m) => [m._id, m.count])),
          new Map(doctorsByMonth.map((m) => [m._id, m.count]))
        ),
      };
    });

    res.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=30');
    return sendResponse(res, { data: payload });
  })
);

router.get(
  '/daily',
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 90);

    const payload = await cache.cached(`daily:${days}`, TTL_MS, async () => {
      const since = dayWindowStart(days);

      const grouped = (Model) =>
        Model.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
        ]).exec();

      const [patientsByDay, doctorsByDay] = await Promise.all([grouped(Patient), grouped(Doctor)]);
      const patientMap = new Map(patientsByDay.map((d) => [d._id, d.count]));
      const doctorMap = new Map(doctorsByDay.map((d) => [d._id, d.count]));

      const series = [];
      for (let i = 0; i < days; i += 1) {
        const d = new Date(since.getTime() + i * 86400000);
        const key = d.toISOString().slice(0, 10);
        series.push({ date: key, patients: patientMap.get(key) || 0, doctors: doctorMap.get(key) || 0 });
      }
      return { days, series };
    });

    res.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=30');
    return sendResponse(res, { data: payload });
  })
);

// Condition distribution for the dashboard donut.
router.get(
  '/conditions',
  asyncHandler(async (_req, res) => {
    const payload = await cache.cached('conditions', TTL_MS, () =>
      Patient.aggregate([
        { $group: { _id: '$condition', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, condition: '$_id', count: 1 } },
      ]).exec()
    );

    res.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=30');
    return sendResponse(res, { data: payload });
  })
);

module.exports = router;
