/**
 * Booking Validation Schemas (Joi)
 * 
 * These run BEFORE the controller — if validation fails,
 * the request never reaches business logic.
 */
const Joi = require('joi');

// Reusable: HH:MM time format (00:00 – 23:59)
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ========== SCHEMAS ==========

const createBookingSchema = Joi.object({
  tutorId: Joi.string().hex().length(24).required()
    .messages({ 'string.length': 'Invalid tutor ID format' }),
  subject: Joi.string().trim().min(1).max(100).required()
    .messages({ 'string.empty': 'Subject is required' }),
  sessionDate: Joi.date().iso().min('now').required()
    .messages({ 'date.min': 'Session date must be in the future' }),
  startTime: Joi.string().pattern(timePattern).required()
    .messages({ 'string.pattern.base': 'Start time must be HH:MM format (00:00-23:59)' }),
  endTime: Joi.string().pattern(timePattern).required()
    .messages({ 'string.pattern.base': 'End time must be HH:MM format (00:00-23:59)' }),
  notes: Joi.string().trim().max(500).allow('').default(''),
});

const cancelBookingSchema = Joi.object({
  reason: Joi.string().trim().max(300).allow('').default('Cancelled by user'),
});

const feedbackSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required()
    .messages({ 'number.min': 'Rating must be at least 1', 'number.max': 'Rating cannot exceed 5' }),
  feedback: Joi.string().trim().max(1000).allow('').default(''),
});

// ========== MIDDLEWARE FACTORY ==========

/**
 * Creates Express middleware that validates req.body against a Joi schema.
 * If invalid, returns 400 with the first error message.
 * If valid, replaces req.body with the sanitized/trimmed values.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: true,      // Stop at first error
      stripUnknown: true,    // Remove fields not in schema
    });

    if (error) {
      const message = error.details[0].message.replace(/"/g, '');
      return res.status(400).json({ message });
    }

    req.body = value; // Use sanitized data
    next();
  };
}

module.exports = {
  validateCreateBooking: validate(createBookingSchema),
  validateCancelBooking: validate(cancelBookingSchema),
  validateFeedback: validate(feedbackSchema),
};
