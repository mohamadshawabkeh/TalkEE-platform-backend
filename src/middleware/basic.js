'use strict';

const base64 = require('base-64');
const { User } = require('../models');

module.exports = async (req, res, next) => {
  if (!req.headers.authorization) { 
    return _authError('No authorization header'); 
  }

  let basic = req.headers.authorization.split(' ').pop();
  let [user, pass] = base64.decode(basic).split(':');

  try {
    req.user = await User.authenticateBasic(user, pass);
    next();
  } catch (e) {
    _authError(e.message);
  }

  function _authError(message = 'Invalid Login') {
    res.status(403).send({ error: message });
  }
}
