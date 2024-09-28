'use strict';

const { User } = require('../models'); 

module.exports = async (req, res, next) => {

  try {

    if (!req.headers.authorization) { _authError() }

    const token = req.headers.authorization.split(' ').pop();
    const validUser = await User.authenticateToken(token);
    console.log('validUser', validUser);
    req.user = validUser;
    req.token = validUser.token;
    // req.token = token;
    next();

  } catch (e) {
    _authError();
  }

  function _authError(message = 'Invalid Login') {
    res.status(401).send({ error: message });
  }
}

