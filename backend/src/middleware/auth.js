/**
 * JWT authentication guard.
 *
 * The token is self-describing (subject + email + role are signed), so the
 * admin document is only needed to prove the account still exists. That check
 * is cached per token subject: without it every API call paid an extra
 * database round trip before doing any work.
 */
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const ADMIN_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHED = 100;
const adminCache = new Map();

async function loadAdmin(sub) {
  const hit = adminCache.get(sub);
  if (hit && hit.expires > Date.now()) return hit.admin;

  const admin = await Admin.findById(sub).lean({ getters: false });
  if (!admin) {
    adminCache.delete(sub);
    return null;
  }

  const record = {
    id: admin._id.toString(),
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };
  if (adminCache.size >= MAX_CACHED) adminCache.clear();
  adminCache.set(sub, { admin: record, expires: Date.now() + ADMIN_TTL_MS });
  return record;
}

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

    const admin = await loadAdmin(decoded.sub);
    if (!admin) {
      // Token is valid but the account no longer exists.
      return res.status(401).json({ success: false, message: 'Account no longer exists.' });
    }

    req.user = admin;
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = { protect };
