/**
 * Auth Controller — Thin HTTP layer.
 */
const authService = require('../services/auth.service');

exports.studentSignup = async (req, res) => {
  const result = await authService.signupStudent(req.body);
  res.status(201).json({ message: 'Student registered successfully!', ...result });
};

exports.tutorSignup = async (req, res) => {
  const result = await authService.signupTutor(req.body);
  res.status(201).json({ message: 'Tutor registered successfully!', ...result });
};

exports.studentLogin = async (req, res) => {
  const result = await authService.loginStudent(req.body);
  res.status(200).json({ message: 'Login successful', ...result });
};

exports.tutorLogin = async (req, res) => {
  const result = await authService.loginTutor(req.body);
  res.status(200).json({ message: 'Login successful', ...result });
};

exports.refreshToken = async (req, res) => {
  const result = await authService.refreshAccessToken(req.body.refreshToken);
  res.status(200).json({ message: 'Token refreshed', ...result });
};

exports.getMe = async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id, req.user.role);
  res.status(200).json({ user });
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.user.role, req.body);
  res.status(200).json({ message: 'Profile updated successfully', user });
};

// GET /api/auth/verify-email?token=...&role=...
// [DISABLED FOR DEMO] — returns disabled message
exports.verifyEmail = async (req, res) => {
  // const result = await authService.verifyEmail(req.query.token, req.query.role);
  res.status(200).json({ message: 'Email verification is currently disabled. Your account is already active.' });
};

// POST /api/auth/resend-verification
exports.resendVerification = async (req, res) => {
  const result = await authService.resendVerification(req.user.id, req.user.role);
  res.status(200).json(result);
};
