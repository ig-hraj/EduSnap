/**
 * Message Service — Pure business logic for chat messages.
 * 
 * Used by BOTH the REST controller (HTTP API) and the Socket handler (real-time).
 * No req/res, no socket objects — just data in, results out.
 */
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const Student = require('../models/Student');
const Tutor = require('../models/Tutor');
const AppError = require('../utils/AppError');

/**
 * Verify a user is part of a booking (student or tutor).
 * Reused by getMessages, sendMessage, etc.
 * @returns {Object} The booking document
 */
async function verifyBookingAccess(bookingId, userId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  const isStudent = booking.studentId.toString() === userId;
  const isTutor = booking.tutorId.toString() === userId;

  if (!isStudent && !isTutor) {
    throw new AppError('You are not authorized to access this chat', 403);
  }

  return booking;
}

/**
 * Get all messages for a booking and mark opponent's messages as read.
 */
async function getMessages(bookingId, userId) {
  await verifyBookingAccess(bookingId, userId);

  // Fetch messages + mark unread as read (parallel)
  const [messages] = await Promise.all([
    Message.find({ bookingId }).sort({ createdAt: 1 }),
    Message.updateMany(
      { bookingId, senderId: { $ne: userId }, isRead: false },
      { isRead: true }
    ),
  ]);

  return messages;
}

/**
 * Resolve sender's full name from their ID and role.
 */
async function resolveSenderName(senderId, senderRole) {
  try {
    if (senderRole === 'student') {
      const student = await Student.findById(senderId).select('firstName lastName');
      return student ? `${student.firstName} ${student.lastName}` : 'Student';
    } else {
      const tutor = await Tutor.findById(senderId).select('firstName lastName');
      return tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Tutor';
    }
  } catch {
    return 'User';
  }
}

/**
 * Create and save a new message.
 * Used by both REST POST /messages and Socket message:send.
 * 
 * @param {Object} params - { bookingId, senderId, senderRole, messageText }
 * @returns {Object} Saved message document
 */
async function sendMessage({ bookingId, senderId, senderRole, messageText }) {
  if (!messageText || !messageText.trim()) {
    throw new AppError('Message cannot be empty', 400);
  }

  if (messageText.length > 1000) {
    throw new AppError('Message cannot exceed 1000 characters', 400);
  }

  // Verify sender belongs to this booking
  await verifyBookingAccess(bookingId, senderId);

  // Resolve sender name
  const senderName = await resolveSenderName(senderId, senderRole);

  // Create message
  const message = await Message.create({
    bookingId,
    senderId,
    senderName,
    senderRole,
    message: messageText.trim(),
  });

  return message;
}

/**
 * Mark a single message as read.
 */
async function markAsRead(messageId, userId) {
  const message = await Message.findById(messageId);
  if (!message) throw new AppError('Message not found', 404);

  // Only the recipient can mark as read (not the sender)
  if (message.senderId.toString() === userId) {
    return message; // Already own message, no-op
  }

  message.isRead = true;
  await message.save();
  return message;
}

/**
 * Get unread message count for a booking (messages from the other party).
 */
async function getUnreadCount(bookingId, userId) {
  return Message.countDocuments({
    bookingId,
    senderId: { $ne: userId },
    isRead: false,
  });
}

module.exports = {
  verifyBookingAccess,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
  resolveSenderName,
};
