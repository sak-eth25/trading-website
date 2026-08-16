/**
 * Socket.io event handlers and utilities
 */

/**
 * Initialize WebSocket event listeners
 * @param {object} io - Socket.io instance
 */
function initializeSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // When user joins a room (optional)
    socket.on('join', (data) => {
      console.log(`📍 User ${socket.id} joined room: ${data.room}`);
      socket.join(data.room);
    });

    // When user leaves a room (optional)
    socket.on('leave', (data) => {
      console.log(`📍 User ${socket.id} left room: ${data.room}`);
      socket.leave(data.room);
    });

    // Send welcome message to newly connected client
    socket.emit('connected', {
      message: 'Connected to trading backend',
      socketId: socket.id
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('🚨 Socket error:', error);
    });
  });
}

/**
 * Broadcast price update to all connected clients
 * @param {object} io - Socket.io instance
 * @param {object} priceData - { symbol, price, timestamp }
 */
function broadcastPriceUpdate(io, priceData) {
  io.emit('priceUpdate', priceData);
}

/**
 * Broadcast price update to specific room
 * @param {object} io - Socket.io instance
 * @param {string} room - Room name
 * @param {object} priceData - { symbol, price, timestamp }
 */
function broadcastToRoom(io, room, priceData) {
  io.to(room).emit('priceUpdate', priceData);
}

/**
 * Send message to specific client
 * @param {object} io - Socket.io instance
 * @param {string} socketId - Socket ID of target client
 * @param {string} event - Event name
 * @param {object} data - Data to send
 */
function sendToClient(io, socketId, event, data) {
  io.to(socketId).emit(event, data);
}

module.exports = {
  initializeSocketHandlers,
  broadcastPriceUpdate,
  broadcastToRoom,
  sendToClient
};
