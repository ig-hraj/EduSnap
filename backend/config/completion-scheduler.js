/**
 * Booking Completion Scheduler
 * 
 * Marks confirmed bookings as 'completed' after their session end time has passed.
 * This enables students to leave reviews for completed sessions.
 * 
 * Runs every 5 minutes.
 */

const Booking = require('../models/Booking');
const { getIO } = require('./socket-config');

let schedulerInterval = null;

/**
 * Start the completion scheduler
 */
async function startCompletionScheduler() {
  try {
    console.log('📅 Booking Completion Scheduler started (5-min interval)');
    
    // Run immediately on startup
    await markCompletedBookings();
    
    // Then run every 5 minutes
    schedulerInterval = setInterval(async () => {
      try {
        await markCompletedBookings();
      } catch (error) {
        console.error('[SCHEDULER] Error marking bookings as completed:', error.message);
      }
    }, 5 * 60 * 1000); // 5 minutes

  } catch (error) {
    console.error('[SCHEDULER] Failed to start completion scheduler:', error);
  }
}

/**
 * Mark confirmed/accepted bookings as completed if session has ended
 */
async function markCompletedBookings() {
  try {
    const now = new Date();

    // Find all bookings that are confirmed/accepted and have ended
    const bookings = await Booking.find({
      status: { $in: ['confirmed', 'accepted'] },
      sessionDate: { $exists: true },
      endTime: { $exists: true }
    }).select('_id sessionDate endTime tutorId studentId');

    let completedCount = 0;

    for (const booking of bookings) {
      // Parse session end date and time
      const sessionDateTime = new Date(booking.sessionDate);
      const [hours, minutes] = booking.endTime.split(':').map(Number);
      sessionDateTime.setHours(hours, minutes, 0, 0);

      // If session has ended, mark as completed
      if (sessionDateTime <= now) {
        await Booking.updateOne(
          { _id: booking._id },
          { status: 'completed' }
        );
        completedCount++;

        // Emit Socket.IO event to notify users
        const io = getIO();
        if (io) {
          io.to(`user_${booking.tutorId}`).emit('booking:completed', {
            bookingId: booking._id,
            message: 'A session has been completed. Students can now leave feedback.'
          });
          io.to(`user_${booking.studentId}`).emit('booking:completed', {
            bookingId: booking._id,
            message: 'Your session has ended. You can now leave feedback for your tutor.'
          });
        }
      }
    }

    if (completedCount > 0) {
      console.log(`[SCHEDULER] ✅ Marked ${completedCount} bookings as completed`);
    }

  } catch (error) {
    console.error('[SCHEDULER] Error in markCompletedBookings:', error);
  }
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
function stopCompletionScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    console.log('📅 Booking Completion Scheduler stopped');
  }
}

module.exports = {
  startCompletionScheduler,
  stopCompletionScheduler,
  markCompletedBookings
};
