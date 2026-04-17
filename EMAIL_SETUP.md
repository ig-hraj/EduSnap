# Email Notifications Setup - EduSnap

## Overview
The EduSnap platform includes automated email notifications for key booking lifecycle events:

- **Booking Confirmation** - Sent when a booking is created
- **Session Reminder** - Sent 1 hour before the scheduled session
- **Booking Cancellation** - Sent when a booking is cancelled
- **Feedback Notification** - Sent to tutor when feedback is received

## Configuration

### Email Provider Setup (Mailtrap recommended for testing)

1. **Sign up at** [Mailtrap.io](https://mailtrap.io)
2. **Create a project** (e.g., "EduSnap")
3. **Get credentials** from the SMTP settings

### Update .env File

Edit `backend/.env` and add:

```env
# Email Configuration (Mailtrap for testing or Gmail SMTP)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=587
EMAIL_USER=your_mailtrap_email_user
EMAIL_PASSWORD=your_mailtrap_password
EMAIL_FROM=noreply@edusnap.com
```

### Alternative: Gmail SMTP

For production with Gmail:

1. Enable 2-Step Verification in Google Account
2. Create an [App Password](https://myaccount.google.com/apppasswords)
3. Update `.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your.email@gmail.com
```

## Email Features

### 1. Booking Confirmation Email
**Triggered:** When student creates a booking
**Recipients:** Student
**Contains:**
- Tutor name and subject
- Session date and time
- Total price
- Platform instructions

### 2. Session Reminder Email
**Triggered:** Automatically 1 hour before session
**Recipients:** Student & Tutor
**Contains:**
- Subject and tutor/student name
- Exact session time
- Connection instructions
- Chat integration reminder

### 3. Cancellation Email
**Triggered:** When booking is cancelled
**Recipients:** Student & Tutor
**Contains:**
- Session details that were cancelled
- Cancellation reason
- Rescheduling information

### 4. Feedback Notification Email
**Triggered:** When student leaves feedback/rating
**Recipients:** Tutor
**Contains:**
- Student name and subject
- Star rating (1-5)
- Feedback text
- Encouragement message

## Email Reminder Scheduler

The system automatically checks every 5 minutes for upcoming sessions:

- Bookings scheduled within 1 hour get a reminder email
- Each reminder is sent only once
- Reminders are auto-tracked to prevent duplicate sends

### Configuration

Edit timeout in `backend/config/email-reminders.js`:
```javascript
// Check every 5 minutes (default)
reminderCheckInterval = setInterval(checkAndSendReminders, 5 * 60 * 1000);

// To check every minute:
reminderCheckInterval = setInterval(checkAndSendReminders, 1 * 60 * 1000);
```

## Email Templates

All email templates are HTML formatted with:
- Responsive design (works on mobile/desktop)
- EduSnap gradient branding (purple)
- Clear typography and spacing
- Call-to-action buttons
- Footer with copyright

Templates are located in: `backend/config/email.js`

## Testing Emails

### Test Mailtrap Inbox
1. After sending an email, check your Mailtrap project inbox
2. View the raw email, HTML rendering, and headers
3. Verify design and content

### Test Locally
```bash
# With Mailtrap configured, create a booking
# The confirmation email should appear in Mailtrap inbox within seconds

# For reminders, wait for the scheduler to run
# Or manually trigger by editing a booking's sessionDate to 55 minutes from now
```

## Troubleshooting

### Emails not sending
1. Check `.env` credentials are correct
2. Verify Mailtrap account is active
3. Check server logs for email service errors
4. Ensure `nodemailer` is installed: `npm list nodemailer`

### Reminders not being sent
1. Check that server has `startReminderScheduler()` called
2. Verify bookings have correct `sessionDate` format
3. Check server console for reminder scheduler logs

### Using external templates
To use external email templates:
1. Replace HTML strings in `email.js` with template engine (e.g., Handlebars)
2. Store templates in separate files
3. Load and render dynamically

## Production Considerations

### Email Sending Limits
- **Mailtrap (Free):** 100 emails/day
- **Gmail SMTP:** Up to 30 per minute
- **SendGrid:** 100 emails/day (free tier)
- **AWS SES:** 62,000 emails/day (free tier)

### Recommendations for Production
1. Use dedicated email service (SendGrid, AWS SES, Mailgun)
2. Implement email queuing for reliability
3. Add retry logic for failed sends
4. Monitor email delivery rates
5. Allow users to unsubscribe from emails
6. Use transactional email templates

### Unsubscribe Implementation
Add to emails: `<p><a href="https://edusnap.com/preferences">Update email preferences</a></p>`

## Next Steps

### Step 5C: Payment Integration (Razorpay)
The platform is now ready for payment integration. Email confirmations will be sent after successful payments are processed.

Configuration will be added to `.env`:
```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

---

**Last Updated:** April 17, 2026  
**Maintained by:** EduSnap Development Team
