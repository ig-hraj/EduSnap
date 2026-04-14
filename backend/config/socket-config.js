const socketIO = require('socket.io');

// Store active users: { userId: socketId }
const activeUsers = {};

// Store user rooms for messaging: { bookingId: [socket1, socket2] }
const bookingRooms = {};

function setupSocket(server) {
  const io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Connection
  io.on('connection', (socket) => {
    console.log(`✓ User connected: ${socket.id}`);

    // User joins (login)
    socket.on('user:join', (userId, role) => {
      activeUsers[userId] = socket.id;
      socket.userId = userId;
      socket.role = role;
      console.log(`👤 ${role} ${userId} joined`);
      io.emit('users:online', Object.keys(activeUsers));
    });

    // User joins booking room for chat (student + tutor)
    socket.on('booking:join', (bookingId) => {
      socket.join(`booking:${bookingId}`);
      socket.bookingId = bookingId;
      
      if (!bookingRooms[bookingId]) {
        bookingRooms[bookingId] = [];
      }
      bookingRooms[bookingId].push(socket.id);
      console.log(`📅 User joined booking room: ${bookingId}`);
      
      io.to(`booking:${bookingId}`).emit('booking:user-joined', {
        bookingId,
        timestamp: new Date(),
      });
    });

    // Alternative event name for chat page
    socket.on('join:booking-room', (data) => {
      const { bookingId } = data;
      socket.join(`booking:${bookingId}`);
      socket.bookingId = bookingId;
      
      if (!bookingRooms[bookingId]) {
        bookingRooms[bookingId] = [];
      }
      bookingRooms[bookingId].push(socket.id);
      console.log(`📅 User joined booking room: ${bookingId}`);
      
      io.to(`booking:${bookingId}`).emit('booking:user-joined', {
        bookingId,
        timestamp: new Date(),
      });
    });

    // Booking created - notify tutor
    socket.on('booking:created', (data) => {
      const { tutorId, bookingId, studentName, subject, sessionDate, startTime } = data;
      
      console.log(`📌 New booking for tutor ${tutorId}: ${bookingId}`);
      
      // Notify tutor if online
      const tutorSocketId = activeUsers[tutorId];
      if (tutorSocketId) {
        io.to(tutorSocketId).emit('notification:booking-created', {
          bookingId,
          studentName,
          subject,
          sessionDate,
          startTime,
          message: `New booking from ${studentName} for ${subject}`,
          timestamp: new Date(),
        });
      }
      
      // Broadcast to tutors dashboard
      io.emit('dashboard:booking-update', {
        tutorId,
        bookingId,
        type: 'new',
      });
    });

    // Booking status updated (confirmed → in-progress → completed)
    socket.on('booking:status-changed', (data) => {
      const { bookingId, studentId, tutorId, newStatus, oldStatus } = data;
      
      console.log(`🔄 Booking ${bookingId}: ${oldStatus} → ${newStatus}`);
      
      // Notify both parties
      if (activeUsers[studentId]) {
        io.to(activeUsers[studentId]).emit('notification:status-changed', {
          bookingId,
          status: newStatus,
          message: `Your session status: ${newStatus}`,
          timestamp: new Date(),
        });
      }
      
      if (activeUsers[tutorId]) {
        io.to(activeUsers[tutorId]).emit('notification:status-changed', {
          bookingId,
          status: newStatus,
          message: `Session status: ${newStatus}`,
          timestamp: new Date(),
        });
      }
      
      // Broadcast to dashboards
      io.emit('dashboard:booking-status', {
        bookingId,
        studentId,
        tutorId,
        status: newStatus,
      });
    });

    // Booking cancelled
    socket.on('booking:cancelled', (data) => {
      const { bookingId, studentId, tutorId, reason } = data;
      
      console.log(`❌ Booking cancelled: ${bookingId} - ${reason}`);
      
      // Notify tutor
      if (activeUsers[tutorId]) {
        io.to(activeUsers[tutorId]).emit('notification:booking-cancelled', {
          bookingId,
          reason,
          message: 'A booking has been cancelled',
          timestamp: new Date(),
        });
      }
      
      // Broadcast to dashboards
      io.emit('dashboard:booking-cancelled', {
        bookingId,
        studentId,
        tutorId,
      });
    });

    // Feedback submitted - notify tutor
    socket.on('booking:feedback-submitted', (data) => {
      const { bookingId, tutorId, studentName, rating, feedback } = data;
      
      console.log(`⭐ Feedback for tutor ${tutorId}: ${rating} stars`);
      
      // Notify tutor
      if (activeUsers[tutorId]) {
        io.to(activeUsers[tutorId]).emit('notification:feedback-received', {
          bookingId,
          studentName,
          rating,
          feedback: feedback.substring(0, 100) + '...', // Preview
          message: `${studentName} left ${rating}⭐ feedback`,
          timestamp: new Date(),
        });
      }
      
      // Broadcast to update tutor's rating in dashboards
      io.emit('dashboard:tutor-rating-updated', {
        tutorId,
        bookingId,
        rating,
      });
    });

    // Tutor availability updated
    socket.on('tutor:availability-changed', (data) => {
      const { tutorId, availability } = data;
      
      console.log(`📅 Tutor ${tutorId} availability updated`);
      
      // Broadcast to all (students viewing tutors should see updates)
      io.emit('dashboard:tutor-availability-updated', {
        tutorId,
        availability,
        timestamp: new Date(),
      });
    });

    // Message sent in booking chat
    socket.on('message:send', (data) => {
      const { bookingId, senderId, senderName, senderRole, message, timestamp } = data;
      
      console.log(`💬 Message in booking ${bookingId}: ${message.substring(0, 30)}...`);
      
      // Broadcast to booking room (both student and tutor)
      io.to(`booking:${bookingId}`).emit('message:received', {
        bookingId,
        senderId,
        senderName,
        senderRole,
        message,
        timestamp: timestamp || new Date(),
      });
    });

    // User is typing in chat
    socket.on('message:typing', (data) => {
      const { bookingId, userId, userName } = data;
      
      // Broadcast typing status to booking room (except sender)
      socket.to(`booking:${bookingId}`).emit('message:typing', {
        bookingId,
        senderId: userId,
        senderName: userName,
        isTyping: true,
      });
    });

    // User stops typing
    socket.on('message:stop-typing', (data) => {
      const { bookingId, userId } = data;
      
      socket.to(`booking:${bookingId}`).emit('message:user-stopped-typing', {
        bookingId,
        userId,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`✗ User disconnected: ${socket.id}`);
      
      // Remove from active users
      if (socket.userId) {
        delete activeUsers[socket.userId];
      }
      
      // Remove from booking rooms
      if (socket.bookingId && bookingRooms[socket.bookingId]) {
        bookingRooms[socket.bookingId] = bookingRooms[socket.bookingId].filter(
          (id) => id !== socket.id
        );
      }
      
      // Broadcast updated online users
      io.emit('users:online', Object.keys(activeUsers));
      
      // Notify booking room
      if (socket.bookingId) {
        io.to(`booking:${socket.bookingId}`).emit('booking:user-left', {
          bookingId: socket.bookingId,
        });
      }
    });
  });

  return io;
}

module.exports = { setupSocket, activeUsers };
