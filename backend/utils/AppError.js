/**
 * Custom Application Error class.
 * Sets isOperational = true so the global error handler knows
 * this is a "known" error (bad input, not found, etc.)
 * vs an unexpected crash.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
