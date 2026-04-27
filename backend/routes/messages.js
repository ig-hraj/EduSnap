/**
 * Message Routes — Clean API layer.
 * 
 * BEFORE: 156 lines of mixed validation, DB queries, socket emit, try/catch
 * AFTER:  25 lines. Each route is one readable pipeline.
 */
const express = require('express');
const { verifyToken } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const messageController = require('../controllers/message.controller');

const router = express.Router();

// Get all messages for a booking
router.get('/:bookingId', verifyToken, catchAsync(messageController.getMessages));

// Send a message
router.post('/', verifyToken, catchAsync(messageController.sendMessage));

// Mark message as read
router.put('/:messageId/read', verifyToken, catchAsync(messageController.markAsRead));

// Get unread count for a booking
router.get('/:bookingId/unread-count', verifyToken, catchAsync(messageController.getUnreadCount));

module.exports = router;
