
const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    filename: String,
    contentType: String,
    data: Buffer,
    createdAt: { type: Date, default: Date.now },
  });
  
module.exports = imageSchema;