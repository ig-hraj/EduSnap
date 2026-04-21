/**
 * Chat Socket Handler — Real-time messaging events.
 * 
 * Separated from socket-config.js for clean architecture.
 * Uses the message service for DB operations — no raw DB calls here.
 * 
 * Events handled:
 *   - join:booking-room  → Join a chat room for a booking
 *   - message:send       → Send a message (persisted via service)
 *   - message:typing     → Typing indicator broadcast
 *   - message:stop-typing → Stop typing indicator
 */
const messageService = require('../services/message.service');

/**
 * Register all chat-related socket events on a socket connection.
 * Called from socket-config.js after auth.
 * 
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Authenticated socket connection
 */
function registerChatHandlers(io, socket) {

  // ========== JOIN BOOKING ROOM ==========
  // Both 'booking:join' and 'join:booking-room' point here (backwards compat)
  const joinRoom = async (data) => {
    const bookingId = typeof data === 'string' ? data : data?.bookingId;
    if (!bookingId) return;

    try {
      // Verify the user actually belongs to this booking
      await messageService.verifyBookingAccess(bookingId, socket.userId);

      socket.join(`booking:${bookingId}`);
      socket.bookingId = bookingId;
      console.log(`📅 ${socket.userId} joined booking room: ${bookingId}`);

      // Notify room
      socket.to(`booking:${bookingId}`).emit('booking:user-joined', {
        userId: socket.userId,
        bookingId,
        timestamp: new Date(),
      });
    } catch (err) {
      socket.emit('error:chat', { message: err.message || 'Cannot join room' });
    }
  };

  socket.on('booking:join', joinRoom);
  socket.on('join:booking-room', joinRoom);

  // ========== SEND MESSAGE ==========
  // Real-time path: save to DB via service, then broadcast
  socket.on('message:send', async (data) => {
    const { bookingId, message } = data;

    if (!bookingId || !message) {
      return socket.emit('error:chat', { message: 'bookingId and message are required' });
    }

    try {
      const savedMessage = await messageService.sendMessage({
        bookingId,
        senderId: socket.userId,
        senderRole: socket.role,
        messageText: message,
      });

      // Broadcast to the entire booking room (including sender for confirmation)
      io.to(`booking:${bookingId}`).emit('message:received', {
        _id: savedMessage._id,
        bookingId: savedMessage.bookingId,
        senderId: savedMessage.senderId,
        senderName: savedMessage.senderName,
        senderRole: savedMessage.senderRole,
        message: savedMessage.message,
        createdAt: savedMessage.createdAt,
        isRead: false,
      });

    } catch (err) {
      console.error('Socket message:send error:', err.message);
      socket.emit('error:chat', { message: err.message || 'Failed to send message' });
    }
  });

  // ========== TYPING INDICATORS ==========
  socket.on('message:typing', (data) => {
    const { bookingId } = data;
    if (!bookingId) return;

    // Broadcast to room except sender
    socket.to(`booking:${bookingId}`).emit('message:typing', {
      bookingId,
      senderId: socket.userId,
      senderName: data.userName || 'User',
      isTyping: true,
    });
  });

  socket.on('message:stop-typing', (data) => {
    const { bookingId } = data;
    if (!bookingId) return;

    socket.to(`booking:${bookingId}`).emit('message:typing', {
      bookingId,
      senderId: socket.userId,
      isTyping: false,
    });
  });

  // ========== DISCONNECT CLEANUP ==========
  socket.on('disconnect', () => {
    if (socket.bookingId) {
      io.to(`booking:${socket.bookingId}`).emit('booking:user-left', {
        userId: socket.userId,
        bookingId: socket.bookingId,
      });
    }
  });
}

module.exports = { registerChatHandlers };
