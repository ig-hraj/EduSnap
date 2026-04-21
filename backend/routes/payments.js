/**
 * Payment Routes — Clean API layer.
 * 
 * BEFORE: 371 lines with inline email templates, DB queries, validation
 * AFTER:  25 lines. Security enforced in service layer.
 */
const express = require('express');
const { verifyToken } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

// Create Razorpay order
router.post('/order', verifyToken, catchAsync(paymentController.createOrder));

// Verify payment signature (CRITICAL security step)
router.post('/verify', verifyToken, catchAsync(paymentController.verifyPayment));

// Get payment status for a booking
router.get('/:bookingId', verifyToken, catchAsync(paymentController.getStatus));

// Process refund
router.post('/:bookingId/refund', verifyToken, catchAsync(paymentController.refund));

module.exports = router;
