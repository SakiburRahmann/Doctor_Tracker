/**
 * Doctor routes: /api/doctors
 *
 * Query contract (all optional):
 *   ?search=term              -> text search across name/specialization/hospital
 *   ?specialization=Cardiology&hospital=Square&status=active
 *   ?createdFrom=2026-01-01&createdTo=2026-01-31  -> date-wise filter
 *   ?page=1&limit=10&sort=newest|oldest|name
 *
 * Performance notes:
 *   - one .countDocuments() + one .find().skip().limit() per request (the two-query
 *     pattern is cheaper and more index-friendly than a $facet on large collections)
 *   - filters are assembled from a whitelist, never from raw req.query
 *   - every combination the UI offers is covered by a compound index in the model
 */
const express = require('express');
const { body, query, param } = require('express-validator');

const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth');
const sendResponse = require('../utils/sendResponse');
const { parsePagination } = require('../utils/pagination');
const cache = require('../utils/cache');
const { buildDoctorFilter, listDoctors, SORT_MAP } = require('../services/doctorList');

const router = express.Router();
router.use(protect); // every doctor route requires a valid token


const doctorBodyValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('specialization').trim().notEmpty().withMessage('Specialization is required').isLength({ max: 120 }),
  body('hospital').trim().notEmpty().withMessage('Hospital is required').isLength({ max: 160 }),
  body('phone')
    .trim()
    .matches(/^\+?[0-9][0-9\s-]{6,19}$/)
    .withMessage('Phone must be 7-20 digits, optionally starting with +'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('consultationFee').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Fee must be >= 0'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
];

// GET /api/doctors - list + search + filter + paginate.
// One round trip: the count and the page are issued together, and each page row
// resolves its patient total with an index-backed $lookup instead of a second
// grouped query over every id.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const payload = await listDoctors(req.query);
    res.set('Cache-Control', 'private, max-age=3');
    return sendResponse(res, payload);
  })
);

// GET /api/doctors/meta - distinct filter options for the UI dropdowns (one small query)
router.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const data = await cache.cached('doctor-meta', 30000, async () => {
      // Two grouped scans in one $facet instead of two distinct commands.
      const [bucket] = await Doctor.aggregate([
        {
          $facet: {
            specializations: [{ $group: { _id: '$specialization' } }, { $sort: { _id: 1 } }],
            hospitals: [{ $group: { _id: '$hospital' } }, { $sort: { _id: 1 } }],
          },
        },
      ]).exec();
      return {
        specializations: bucket.specializations.map((s) => s._id),
        hospitals: bucket.hospitals.map((h) => h._id),
      };
    });

    res.set('Cache-Control', 'private, max-age=30');
    return sendResponse(res, { data });
  })
);

// GET /api/doctors/:id - single doctor
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id).lean();
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }
    return sendResponse(res, { data: doctor });
  })
);

// POST /api/doctors - create
router.post(
  '/',
  doctorBodyValidators,
  asyncHandler(async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        fieldErrors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const doctor = await Doctor.create({
      name: req.body.name,
      specialization: req.body.specialization,
      hospital: req.body.hospital,
      phone: req.body.phone,
      email: req.body.email,
      consultationFee: req.body.consultationFee || 0,
      status: req.body.status || 'active',
    });

    cache.clear(); // reads are memoised; a write invalidates them
    return sendResponse(res, { status: 201, data: doctor, message: 'Doctor created successfully.' });
  })
);

// PUT /api/doctors/:id - update
router.put(
  '/:id',
  doctorBodyValidators,
  asyncHandler(async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        fieldErrors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    // Explicit field whitelist: the client can never write timestamps, _id or
    // any field added to the schema later (no mass assignment).
    const updates = {
      name: req.body.name,
      specialization: req.body.specialization,
      hospital: req.body.hospital,
      phone: req.body.phone,
      email: req.body.email,
      consultationFee: req.body.consultationFee ?? 0,
      status: req.body.status || 'active',
    };

    const doctor = await Doctor.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }
    cache.clear();
    return sendResponse(res, { data: doctor, message: 'Doctor updated successfully.' });
  })
);

// DELETE /api/doctors/:id - delete doctor and cascade-delete their patients
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }
    const removed = await Patient.deleteMany({ doctor: doctor._id });
    cache.clear();
    return sendResponse(res, {
      message: `Doctor deleted. ${removed.deletedCount} patient(s) removed with them.`,
    });
  })
);

// GET /api/doctors/:id/stats - six-month activity + condition mix for one doctor.
// Two indexed aggregations ($match on doctor uses the { doctor: 1, createdAt: -1 }
// index) so the dashboard panel costs one round trip instead of paging every patient.
router.get(
  '/:id/stats',
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id).lean();
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(1);
    since.setMonth(since.getMonth() - 5);

    // One indexed match, three projections of the same stream: one round trip.
    const [buckets] = await Patient.aggregate([
      { $match: { doctor: doctor._id } },
      {
        $facet: {
          monthly: [
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
          ],
          conditions: [
            { $group: { _id: '$condition', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, condition: '$_id', count: 1 } },
          ],
          statuses: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $project: { _id: 0, status: '$_id', count: 1 } },
          ],
        },
      },
    ]).exec();
    const { monthly, conditions, statuses } = buckets;

    const counts = new Map(monthly.map((m) => [m._id, m.count]));
    const months = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        key,
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        count: counts.get(key) || 0,
      });
    }

    return sendResponse(res, {
      data: {
        months,
        conditions,
        statuses,
        total: conditions.reduce((sum, c) => sum + c.count, 0),
      },
    });
  })
);

// GET /api/doctors/:id/patients - patients belonging to one doctor (paginated)
router.get(
  '/:id/patients',
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id).lean();
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    const filter = { doctor: doctor._id };
    if (req.query.condition) filter.condition = req.query.condition;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = new RegExp(escaped, 'i');
    }

    const { page, limit, skip } = parsePagination(req.query, { limit: 10 });
    const [total, patients] = await Promise.all([
      Patient.countDocuments(filter),
      Patient.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('doctor', 'name specialization hospital')
        .lean(),
    ]);

    return sendResponse(res, {
      data: patients,
      meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    });
  })
);

module.exports = router;
