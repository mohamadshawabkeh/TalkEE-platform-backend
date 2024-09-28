const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: { type: String, required: false }, 
    content: { type: String, required: true }, 
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
        type: { type: String, enum: ['like', 'funny', 'sad', 'angry'] }, 
        createdAt: { type: Date, default: Date.now } 
      }
    ],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
        comment: { type: String, required: false }, 
        createdAt: { type: Date, default: Date.now } 
      }
    ]
  }, { timestamps: true });
  
  module.exports = postSchema;
  