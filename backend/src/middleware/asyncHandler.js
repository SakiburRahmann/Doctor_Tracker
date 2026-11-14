/**
 * Wraps async route handlers and forwards rejections to the central error handler,
 * so every route can be written without try/catch boilerplate.
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
