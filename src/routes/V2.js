'use strict';

const express = require('express');
const dataModules = require('../models');
const router = express.Router();
const bearerAuth = require('../middleware/bearer.js');
const permissions = require('../middleware/acl.js');

router.param('model', (req, res, next) => {
  const modelName = req.params.model;
  if (dataModules[modelName]) {
    req.model = dataModules[modelName];
    next();
  } else {
    next('Invalid Model');
  }
});

// Get all posts with populated reactions and comments
router.get('/posts', bearerAuth, async (req, res) => {
  try {
    const allPosts = await dataModules.Post.find({})
      .populate({ path: 'reactions.user', select: 'username' })
      .populate({ path: 'comments.user', select: 'username' })
      .exec();
    res.status(200).json(allPosts);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's own posts with populated reactions and comments
router.get('/posts/user', bearerAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const userPosts = await dataModules.Post.find({ author: userId })
      .populate({ path: 'reactions.user', select: 'username' })
      .populate({ path: 'comments.user', select: 'username' })
      .exec();
    res.status(200).json(userPosts);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a post
router.post('/posts', bearerAuth, permissions('create'), async (req, res) => {
  try {
    const { title, content, photos } = req.body; // Include photos
    const newPost = await dataModules.Post.create({ 
      title, 
      content, 
      photos: photos || [], // Ensure photos are optional
      author: req.user._id 
    });
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a post
router.put('/posts/:id', bearerAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const post = await dataModules.Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Admin can edit any post
    if (req.user.role === 'admin') {
      const updatedPost = await dataModules.Post.findByIdAndUpdate(postId, req.body, { new: true });
      return res.status(200).json(updatedPost);
    }

    // Users can only edit their own posts
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const updatedPost = await dataModules.Post.findByIdAndUpdate(postId, req.body, { new: true });
    res.status(200).json(updatedPost);
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

    // Admin can delete any post
    if (req.user.role === 'admin') {
      await dataModules.Post.deleteOne({ _id: postId });
      return res.status(200).json({ message: 'Post deleted successfully.' });
    }

    // Users can only delete their own posts
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await dataModules.Post.deleteOne({ _id: postId });
    res.status(200).json({ message: 'Post deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// React to a post
router.post('/posts/:id/react', bearerAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const reaction = req.body.reaction; 
    if (!reaction) return res.status(400).json({ message: 'Reaction is required' });
    
    const post = await dataModules.Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const userId = req.user._id;
    const existingReactionIndex = post.reactions.findIndex(r => r.user.equals(userId));
    
    if (existingReactionIndex > -1) {
      post.reactions[existingReactionIndex].type = reaction;
    } else {
      post.reactions.push({ user: userId, type: reaction });
    }

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
