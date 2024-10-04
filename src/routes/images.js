'use strict';

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { Image } = require('../models/images/images'); 
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to upload an image
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const processedImage = await sharp(req.file.buffer)
      .resize({ width: 800 }) 
      .toFormat('jpeg', { quality: 80 }) 
      .toBuffer();

    const image = new Image({
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      data: processedImage,
      type: req.body.type, 
      relatedId: req.body.relatedId 
    });

    await image.save();
    res.status(201).json({ message: 'Image uploaded successfully!', image });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading image', error });
  }
});

// Route to get images by type and relatedId
router.get('/images', async (req, res) => {
  try {
    const { type, relatedId } = req.query; 
    const images = await Image.find({ type, relatedId }); 
    res.status(200).json(images);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving images', error });
  }
});

module.exports = router;
