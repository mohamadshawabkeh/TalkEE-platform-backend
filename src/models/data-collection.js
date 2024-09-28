'use strict';
const mongoose = require('mongoose');

class DataCollection {
  constructor(model) {
    this.model = model;
  }

  async get(id) {
    try {
      return id ? await this.model.findById(id).exec() : await this.model.find({}).exec();
    } catch (error) {
      throw new Error(`Error fetching records: ${error.message}`);
    }
  }

  async create(record) {
    try {
      const newRecord = new this.model(record);
      return await newRecord.save();
    } catch (error) {
      throw new Error(`Error creating record: ${error.message}`);
    }
  }

  async update(id, data) {
    try {
      const record = await this.model.findById(id).exec();
      if (!record) throw new Error('Record not found');
      
      Object.assign(record, data);
      return await record.save();
    } catch (error) {
      throw new Error(`Error updating record: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const result = await this.model.findByIdAndDelete(id).exec();
      if (!result) throw new Error('Record not found');
      return result;
    } catch (error) {
      throw new Error(`Error deleting record: ${error.message}`);
    }
  }

  async addReaction(postId, userId, reactionType) {
    try {
      const post = await this.model.findById(postId).exec();
      if (!post) throw new Error('Post not found');

      const existingReactionIndex = post.reactions.findIndex(r => r.userId.toString() === userId);
      if (existingReactionIndex > -1) {
        post.reactions[existingReactionIndex].type = reactionType; // Update existing reaction
      } else {
        post.reactions.push({ userId, type: reactionType });
      }

      return await post.save();
    } catch (error) {
      throw new Error(`Error adding/updating reaction: ${error.message}`);
    }
  }

  async removeReaction(postId, userId) {
    try {
      const post = await this.model.findById(postId).exec();
      if (!post) throw new Error('Post not found');
      
      post.reactions = post.reactions.filter(r => r.userId.toString() !== userId);
      return await post.save();
    } catch (error) {
      throw new Error(`Error removing reaction: ${error.message}`);
    }
  }
}

module.exports = DataCollection;
