/**
 * Doctor routes: /api/doctors
 *
 * Query contract (all optional):
 *   ?search=term              -> index-backed search across name/specialization/hospital/email
 *   ?specialization=Cardiology&hospital=Square&status=active
 *   ?createdFrom=2026-01-01&createdTo=2026-01-31  -> date-wise filter
 *   ?page=1&limit=10&sort=newest|oldest|name
 *
 * Performance notes: the list itself lives in `services/doctorList` (single
 * round trip, index-backed search, short-lived cache). Everything here is a thin
 * HTTP layer: whitelist → service → envelope.
 */
const express = require('express');
const { body } = require('express-validator');

const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const sendResponse = require('../utils/sendResponse');
const cache = require('../utils/cache');
const { PARAM_ID } = require('../utils/ids');
const { doctorListRules } = require('../utils/listQuery');
const { listDoctors } = require('../services/doctorList');
const { listPatients } = require('../services/patientList');

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

/** Fields a client may write — never the whole body (no mass assignment). */
function fieldsFrom(body_) {
  return {
    name: body_.name,
    specialization: body_.specialization,
    hospital: body_.hospital,
    phone: body_.phone,
    email: body_.email,
    consultationFee: body_.consultationFee ?? 0,
    status: body_.status || 'active',
  };
}

// GET /api/doctors - list + search + filter + paginate
router.get(
  '/',
  doctorListRules,
  validate,
  asyncHandler(async (req, res) => {
    const payload = await listDoctors(req.query);
    res.set('Cache-Control', 'private, max-age=3');
    return sendResponse(res, payload);
  })
);

// GET /api/doctors/meta - distinct filter options for the UI dropdowns.
// Two grouped scans in one $facet, cached for 30s (they change rarely).
router.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const data = await cache.cached('doctor-meta', 30000, async () => {
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
  PARAM_ID,
  validate,
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id).select('-__v').lean();
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
  validate,
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.create(fieldsFrom(req.body));
    cache.clear(); // reads are memoised; a write invalidates them
    return sendResponse(res, { status: 201, data: doctor, message: 'Doctor created successfully.' });
  })
);

// PUT /api/doctors/:id - update
router.put(
  '/:id',
  PARAM_ID,
  doctorBodyValidators,
  validate,
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, fieldsFrom(req.body), {
      new: true,
      runValidators: true,
    }).select('-__v');

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
  PARAM_ID,
  validate,
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
// One indexed match, three projections of the same stream: one round trip.
router.get(
  '/:id/stats',
  PARAM_ID,
  validate,
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.exists({ _id: req.params.id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(1);
    since.setMonth(since.getMonth() - 5);

    const [buckets] = await Patient.aggregate([
      { $match: { doctor: req.params.id } },
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

// GET /api/doctors/:id/patients - patients belonging to one doctor (paginated).
// Reuses the same list service the /patients page uses.
router.get(
  '/:id/patients',
  PARAM_ID,
  validate,
  asyncHandler(async (req, res) => {
    const exists = await Doctor.exists({ _id: req.params.id });
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    const payload = await listPatients({ ...req.query, doctor: req.params.id });
    return sendResponse(res, payload);
  })
);

module.exports = router;
