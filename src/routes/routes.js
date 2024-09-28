'use strict';

const express = require('express');
const authRouter = express.Router();
const { User } = require('../models/index.js');
const basicAuth = require('../middleware/basic.js');
const bearerAuth = require('../middleware/bearer.js');

authRouter.post('/signup', async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    let userRecord = await User.create({ username, email, password, role }); 
    const output = {
      user: {
        username: userRecord.username,
        email: userRecord.email,
        role: userRecord.role,
        signedUpAt: userRecord.createdAt
      },
      token: userRecord.token
    };
    res.status(201).json(output);
  } catch (e) {
    next(e);
  }
});


authRouter.post('/signin', basicAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const output = {
      user: {
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

// Get all users - Admins only
authRouter.get('/users', bearerAuth, async (req, res, next) => {
  try {
    // Check if the user is an admin
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
