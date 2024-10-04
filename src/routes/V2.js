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

// Get all posts with images
router.get('/posts', bearerAuth, async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const filter = {};

    if (userId) {
      filter.author = userId; 
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const allPosts = await dataModules.Post.find(filter)
      .sort({ pinned: -1, createdAt: -1 })
      .populate({ path: 'author', select: 'username profileImage' })
      .populate({ path: 'reactions.user', select: 'username' })
      .populate({ path: 'comments.user', select: 'username profileImage' })
      .populate({ path: 'photos', select: 'filename contentType data' }) 
      .exec();

    allPosts.forEach(post => {
      post.comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); 
    });

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

    // Emit user profile image if available
    if (req.user.profileImage) {
      emitNotification('userProfileImage', {
        userId: req.user._id,
        profileImage: req.user.profileImage
      });
    }

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

    // Re-populate reactions to get the latest usernames
    const updatedPost = await dataModules.Post.findById(postId)
      .populate({ path: 'reactions.user', select: 'username profileImage' })
      .exec();
    const reactingUser = await dataModules.User.findById(userId).select('username profileImage');

    emitNotification('reaction', {
      postId,
      userId,
      username: reactingUser.username, // Include the username
      profileImage: reactingUser.profileImage, // Include the profile image
      reaction
    });

    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add a comment to a post
router.post('/posts/:postId/comments', bearerAuth, [
  param('postId').exists().withMessage('Post ID is required'),
  body('comment').exists().withMessage('Content is required'), // Changed to 'comment'
  body('photos').optional().isArray().withMessage('Photos should be an array')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const postId = req.params.postId;
    const { comment, photos } = req.body; // Changed to 'comment'

    const newComment = { comment, user: req.user._id, photos: photos || [] };

    const post = await dataModules.Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push(newComment);
    await post.save();

    // Get the username of the commenting user
    const commentingUser = await dataModules.User.findById(req.user._id).select('username profileImage');

    // Emit notification for the new comment
    emitNotification('newComment', { 
      postId, 
      userId: req.user._id, 
      username: commentingUser.username, // Added username
      profileImage: commentingUser.profileImage, // Added profile image
      comment 
    });

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Edit a comment
router.put('/posts/:postId/comments/:commentId', bearerAuth, [
  param('postId').exists().withMessage('Post ID is required'),
  param('commentId').exists().withMessage('Comment ID is required'),
  body('comment').optional().exists().withMessage('Content must be provided if updating'),
  body('photos').optional().isArray().withMessage('Photos should be an array')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { postId, commentId } = req.params;
    const post = await dataModules.Post.findById(postId);

    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Check if the user is the author of the comment or an admin
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to edit this comment' });
    }

    // Update the comment
    comment.comment = req.body.comment || comment.comment;
    comment.photos = req.body.photos || comment.photos;

    await post.save();

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

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if the user is the author of the comment or an admin
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to delete this comment' });
    }

    // Use the correct way to remove the comment
    post.comments = post.comments.filter(c => c._id.toString() !== commentId);
    await post.save();

    res.status(200).json({ message: 'Comment deleted successfully.' });
  } catch (error) {
    console.error("Error deleting comment:", error);
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

// Pin a post
router.post('/posts/:id/pin', bearerAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await dataModules.Post.findById(postId);

    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    post.pinned = true;
    await post.save();

    res.status(200).json({ message: 'Post pinned successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Unpin a post
router.post('/posts/:id/unpin', bearerAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await dataModules.Post.findById(postId);

    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    post.pinned = false;
    await post.save();

    res.status(200).json({ message: 'Post unpinned successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Pin a comment
router.post('/posts/:postId/comments/:commentId/pin', bearerAuth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await dataModules.Post.findById(postId);

    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    comment.pinned = true;
    await post.save();

    res.status(200).json({ message: 'Comment pinned successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Unpin a comment
router.post('/posts/:postId/comments/:commentId/unpin', bearerAuth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await dataModules.Post.findById(postId);

    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    comment.pinned = false;
    await post.save();

    res.status(200).json({ message: 'Comment unpinned successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
