/**
 * Auth Service - Authentication business logic.
 *
 * Handles signup, login, token generation, and user lookup.
 * No req/res - pure data in, results out.
 */
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Tutor = require('../models/Tutor');
const AppError = require('../utils/AppError');

// Token expiration config
const ACCESS_TOKEN_EXPIRY = '1d';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate access token - short-lived, used for API requests.
 * Only contains id + role (never include email/password/PII).
 */
function generateAccessToken(id, role) {
  const normalizedRole = role ? role.toLowerCase().trim() : 'unknown';

  return jwt.sign({ id, role: normalizedRole, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate refresh token - long-lived, used to get new access tokens.
 */
function generateRefreshToken(id, role) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
  const normalizedRole = role ? role.toLowerCase().trim() : 'unknown';

  return jwt.sign({ id, role: normalizedRole, type: 'refresh' }, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify a refresh token and return decoded payload.
 */
function verifyRefreshToken(token) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.type !== 'refresh') throw new Error();
    return decoded;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
}

/**
 * Format user object for API response (strip sensitive fields).
 */
function sanitizeUser(user, role) {
  const normalizedRole = role ? role.toLowerCase().trim() : 'unknown';

  return {
    id: user._id,
    email: user.email,
    role: normalizedRole,
    firstName: user.firstName,
    lastName: user.lastName,
    isVerified: true,
  };
}

/**
 * Generate both tokens + sanitized user object.
 */
function generateAuthResponse(user, role) {
  return {
    token: generateAccessToken(user._id, role),
    refreshToken: generateRefreshToken(user._id, role),
    user: sanitizeUser(user, role),
  };
}

// ========== SIGNUP ==========

async function signupStudent({ email, password, firstName, lastName, subjects }) {
  const existing = await Student.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('Email already registered', 400);

  const student = await Student.create({
    email: email.toLowerCase(),
    password,
    firstName,
    lastName,
    subjects: subjects || [],
    isVerified: true,
  });

  return generateAuthResponse(student, 'student');
}

async function signupTutor({ email, password, firstName, lastName, subjects, hourlyRate, bio }) {
  const existing = await Tutor.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('Email already registered', 400);

  const tutor = await Tutor.create({
    email: email.toLowerCase(),
    password,
    firstName,
    lastName,
    subjects: subjects || [],
    hourlyRate,
    bio: bio || '',
    availability: {},
    isVerified: true,
  });

  return generateAuthResponse(tutor, 'tutor');
}

// ========== LOGIN ==========

async function loginStudent({ email, password }) {
  const errorMsg = 'Invalid email or password';

  const student = await Student.findOne({ email: email.toLowerCase() }).select('+password');
  if (!student) throw new AppError(errorMsg, 401);

  const isValid = await student.matchPassword(password);
  if (!isValid) throw new AppError(errorMsg, 401);

  return generateAuthResponse(student, 'student');
}

async function loginTutor({ email, password }) {
  const errorMsg = 'Invalid email or password';

  const tutor = await Tutor.findOne({ email: email.toLowerCase() }).select('+password');
  if (!tutor) throw new AppError(errorMsg, 401);

  const isValid = await tutor.matchPassword(password);
  if (!isValid) throw new AppError(errorMsg, 401);

  return generateAuthResponse(tutor, 'tutor');
}

// ========== TOKEN REFRESH ==========

async function refreshAccessToken(refreshToken) {
  const decoded = verifyRefreshToken(refreshToken);

  const Model = decoded.role === 'student' ? Student : Tutor;
  const user = await Model.findById(decoded.id);
  if (!user) throw new AppError('User no longer exists', 401);

  return {
    token: generateAccessToken(user._id, decoded.role),
    user: sanitizeUser(user, decoded.role),
  };
}

// ========== GET CURRENT USER ==========

async function getCurrentUser(userId, role) {
  const Model = role === 'student' ? Student : Tutor;
  const user = await Model.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  return sanitizeUser(user, role);
}

// ========== UPDATE PROFILE ==========

async function updateProfile(userId, role, updates) {
  const Model = role === 'student' ? Student : Tutor;
  const allowedFields = ['firstName', 'lastName'];

  if (role === 'tutor') {
    allowedFields.push('bio', 'subjects', 'hourlyRate');
  }

  const sanitized = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      sanitized[key] = updates[key];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  const user = await Model.findByIdAndUpdate(userId, sanitized, {
    new: true,
    runValidators: true,
  });

  if (!user) throw new AppError('User not found', 404);

  return sanitizeUser(user, role);
}

module.exports = {
  signupStudent,
  signupTutor,
  loginStudent,
  loginTutor,
  refreshAccessToken,
  getCurrentUser,
  generateAccessToken,
  updateProfile,
};
