/**
 * Analytics routes: /api/analytics
 *
 * All aggregations run server-side in MongoDB (the aggregation pipeline), so the
 * dashboard never pulls raw documents to count them in JavaScript.
 *
 * GET /overview   -> totals + per-specialization + patients-per-doctor + monthly trend
 * GET /daily      -> patients & doctors created per day for the last N days (default 14)
 */
const express = require('express');

const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth');
const sendResponse = require('../utils/sendResponse');

const router = express.Router();
router.use(protect);

router.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [totalDoctors, totalPatients, activeDoctors, bySpecialization, patientsPerDoctor] =
      await Promise.all([
        Doctor.countDocuments({}),
        Patient.countDocuments({}),
        Doctor.countDocuments({ status: 'active' }),
        Doctor.aggregate([
          { $group: { _id: '$specialization', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, specialization: '$_id', count: 1 } },
        ]),
        Doctor.aggregate([
          {
            $lookup: {
              from: 'patients',
              localField: '_id',
              foreignField: 'doctor',
              as: 'patients',
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              specialization: 1,
              patientCount: { $size: '$patients' },
            },
          },
          { $sort: { patientCount: -1 } },
          { $limit: 10 },
        ]),
      ]);

    return sendResponse(res, {
      data: {
        totalDoctors,
        activeDoctors,
        totalPatients,
        bySpecialization,
        patientsPerDoctor,
      },
    });
  })
);

router.get(
  '/daily',
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 90);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const [patientsByDay, doctorsByDay] = await Promise.all([
      Patient.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      Doctor.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Fill the gaps so the chart gets a continuous series.
    const patientMap = new Map(patientsByDay.map((d) => [d._id, d.count]));
    const doctorMap = new Map(doctorsByDay.map((d) => [d._id, d.count]));
    const series = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      series.push({ date: key, patients: patientMap.get(key) || 0, doctors: doctorMap.get(key) || 0 });
    }

    return sendResponse(res, { data: { days, series } });
  })
);

// Condition distribution for the dashboard pie/donut chart.
router.get(
  '/conditions',
  asyncHandler(async (_req, res) => {
    const conditions = await Patient.aggregate([
      { $group: { _id: '$condition', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, condition: '$_id', count: 1 } },
    ]);
    return sendResponse(res, { data: conditions });
  })
);

module.exports = router;
