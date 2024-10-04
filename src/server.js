'use strict';

require('dotenv').config(); 
let path = require('path');
let http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const notFoundHandler = require('./error-handlers/404.js');
const errorHandler = require('./error-handlers/500.js');
const logger = require('./middleware/logger.js');
const { initSocket } = require('./socket/socket.js');

const authRoutes = require('./routes/routes.js');
const v2Routes = require('./routes/V2.js');
const imagesRouter = require('./routes/images.js');

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(express.static(path.join(__dirname, 'public')));


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
});

app.use(limiter);

app.get('/', (req, res) => {
  res.send('Welcome to the Home Page');
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// App Level MW
app.use(cors());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(logger);

// Initialize Socket.IO
initSocket(server);

// Routes
app.use(authRoutes);
app.use('/api/v2', v2Routes);
app.use('/api/v2/images', imagesRouter);

// Catchalls
app.use('*', notFoundHandler);
app.use(errorHandler);

const start = port => {
  if (!port) { throw new Error('Missing Port'); }
  server.listen(port, () => console.log(`Listening on ${port}`));
};

module.exports = {
  server,
  start,
};