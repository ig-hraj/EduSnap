/**
 * Booking Service — Pure business logic.
 * 
 * No req/res objects here. Takes plain data, returns results or throws AppError.
 * This makes the logic testable without HTTP.
 */
const Booking = require('../models/Booking');
const Tutor = require('../models/Tutor');
const Student = require('../models/Student');
const AppError = require('../utils/AppError');
const { sendEmail, bookingConfirmationEmail, cancellationEmail, feedbackReceivedEmail } = require('../config/email');

// ========== HELPERS ==========

/**
 * Convert "HH:MM" string to total minutes since midnight.
 */
function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Check if two time ranges overlap.
 * Two intervals [s1,e1) and [s2,e2) overlap if s1 < e2 AND e1 > s2.
 */
function hasTimeOverlap(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
}

// ========== SERVICE METHODS ==========

/**
 * Create a new booking.
 * 
 * @param {string} studentId - Authenticated student's ID
 * @param {Object} data - { tutorId, subject, sessionDate, startTime, endTime, notes }
 * @returns {Object} Created booking document
 * @throws {AppError} On validation failure, conflict, or not found
 */
async function createBooking(studentId, data) {
  const { tutorId, subject, sessionDate, startTime, endTime, notes } = data;

  // 1. Fetch tutor + student (parallel for speed)
  const [tutor, student] = await Promise.all([
    Tutor.findById(tutorId),
    Student.findById(studentId),
  ]);

  if (!tutor) throw new AppError('Tutor not found', 404);
  if (!student) throw new AppError('Student not found', 404);

  // 2. Calculate duration and price
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const durationMinutes = endMin - startMin;

  if (durationMinutes <= 0) throw new AppError('End time must be after start time', 400);
  if (durationMinutes > 480) throw new AppError('Session cannot exceed 8 hours', 400);

  const durationHours = durationMinutes / 60;
  const totalPrice = tutor.hourlyRate * durationHours;

  // 3. Check for time conflicts (numeric comparison — no string issues)
  const sameDayBookings = await Booking.find({
    tutorId,
    sessionDate: new Date(sessionDate),
    status: { $in: ['confirmed', 'completed'] },
  });

  const hasConflict = sameDayBookings.some(existing => {
    const existingStart = timeToMinutes(existing.startTime);
    const existingEnd = timeToMinutes(existing.endTime);
    return hasTimeOverlap(startMin, endMin, existingStart, existingEnd);
  });

  if (hasConflict) {
    throw new AppError('Tutor is not available at this time. Please choose a different slot.', 400);
  }

  // 4. Create and save booking
  const booking = await Booking.create({
    studentId,
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

  // 5. Send confirmation email (non-blocking)
  const emailContent = bookingConfirmationEmail(
    booking.studentName, booking.tutorName, booking.subject,
    booking.sessionDate, booking.startTime, booking.endTime, booking.totalPrice
  );
  sendEmail(student.email, '🎓 Booking Confirmed - EduSnap', emailContent).catch(err =>
    console.log('Email send error (non-blocking):', err.message)
  );

  return booking;
}

/**
 * Get all bookings for the authenticated user.
 */
async function getMyBookings(userId, role) {
  const filter = role === 'student' ? { studentId: userId } : { tutorId: userId };
  return Booking.find(filter).sort({ sessionDate: 1 });
}

/**
 * Get upcoming confirmed bookings for a student.
 */
async function getUpcomingBookings(studentId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Booking.find({
    studentId,
    sessionDate: { $gte: today },
    status: { $in: ['confirmed', 'completed'] },
  }).sort({ sessionDate: 1 });
}

/**
 * Get a single booking by ID and verify ownership.
 */
async function getBookingById(bookingId, userId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  // Verify access: only the student or tutor involved can view
  if (booking.studentId.toString() !== userId && booking.tutorId.toString() !== userId) {
    throw new AppError('You are not authorized to view this booking', 403);
  }

  return booking;
}

/**
 * Cancel a booking and notify both parties.
 */
async function cancelBooking(bookingId, userId, reason) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  // Verify access
  if (booking.studentId.toString() !== userId && booking.tutorId.toString() !== userId) {
    throw new AppError('You are not authorized to cancel this booking', 403);
  }

  if (booking.status !== 'confirmed') {
    throw new AppError('Only confirmed bookings can be cancelled', 400);
  }

  // Update booking
  booking.status = 'cancelled';
  booking.cancelReason = reason || 'Cancelled by user';
  booking.updatedAt = Date.now();
  await booking.save();

  // Send cancellation emails (non-blocking, parallel)
  const [student, tutor] = await Promise.all([
    Student.findById(booking.studentId),
    Tutor.findById(booking.tutorId),
  ]);

  const emailPromises = [];

  if (student?.email) {
    const content = cancellationEmail(
      booking.studentName, booking.tutorName, booking.subject,
      booking.sessionDate, booking.cancelReason
    );
    emailPromises.push(
      sendEmail(student.email, '❌ Booking Cancelled - EduSnap', content)
    );
  }

  if (tutor?.email) {
    const content = cancellationEmail(
      booking.tutorName, booking.studentName, booking.subject,
      booking.sessionDate, booking.cancelReason
    );
    emailPromises.push(
      sendEmail(tutor.email, '❌ Booking Cancelled - EduSnap', content)
    );
  }

  // Fire-and-forget
  Promise.allSettled(emailPromises).catch(() => {});

  return booking;
}

/**
 * Add feedback to a completed booking and update tutor's average rating.
 */
async function addFeedback(bookingId, studentId, rating, feedbackText) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  if (booking.studentId.toString() !== studentId) {
    throw new AppError('You are not authorized to leave feedback on this booking', 403);
  }

  if (booking.status !== 'completed') {
    throw new AppError('Only completed bookings can have feedback', 400);
  }

  if (booking.rating) {
    throw new AppError('Feedback has already been submitted for this booking', 400);
  }

  // Save feedback
  booking.rating = rating;
  booking.feedback = feedbackText || '';
  booking.updatedAt = Date.now();
  await booking.save();

  // Recalculate tutor's average rating using MongoDB aggregation (more efficient)
  const ratingAgg = await Booking.aggregate([
    { $match: { tutorId: booking.tutorId, rating: { $exists: true, $ne: null } } },
    { $group: { _id: '$tutorId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  if (ratingAgg.length > 0) {
    await Tutor.updateOne(
      { _id: booking.tutorId },
      {
        ratings: parseFloat(ratingAgg[0].avgRating.toFixed(1)),
        totalReviews: ratingAgg[0].count,
      }
    );
  }

  // Send feedback email to tutor (non-blocking)
  const tutor = await Tutor.findById(booking.tutorId);
  if (tutor?.email) {
    const content = feedbackReceivedEmail(
      booking.tutorName, booking.studentName, booking.subject, rating, feedbackText
    );
    sendEmail(tutor.email, '⭐ You Received Feedback - EduSnap', content).catch(err =>
      console.log('Email send error (non-blocking):', err.message)
    );
  }

  return booking;
}

module.exports = {
  createBooking,
  getMyBookings,
  getUpcomingBookings,
  getBookingById,
  cancelBooking,
  addFeedback,
};
