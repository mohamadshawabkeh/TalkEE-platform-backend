'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET = process.env.SECRET || 'secretstring';

// Define the User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
});

// Middleware to hash the password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to authenticate user with basic credentials
userSchema.statics.authenticateBasic = async function (username, password) {
  const user = await this.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    return user;
  }
  throw new Error('Invalid User');
};

// Method to authenticate user with token
userSchema.statics.authenticateToken = async function (token) {
  try {
    const parsedToken = jwt.verify(token, SECRET);
    const user = await this.findOne({ username: parsedToken.username });
    if (user) return user;
    throw new Error("User Not Found");
  } catch (e) {
    throw new Error(e.message);
  }
};

// Virtual field for token
userSchema.virtual('token').get(function () {
  return jwt.sign({ username: this.username, role: this.role }, SECRET);
});

// Virtual field for capabilities
userSchema.virtual('capabilities').get(function () {
  const acl = {
    user: ['read', 'create', 'update', 'delete'],
    admin: ['read', 'create', 'update', 'delete'],
  };
  return acl[this.role];
});

module.exports = userSchema;
