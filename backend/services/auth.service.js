/**
 * Auth Service — Authentication business logic.
 * 
 * Handles signup, login, token generation, and user lookup.
 * No req/res — pure data in, results out.
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Student = require('../models/Student');
const Tutor = require('../models/Tutor');
const AppError = require('../utils/AppError');
const { sendEmail } = require('../config/email');

// Token expiration config
const ACCESS_TOKEN_EXPIRY = '1d';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate access token — short-lived, used for API requests.
 * Only contains id + role (NEVER include email/password/PII).
 */
function generateAccessToken(id, role) {
  // Normalize role in token
  const normalizedRole = role ? role.toLowerCase().trim() : 'unknown';
  console.debug('[AUTH] generateAccessToken():', { userId: id, role: normalizedRole });
  
  return jwt.sign({ id, role: normalizedRole, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate refresh token — long-lived, used to get new access tokens.
 */
function generateRefreshToken(id, role) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
  // Normalize role in token
  const normalizedRole = role ? role.toLowerCase().trim() : 'unknown';
  console.debug('[AUTH] generateRefreshToken():', { userId: id, role: normalizedRole });
  
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
  // Normalize role to lowercase
  const normalizedRole = role ? role.toLowerCase().trim() : 'unknown';
  console.debug('[AUTH] sanitizeUser():', { originalRole: role, normalizedRole, userId: user._id });
  
  return {
    id: user._id,
    email: user.email,
    role: normalizedRole,
    firstName: user.firstName,
    lastName: user.lastName,
    isVerified: user.isVerified || false,
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

  // [DISABLED FOR DEMO] const verificationToken = crypto.randomBytes(32).toString('hex');

  const student = await Student.create({
    email: email.toLowerCase(),
    password,
    firstName,
    lastName,
    subjects: subjects || [],
    isVerified: true, // [DISABLED FOR DEMO] was: false
    // [DISABLED FOR DEMO] verificationToken,
    // [DISABLED FOR DEMO] verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // [DISABLED FOR DEMO] Send verification email
  // sendVerificationEmail(student.email, firstName, verificationToken, 'student').catch(() => {});

  const response = generateAuthResponse(student, 'student');
  // [DISABLED FOR DEMO] response.verificationRequired = true;
  return response;
}

async function signupTutor({ email, password, firstName, lastName, subjects, hourlyRate, bio }) {
  const existing = await Tutor.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('Email already registered', 400);

  // [DISABLED FOR DEMO] const verificationToken = crypto.randomBytes(32).toString('hex');

  const tutor = await Tutor.create({
    email: email.toLowerCase(),
    password,
    firstName,
    lastName,
    subjects: subjects || [],
    hourlyRate,
    bio: bio || '',
    availability: {},
    isVerified: true, // [DISABLED FOR DEMO] was: false
    // [DISABLED FOR DEMO] verificationToken,
    // [DISABLED FOR DEMO] verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // [DISABLED FOR DEMO] Send verification email
  // sendVerificationEmail(tutor.email, firstName, verificationToken, 'tutor').catch(() => {});

  const response = generateAuthResponse(tutor, 'tutor');
  // [DISABLED FOR DEMO] response.verificationRequired = true;
  return response;
}

// ========== LOGIN ==========

async function loginStudent({ email, password }) {
  // Always use same error message to prevent user enumeration
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

  // Verify user still exists
  const Model = decoded.role === 'student' ? Student : Tutor;
  const user = await Model.findById(decoded.id);
  if (!user) throw new AppError('User no longer exists', 401);

  // Issue new access token (but NOT a new refresh token — rotation on login only)
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

// ========== EMAIL VERIFICATION ==========

/**
 * Verify a user's email via their verification token.
 */
async function verifyEmail(token, role) {
  if (!token || !role) throw new AppError('Token and role are required', 400);

  const Model = role === 'student' ? Student : Tutor;
  const user = await Model.findOne({
    verificationToken: token,
    verificationTokenExpiry: { $gt: new Date() },
  });

  if (!user) throw new AppError('Invalid or expired verification token', 400);

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  return { email: user.email, firstName: user.firstName };
}

/**
 * Resend verification email.
 */
async function resendVerification(userId, role) {
  const Model = role === 'student' ? Student : Tutor;
  const user = await Model.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (user.isVerified) throw new AppError('Email already verified', 400);

  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.verificationToken = verificationToken;
  user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  await sendVerificationEmail(user.email, user.firstName, verificationToken, role);
  return { message: 'Verification email sent' };
}

/**
 * Send verification email — falls back to console log if email service fails.
 */
async function sendVerificationEmail(email, firstName, token, role) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
  const verifyUrl = `${baseUrl}/pages/verify-email.html?token=${token}&role=${role}`;

  // Always log to console as fallback
  console.log(`\n📧 Verification link for ${email}: ${verifyUrl}\n`);

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#fff;border-radius:10px;">
      <div style="background:linear-gradient(135deg,#5BD1D7,#4AB8BE);color:#fff;padding:25px;border-radius:8px;text-align:center;">
        <h1 style="margin:0;">📚 Welcome to EduSnap!</h1>
      </div>
      <div style="padding:25px 0;">
        <p>Hi <strong>${firstName}</strong>,</p>
        <p>Thank you for signing up! Please verify your email to unlock all features:</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${verifyUrl}" style="background:linear-gradient(135deg,#5BD1D7,#4AB8BE);color:#fff;padding:14px 35px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px;">Verify My Email</a>
        </div>
        <p style="color:#666;font-size:13px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
        <p>— The EduSnap Team</p>
      </div>
    </div>
  `;

  await sendEmail(email, '📚 Verify Your Email - EduSnap', html);
}
// ========== UPDATE PROFILE ==========

async function updateProfile(userId, role, updates) {
  const Model = role === 'student' ? Student : Tutor;
  const allowedFields = ['firstName', 'lastName'];

  // Tutors can also update these fields
  if (role === 'tutor') {
    allowedFields.push('bio', 'subjects', 'hourlyRate');
  }

  // Filter to only allowed fields
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
  verifyEmail,
  resendVerification,
};
