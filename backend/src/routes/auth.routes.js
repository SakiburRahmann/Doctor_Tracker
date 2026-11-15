/**
 * Auth routes: /api/auth
 * POST /login  -> issue JWT (rate-limited)
 * GET  /me     -> current admin profile (token refresh cheap check)
 */
const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const Admin = require('../models/Admin');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth');
const sendResponse = require('../utils/sendResponse');

const router = express.Router();

// Brute-force guard on the login endpoint.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 attempts / window / IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

const loginValidators = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6, max: 72 }).withMessage('Password must be 6-72 characters'),
];

router.post(
  '/login',
  loginLimiter,
  loginValidators,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email }).select('+passwordHash');

    // Same error for unknown email and wrong password (no account enumeration).
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    admin.lastLoginAt = new Date();
    await admin.save({ validateBeforeSave: false });

    // The profile claims travel in the token so the client can resolve the
    // session without a round trip. They are display data only: authorization
    // is still decided per request by the API.
    const token = jwt.sign(
      {
        sub: admin._id.toString(),
        role: admin.role,
        name: admin.name,
        email: admin.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return sendResponse(res, {
      data: {
        token,
        user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
      },
    });
  })
);

router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    return sendResponse(res, { data: req.user });
  })
);

module.exports = router;
