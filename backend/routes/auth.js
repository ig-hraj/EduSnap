const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Tutor = require('../models/Tutor');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// ========== STUDENT ROUTES ==========

// Student Signup
router.post('/student/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, subjects } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new student
    const student = new Student({
      email,
      password,
      firstName,
      lastName,
      subjects: subjects || [],
    });

    await student.save();

    // Generate token
    const token = generateToken(student._id, 'student');

    res.status(201).json({
      message: 'Student registered successfully',
      token,
      user: {
        id: student._id,
        email: student.email,
        role: 'student',
        firstName: student.firstName,
        lastName: student.lastName,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Student Login
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find student and include password field
    const student = await Student.findOne({ email }).select('+password');
    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await student.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(student._id, 'student');

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: student._id,
        email: student.email,
        role: 'student',
        firstName: student.firstName,
        lastName: student.lastName,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== TUTOR ROUTES ==========

// Tutor Signup
router.post('/tutor/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, subjects, hourlyRate, bio } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName || !hourlyRate) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if tutor already exists
    const existingTutor = await Tutor.findOne({ email });
    if (existingTutor) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new tutor
    const tutor = new Tutor({
      email,
      password,
      firstName,
      lastName,
      subjects: subjects || [],
      hourlyRate,
      bio: bio || '',
      availability: {},
    });

    await tutor.save();

    // Generate token
    const token = generateToken(tutor._id, 'tutor');

    res.status(201).json({
      message: 'Tutor registered successfully',
      token,
      user: {
        id: tutor._id,
        email: tutor.email,
        role: 'tutor',
        firstName: tutor.firstName,
        lastName: tutor.lastName,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Tutor Login
router.post('/tutor/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find tutor and include password field
    const tutor = await Tutor.findOne({ email }).select('+password');
    if (!tutor) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await tutor.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(tutor._id, 'tutor');

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: tutor._id,
        email: tutor.email,
        role: 'tutor',
        firstName: tutor.firstName,
        lastName: tutor.lastName,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== PROTECTED ROUTES ==========

// Get current user info
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { id, role } = req.user;

    let user;
    if (role === 'student') {
      user = await Student.findById(id);
    } else if (role === 'tutor') {
      user = await Tutor.findById(id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
