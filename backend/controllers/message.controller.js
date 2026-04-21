/**
 * Message Controller — Thin HTTP layer for REST chat API.
 * 
 * Each method: extract from req → call service → send response.
 * Socket.IO real-time messaging is handled separately in sockets/chatSocket.js.
 */
const messageService = require('../services/message.service');

// GET /api/messages/:bookingId
exports.getMessages = async (req, res) => {
  const messages = await messageService.getMessages(req.params.bookingId, req.user.id);

  res.status(200).json({ messages });
};

// POST /api/messages
exports.sendMessage = async (req, res) => {
  const message = await messageService.sendMessage({
    bookingId: req.body.bookingId,
    senderId: req.user.id,
    senderRole: req.user.role,
    messageText: req.body.message,
  });

  // Emit via Socket.IO for real-time delivery
  const io = req.app.get('io');
  if (io) {
    io.to(`booking:${message.bookingId}`).emit('message:received', {
      _id: message._id,
      bookingId: message.bookingId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      message: message.message,
      createdAt: message.createdAt,
      isRead: false,
    });
  }

  res.status(201).json({
    message: 'Message sent',
    messageData: message,
  });
};

// PUT /api/messages/:messageId/read
exports.markAsRead = async (req, res) => {
  const message = await messageService.markAsRead(req.params.messageId, req.user.id);

  // Notify sender their message was read
  const io = req.app.get('io');
  if (io) {
    io.to(`booking:${message.bookingId}`).emit('message:read', {
      messageId: message._id,
      readBy: req.user.id,
    });
  }

  res.status(200).json({ message: 'Message marked as read', messageData: message });
};

// GET /api/messages/:bookingId/unread-count
exports.getUnreadCount = async (req, res) => {
  const unreadCount = await messageService.getUnreadCount(req.params.bookingId, req.user.id);

  res.status(200).json({ unreadCount });
};
