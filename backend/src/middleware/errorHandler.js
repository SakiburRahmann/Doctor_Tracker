/**
 * Central error handler.
 * - Mongoose CastError / ValidationError -> 400 with field details
 * - Duplicate key (11000) -> 409 with the offending field
 * - Anything else -> 500 with a generic message (details stay in server logs)
 */
const errorHandler = (err, req, res, _next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let fieldErrors = undefined;

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    status = 400;
    message = `Invalid id format for field "${err.path}".`;
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed.';
    fieldErrors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}: ${err.keyValue ? err.keyValue[field] : ''}`;
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} ->`, err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(fieldErrors ? { fieldErrors } : {}),
    ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;
