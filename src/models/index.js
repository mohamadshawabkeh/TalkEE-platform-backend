// index.js
const mongoose = require('mongoose');
const userSchema = require('./users/users.js');
const postSchema = require('./posts/posts.js');

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);

module.exports = {
  User,
  Post,
};
