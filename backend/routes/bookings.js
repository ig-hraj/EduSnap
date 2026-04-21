/**
 * Booking Routes — Clean API layer.
 *
 * Each route is a pipeline:  auth → validate → controller
 * 
 * BEFORE (old monolithic routes/bookings.js):
 *   - 360 lines of mixed validation, DB queries, email logic, error handling
 *   - Everything in massive try/catch blocks
 *   - Inline require() calls
 *   - Duplicated auth checks
 *
 * AFTER (this file):
 *   - 35 lines. Each route is one readable line.
 *   - Validation: validators/booking.validator.js (Joi schemas)
 *   - Logic: services/booking.service.js (pure business logic)
 *   - HTTP: controllers/booking.controller.js (thin req→service→res)
 *   - Errors: utils/catchAsync.js (auto-forwards to global handler)
 */
const express = require('express');
const { verifyToken, restrictTo } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const bookingController = require('../controllers/booking.controller');
const {
  validateCreateBooking,
  validateCancelBooking,
  validateFeedback,
} = require('../validators/booking.validator');

const router = express.Router();

// ========== ROUTES ==========

// Create booking (students only)
router.post('/',      verifyToken, restrictTo('student'), validateCreateBooking, catchAsync(bookingController.create));

// Get current user's bookings
router.get('/my-bookings', verifyToken, catchAsync(bookingController.getMyBookings));

// Get upcoming bookings (students)
router.get('/upcoming',    verifyToken, restrictTo('student'), catchAsync(bookingController.getUpcoming));

// Get single booking by ID
router.get('/:id',         verifyToken, catchAsync(bookingController.getById));

// Cancel a booking
router.put('/:id/cancel',  verifyToken, validateCancelBooking, catchAsync(bookingController.cancel));

// Add feedback (students only)
router.put('/:id/feedback', verifyToken, restrictTo('student'), validateFeedback, catchAsync(bookingController.addFeedback));

module.exports = router;
