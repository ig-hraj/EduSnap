/**
 * Auth Middleware — JWT verification + role guards.
 * 
 * UPGRADED from original:
 *   - Checks token type (access vs refresh)
 *   - Role-based access control via restrictTo()
 *   - Consistent AppError responses
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

    // Reject refresh tokens used as access tokens
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
 * Usage: router.get('/admin', verifyToken, restrictTo('admin'), handler)
 * 
 * @param  {...string} roles - Allowed roles ('student', 'tutor', 'admin')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Access denied. Required role: ${roles.join(' or ')}`, 403));
    }
    next();
  };
};

module.exports = { verifyToken, restrictTo };
