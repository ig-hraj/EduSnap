const express = require('express');
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get all messages for a booking (including message history)
router.get('/:bookingId', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { id: userId } = req.user;

    // Verify user is part of this booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.studentId.toString() !== userId && booking.tutorId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get all messages for this booking
    const messages = await Message.find({ bookingId }).sort({ createdAt: 1 });

    // Mark unread messages as read
    await Message.updateMany(
      { bookingId, senderId: { $ne: userId }, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send a message
router.post('/', verifyToken, async (req, res) => {
  try {
    const { bookingId, message } = req.body;
    const { id: senderId, role: senderRole } = req.user;

    // Validate input
    if (!bookingId || !message) {
      return res.status(400).json({ message: 'Booking ID and message are required' });
    }

    // Get booking details
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user is part of this booking
    if (booking.studentId.toString() !== senderId && booking.tutorId.toString() !== senderId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get sender name
    let senderName = 'User';
    try {
      if (senderRole === 'student') {
        const Student = require('../models/Student');
        const student = await Student.findById(senderId);
        senderName = `${student.firstName} ${student.lastName}`;
      } else if (senderRole === 'tutor') {
        const Tutor = require('../models/Tutor');
        const tutor = await Tutor.findById(senderId);
        senderName = `${tutor.firstName} ${tutor.lastName}`;
      }
    } catch (e) {
      console.error('Error getting sender name:', e);
    }

    // Create message
    const newMessage = new Message({
      bookingId,
      senderId,
      senderName,
      senderRole,
      message,
    });

    await newMessage.save();

    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.to(`booking:${bookingId}`).emit('message:received', {
        _id: newMessage._id,
        bookingId,
        senderId,
        senderName,
        senderRole,
        message,
        createdAt: newMessage.createdAt,
        isRead: false,
      });
    }

    res.status(201).json({
      message: 'Message sent',
      messageData: newMessage,
    });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark message as read
router.put('/:messageId/read', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { isRead: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.status(200).json({ message: 'Message marked as read', messageData: message });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unread message count for a booking
router.get('/:bookingId/unread-count', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { id: userId } = req.user;

    const unreadCount = await Message.countDocuments({
      bookingId,
      senderId: { $ne: userId },
      isRead: false,
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
