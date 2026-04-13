const express = require('express');
const Booking = require('../models/Booking');
const Tutor = require('../models/Tutor');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ========== CREATE BOOKING ==========

// Create new booking (students only)
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can book sessions' });
    }

    const { tutorId, subject, sessionDate, startTime, endTime, notes } = req.body;

    // Validate input
    if (!tutorId || !subject || !sessionDate || !startTime || !endTime) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Get tutor info
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    // Get student info
    const Student = require('../models/Student');
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Calculate duration (in minutes)
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    const durationMinutes = endTotalMin - startTotalMin;

    if (durationMinutes <= 0) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Calculate total price
    const durationHours = durationMinutes / 60;
    const totalPrice = tutor.hourlyRate * durationHours;

    // Check for conflicting bookings (optional - for advanced features)
    const existingBooking = await Booking.findOne({
      tutorId,
      sessionDate: new Date(sessionDate),
      status: { $in: ['confirmed', 'completed'] },
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
      ],
    });

    if (existingBooking) {
      return res.status(400).json({ message: 'Tutor is not available at this time' });
    }

    // Create booking
    const booking = new Booking({
      studentId: req.user.id,
      tutorId,
      studentName: `${student.firstName} ${student.lastName}`,
      tutorName: `${tutor.firstName} ${tutor.lastName}`,
      subject,
      sessionDate: new Date(sessionDate),
      startTime,
      endTime,
      durationMinutes,
      hourlyRate: tutor.hourlyRate,
      totalPrice,
      notes: notes || '',
      status: 'confirmed',
    });

    await booking.save();

    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: booking._id,
        tutorName: booking.tutorName,
        subject: booking.subject,
        sessionDate: booking.sessionDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        totalPrice: booking.totalPrice,
        status: booking.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== GET BOOKINGS ==========

// Get student's bookings
router.get('/my-bookings', verifyToken, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'student') {
      filter.studentId = req.user.id;
    } else if (req.user.role === 'tutor') {
      filter.tutorId = req.user.id;
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const bookings = await Booking.find(filter).sort({ sessionDate: 1 });

    res.status(200).json({
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get upcoming bookings for student
router.get('/upcoming', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can view this' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = await Booking.find({
      studentId: req.user.id,
      sessionDate: { $gte: today },
      status: { $in: ['confirmed', 'completed'] },
    }).sort({ sessionDate: 1 });

    res.status(200).json({
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get specific booking
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user owns this booking
    if (
      booking.studentId.toString() !== req.user.id &&
      booking.tutorId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.status(200).json({ booking });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== CANCEL BOOKING ==========

// Cancel booking (student or tutor)
router.put('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user owns this booking
    if (
      booking.studentId.toString() !== req.user.id &&
      booking.tutorId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Only confirmed bookings can be cancelled
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: 'Only confirmed bookings can be cancelled' });
    }

    booking.status = 'cancelled';
    booking.cancelReason = reason || 'Cancelled by user';
    await booking.save();

    res.status(200).json({
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== ADD FEEDBACK ==========

// Add feedback to completed booking (students only)
router.put('/:id/feedback', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can leave feedback' });
    }

    const { rating, feedback } = req.body;

    if (!rating || rating < 0 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 0 and 5' });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify student owns this booking
    if (booking.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Only completed bookings can have feedback
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Only completed bookings can have feedback' });
    }

    booking.rating = rating;
    booking.feedback = feedback || '';
    await booking.save();

    // Update tutor's average rating
    const allFeedback = await Booking.find({
      tutorId: booking.tutorId,
      rating: { $exists: true },
    });

    if (allFeedback.length > 0) {
      const avgRating = allFeedback.reduce((sum, b) => sum + (b.rating || 0), 0) / allFeedback.length;
      await Tutor.updateOne(
        { _id: booking.tutorId },
        {
          ratings: parseFloat(avgRating.toFixed(1)),
          totalReviews: allFeedback.length,
        }
      );
    }

    res.status(200).json({
      message: 'Feedback added successfully',
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
