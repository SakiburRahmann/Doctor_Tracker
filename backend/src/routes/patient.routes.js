/**
 * Patient routes: /api/patients
 *
 * Query contract (all optional):
 *   ?search=term            -> name / notes search
 *   ?condition=Critical&status=admitted&doctor=<id>
 *   ?createdFrom&createdTo  -> date-wise (uses patient createdAt)
 *   ?page=1&limit=10&sort=newest|oldest|name|age
 *
 * All filter values are whitelist-driven; pagination is server-clamped.
 */
const express = require('express');
const { body, param } = require('express-validator');

const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth');
const sendResponse = require('../utils/sendResponse');
const { parsePagination } = require('../utils/pagination');

const router = express.Router();
router.use(protect);

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  age: { age: -1 },
};

function buildPatientFilter(query) {
  const filter = {};
  const { search, condition, status, doctor, createdFrom, createdTo } = query;

  if (search && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: new RegExp(escaped, 'i') },
      { notes: new RegExp(escaped, 'i') },
    ];
  }
  if (condition) filter.condition = condition;
  if (status) filter.status = status;
  if (doctor && doctor.match(/^[0-9a-fA-F]{24}$/)) filter.doctor = doctor;

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

const patientBodyValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('age').isInt({ min: 0, max: 130 }).withMessage('Age must be 0-130'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female or other'),
  body('condition')
    .isIn(['Critical', 'Serious', 'Stable', 'Recovering', 'Chronic', 'Under Observation'])
    .withMessage('Invalid condition'),
  body('doctor').isMongoId().withMessage('A valid doctor id is required'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^\+?[0-9][0-9\s-]{6,19}$/)
    .withMessage('Phone must be 7-20 digits'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('A valid email is required'),
  body('status').optional().isIn(['admitted', 'discharged', 'follow-up']),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
];

function runValidation(req, res) {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed.',
      fieldErrors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
    return false;
  }
  return true;
}

// GET /api/patients
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = buildPatientFilter(req.query);
    const { page, limit, skip } = parsePagination(req.query, { limit: 10 });
    const sort = SORT_MAP[req.query.sort] || SORT_MAP.newest;

    const [total, patients] = await Promise.all([
      Patient.countDocuments(filter),
      Patient.find(filter)
        .sort(sort)
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

// GET /api/patients/meta - dropdown options
router.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const conditions = ['Critical', 'Serious', 'Stable', 'Recovering', 'Chronic', 'Under Observation'];
    const [doctors, statuses] = await Promise.all([
      Doctor.find({}).select('name specialization').sort({ name: 1 }).lean(),
      Patient.distinct('status'),
    ]);
    return sendResponse(res, {
      data: {
        conditions,
        statuses: ['admitted', 'discharged', 'follow-up'].filter((s) => !s || statuses.includes(s)),
        doctors: doctors.map((d) => ({ id: d._id, name: d.name, specialization: d.specialization })),
      },
    });
  })
);

// GET /api/patients/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const patient = await Patient.findById(req.params.id)
      .populate('doctor', 'name specialization hospital')
      .lean();
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }
    return sendResponse(res, { data: patient });
  })
);

// POST /api/patients
router.post(
  '/',
  patientBodyValidators,
  asyncHandler(async (req, res) => {
    if (!runValidation(req, res)) return;

    const doctor = await Doctor.findById(req.body.doctor).lean();
    if (!doctor) {
      return res.status(400).json({ success: false, message: 'Referenced doctor does not exist.' });
    }

    const patient = await Patient.create({
      name: req.body.name,
      age: req.body.age,
      gender: req.body.gender,
      condition: req.body.condition,
      doctor: req.body.doctor,
      phone: req.body.phone || undefined,
      email: req.body.email || undefined,
      status: req.body.status || 'admitted',
      notes: req.body.notes || undefined,
    });

    const populated = await Patient.findById(patient._id)
      .populate('doctor', 'name specialization hospital')
      .lean();

    return sendResponse(res, { status: 201, data: populated, message: 'Patient added successfully.' });
  })
);

// PUT /api/patients/:id - edit
router.put(
  '/:id',
  patientBodyValidators,
  asyncHandler(async (req, res) => {
    if (!runValidation(req, res)) return;

    if (!(await Doctor.findById(req.body.doctor).lean())) {
      return res.status(400).json({ success: false, message: 'Referenced doctor does not exist.' });
    }

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        age: req.body.age,
        gender: req.body.gender,
        condition: req.body.condition,
        doctor: req.body.doctor,
        phone: req.body.phone || undefined,
        email: req.body.email || undefined,
        status: req.body.status || 'admitted',
        notes: req.body.notes || undefined,
      },
      { new: true, runValidators: true }
    )
      .populate('doctor', 'name specialization hospital')
      .lean();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }
    return sendResponse(res, { data: patient, message: 'Patient updated successfully.' });
  })
);

// DELETE /api/patients/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }
    return sendResponse(res, { message: 'Patient deleted successfully.' });
  })
);

module.exports = router;
