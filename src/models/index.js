// index.js
const mongoose = require('mongoose');
const userSchema = require('./users/users.js');
const postSchema = require('./posts/posts.js');
const imageSchema = require('./images/images.js');

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);
const Image = mongoose.model('Image', imageSchema);

module.exports = {
  User,
  Post,
  Image,
};
