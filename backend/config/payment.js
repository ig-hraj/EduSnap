const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a payment order
 */
async function createPaymentOrder(bookingId, amount, description, customerId) {
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise (1 rupee = 100 paise)
      currency: 'INR',
      receipt: `booking_${bookingId}`,
      description: description,
      customer_notify: 1,
      notes: {
        bookingId: bookingId.toString(),
        customerId: customerId.toString(),
      },
    });

    console.log(`💳 Razorpay order created: ${order.id}`);
    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    };
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Verify payment signature
 */
function verifyPaymentSignature(orderId, paymentId, signature) {
  try {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attack side-channel
    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );

    if (isSignatureValid) {
      console.log(`✅ Payment signature verified: ${paymentId}`);
    } else {
      console.log(`❌ Payment signature invalid for: ${paymentId}`);
    }

    return isSignatureValid;
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 */
async function fetchPaymentDetails(paymentId) {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return {
      success: true,
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      description: payment.description,
      acquirerData: payment.acquirer_data,
    };
  } catch (error) {
    console.error('❌ Error fetching payment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Capture payment (if authorized)
 */
async function capturePayment(paymentId, amount) {
  try {
    const capture = await razorpay.payments.capture(paymentId, Math.round(amount * 100));
    console.log(`✅ Payment captured: ${paymentId}`);
    return {
      success: true,
      paymentId: capture.id,
      status: capture.status,
    };
  } catch (error) {
    console.error('❌ Error capturing payment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Refund payment
 */
async function refundPayment(paymentId, amount = null, reason = '') {
  try {
    const refundData = {
      notes: {
        reason: reason,
      },
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }

    const refund = await razorpay.payments.refund(paymentId, refundData);
    console.log(`✅ Refund created: ${refund.id}`);
    return {
      success: true,
      refundId: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount,
      status: refund.status,
    };
  } catch (error) {
    console.error('❌ Error refunding payment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  razorpay,
  createPaymentOrder,
  verifyPaymentSignature,
  fetchPaymentDetails,
  capturePayment,
  refundPayment,
};
