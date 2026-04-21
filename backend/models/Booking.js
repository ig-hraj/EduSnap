const mongoose = require('mongoose');

// Booking Schema
const bookingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required'],
  },
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    required: [true, 'Tutor ID is required'],
  },
  studentName: String,
  tutorName: String,
  subject: {
    type: String,
    required: [true, 'Subject is required'],
  },
  sessionDate: {
    type: Date,
    required: [true, 'Session date is required'],
  },
  startTime: {
    type: String, // Format: "14:30" (24-hour)
    required: [true, 'Start time is required'],
  },
  endTime: {
    type: String, // Format: "15:30"
    required: [true, 'End time is required'],
  },
  durationMinutes: {
    type: Number,
    required: true,
  },
  hourlyRate: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['confirmed', 'completed', 'cancelled'],
    default: 'confirmed',
  },
  // Payment tracking (updated by payment verification route)
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded'],
    default: 'unpaid',
  },
  paymentId: String, // Razorpay payment ID
  notes: String, // Student notes/requirements
  cancelReason: String, // If cancelled
  rating: Number, // Tutor rating by student (0-5)
  feedback: String, // Feedback by student
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for efficient queries
bookingSchema.index({ studentId: 1, sessionDate: 1 });
bookingSchema.index({ tutorId: 1, sessionDate: 1 });
bookingSchema.index({ tutorId: 1, sessionDate: 1, status: 1 }); // For conflict detection

module.exports = mongoose.model('Booking', bookingSchema);
