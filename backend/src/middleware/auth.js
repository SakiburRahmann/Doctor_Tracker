/**
 * JWT authentication guard.
 * Verifies the Bearer token and attaches the admin document to req.user.
 * sendResponse without a token -> 401 before any route logic runs.
 */
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const reason =
        err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.';
      return res.status(401).json({ success: false, message: reason });
    }

    const admin = await Admin.findById(decoded.sub).lean({ getters: false });
    if (!admin) {
      // Token is valid but the account no longer exists.
      return res.status(401).json({ success: false, message: 'Account no longer exists.' });
    }

    req.user = { id: admin._id.toString(), email: admin.email, name: admin.name, role: admin.role };
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = { protect };
