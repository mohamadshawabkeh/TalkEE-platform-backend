'use strict';
require('dotenv').config();
const { start } = require('./src/server.js');
const connectDB = require('./src/models/db.js');

connectDB()
        .then(()=>{
          console.log('server started successfuly after mongo');
          start(process.env.PORT || 3001);
        })
        .catch(err => {
          console.error('MongoDB connection error:', err);
        });