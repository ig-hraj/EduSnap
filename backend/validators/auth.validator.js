/**
 * Auth Validation Schemas (Joi).
 */
const Joi = require('joi');

const passwordRules = Joi.string().min(8).max(128).required().messages({
  'string.min': 'Password must be at least 8 characters',
  'string.max': 'Password cannot exceed 128 characters',
});

const studentSignupSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: passwordRules,
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  subjects: Joi.array().items(Joi.string().trim().max(50)).max(20).default([]),
});

const tutorSignupSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: passwordRules,
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  subjects: Joi.array().items(Joi.string().trim().max(50)).max(20).default([]),
  hourlyRate: Joi.number().min(1).max(50000).required()
    .messages({ 'number.min': 'Hourly rate must be at least 1' }),
  bio: Joi.string().trim().max(1000).allow('').default(''),
});

const loginSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// Middleware factory
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ message: error.details[0].message.replace(/"/g, '') });
    }
    req.body = value;
    next();
  };
}

module.exports = {
  validateStudentSignup: validate(studentSignupSchema),
  validateTutorSignup: validate(tutorSignupSchema),
  validateLogin: validate(loginSchema),
  validateRefresh: validate(refreshSchema),
};
