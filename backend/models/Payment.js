const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentId: {
      type: String,
      sparse: true, // Optional until payment is completed
      unique: true,
    },
    amount: {
      type: Number,
      required: true, // In INR
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'created',
    },
    method: {
      type: String,
      enum: ['card', 'netbanking', 'wallet', 'upi', 'emandate', 'cardless_emi'],
      sparse: true,
    },
    paymentSignature: {
      type: String,
      sparse: true,
    },
    description: {
      type: String,
    },
    // Refund details
    refundId: {
      type: String,
      sparse: true,
    },
    refundStatus: {
      type: String,
      enum: ['none', 'partial', 'full'],
      default: 'none',
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundReason: String,
    
    // Error handling
    errorCode: String,
    errorDescription: String,
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
paymentSchema.index({ bookingId: 1, createdAt: -1 });
paymentSchema.index({ studentId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
