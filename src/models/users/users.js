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
  createdAt: { type: Date, default: Date.now },
  bio: { type: String, required: false },
  profilePicture: { type: mongoose.Schema.Types.ObjectId, ref: 'Image', required: false },
  address: { type: String, required: false }, 
  phone: { type: String, required: false },
  website: { type: String, required: false }, 
  organization: { type: String, required: false }, 
  department: { type: String, required: false }, 
  socialLinks: { 
    twitter: { type: String, required: false },
    linkedin: { type: String, required: false },
    facebook: { type: String, required: false },
    instagram: { type: String, required: false },
  },

});

// Middleware to hash the password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.statics.authenticateBasic = async function (usernameOrEmail, password) {
  const user = await this.findOne({
    $or: [
      { username: usernameOrEmail },
      { email: usernameOrEmail }
    ]
  });
  
  if (user && await bcrypt.compare(password, user.password)) {
    return user;
  }
  
  throw new Error('Invalid User');
};

userSchema.statics.authenticateToken = async function (token) {
  try {
    const parsedToken = jwt.verify(token, SECRET);
    const user = await this.findById(parsedToken.id); // Use findById for better performance
    if (user) return user;
    throw new Error("User Not Found");
  } catch (e) {
    throw new Error(e.message);
  }
};


userSchema.virtual('token').get(function () {
  return jwt.sign({ id: this._id, username: this.username, role: this.role }, SECRET);
});

userSchema.virtual('capabilities').get(function () {
  const acl = {
    user: ['read', 'create', 'update', 'delete'],
    admin: ['read', 'create', 'update', 'delete'],
  };
  return acl[this.role];
});

module.exports = userSchema;
