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

const router = express.Router();
router.use(protect); // every doctor route requires a valid token

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
};

/** Builds the filter object from a whitelist of query params. */
function buildDoctorFilter(query) {
  const filter = {};
  const { search, specialization, hospital, status, createdFrom, createdTo } = query;

  if (search && search.trim()) {
    // Escape regex metacharacters so special input can't be abused as a pattern.
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

// GET /api/doctors - list + search + filter + paginate
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = buildDoctorFilter(req.query);
    const { page, limit, skip } = parsePagination(req.query, { limit: 10 });
    const sort = SORT_MAP[req.query.sort] || SORT_MAP.newest;

    const [total, doctors] = await Promise.all([
      Doctor.countDocuments(filter),
      Doctor.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    ]);

    return sendResponse(res, {
      data: doctors,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  })
);

// GET /api/doctors/meta - distinct filter options for the UI dropdowns (one small query)
router.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const [specializations, hospitals] = await Promise.all([
      Doctor.distinct('specialization'),
      Doctor.distinct('hospital'),
    ]);
    return sendResponse(res, {
      data: { specializations: specializations.sort(), hospitals: hospitals.sort() },
    });
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

    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }
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
    return sendResponse(res, {
      message: `Doctor deleted. ${removed.deletedCount} patient(s) removed with them.`,
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
