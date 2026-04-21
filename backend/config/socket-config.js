/**
 * Socket.IO Configuration — Core setup + handler registration.
 * 
 * BEFORE: 280 lines — JWT auth, chat logic, booking notifications, 
 *         room tracking, typing indicators ALL in one massive file.
 * 
 * AFTER:  ~100 lines — Clean core with:
 *   - JWT authentication middleware
 *   - Active user tracking
 *   - Modular handler delegation (chat → sockets/chatSocket.js)
 *   - Booking notification events (kept here — they're simple broadcasts)
 */
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { registerChatHandlers } = require('../sockets/chatSocket');

// Active users: { userId: socketId }
const activeUsers = {};

function setupSocket(server) {
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ========== JWT Authentication Middleware ==========
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.role = decoded.role;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  // ========== Connection Handler ==========
  io.on('connection', (socket) => {
    console.log(`✓ Connected: ${socket.id} (${socket.role} ${socket.userId})`);

    // Track active user
    activeUsers[socket.userId] = socket.id;
    io.emit('users:online', Object.keys(activeUsers));

    // ---- Register modular handlers ----
    registerChatHandlers(io, socket);
    registerBookingHandlers(io, socket);

    // ---- Disconnect ----
    socket.on('disconnect', () => {
      console.log(`✗ Disconnected: ${socket.id}`);
      delete activeUsers[socket.userId];
      io.emit('users:online', Object.keys(activeUsers));
    });
  });

  return io;
}

/**
 * Booking notification handlers — simple event broadcasts.
 * These are lightweight enough to stay inline (no DB calls).
 */
function registerBookingHandlers(io, socket) {

  // New booking → notify tutor
  socket.on('booking:created', (data) => {
    const { tutorId, bookingId, studentName, subject, sessionDate, startTime } = data;
    const tutorSocketId = activeUsers[tutorId];
    if (tutorSocketId) {
      io.to(tutorSocketId).emit('notification:booking-created', {
        bookingId, studentName, subject, sessionDate, startTime,
        message: `New booking from ${studentName} for ${subject}`,
        timestamp: new Date(),
      });
    }
    io.emit('dashboard:booking-update', { tutorId, bookingId, type: 'new' });
  });

  // Status change → notify both parties
  socket.on('booking:status-changed', (data) => {
    const { bookingId, studentId, tutorId, newStatus } = data;
    [studentId, tutorId].forEach(userId => {
      if (activeUsers[userId]) {
        io.to(activeUsers[userId]).emit('notification:status-changed', {
          bookingId, status: newStatus,
          message: `Session status: ${newStatus}`,
          timestamp: new Date(),
        });
      }
    });
    io.emit('dashboard:booking-status', { bookingId, studentId, tutorId, status: newStatus });
  });

  // Cancellation → notify tutor
  socket.on('booking:cancelled', (data) => {
    const { bookingId, studentId, tutorId, reason } = data;
    if (activeUsers[tutorId]) {
      io.to(activeUsers[tutorId]).emit('notification:booking-cancelled', {
        bookingId, reason,
        message: 'A booking has been cancelled',
        timestamp: new Date(),
      });
    }
    io.emit('dashboard:booking-cancelled', { bookingId, studentId, tutorId });
  });

  // Feedback → notify tutor
  socket.on('booking:feedback-submitted', (data) => {
    const { bookingId, tutorId, studentName, rating, feedback } = data;
    if (activeUsers[tutorId]) {
      io.to(activeUsers[tutorId]).emit('notification:feedback-received', {
        bookingId, studentName, rating,
        feedback: (feedback || '').substring(0, 100),
        message: `${studentName} left ${rating}⭐ feedback`,
        timestamp: new Date(),
      });
    }
    io.emit('dashboard:tutor-rating-updated', { tutorId, bookingId, rating });
  });

  // Tutor availability update
  socket.on('tutor:availability-changed', (data) => {
    io.emit('dashboard:tutor-availability-updated', {
      tutorId: data.tutorId,
      availability: data.availability,
      timestamp: new Date(),
    });
  });
}

module.exports = { setupSocket, activeUsers };
