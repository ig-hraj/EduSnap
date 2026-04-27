/**
 * Auth Middleware - JWT verification + role guards.
 */
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

/**
 * Verify JWT access token and attach user info to req.user.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided. Please log in.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'refresh') {
      return next(new AppError('Cannot use refresh token for API access', 401));
    }

    req.user = decoded; // { id, role, type, iat, exp }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please refresh or log in again.', 401));
    }
    return next(new AppError('Invalid token', 401));
  }
};

/**
 * Restrict route to specific roles.
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user.role ? req.user.role.toLowerCase().trim() : null;
    const allowedRoles = roles.map((r) => r.toLowerCase());

    if (!allowedRoles.includes(userRole)) {
      const msg = `Access denied. Required role: ${roles.join(' or ')}, but got: "${req.user.role}"`;
      return next(new AppError(msg, 403));
    }

    next();
  };
};

module.exports = { verifyToken, restrictTo };
