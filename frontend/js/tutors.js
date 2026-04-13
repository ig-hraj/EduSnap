// Tutor API utilities for frontend

const API_URL = 'http://localhost:5000/api';

// Get all tutors (with optional filters)
const getAllTutors = async (filters = {}) => {
  try {
    let url = `${API_URL}/tutors`;
    const params = new URLSearchParams();

    if (filters.subject) params.append('subject', filters.subject);
    if (filters.minRate) params.append('minRate', filters.minRate);
    if (filters.maxRate) params.append('maxRate', filters.maxRate);
    if (filters.minRating) params.append('minRating', filters.minRating);

    if (params.toString()) {
      url += '?' + params.toString();
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch tutors');
    return await response.json();
  } catch (error) {
    console.error('Error fetching tutors:', error);
    throw error;
  }
};

// Get single tutor by ID
const getTutorById = async (tutorId) => {
  try {
    const response = await fetch(`${API_URL}/tutors/${tutorId}`);
    if (!response.ok) throw new Error('Tutor not found');
    return await response.json();
  } catch (error) {
    console.error('Error fetching tutor:', error);
    throw error;
  }
};

// Search tutors by subject
const searchTutorsBySubject = async (subject, filters = {}) => {
  try {
    let url = `${API_URL}/tutors/search/${subject}`;
    const params = new URLSearchParams();

    if (filters.minRate) params.append('minRate', filters.minRate);
    if (filters.maxRate) params.append('maxRate', filters.maxRate);

    if (params.toString()) {
      url += '?' + params.toString();
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  } catch (error) {
    console.error('Error searching tutors:', error);
    throw error;
  }
};

// Update tutor profile (tutors only)
const updateTutorProfile = async (tutorId, profileData) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/tutors/${tutorId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) throw new Error('Failed to update profile');
    return await response.json();
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

// Update tutor availability (tutors only)
const updateTutorAvailability = async (tutorId, availability) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/tutors/${tutorId}/availability`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ availability }),
    });

    if (!response.ok) throw new Error('Failed to update availability');
    return await response.json();
  } catch (error) {
    console.error('Error updating availability:', error);
    throw error;
  }
};

// Format availability for display
const formatAvailability = (availability) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const formatted = {};

  days.forEach((day) => {
    const dayKey = day.toLowerCase();
    if (availability[dayKey]) {
      formatted[day] = `${availability[dayKey].start} - ${availability[dayKey].end}`;
    } else {
      formatted[day] = 'Not Available';
    }
  });

  return formatted;
};

// Create star rating display
const createStarRating = (rating, totalReviews = 0) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let stars = '★'.repeat(fullStars);
  if (hasHalfStar) stars += '✦';
  stars += '☆'.repeat(emptyStars);

  return `${stars} (${rating.toFixed(1)} - ${totalReviews} reviews)`;
};
