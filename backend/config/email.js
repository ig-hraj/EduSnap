const nodemailer = require('nodemailer');

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Test connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.log('⚠️  Email service not configured properly:', error.message);
  } else {
    console.log('✓ Email service ready');
  }
});

/**
 * Send email
 */
async function sendEmail(to, subject, html) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@edusnap.com',
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Email Templates
 */

// Booking confirmation email
function bookingConfirmationEmail(studentName, tutorName, subject, sessionDate, startTime, endTime, totalPrice) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; text-align: center; }
          .content { padding: 20px 0; }
          .booking-details { background: #f9f9f9; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .label { font-weight: 600; color: #333; }
          .value { color: #666; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; margin-top: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Booking Confirmed!</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${studentName}</strong>,</p>
            <p>Your tutoring session has been successfully booked! Here are the details:</p>
            
            <div class="booking-details">
              <div class="detail-row">
                <span class="label">Tutor:</span>
                <span class="value">${tutorName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Subject:</span>
                <span class="value">${subject}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">${new Date(sessionDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div class="detail-row">
                <span class="label">Time:</span>
                <span class="value">${startTime} - ${endTime}</span>
              </div>
              <div class="detail-row">
                <span class="label">Total Price:</span>
                <span class="value"><strong>$${totalPrice.toFixed(2)}</strong></span>
              </div>
            </div>
            
            <p>Please make sure you are available at the scheduled time. You can communicate with your tutor through the chat feature on the platform before the session.</p>
            
            <p>If you need to reschedule or cancel, please do so at least 24 hours in advance to avoid cancellation fees.</p>
            
            <p>Best regards,<br/><strong>The EduSnap Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2026 EduSnap. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Session reminder email
function sessionReminderEmail(studentName, tutorName, subject, sessionDate, startTime) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; text-align: center; }
          .content { padding: 20px 0; }
          .reminder-box { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; margin-top: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Session Reminder</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${studentName}</strong>,</p>
            
            <div class="reminder-box">
              <p><strong>Your session starts in 1 hour!</strong></p>
              <p>📚 <strong>${subject}</strong> with <strong>${tutorName}</strong></p>
              <p>🕐 <strong>${startTime}</strong> on ${new Date(sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>
            
            <p>Please log in to EduSnap a few minutes early to join the session. Make sure your device is ready and you have a stable internet connection.</p>
            
            <p>If you have any questions or need to reschedule, contact your tutor through the chat.</p>
            
            <p>Good luck!<br/><strong>The EduSnap Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2026 EduSnap. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Feedback notification email (for tutor)
function feedbackReceivedEmail(tutorName, studentName, subject, rating, feedback) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; text-align: center; }
          .content { padding: 20px 0; }
          .rating-box { background: #e8f5e9; padding: 15px; border-left: 4px solid #4caf50; margin: 15px 0; text-align: center; border-radius: 5px; }
          .stars { font-size: 28px; color: #ffc107; }
          .feedback-box { background: #f9f9f9; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⭐ You Received Feedback!</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${tutorName}</strong>,</p>
            
            <p><strong>${studentName}</strong> has left feedback for your ${subject} session:</p>
            
            <div class="rating-box">
              <p>Rating:</p>
              <div class="stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
              <p><strong>${rating}/5</strong></p>
            </div>
            
            ${feedback ? `
            <div class="feedback-box">
              <p><strong>Feedback:</strong></p>
              <p>"${feedback}"</p>
            </div>
            ` : ''}
            
            <p>Great work! Keep delivering excellent tutoring sessions. Your ratings help students find quality tutors.</p>
            
            <p>Best regards,<br/><strong>The EduSnap Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2026 EduSnap. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Cancellation email
function cancellationEmail(studentName, tutorName, subject, sessionDate, reason) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 20px; border-radius: 5px; text-align: center; }
          .content { padding: 20px 0; }
          .cancel-box { background: #ffe5e5; padding: 15px; border-left: 4px solid #e74c3c; margin: 15px 0; border-radius: 5px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Booking Cancelled</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${studentName}</strong>,</p>
            
            <p>Your booking has been cancelled:</p>
            
            <div class="cancel-box">
              <p><strong>${subject}</strong> with <strong>${tutorName}</strong></p>
              <p>📅 ${new Date(sessionDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            
            <p>If you need another tutoring session, you can browse our available tutors and book again.</p>
            
            <p>If you have any questions, feel free to contact us.</p>
            
            <p>Best regards,<br/><strong>The EduSnap Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2026 EduSnap. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

module.exports = {
  sendEmail,
  bookingConfirmationEmail,
  sessionReminderEmail,
  feedbackReceivedEmail,
  cancellationEmail,
};
