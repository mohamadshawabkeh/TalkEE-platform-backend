'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const authRouter = express.Router();
const { User } = require('../models/index.js');
const basicAuth = require('../middleware/basic.js');
const bearerAuth = require('../middleware/bearer.js');

// Signup route with validation
authRouter.post('/signup', [
  body('username').matches(/^[a-zA-Z0-9-_\.]+$/).withMessage('Username must be alphanumeric and can include dashes, underscores, or periods.'),
  body('email').isEmail(),
  body('password').isLength({ min: 5 }),
  body('role').optional().isIn(['user', 'admin']),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, email, password, role = 'user' } = req.body; // Default role is 'user'
    let userRecord = await User.create({ username, email, password, role });
    const output = {
      user: {
        id: userRecord._id,
        username: userRecord.username,
        email: userRecord.email,
        role: userRecord.role,
        signedUpAt: userRecord.createdAt
      },
      token: userRecord.token
    };

    res.status(201).json(output);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ message: 'Username or email already exists.' });
    }
    next(e); 
  }
});

// Signin route with validation
authRouter.post('/signin', [
  body('username').exists().withMessage('Username is required'),
  body('password').exists().withMessage('Password is required')
], basicAuth, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = req.user;
    const output = {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token: user.token
    };
    res.status(200).json(output);
  } catch (e) {
    next(e);
  }
});

authRouter.get('/users', bearerAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }

    const userRecords = await User.find();
    const list = userRecords.map(user => ({
      username: user.username,
      email: user.email,
      role: user.role,
      signedUpAt: user.createdAt
    }));

    res.status(200).json(list);
  } catch (e) {
    next(e);
  }
});

authRouter.get('/secret', bearerAuth, (req, res) => {
  res.status(200).send('Welcome to the secret area');
});

module.exports = authRouter;
