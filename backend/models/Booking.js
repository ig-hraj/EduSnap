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
    enum: ['pending', 'accepted', 'confirmed', 'completed', 'cancelled', 'rejected'],
    default: 'pending',
  },
  // Payment tracking (updated by payment verification route)
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded'],
    default: 'unpaid',
  },
  paymentId: String, // Razorpay payment ID
  // Earnings breakdown (calculated after payment capture)
  platformFee: { type: Number, default: 0 },       // 10% platform cut
  tutorEarnings: { type: Number, default: 0 },      // 90% tutor payout
  payoutStatus: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending',
  },
  notes: String, // Student notes/requirements
  cancelReason: String, // If cancelled
  rejectionReason: String, // If rejected by tutor
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
