const express = require('express');
const { signup, login } = require('../controllers/userController');
const { signupRules, loginRules } = require('../validators/userValidators');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/signup', authLimiter, signupRules, validate, signup);
router.post('/login', authLimiter, loginRules, validate, login);

module.exports = router;
