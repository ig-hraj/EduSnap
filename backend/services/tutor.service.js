/**
 * Tutor Service — Business logic for tutor profiles.
 * 
 * Handles search/filter, profile updates, and availability management.
 */
const Tutor = require('../models/Tutor');
const AppError = require('../utils/AppError');

/**
 * Escape regex special characters to prevent ReDoS.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build MongoDB filter from query parameters.
 */
function buildFilter({ subject, minRate, maxRate, minRating }) {
  const filter = {};

  if (subject) {
    // Use $regex operator for proper MongoDB pattern matching
    filter.subjects = { $regex: escapeRegex(subject), $options: 'i' };
  }

  if (minRate || maxRate) {
    filter.hourlyRate = {};
    if (minRate) filter.hourlyRate.$gte = parseFloat(minRate);
    if (maxRate) filter.hourlyRate.$lte = parseFloat(maxRate);
  }

  if (minRating) {
    filter.ratings = { $gte: parseFloat(minRating) };
  }

  return filter;
}

/**
 * Get all tutors with optional filters, sorted by rating.
 */
async function getAllTutors(query) {
  const filter = buildFilter(query);
  const tutors = await Tutor.find(filter)
    .select('-password')
    .sort({ ratings: -1 });

  return tutors;
}

/**
 * Get a single tutor by ID.
 */
async function getTutorById(tutorId) {
  const tutor = await Tutor.findById(tutorId).select('-password');
  if (!tutor) throw new AppError('Tutor not found', 404);
  return tutor;
}

/**
 * Search tutors by subject with optional rate filters.
 */
async function searchBySubject(subject, { minRate, maxRate } = {}) {
  const filter = buildFilter({ subject, minRate, maxRate });
  const tutors = await Tutor.find(filter)
    .select('-password')
    .sort({ ratings: -1 });

  return tutors;
}

/**
 * Update tutor profile. Only the tutor themselves can update.
 */
async function updateProfile(tutorId, userId, updates) {
  if (tutorId !== userId) {
    throw new AppError('You can only update your own profile', 403);
  }

  const tutor = await Tutor.findById(tutorId);
  if (!tutor) throw new AppError('Tutor not found', 404);

  // Whitelist allowed fields
  const allowed = ['firstName', 'lastName', 'bio', 'subjects', 'hourlyRate', 'phone', 'availability'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      tutor[key] = updates[key];
    }
  }

  await tutor.save();

  return {
    id: tutor._id,
    email: tutor.email,
    firstName: tutor.firstName,
    lastName: tutor.lastName,
    bio: tutor.bio,
    subjects: tutor.subjects,
    hourlyRate: tutor.hourlyRate,
    phone: tutor.phone,
    ratings: tutor.ratings,
  };
}

/**
 * Update tutor availability schedule.
 */
async function updateAvailability(tutorId, userId, availability) {
  if (tutorId !== userId) {
    throw new AppError('You can only update your own availability', 403);
  }

  const tutor = await Tutor.findById(tutorId);
  if (!tutor) throw new AppError('Tutor not found', 404);

  tutor.availability = availability;
  await tutor.save();

  return tutor.availability;
}

module.exports = {
  getAllTutors,
  getTutorById,
  searchBySubject,
  updateProfile,
  updateAvailability,
};
