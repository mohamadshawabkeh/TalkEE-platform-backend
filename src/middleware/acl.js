'use strict';

module.exports = (capability) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return next('User not authenticated');
      }

      if (req.user.capabilities.includes(capability)) {
        next();
      } else {
        next('Access Denied');
      }
    } catch (e) {
      next('Authorization error');
    }
  };
}
