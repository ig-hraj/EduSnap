// Booking API utilities for frontend

const API_URL = 'http://localhost:5000/api';

// Create a new booking
const createBooking = async (bookingData) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create booking');
    }
    
    const result = await response.json();
    const booking = result.booking;
    
    // Emit Socket.IO event
    if (typeof emitBookingCreated === 'function') {
      emitBookingCreated({
        id: booking._id,
        tutorId: booking.tutorId,
        studentName: booking.studentName,
        subject: booking.subject,
        sessionDate: booking.sessionDate,
        startTime: booking.startTime,
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

// Get user's bookings (for students and tutors)
const getMyBookings = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/bookings/my-bookings`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to fetch bookings');
    return await response.json();
  } catch (error) {
    console.error('Error fetching bookings:', error);
    throw error;
  }
};

// Get upcoming bookings (students only)
const getUpcomingBookings = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/bookings/upcoming`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to fetch upcoming bookings');
    return await response.json();
  } catch (error) {
    console.error('Error fetching upcoming bookings:', error);
    throw error;
  }
};

// Get single booking details
const getBookingById = async (bookingId) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Booking not found');
    return await response.json();
  } catch (error) {
    console.error('Error fetching booking:', error);
    throw error;
  }
};

// Cancel a booking
const cancelBooking = async (bookingId, reason = '') => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) throw new Error('Failed to cancel booking');
    
    const result = await response.json();
    const booking = result.booking;
    
    // Emit Socket.IO event
    if (typeof emitBookingCancelled === 'function') {
      emitBookingCancelled(bookingId, booking.tutorId, booking.studentId, reason);
    }
    
    return result;
  } catch (error) {
    console.error('Error cancelling booking:', error);
    throw error;
  }
};

// Add feedback to booking (students only)
const addFeedback = async (bookingId, rating, feedback) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/bookings/${bookingId}/feedback`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ rating, feedback }),
    });

    if (!response.ok) throw new Error('Failed to add feedback');
    
    const result = await response.json();
    const booking = result.booking;
    
    // Get student name for notification
    try {
      const authResponse = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const authData = await authResponse.json();
      const studentName = `${authData.user.firstName} ${authData.user.lastName}`;
      
      // Emit Socket.IO event
      if (typeof emitFeedbackSubmitted === 'function') {
        emitFeedbackSubmitted(bookingId, booking.tutorId, studentName, rating, feedback);
      }
    } catch (e) {
      console.error('Error getting student name for feedback:', e);
    }
    
    return result;
  } catch (error) {
    console.error('Error adding feedback:', error);
    throw error;
  }
};

// Format date for display
const formatDate = (date) => {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Format time to 12-hour format
const formatTime = (time24) => {
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

// Calculate duration in hours
const calculateDuration = (startTime, endTime) => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startTotalMin = startHour * 60 + startMin;
  const endTotalMin = endHour * 60 + endMin;
  const durationMin = endTotalMin - startTotalMin;
  return durationMin / 60;
};

// Calculate total price
const calculatePrice = (hourlyRate, duration) => {
  return hourlyRate * duration;
};

// Get status badge color
const getStatusColor = (status) => {
  switch (status) {
    case 'confirmed':
      return '#667eea';
    case 'completed':
      return '#27ae60';
    case 'cancelled':
      return '#e74c3c';
    default:
      return '#999';
  }
};

// Get status badge text
const getStatusText = (status) => {
  switch (status) {
    case 'confirmed':
      return 'Confirmed';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};
