const express = require('express');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const { verifyToken } = require('../middleware/auth');
const { createPaymentOrder, verifyPaymentSignature, fetchPaymentDetails, refundPayment } = require('../config/payment');
const { sendEmail } = require('../config/email');

const router = express.Router();

// ========== CREATE PAYMENT ORDER ==========

/**
 * Create Razorpay order for a booking
 * POST /api/payments/order
 */
router.post('/order', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Validate input
    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    // Get booking details
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user is the student
    if (booking.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Check if payment already exists for this booking
    const existingPayment = await Payment.findOne({
      bookingId,
      status: { $in: ['created', 'authorized', 'captured'] },
    });

    if (existingPayment) {
      return res.status(400).json({
        message: 'Payment order already exists for this booking',
        orderId: existingPayment.orderId,
      });
    }

    // Create Razorpay order
    const orderResult = await createPaymentOrder(
      bookingId,
      booking.totalPrice,
      `Session with ${booking.tutorName} - ${booking.subject}`,
      req.user.id
    );

    if (!orderResult.success) {
      return res.status(500).json({
        message: 'Failed to create payment order',
        error: orderResult.error,
      });
    }

    // Save payment record to database
    const payment = new Payment({
      bookingId,
      studentId: req.user.id,
      orderId: orderResult.orderId,
      amount: booking.totalPrice,
      status: 'created',
      description: `Session with ${booking.tutorName} - ${booking.subject}`,
    });

    await payment.save();

    res.status(201).json({
      message: 'Payment order created',
      orderId: orderResult.orderId,
      amount: booking.totalPrice,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== VERIFY PAYMENT ==========

/**
 * Verify Razorpay payment signature
 * POST /api/payments/verify
 */
router.post('/verify', verifyToken, async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    // Validate input
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Order ID, Payment ID, and Signature are required' });
    }

    // Verify signature
    const isSignatureValid = verifyPaymentSignature(orderId, paymentId, signature);

    if (!isSignatureValid) {
      return res.status(400).json({ message: 'Payment signature verification failed' });
    }

    // Fetch payment details from Razorpay
    const paymentDetails = await fetchPaymentDetails(paymentId);

    if (!paymentDetails.success) {
      return res.status(500).json({
        message: 'Failed to fetch payment details',
        error: paymentDetails.error,
      });
    }

    // Update payment record
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

    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    // Update booking status if payment is successful
    if (payment.status === 'captured') {
      await Booking.findByIdAndUpdate(
        payment.bookingId,
        {
          paymentStatus: 'paid',
          paymentId: paymentId,
        }
      );

      // Send payment confirmation email
      const booking = await Booking.findById(payment.bookingId);
      const Student = require('../models/Student');
      const student = await Student.findById(payment.studentId);

      if (student && student.email) {
        const emailContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; text-align: center; }
                .content { padding: 20px 0; }
                .receipt-box { background: #f9f9f9; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
                .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .label { font-weight: 600; color: #333; }
                .value { color: #666; }
                .success-badge { background: #d4edda; color: #155724; padding: 10px 15px; border-radius: 5px; text-align: center; font-weight: 600; margin: 15px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✅ Payment Successful!</h1>
                </div>
                
                <div class="content">
                  <p>Hi ${student.firstName},</p>
                  <p>Thank you for your payment. Your tutoring session is now confirmed!</p>
                  
                  <div class="success-badge">Payment Status: COMPLETED</div>
                  
                  <div class="receipt-box">
                    <div class="receipt-row">
                      <span class="label">Tutor:</span>
                      <span class="value">${booking.tutorName}</span>
                    </div>
                    <div class="receipt-row">
                      <span class="label">Subject:</span>
                      <span class="value">${booking.subject}</span>
                    </div>
                    <div class="receipt-row">
                      <span class="label">Session Date:</span>
                      <span class="value">${new Date(booking.sessionDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div class="receipt-row">
                      <span class="label">Time:</span>
                      <span class="value">${booking.startTime} - ${booking.endTime}</span>
                    </div>
                    <div class="receipt-row">
                      <span class="label">Amount Paid:</span>
                      <span class="value"><strong>₹${payment.amount.toFixed(2)}</strong></span>
                    </div>
                    <div class="receipt-row">
                      <span class="label">Transaction ID:</span>
                      <span class="value">${paymentId}</span>
                    </div>
                  </div>
                  
                  <p>You can join your session through the EduSnap platform at the scheduled time. Your tutor will be available in the chat room.</p>
                  
                  <p>Best regards,<br/><strong>The EduSnap Team</strong></p>
                </div>
                
                <div class="footer">
                  <p>© 2026 EduSnap. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `;

        sendEmail(student.email, '✅ Payment Successful - EduSnap', emailContent).catch(err =>
          console.log('Email send error (non-blocking):', err.message)
        );
      }
    }

    res.status(200).json({
      message: 'Payment verified successfully',
      payment: {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== GET PAYMENT STATUS ==========

/**
 * Get payment status for a booking
 * GET /api/payments/:bookingId
 */
router.get('/:bookingId', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Get booking to verify user is part of it
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (
      booking.studentId.toString() !== req.user.id &&
      booking.tutorId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get payment
    const payment = await Payment.findOne({ bookingId });

    if (!payment) {
      return res.status(404).json({ message: 'No payment found for this booking' });
    }

    res.status(200).json({
      payment: {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
        refundStatus: payment.refundStatus,
        refundAmount: payment.refundAmount,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== REFUND PAYMENT ==========

/**
 * Refund a payment
 * POST /api/payments/:bookingId/refund
 */
router.post('/:bookingId/refund', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    // Get booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user is the student
    if (booking.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get payment
    const payment = await Payment.findOne({ bookingId });
    if (!payment) {
      return res.status(404).json({ message: 'No payment found for this booking' });
    }

    // Check if payment can be refunded
    if (payment.status === 'failed' || payment.status === 'refunded') {
      return res.status(400).json({ message: 'This payment cannot be refunded' });
    }

    if (!payment.paymentId) {
      return res.status(400).json({ message: 'Payment not yet completed' });
    }

    // Process refund
    const refundResult = await refundPayment(
      payment.paymentId,
      payment.amount,
      reason || 'Booking cancelled'
    );

    if (!refundResult.success) {
      return res.status(500).json({
        message: 'Failed to process refund',
        error: refundResult.error,
      });
    }

    // Update payment record
    payment.refundId = refundResult.refundId;
    payment.refundStatus = 'full';
    payment.refundAmount = payment.amount;
    payment.refundReason = reason || 'Booking cancelled';
    payment.status = 'refunded';
    await payment.save();

    // Update booking
    await Booking.findByIdAndUpdate(bookingId, {
      paymentStatus: 'refunded',
    });

    res.status(200).json({
      message: 'Refund processed successfully',
      refund: {
        refundId: refundResult.refundId,
        amount: refundResult.amount,
        status: refundResult.status,
      },
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
