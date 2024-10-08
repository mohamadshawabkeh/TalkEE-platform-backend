const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: { type: String, required: false }, 
    content: { type: String, required: true }, 
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    reactions: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
            type: { type: String, enum: ['like', 'funny', 'sad', 'angry'], required: true }, 
            createdAt: { type: Date, default: Date.now } 
        }
    ],
    comments: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
            comment: { type: String, required: true },
            photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Image', required: false }],
            createdAt: { type: Date, default: Date.now },
            pinned: { type: Boolean, default: false }
        }
    ],
    photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Image', required: false }],
    pinned: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = postSchema;
