const { body, param, query } = require('express-validator');

const stringField = (name, label, max, optional) => {
  let chain = body(name);
  chain = optional
    ? chain.optional()
    : chain.exists({ values: 'falsy' }).withMessage(`${label} is required`).bail();
  return chain
    .isString().withMessage(`${label} must be a string`).bail()
    .trim()
    .notEmpty().withMessage(`${label} cannot be empty`)
    .isLength({ max }).withMessage(`${label} must be at most ${max} characters`);
};

const employeeRules = (optional = false) => [
  stringField('first_name', 'First name', 50, optional),
  stringField('last_name', 'Last name', 50, optional),
  stringField('email', 'Email', 100, optional).isEmail().withMessage('Email is not valid'),
  stringField('position', 'Position', 100, optional),
  stringField('department', 'Department', 100, optional),
  (optional ? body('salary').optional() : body('salary').exists({ values: 'null' }).withMessage('Salary is required').bail())
    .isFloat({ gt: 0 }).withMessage('Salary must be a positive number').toFloat(),
  (optional ? body('date_of_joining').optional() : body('date_of_joining').exists({ values: 'falsy' }).withMessage('Date of joining is required').bail())
    .isISO8601({ strict: true }).withMessage('Date of joining must be a valid date (YYYY-MM-DD)').toDate(),
  // The owner is always taken from the JWT. Reject attempts to set it from the client.
  body('user').not().exists().withMessage('The user field cannot be set by the client'),
];

const createEmployeeRules = employeeRules(false);

const updateEmployeeRules = [
  param('eid').isMongoId().withMessage('Invalid employee id'),
  body().custom((value) => {
    const allowed = ['first_name', 'last_name', 'email', 'position', 'salary', 'date_of_joining', 'department'];
    if (!value || typeof value !== 'object' || !Object.keys(value).some((k) => allowed.includes(k))) {
      throw new Error(`Provide at least one field to update: ${allowed.join(', ')}`);
    }
    return true;
  }),
  ...employeeRules(true),
];

const eidParamRules = [param('eid').isMongoId().withMessage('Invalid employee id')];

const eidQueryRules = [
  query('eid')
    .exists({ values: 'falsy' }).withMessage('Employee id (eid) query parameter is required').bail()
    .isMongoId().withMessage('Invalid employee id'),
];

module.exports = { createEmployeeRules, updateEmployeeRules, eidParamRules, eidQueryRules };
