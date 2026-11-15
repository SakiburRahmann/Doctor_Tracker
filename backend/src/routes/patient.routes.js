/**
 * Patient routes: /api/patients
 *
 * Query contract (all optional):
 *   ?search=term            -> name / notes (index-backed, see services/search)
 *   ?condition=Critical&status=admitted&doctor=<id>
 *   ?createdFrom&createdTo  -> date-wise (uses patient createdAt)
 *   ?page=1&limit=10&sort=newest|oldest|name|age
 *
 * All filter values are whitelist-driven, pagination is server-clamped, and the
 * query itself lives in `services/patientList` so the doctor detail view and the
 * dashboard reuse exactly one implementation.
 */
const express = require('express');
const { body } = require('express-validator');

const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const sendResponse = require('../utils/sendResponse');
const cache = require('../utils/cache');
const { listPatients } = require('../services/patientList');
const { PARAM_ID } = require('../utils/ids');
const { patientListRules } = require('../utils/listQuery');

const router = express.Router();
router.use(protect);

const CONDITIONS = ['Critical', 'Serious', 'Stable', 'Recovering', 'Chronic', 'Under Observation'];

const patientBodyValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('age').isInt({ min: 0, max: 130 }).withMessage('Age must be 0-130'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female or other'),
  body('condition').isIn(CONDITIONS).withMessage('Invalid condition'),
  body('doctor').isMongoId().withMessage('A valid doctor id is required'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^\+?[0-9][0-9\s-]{6,19}$/)
    .withMessage('Phone must be 7-20 digits'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('A valid email is required'),
  body('status').optional().isIn(['admitted', 'discharged', 'follow-up']),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
];

/** Fields a client may write — never the whole body (no mass assignment). */
function fieldsFrom(body_) {
  return {
    name: body_.name,
    age: body_.age,
    gender: body_.gender,
    condition: body_.condition,
    doctor: body_.doctor,
    phone: body_.phone || undefined,
    email: body_.email || undefined,
    status: body_.status || 'admitted',
    notes: body_.notes || undefined,
  };
}

// GET /api/patients
router.get(
  '/',
  patientListRules,
  validate,
  asyncHandler(async (req, res) => {
    const payload = await listPatients(req.query);
    res.set('Cache-Control', 'private, max-age=3');
    return sendResponse(res, payload);
  })
);

// GET /api/patients/meta - dropdown options (cached: they change rarely)
router.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const data = await cache.cached('patient-meta', 30000, async () => {
      const [doctors, statuses] = await Promise.all([
        Doctor.find({}).select('name specialization').sort({ name: 1 }).lean(),
        Patient.distinct('status'),
      ]);
      return {
        conditions: CONDITIONS,
        statuses: ['admitted', 'discharged', 'follow-up'].filter((s) => statuses.includes(s)),
        doctors: doctors.map((d) => ({ id: d._id, name: d.name, specialization: d.specialization })),
      };
    });

    res.set('Cache-Control', 'private, max-age=30');
    return sendResponse(res, { data });
  })
);

// GET /api/patients/:id
router.get(
  '/:id',
  PARAM_ID,
  asyncHandler(async (req, res) => {
    const patient = await Patient.findById(req.params.id)
      .select('-__v')
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
  validate,
  asyncHandler(async (req, res) => {
    // Existence check is a projection-only read: no need for the whole document.
    const doctorExists = await Doctor.exists({ _id: req.body.doctor });
    if (!doctorExists) {
      return res.status(400).json({ success: false, message: 'Referenced doctor does not exist.' });
    }

    const patient = await Patient.create(fieldsFrom(req.body));
    const populated = await Patient.findById(patient._id)
      .select('-__v')
      .populate('doctor', 'name specialization hospital')
      .lean();

    cache.clear();
    return sendResponse(res, { status: 201, data: populated, message: 'Patient added successfully.' });
  })
);

// PUT /api/patients/:id
router.put(
  '/:id',
  PARAM_ID,
  patientBodyValidators,
  validate,
  asyncHandler(async (req, res) => {
    const doctorExists = await Doctor.exists({ _id: req.body.doctor });
    if (!doctorExists) {
      return res.status(400).json({ success: false, message: 'Referenced doctor does not exist.' });
    }

    const patient = await Patient.findByIdAndUpdate(req.params.id, fieldsFrom(req.body), {
      new: true,
      runValidators: true,
    })
      .select('-__v')
      .populate('doctor', 'name specialization hospital')
      .lean();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }
    cache.clear();
    return sendResponse(res, { data: patient, message: 'Patient updated successfully.' });
  })
);

// DELETE /api/patients/:id
router.delete(
  '/:id',
  PARAM_ID,
  asyncHandler(async (req, res) => {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }
    cache.clear();
    return sendResponse(res, { message: 'Patient deleted successfully.' });
  })
);

module.exports = router;
