'use strict';

const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server);

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinRoom', (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

const emitNotification = (event, data) => {
  if (io) {
    io.emit(event, data);
  } else {
    console.error('Socket.IO not initialized.');
  }
};

module.exports = {
  initSocket,
  emitNotification,
};
