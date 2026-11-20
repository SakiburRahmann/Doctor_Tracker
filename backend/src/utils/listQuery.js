/**
 * Query-string validation for the list endpoints.
 *
 * Filters are already whitelisted by the services (an unknown value simply
 * cannot reach Mongo), but a malformed request should still fail loudly: an
 * invalid enum or a garbage date is a client bug, not "no results".
 *
 * Every rule is `optional({ values: 'falsy' })` so the UI can send empty
 * strings (cleared filters) and so `page=0` is still clamped rather than
 * rejected.
 */
const { query } = require('express-validator');

const paginationRules = [
  query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('limit must be >= 1'),
];

const dateRules = [
  query('createdFrom').optional({ values: 'falsy' }).isISO8601().withMessage('createdFrom must be a date'),
  query('createdTo').optional({ values: 'falsy' }).isISO8601().withMessage('createdTo must be a date'),
];

// Free-text filters must arrive as plain strings. Without this rule, Express's
// extended query parser turns `?specialization[$ne]=x` into an object and the
// operator would flow straight into the Mongo filter (NoSQL operator injection).
const stringFilter = (field, max) =>
  query(field).optional({ values: 'falsy' }).isString().withMessage(`${field} must be a string`).isLength({ max });

const searchRule = stringFilter('search', 200);

const doctorListRules = [
  stringFilter('specialization', 120),
  stringFilter('hospital', 160),
  searchRule,
  query('status').optional({ values: 'falsy' }).isIn(['active', 'inactive']).withMessage('Invalid status'),
  query('sort').optional({ values: 'falsy' }).isIn(['newest', 'oldest', 'name']).withMessage('Invalid sort'),
  ...paginationRules,
  ...dateRules,
];

const patientListRules = [
  searchRule,
  query('condition')
    .optional({ values: 'falsy' })
    .isIn(['Critical', 'Serious', 'Stable', 'Recovering', 'Chronic', 'Under Observation'])
    .withMessage('Invalid condition'),
  query('status')
    .optional({ values: 'falsy' })
    .isIn(['admitted', 'discharged', 'follow-up'])
    .withMessage('Invalid status'),
  query('sort')
    .optional({ values: 'falsy' })
    .isIn(['newest', 'oldest', 'name', 'age'])
    .withMessage('Invalid sort'),
  // A doctor filter may be one id or a comma-separated list of ids.
  query('doctor')
    .optional({ values: 'falsy' })
    .matches(/^[0-9a-fA-F]{24}(,[0-9a-fA-F]{24})*$/)
    .withMessage('doctor must be a mongo id'),
  ...paginationRules,
  ...dateRules,
];

module.exports = { doctorListRules, patientListRules };
