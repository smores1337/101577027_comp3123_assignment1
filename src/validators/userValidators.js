const { body } = require('express-validator');

const signupRules = [
  body('username')
    .exists({ values: 'falsy' }).withMessage('Username is required').bail()
    .isString().withMessage('Username must be a string').bail()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[A-Za-z0-9_.-]+$/).withMessage('Username may only contain letters, numbers, _ . -'),
  body('email')
    .exists({ values: 'falsy' }).withMessage('Email is required').bail()
    .isString().withMessage('Email must be a string').bail()
    .trim()
    .isEmail().withMessage('Email is not valid')
    .isLength({ max: 100 }).withMessage('Email must be at most 100 characters')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .exists({ values: 'falsy' }).withMessage('Password is required').bail()
    .isString().withMessage('Password must be a string').bail()
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
    .matches(/\d/).withMessage('Password must contain at least one number'),
];

const loginRules = [
  body().custom((value) => {
    if (!value || (!value.username && !value.email)) {
      throw new Error('Username or email is required');
    }
    return true;
  }),
  body('username').optional().isString().withMessage('Username must be a string').trim(),
  body('email').optional().isString().withMessage('Email must be a string').bail().trim()
    .isEmail().withMessage('Email is not valid'),
  body('password')
    .exists({ values: 'falsy' }).withMessage('Password is required').bail()
    .isString().withMessage('Password must be a string'),
];

module.exports = { signupRules, loginRules };
