/**
 * Payment Service — Razorpay business logic.
 * 
 * Handles order creation, signature verification, status lookup, and refunds.
 * Key security rules:
 *   1. NEVER trust frontend-supplied amounts — always fetch from DB
 *   2. Signature verification is MANDATORY before marking as paid
 *   3. Idempotency: reject duplicate payment orders for same booking
 *   4. Only the booking's student can pay/refund
 */
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Student = require('../models/Student');
const AppError = require('../utils/AppError');
const {
  createPaymentOrder: createRazorpayOrder,
  verifyPaymentSignature,
  fetchPaymentDetails,
  refundPayment: processRazorpayRefund,
} = require('../config/payment');
const { sendEmail } = require('../config/email');

/**
 * Verify the user is the student who owns this booking.
 */
async function verifyPaymentAccess(bookingId, userId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.studentId.toString() !== userId) {
    throw new AppError('Only the student who booked can manage payment', 403);
  }
  return booking;
}

/**
 * Create a Razorpay order for a booking.
 * 
 * Security: Amount comes from DB (booking.totalPrice), NOT from frontend.
 * Idempotency: Rejects if a pending/completed payment already exists.
 */
async function createOrder(bookingId, userId) {
  const booking = await verifyPaymentAccess(bookingId, userId);

  // Only allow payment for tutor-accepted bookings
  if (booking.status !== 'accepted') {
    throw new AppError(
      booking.status === 'pending'
        ? 'Session not approved yet. Please wait for tutor to accept.'
        : `Cannot pay for a ${booking.status} booking.`,
      400
    );
  }

  // Idempotency check — prevent duplicate payment orders
  const existingPayment = await Payment.findOne({
    bookingId,
    status: { $in: ['created', 'authorized', 'captured'] },
  });

  if (existingPayment) {
    throw new AppError('A payment order already exists for this booking', 400);
  }

  // Amount from DB — NEVER trust frontend
  const amount = booking.totalPrice;
  const description = `Session with ${booking.tutorName} - ${booking.subject}`;

  console.log('[PAYMENT_SERVICE] Creating order for booking:', {
    bookingId: booking._id,
    tutorName: booking.tutorName,
    amount,
    description,
  });

  // Create Razorpay order
  const orderResult = await createRazorpayOrder(bookingId, amount, description, userId);

  if (!orderResult.success) {
    const errorMsg = orderResult.error || 'Razorpay API error - check backend logs';
    console.error('[PAYMENT_SERVICE] Order creation failed:', { 
      error: errorMsg, 
      bookingId,
      orderResult 
    });
    throw new AppError(errorMsg, 500);
  }

  console.log('[PAYMENT_SERVICE] Order created successfully:', {
    orderId: orderResult.orderId,
    amount: orderResult.amount,
  });

  // Save payment record
  await Payment.create({
    bookingId,
    studentId: userId,
    orderId: orderResult.orderId,
    amount,
    status: 'created',
    description,
  });

  return {
    orderId: orderResult.orderId,
    amount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
  };
}

/**
 * Verify Razorpay payment signature and finalize payment.
 * 
 * This is the CRITICAL security step — signature proves Razorpay actually
 * processed the payment. Without this, anyone could fake a success response.
 */
async function verifyPayment(orderId, paymentId, signature, userId) {
  if (!orderId || !paymentId || !signature) {
    throw new AppError('Order ID, Payment ID, and Signature are all required', 400);
  }

  // Step 1: Verify cryptographic signature
  const isValid = verifyPaymentSignature(orderId, paymentId, signature);
  if (!isValid) {
    throw new AppError('Payment signature verification failed. Payment not authorized.', 400);
  }

  // Step 2: Fetch actual payment status from Razorpay (don't trust client)
  const paymentDetails = await fetchPaymentDetails(paymentId);
  if (!paymentDetails.success) {
    throw new AppError('Failed to verify payment with Razorpay', 500);
  }

  // Step 3: Update payment record
  const payment = await Payment.findOneAndUpdate(
    { orderId },
    {
      paymentId,
      status: paymentDetails.status === 'captured' ? 'captured' : 'authorized',
      method: paymentDetails.method,
      paymentSignature: signature,
    },
    { new: true }
  );

  if (!payment) throw new AppError('Payment record not found for this order', 404);

  // Step 4: Verify the user owns this payment
  if (payment.studentId.toString() !== userId) {
    throw new AppError('You cannot verify someone else\'s payment', 403);
  }

  // Step 5: Update booking payment status
  if (payment.status === 'captured') {
    await Booking.findByIdAndUpdate(payment.bookingId, {
      paymentStatus: 'paid',
      paymentId,
    });

    // Send confirmation email (non-blocking)
    sendPaymentConfirmationEmail(payment).catch(() => {});
  }

  return {
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    amount: payment.amount,
    status: payment.status,
    method: payment.method,
  };
}

/**
 * Get payment status for a booking.
 */
async function getPaymentStatus(bookingId, userId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  // Both student and tutor can view payment status
  if (booking.studentId.toString() !== userId && booking.tutorId.toString() !== userId) {
    throw new AppError('Unauthorized', 403);
  }

  const payment = await Payment.findOne({ bookingId });
  if (!payment) throw new AppError('No payment found for this booking', 404);

  return {
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    amount: payment.amount,
    status: payment.status,
    method: payment.method,
    refundStatus: payment.refundStatus,
    refundAmount: payment.refundAmount,
    createdAt: payment.createdAt,
  };
}

/**
 * Process a refund for a booking's payment.
 */
async function processRefund(bookingId, userId, reason) {
  await verifyPaymentAccess(bookingId, userId);

  const payment = await Payment.findOne({ bookingId });
  if (!payment) throw new AppError('No payment found for this booking', 404);

  if (payment.status === 'failed' || payment.status === 'refunded') {
    throw new AppError('This payment cannot be refunded', 400);
  }

  if (!payment.paymentId) {
    throw new AppError('Payment not yet completed — nothing to refund', 400);
  }

  // Process refund via Razorpay
  const refundResult = await processRazorpayRefund(
    payment.paymentId,
    payment.amount,
    reason || 'Booking cancelled'
  );

  if (!refundResult.success) {
    throw new AppError('Refund failed: ' + refundResult.error, 500);
  }

  // Update payment record
  payment.refundId = refundResult.refundId;
  payment.refundStatus = 'full';
  payment.refundAmount = payment.amount;
  payment.refundReason = reason || 'Booking cancelled';
  payment.status = 'refunded';
  await payment.save();

  // Update booking
  await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'refunded' });

  return {
    refundId: refundResult.refundId,
    amount: refundResult.amount,
    status: refundResult.status,
  };
}

/**
 * Send payment confirmation email (fire-and-forget).
 */
async function sendPaymentConfirmationEmail(payment) {
  const booking = await Booking.findById(payment.bookingId);
  const student = await Student.findById(payment.studentId);
  if (!student?.email || !booking) return;

  const emailContent = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#fff;border-radius:10px;">
      <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:20px;border-radius:5px;text-align:center;">
        <h1>✅ Payment Successful!</h1>
      </div>
      <p>Hi ${student.firstName},</p>
      <p>Your payment of <strong>₹${payment.amount.toFixed(2)}</strong> for <strong>${booking.subject}</strong> with <strong>${booking.tutorName}</strong> has been confirmed.</p>
      <p><strong>Transaction ID:</strong> ${payment.paymentId}</p>
      <p><strong>Session:</strong> ${new Date(booking.sessionDate).toLocaleDateString()} at ${booking.startTime}</p>
      <p>— The EduSnap Team</p>
    </div>
  `;

  await sendEmail(student.email, '✅ Payment Successful - EduSnap', emailContent);
}

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  processRefund,
};
