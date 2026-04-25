/**
 * Booking Controller — Thin HTTP layer.
 * 
 * Each method:
 *   1. Extracts data from req (params, body, user)
 *   2. Calls the service
 *   3. Sends the response
 * 
 * NO business logic here. If you're writing an if-statement
 * that isn't about HTTP, it belongs in the service.
 */
const bookingService = require('../services/booking.service');

// POST /api/bookings
exports.create = async (req, res) => {
  const booking = await bookingService.createBooking(req.user.id, req.body);

  res.status(201).json({
    message: 'Booking created successfully',
    booking: {
      id: booking._id,
      tutorId: booking.tutorId,
      tutorName: booking.tutorName,
      studentName: booking.studentName,
      subject: booking.subject,
      sessionDate: booking.sessionDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalPrice: booking.totalPrice,
      status: booking.status,
    },
  });
};

// GET /api/bookings/my-bookings
exports.getMyBookings = async (req, res) => {
  const bookings = await bookingService.getMyBookings(req.user.id, req.user.role);

  res.status(200).json({
    count: bookings.length,
    bookings,
  });
};

// GET /api/bookings/upcoming
exports.getUpcoming = async (req, res) => {
  const bookings = await bookingService.getUpcomingBookings(req.user.id);

  res.status(200).json({
    count: bookings.length,
    bookings,
  });
};

// GET /api/bookings/:id
exports.getById = async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user.id);

  res.status(200).json({ booking });
};

// PUT /api/bookings/:id/cancel
exports.cancel = async (req, res) => {
  const booking = await bookingService.cancelBooking(
    req.params.id,
    req.user.id,
    req.body.reason
  );

  res.status(200).json({
    message: 'Booking cancelled successfully',
    booking,
  });
};

// PUT /api/bookings/:id/feedback
exports.addFeedback = async (req, res) => {
  const booking = await bookingService.addFeedback(
    req.params.id,
    req.user.id,
    req.body.rating,
    req.body.feedback
  );

  res.status(200).json({
    message: 'Feedback added successfully',
    booking,
  });
};

// GET /api/bookings/dashboard-stats
exports.getDashboardStats = async (req, res) => {
  const stats = await bookingService.getDashboardStats(req.user.id, req.user.role);
  res.status(200).json({ stats });
};

// GET /api/bookings/reviews/:tutorId
exports.getReviews = async (req, res) => {
  const reviews = await bookingService.getReviewsForTutor(req.params.tutorId);
  res.status(200).json({ count: reviews.length, reviews });
};

// GET /api/bookings/my-students
exports.getMyStudents = async (req, res) => {
  const students = await bookingService.getStudentsByTutor(req.user.id);
  res.status(200).json({ count: students.length, students });
};
