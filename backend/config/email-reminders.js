const Booking = require('../models/Booking');
const Tutor = require('../models/Tutor');
const Student = require('../models/Student');
const { sendEmail, sessionReminderEmail } = require('./email');

let reminderCheckInterval = null;
let cleanupInterval = null;
const sentReminders = new Map(); // Track reminderId → timestamp of when it was sent

/**
 * Start the reminder scheduler
 * Checks every 5 minutes for bookings that need reminders
 */
function startReminderScheduler() {
  // Check every 5 minutes
  reminderCheckInterval = setInterval(checkAndSendReminders, 5 * 60 * 1000);
  
  // Bulk cleanup every hour — remove reminders older than 24h
  cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [key, timestamp] of sentReminders) {
      if (timestamp < cutoff) sentReminders.delete(key);
    }
  }, 60 * 60 * 1000);
  
  console.log('✓ Email reminder scheduler started');
  
  // Run immediately on startup
  checkAndSendReminders();
}

/**
 * Stop the reminder scheduler
 */
function stopReminderScheduler() {
  if (reminderCheckInterval) {
    clearInterval(reminderCheckInterval);
    reminderCheckInterval = null;
    console.log('✓ Email reminder scheduler stopped');
  }
}

/**
 * Check for upcoming bookings and send reminders
 */
async function checkAndSendReminders() {
  try {
    const now = new Date();
    
    // Get bookings that are scheduled within the next 90 minutes and haven't been reminded yet
    const upcomingBookings = await Booking.find({
      status: 'confirmed',
      sessionDate: { $gte: now },
    }).lean();

    for (const booking of upcomingBookings) {
      // Skip if we've already sent a reminder for this booking
      const reminderId = booking._id.toString();
      if (sentReminders.has(reminderId)) {
        continue;
      }

      // Check if session is within 60 minutes
      const bookingDateTime = new Date(booking.sessionDate);
      const [hour, minute] = booking.startTime.split(':').map(Number);
      bookingDateTime.setHours(hour, minute, 0, 0);

      const timeUntilSession = bookingDateTime - now;
      const minutesUntilSession = Math.floor(timeUntilSession / (1000 * 60));

      // Send reminder if session is within 60 minutes (but more than 55 minutes away to catch the 1-hour window)
      if (minutesUntilSession >= 55 && minutesUntilSession <= 65) {
        // Send reminder to student
        const student = await Student.findById(booking.studentId);
        if (student && student.email) {
          const emailContent = sessionReminderEmail(
            booking.studentName,
            booking.tutorName,
            booking.subject,
            booking.sessionDate,
            booking.startTime
          );
          
          sendEmail(student.email, '⏰ Session Reminder - EduSnap', emailContent).catch(err => 
            console.log('Reminder email error (non-blocking):', err.message)
          );
          
          console.log(`📧 Session reminder sent to ${booking.studentName} for ${booking.subject}`);
        }

        // Send reminder to tutor
        const tutor = await Tutor.findById(booking.tutorId);
        if (tutor && tutor.email) {
          const emailContent = sessionReminderEmail(
            booking.tutorName,
            booking.studentName,
            booking.subject,
            booking.sessionDate,
            booking.startTime
          );
          
          sendEmail(tutor.email, '⏰ Session Reminder - EduSnap', emailContent).catch(err => 
            console.log('Reminder email error (non-blocking):', err.message)
          );
          
          console.log(`📧 Session reminder sent to ${booking.tutorName} for ${booking.subject}`);
        }

        // Mark as sent with timestamp (for bulk cleanup)
        sentReminders.set(reminderId, Date.now());
      }
    }
  } catch (error) {
    console.error('Error in reminder scheduler:', error);
  }
}

module.exports = {
  startReminderScheduler,
  stopReminderScheduler,
};
