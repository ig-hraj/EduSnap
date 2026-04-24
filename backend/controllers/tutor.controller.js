/**
 * Tutor Controller — Thin HTTP layer.
 */
const tutorService = require('../services/tutor.service');

// GET /api/tutors
exports.getAll = async (req, res) => {
  const tutors = await tutorService.getAllTutors(req.query);
  res.status(200).json({ count: tutors.length, tutors });
};

// GET /api/tutors/search/:subject
exports.searchBySubject = async (req, res) => {
  const tutors = await tutorService.searchBySubject(req.params.subject, req.query);
  res.status(200).json({ count: tutors.length, tutors });
};

// GET /api/tutors/:id
exports.getById = async (req, res) => {
  const tutor = await tutorService.getTutorById(req.params.id);
  res.status(200).json({ tutor });
};

// PUT /api/tutors/:id
exports.updateProfile = async (req, res) => {
  const tutor = await tutorService.updateProfile(req.params.id, req.user.id, req.body);
  res.status(200).json({ message: 'Profile updated successfully', tutor });
};

// PUT /api/tutors/:id/availability
exports.updateAvailability = async (req, res) => {
  const availability = await tutorService.updateAvailability(
    req.params.id, req.user.id, req.body.availability
  );
  res.status(200).json({ message: 'Availability updated successfully', availability });
};
