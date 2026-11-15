/**
 * Turns express-validator results into one 400 response.
 *
 * Centralised so every route reports field errors the same way the client
 * renders them (`{ field, message }[]`), instead of each handler repeating the
 * same six lines.
 */
const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: 'Validation failed.',
    fieldErrors: result.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}

module.exports = validate;
