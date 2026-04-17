// Socket.IO Client - Handles real-time connection

let socket = null;
const listeners = {
  'notification:received': [],
  'dashboard:updated': [],
  'booking:status-changed': [],
  'message:new': [],
  'users:online': [],
  'tutor:rating-updated': [],
  'typing:user': [],
};

// Initialize Socket.IO connection
function initSocket() {
  if (socket && socket.connected) {
    console.log('⚡ Socket already connected');
    return socket;
  }

  socket = io();

  // Connection events
  socket.on('connect', () => {
    console.log('✓ Connected to server');
    
    // User joins - send userId and role
    const userId = getUserId();
    const role = getUserRole();
    
    if (userId && role) {
      socket.emit('user:join', userId, role);
      console.log(`👤 ${role} ${userId} joined socket`);
    }
  });

  socket.on('disconnect', () => {
    console.log('✗ Disconnected from server');
  });

  // Notification listeners
  socket.on('notification:booking-created', (data) => {
    handleNotification({
      type: 'booking-created',
      title: 'New Booking!',
      message: data.message,
      data,
    });
  });

  socket.on('notification:status-changed', (data) => {
    handleNotification({
      type: 'status-changed',
      title: 'Session Status Updated',
      message: data.message,
      data,
    });
  });

  socket.on('notification:booking-cancelled', (data) => {
    handleNotification({
      type: 'booking-cancelled',
      title: 'Booking Cancelled',
      message: data.message,
      data,
    });
  });

  socket.on('notification:feedback-received', (data) => {
    handleNotification({
      type: 'feedback-received',
      title: '⭐ Feedback Received',
      message: data.message,
      data,
    });
  });

  // Dashboard updates
  socket.on('dashboard:booking-update', (data) => {
    emitListeners('dashboard:updated', data);
  });

  socket.on('dashboard:booking-status', (data) => {
    emitListeners('booking:status-changed', data);
  });

  socket.on('dashboard:booking-cancelled', (data) => {
    emitListeners('dashboard:updated', data);
  });

  socket.on('dashboard:tutor-rating-updated', (data) => {
    emitListeners('tutor:rating-updated', data);
  });

  socket.on('dashboard:tutor-availability-updated', (data) => {
    emitListeners('dashboard:updated', data);
  });

  // Message listeners
  socket.on('message:received', (data) => {
    console.log('💬 Message received:', data.message);
    emitListeners('message:new', data);
  });

  socket.on('message:user-typing', (data) => {
    emitListeners('typing:user', { type: 'typing', ...data });
  });

  socket.on('message:user-stopped-typing', (data) => {
    emitListeners('typing:user', { type: 'stopped', ...data });
  });

  // Online users
  socket.on('users:online', (users) => {
    console.log('👥 Online users:', users);
    emitListeners('users:online', users);
  });

  return socket;
}

// Handle notifications with toast
function handleNotification(notification) {
  console.log(`🔔 Notification: ${notification.title}`);
  
  // Show toast if notification system is loaded
  if (typeof showNotificationToast === 'function') {
    showNotificationToast(notification);
  }
  
  // Emit to listeners
  emitListeners('notification:received', notification);
}

// Subscribe to events
function onSocket(eventName, callback) {
  if (listeners[eventName]) {
    listeners[eventName].push(callback);
  }
}

// Emit to subscribers
function emitListeners(eventName, data) {
  if (listeners[eventName]) {
    listeners[eventName].forEach(callback => callback(data));
  }
}

// Emit event to server
function emitBookingCreated(bookingData) {
  if (!socket || !socket.connected) return;
  const { id, tutorId, studentName, subject, sessionDate, startTime } = bookingData;
  socket.emit('booking:created', {
    bookingId: id,
    tutorId,
    studentName,
    subject,
    sessionDate,
    startTime,
  });
}

function emitStatusChanged(bookingId, tutorId, studentId, oldStatus, newStatus) {
  if (!socket || !socket.connected) return;
  socket.emit('booking:status-changed', {
    bookingId,
    tutorId,
    studentId,
    oldStatus,
    newStatus,
  });
}

function emitBookingCancelled(bookingId, tutorId, studentId, reason) {
  if (!socket || !socket.connected) return;
  socket.emit('booking:cancelled', {
    bookingId,
    tutorId,
    studentId,
    reason,
  });
}

function emitFeedbackSubmitted(bookingId, tutorId, studentName, rating, feedback) {
  if (!socket || !socket.connected) return;
  socket.emit('booking:feedback-submitted', {
    bookingId,
    tutorId,
    studentName,
    rating,
    feedback,
  });
}

function emitAvailabilityChanged(tutorId, availability) {
  if (!socket || !socket.connected) return;
  socket.emit('tutor:availability-changed', {
    tutorId,
    availability,
  });
}

// Join booking room (for chat)
function joinBookingRoom(bookingId) {
  if (socket && socket.connected) {
    socket.emit('booking:join', bookingId);
    console.log(`📅 Joined booking room: ${bookingId}`);
  }
}

// Send message in booking chat
function sendMessage(bookingId, message) {
  if (socket && socket.connected) {
    const userId = getUserId();
    const userName = getUserName();
    const role = getUserRole();
    
    socket.emit('message:send', {
      bookingId,
      senderId: userId,
      senderName: userName,
      senderRole: role,
      message,
      timestamp: new Date(),
    });
  }
}

// Typing indicator
function emitTyping(bookingId, isTyping = true) {
  if (socket && socket.connected) {
    const userId = getUserId();
    const userName = getUserName();
    
    if (isTyping) {
      socket.emit('message:typing', {
        bookingId,
        userId,
        userName,
        isTyping: true,
      });
    } else {
      socket.emit('message:stop-typing', {
        bookingId,
        userId,
      });
    }
  }
}

function emitStoppedTyping(bookingId) {
  if (socket && socket.connected) {
    const userId = getUserId();
    socket.emit('message:stop-typing', {
      bookingId,
      userId,
    });
  }
}

// Get socket instance
function getSocket() {
  return socket;
}
