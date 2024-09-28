'use strict';

const express = require('express');
const authRouter = express.Router();
const { User } = require('../models/index.js');
const basicAuth = require('../middleware/basic.js');
const bearerAuth = require('../middleware/bearer.js');
const permissions = require('../middleware/acl.js');

authRouter.post('/signup', async (req, res, next) => {
  try {
    let userRecord = await User.create(req.body);
    const output = {
      user: userRecord,
      token: userRecord.token
    };
    res.status(201).json(output);
  } catch (e) {
    next(e);
  }
});

authRouter.post('/signin', basicAuth, (req, res, next) => {
  const user = {
    user: req.user,
    token: req.user.token
  };
  res.status(200).json(user);
});

authRouter.get('/users', bearerAuth, permissions('read'), async (req, res, next) => {
  try {
    const userRecords = await User.find();
    const list = userRecords.map(user => ({
      username: user.username,
      email: user.email
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
