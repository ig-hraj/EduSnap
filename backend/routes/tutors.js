/**
 * Tutor Routes — Clean API layer.
 *
 * BEFORE: 173 lines with inline filters, validation, DB queries
 * AFTER:  30 lines. Clean pipelines.
 * 
 * Note: search/:subject MUST come before /:id to avoid
 * Express matching "search" as an :id parameter.
 */
const express = require('express');
const { verifyToken, restrictTo } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const tutorController = require('../controllers/tutor.controller');

const router = express.Router();

// ========== PUBLIC ROUTES ==========

// Get all tutors (with optional query filters)
router.get('/', catchAsync(tutorController.getAll));

// Search tutors by subject (must be before /:id)
router.get('/search/:subject', catchAsync(tutorController.searchBySubject));

// Get single tutor profile
router.get('/:id', catchAsync(tutorController.getById));

// ========== PROTECTED ROUTES (tutors only) ==========

// Update tutor profile
router.put('/:id', verifyToken, restrictTo('tutor'), catchAsync(tutorController.updateProfile));

// Update tutor availability
router.put('/:id/availability', verifyToken, restrictTo('tutor'), catchAsync(tutorController.updateAvailability));

module.exports = router;
