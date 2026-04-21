/**
 * Payment Controller — Thin HTTP layer.
 */
const paymentService = require('../services/payment.service');

// POST /api/payments/order
exports.createOrder = async (req, res) => {
  const result = await paymentService.createOrder(req.body.bookingId, req.user.id);

  res.status(201).json({ message: 'Payment order created', ...result });
};

// POST /api/payments/verify
exports.verifyPayment = async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  const result = await paymentService.verifyPayment(orderId, paymentId, signature, req.user.id);

  res.status(200).json({ message: 'Payment verified successfully', payment: result });
};

// GET /api/payments/:bookingId
exports.getStatus = async (req, res) => {
  const result = await paymentService.getPaymentStatus(req.params.bookingId, req.user.id);

  res.status(200).json({ payment: result });
};

// POST /api/payments/:bookingId/refund
exports.refund = async (req, res) => {
  const result = await paymentService.processRefund(
    req.params.bookingId, req.user.id, req.body.reason
  );

  res.status(200).json({ message: 'Refund processed successfully', refund: result });
};
