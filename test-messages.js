#!/usr/bin/env node

/**
 * Test Script - Message API Endpoints
 * Tests the Session Chat/Messaging feature endpoints
 */

const API_URL = 'http://localhost:5000/api';

// Test credentials (from previous tests)
const STUDENT_EMAIL = 'studenttest@example.com';
const STUDENT_PASSWORD = 'password123';

const TUTOR_EMAIL = 'newtutortest@example.com';
const TUTOR_PASSWORD = 'password123';

let studentToken = null;
let tutorToken = null;
let studentId = null;
let tutorId = null;
let bookingId = null;
let messageId = null;

console.log('\n🧪 MESSAGE API TEST SUITE\n');

/**
 * Helper function to make HTTP requests
 */
async function makeRequest(method, endpoint, body = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error('Request failed:', error);
    return { status: 0, data: { error: error.message } };
  }
}

/**
 * Parse JWT to get payload
 */
function parseJWT(token) {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64').toString());
}

/**
 * Test 1: Student Login
 */
async function testStudentLogin() {
  console.log('📝 Test 1: Student Login');
  const result = await makeRequest('POST', '/auth/student/login', {
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  });

  if (result.status === 200) {
    studentToken = result.data.token;
    const payload = parseJWT(studentToken);
    studentId = payload.id;
    console.log('✅ Student login successful');
    console.log(`   Token: ${studentToken.substring(0, 30)}...`);
    console.log(`   ID: ${studentId}`);
  } else {
    console.log(
      `❌ Student login failed: ${result.status} - ${result.data.message}`
    );
  }
  console.log('');
}

/**
 * Test 2: Tutor Login
 */
async function testTutorLogin() {
  console.log('📝 Test 2: Tutor Login');
  const result = await makeRequest('POST', '/auth/tutor/login', {
    email: TUTOR_EMAIL,
    password: TUTOR_PASSWORD,
  });

  if (result.status === 200) {
    tutorToken = result.data.token;
    const payload = parseJWT(tutorToken);
    tutorId = payload.id;
    console.log('✅ Tutor login successful');
    console.log(`   Token: ${tutorToken.substring(0, 30)}...`);
    console.log(`   ID: ${tutorId}`);
  } else {
    console.log(`❌ Tutor login failed: ${result.status} - ${result.data.message}`);
  }
  console.log('');
}

/**
 * Test 3: Get or Create Booking
 */
async function testGetOrCreateBooking() {
  console.log('📝 Test 3: Get or Create Booking');

  // First get all bookings for student
  const bookingsResult = await makeRequest(
    'GET',
    '/bookings/my-bookings',
    null,
    studentToken
  );

  if (bookingsResult.status === 200 && bookingsResult.data.bookings.length > 0) {
    bookingId = bookingsResult.data.bookings[0]._id;
    console.log('✅ Found existing booking');
    console.log(`   ID: ${bookingId}`);
  } else {
    console.log('⚠️  No bookings found, creating one...');
    // Create a booking (this would require tutor availability)
    const bookingResult = await makeRequest(
      'POST',
      '/bookings',
      {
        tutorId,
        subject: 'Mathematics',
        sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        startTime: '14:00',
        endTime: '15:00',
        notes: 'Test booking for messaging',
      },
      studentToken
    );

    if (bookingResult.status === 201) {
      bookingId = bookingResult.data.booking._id;
      console.log('✅ Booking created');
      console.log(`   ID: ${bookingId}`);
    } else {
      console.log(
        `❌ Booking creation failed: ${bookingResult.status} - ${bookingResult.data.message}`
      );
      return false;
    }
  }
  console.log('');
  return true;
}

/**
 * Test 4: Send Message (Student)
 */
async function testSendMessageStudent() {
  console.log('📝 Test 4: Send Message (Student)');

  const messageText = `Hi! I'm ready for our session. See you soon! - Test ${Date.now()}`;

  const result = await makeRequest(
    'POST',
    '/api/messages',
    {
      bookingId,
      message: messageText,
    },
    studentToken
  );

  if (result.status === 201) {
    messageId = result.data.messageData._id;
    console.log('✅ Message sent successfully');
    console.log(`   ID: ${messageId}`);
    console.log(`   Text: ${messageText.substring(0, 40)}...`);
  } else {
    console.log(
      `❌ Message send failed: ${result.status} - ${result.data.message}`
    );
  }
  console.log('');
}

/**
 * Test 5: Get Messages
 */
async function testGetMessages() {
  console.log('📝 Test 5: Get Messages');

  const result = await makeRequest(
    'GET',
    `/api/messages/${bookingId}`,
    null,
    studentToken
  );

  if (result.status === 200) {
    console.log('✅ Messages retrieved successfully');
    console.log(`   Count: ${result.data.messages.length}`);
    result.data.messages.forEach((msg, idx) => {
      console.log(
        `   ${idx + 1}. [${msg.senderRole}] ${msg.senderName}: ${msg.message.substring(0, 40)}...`
      );
    });
  } else {
    console.log(
      `❌ Get messages failed: ${result.status} - ${result.data.message}`
    );
  }
  console.log('');
}

/**
 * Test 6: Get Unread Count
 */
async function testGetUnreadCount() {
  console.log('📝 Test 6: Get Unread Message Count');

  const result = await makeRequest(
    'GET',
    `/api/messages/${bookingId}/unread-count`,
    null,
    tutorToken
  );

  if (result.status === 200) {
    console.log('✅ Unread count retrieved');
    console.log(`   Unread: ${result.data.unreadCount}`);
  } else {
    console.log(
      `❌ Get unread count failed: ${result.status} - ${result.data.message}`
    );
  }
  console.log('');
}

/**
 * Test 7: Send Reply (Tutor)
 */
async function testSendMessageTutor() {
  console.log('📝 Test 7: Send Message (Tutor)');

  const messageText = `Great! Looking forward to our session! - Test ${Date.now()}`;

  const result = await makeRequest(
    'POST',
    '/api/messages',
    {
      bookingId,
      message: messageText,
    },
    tutorToken
  );

  if (result.status === 201) {
    console.log('✅ Tutor message sent successfully');
    console.log(`   Text: ${messageText.substring(0, 40)}...`);
  } else {
    console.log(
      `❌ Tutor message send failed: ${result.status} - ${result.data.message}`
    );
  }
  console.log('');
}

/**
 * Test 8: Mark Message as Read
 */
async function testMarkAsRead() {
  if (!messageId) {
    console.log('⚠️  Test 8 skipped (no message ID)');
    return;
  }

  console.log('📝 Test 8: Mark Message as Read');

  const result = await makeRequest(
    'PUT',
    `/api/messages/${messageId}/read`,
    null,
    studentToken
  );

  if (result.status === 200) {
    console.log('✅ Message marked as read');
    console.log(`   IsRead: ${result.data.messageData.isRead}`);
  } else {
    console.log(
      `❌ Mark as read failed: ${result.status} - ${result.data.message}`
    );
  }
  console.log('');
}

/**
 * Run all tests
 */
async function runAllTests() {
  try {
    await testStudentLogin();
    await testTutorLogin();
    await testGetOrCreateBooking();

    if (bookingId) {
      await testSendMessageStudent();
      await testGetMessages();
      await testGetUnreadCount();
      await testSendMessageTutor();
      await testMarkAsRead();
    }

    console.log('✅ TEST SUITE COMPLETED\n');
  } catch (error) {
    console.error('❌ Test suite error:', error);
  }
}

// Run tests
runAllTests();
