/**
 * Route-parameter validation.
 *
 * Checking the id shape before the query runs means a malformed id answers 400
 * from the validator instead of throwing a CastError deep inside Mongoose.
 */
const { param } = require('express-validator');

const PARAM_ID = param('id').isMongoId().withMessage('A valid id is required');

module.exports = { PARAM_ID };
