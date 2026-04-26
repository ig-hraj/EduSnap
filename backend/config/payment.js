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
    // Validate inputs
    if (!bookingId || !amount || !description) {
      throw new Error(`Invalid payment inputs: bookingId=${bookingId}, amount=${amount}, description=${description}`);
    }

    console.log('[RAZORPAY] Creating order:', {
      bookingId,
      amount,
      amountInPaise: Math.round(amount * 100),
      currency: 'INR',
      receipt: `booking_${bookingId}`,
    });

    // Check credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Missing Razorpay credentials in environment variables');
    }

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

    console.log(`✅ Razorpay order created successfully: ${order.id}`);
    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    };
  } catch (error) {
    try {
      // Handle different error types - be defensive about error being undefined
      let errorMessage = 'Unknown error';
      
      if (!error) {
        errorMessage = 'Razorpay API returned no error details';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.message && typeof error.message === 'string') {
        errorMessage = error.message.trim();
      } else if (error.description && typeof error.description === 'string') {
        errorMessage = error.description.trim();
      } else if (error.code && typeof error.code === 'string') {
        errorMessage = `Razorpay error: ${error.code}`;
      } else if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else {
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch {
          errorMessage = `Unable to parse error: ${error}`;
        }
      }

      // Ensure errorMessage is never empty
      if (!errorMessage || errorMessage.trim() === '') {
        errorMessage = 'Payment order creation failed - no error message available';
      }

      const errorDetails = {
        message: errorMessage,
        statusCode: error?.statusCode || 'N/A',
        code: error?.code || 'N/A',
        type: error?.constructor?.name || 'Unknown',
      };

      console.error('❌ Error creating Razorpay order:', errorDetails);
      
      return {
        success: false,
        error: errorMessage,
      };
    } catch (innerError) {
      // If error processing itself fails, return generic message
      console.error('❌ Error handler crashed:', innerError);
      return {
        success: false,
        error: 'Payment order creation failed - check server logs',
      };
    }
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
