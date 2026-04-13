const express = require('express');
const Tutor = require('../models/Tutor');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ========== PUBLIC ROUTES ==========

// Get all tutors (with filters)
router.get('/', async (req, res) => {
  try {
    const { subject, minRate, maxRate, minRating } = req.query;

    // Build filter object
    let filter = {};

    if (subject) {
      // Search tutors who teach this subject
      filter.subjects = { $in: [new RegExp(subject, 'i')] };
    }

    if (minRate || maxRate) {
      filter.hourlyRate = {};
      if (minRate) filter.hourlyRate.$gte = parseFloat(minRate);
      if (maxRate) filter.hourlyRate.$lte = parseFloat(maxRate);
    }

    if (minRating) {
      filter.ratings = { $gte: parseFloat(minRating) };
    }

    // Fetch tutors matching filters
    const tutors = await Tutor.find(filter).select('-password');

    // Sort by rating (highest first)
    tutors.sort((a, b) => b.ratings - a.ratings);

    res.status(200).json({
      count: tutors.length,
      tutors,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single tutor profile
router.get('/:id', async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id).select('-password');

    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    res.status(200).json({ tutor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== PROTECTED ROUTES ==========

// Update tutor profile (tutors only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    // Verify user is updating their own profile and is a tutor
    if (req.user.id !== req.params.id || req.user.role !== 'tutor') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { firstName, lastName, bio, subjects, hourlyRate, phone } = req.body;

    // Find and update tutor
    const tutor = await Tutor.findById(req.params.id);

    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    // Update fields
    if (firstName) tutor.firstName = firstName;
    if (lastName) tutor.lastName = lastName;
    if (bio) tutor.bio = bio;
    if (subjects) tutor.subjects = subjects;
    if (hourlyRate) tutor.hourlyRate = hourlyRate;
    if (phone) tutor.phone = phone;

    await tutor.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      tutor: {
        id: tutor._id,
        email: tutor.email,
        firstName: tutor.firstName,
        lastName: tutor.lastName,
        bio: tutor.bio,
        subjects: tutor.subjects,
        hourlyRate: tutor.hourlyRate,
        phone: tutor.phone,
        ratings: tutor.ratings,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update tutor availability
router.put('/:id/availability', verifyToken, async (req, res) => {
  try {
    // Verify user is updating their own availability and is a tutor
    if (req.user.id !== req.params.id || req.user.role !== 'tutor') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { availability } = req.body;

    if (!availability) {
      return res.status(400).json({ message: 'Availability data is required' });
    }

    const tutor = await Tutor.findById(req.params.id);

    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    tutor.availability = availability;
    await tutor.save();

    res.status(200).json({
      message: 'Availability updated successfully',
      availability: tutor.availability,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get tutors by subject (search endpoint)
router.get('/search/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const { minRate, maxRate } = req.query;

    let filter = {
      subjects: { $in: [new RegExp(subject, 'i')] },
    };

    if (minRate || maxRate) {
      filter.hourlyRate = {};
      if (minRate) filter.hourlyRate.$gte = parseFloat(minRate);
      if (maxRate) filter.hourlyRate.$lte = parseFloat(maxRate);
    }

    const tutors = await Tutor.find(filter).select('-password');
    tutors.sort((a, b) => b.ratings - a.ratings);

    res.status(200).json({
      count: tutors.length,
      tutors,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
