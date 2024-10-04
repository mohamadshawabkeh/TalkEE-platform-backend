'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const dataModules = require('../models');
const router = express.Router();
const bearerAuth = require('../middleware/bearer.js');
const permissions = require('../middleware/acl.js');
const { emitNotification } = require('../socket/socket.js');

// Middleware to handle model parameters
router.param('model', (req, res, next) => {
  const modelName = req.params.model;
  if (dataModules[modelName]) {
    req.model = dataModules[modelName];
    next();
  } else {
    next('Invalid Model');
  }
});

// Get all posts with populated author, reactions, and comments
router.get('/posts', bearerAuth, async (req, res) => {
  try {
    const allPosts = await dataModules.Post.find({})
      .populate({ path: 'author', select: 'username' })
      .populate({ path: 'reactions.user', select: 'username' })
      .populate({ path: 'comments.user', select: 'username' })
      .exec();
    res.status(200).json(allPosts);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's own posts
router.get('/posts/user', bearerAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const userPosts = await dataModules.Post.find({ author: userId })
      .populate({ path: 'author', select: 'username' })
      .populate({ path: 'reactions.user', select: 'username' })
      .populate({ path: 'comments.user', select: 'username' })
      .exec();
    res.status(200).json(userPosts);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a post with validation
router.post('/posts', bearerAuth, permissions('create'), [
  body('title').exists().withMessage('Title is required'),
  body('content').exists().withMessage('Content is required'),
  body('photos').optional().isArray().withMessage('Photos should be an array')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, content, photos } = req.body;
    const newPost = await dataModules.Post.create({
      title,
      content,
      photos: photos || [],
      author: req.user._id
    });

    // Emit notification for new post
    emitNotification('newPost', { postId: newPost._id, userId: req.user._id });

    const populatedPost = await dataModules.Post.findById(newPost._id)
      .populate({ path: 'author', select: 'username' })
      .exec();

    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a post with validation
router.put('/posts/:id', bearerAuth, [
  param('id').exists().withMessage('Post ID is required'),
  body('title').optional().exists().withMessage('Title must be provided if updating'),
  body('content').optional().exists().withMessage('Content must be provided if updating'),
  body('photos').optional().isArray().withMessage('Photos should be an array')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const post = await dataModules.Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check permissions
    if (req.user.role === 'admin' || post.author.toString() === userId.toString()) {
      const updatedPost = await dataModules.Post.findByIdAndUpdate(postId, req.body, { new: true })
        .populate({ path: 'author', select: 'username' })
        .exec();
      return res.status(200).json(updatedPost);
    }

    return res.status(403).json({ message: 'Unauthorized' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a post
router.delete('/posts/:id', bearerAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const post = await dataModules.Post.findById(postId);

    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Check permissions
    if (req.user.role === 'admin' || post.author.toString() === userId.toString()) {
      await dataModules.Post.deleteOne({ _id: postId });
      return res.status(200).json({ message: 'Post deleted successfully.' });
    }

    return res.status(403).json({ message: 'Unauthorized' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// React to a post
router.post('/posts/:id/react', bearerAuth, [
  param('id').exists().withMessage('Post ID is required'),
  body('reaction').exists().withMessage('Reaction is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const postId = req.params.id;
    const { reaction } = req.body;

    const post = await dataModules.Post.findById(postId)
      .populate({ path: 'reactions.user', select: 'username' })
      .exec();

    if (!post) return res.status(404).json({ message: 'Post not found' });

    const userId = req.user._id;
    const existingReactionIndex = post.reactions.findIndex(r => r.user.equals(userId));
    
    if (existingReactionIndex > -1) {
      post.reactions[existingReactionIndex].type = reaction;
    } else {
      post.reactions.push({ user: userId, type: reaction });
    }

    await post.save();

    // Emit notification for the reaction
    emitNotification('reaction', { postId, userId, reaction });

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a comment
router.delete('/posts/:postId/comments/:commentId', bearerAuth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await dataModules.Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if the comment exists
    const commentIndex = post.comments.findIndex(c => c._id.toString() === commentId);
    if (commentIndex === -1) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Remove the comment
    post.comments.splice(commentIndex, 1);
    await post.save();

    res.status(200).json({ message: 'Comment deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove a reaction
router.delete('/posts/:id/react', bearerAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const post = await dataModules.Post.findById(postId);
    
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Filter out the user's reaction
    post.reactions = post.reactions.filter(r => r.user.toString() !== userId.toString());
    await post.save();
    
    res.status(200).json({ message: 'Reaction removed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
