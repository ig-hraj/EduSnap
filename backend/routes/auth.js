/**
 * Auth Routes — Clean API layer.
 * 
 * BEFORE: 230 lines of mixed validation, DB queries, token generation
 * AFTER:  30 lines. Clean pipelines.
 */
const express = require('express');
const { verifyToken } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const authController = require('../controllers/auth.controller');
const {
  validateStudentSignup,
  validateTutorSignup,
  validateLogin,
  validateRefresh,
} = require('../validators/auth.validator');

const router = express.Router();

// Student auth
router.post('/student/signup', validateStudentSignup, catchAsync(authController.studentSignup));
router.post('/student/login',  validateLogin, catchAsync(authController.studentLogin));

// Tutor auth
router.post('/tutor/signup',   validateTutorSignup, catchAsync(authController.tutorSignup));
router.post('/tutor/login',    validateLogin, catchAsync(authController.tutorLogin));

// Token refresh (no auth required — uses refresh token in body)
router.post('/refresh',        validateRefresh, catchAsync(authController.refreshToken));

// Protected: get current user
router.get('/me',              verifyToken, catchAsync(authController.getMe));

module.exports = router;
