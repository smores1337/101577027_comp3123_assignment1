const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');
const { signToken } = require('../services/tokenService');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /api/v1/user/signup
async function signup(req, res) {
  const { username, email, password } = req.body;

  const existing = await User.findOne({
    $or: [{ email }, { username: new RegExp(`^${escapeRegex(username)}$`, 'i') }],
  });
  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    logger.warn('Signup rejected: duplicate user', { field });
    throw ApiError.conflict(`A user with this ${field} already exists`);
  }

  const hashed = await bcrypt.hash(password, env.bcryptSaltRounds);
  const user = await User.create({ username, email, password: hashed });

  logger.info('User registered', { userId: user._id.toString(), username: user.username });
  res.status(201).json({
    status: true,
    message: 'User created successfully.',
    user_id: user._id,
    user: user.toJSON(),
  });
}

// POST /api/v1/user/login  (username OR email + password)
async function login(req, res) {
  const { username, email, password } = req.body;
  const filter = email
    ? { email: String(email).toLowerCase() }
    : { username: new RegExp(`^${escapeRegex(username)}$`, 'i') };

  const user = await User.findOne(filter).select('+password');
  const valid = user ? await bcrypt.compare(password, user.password) : false;

  if (!valid) {
    logger.warn('Login failed: invalid credentials', { identifier: email ? 'email' : 'username', ip: req.ip });
    throw ApiError.unauthorized('Invalid username/email or password');
  }

  const token = signToken(user);
  logger.info('Login successful', { userId: user._id.toString() });
  res.status(200).json({
    status: true,
    message: 'Login successful.',
    jwt_token: token,
    token_type: 'Bearer',
    expires_in: env.jwtExpiresIn,
    user: { _id: user._id, username: user.username, email: user.email },
  });
}

module.exports = { signup, login };
