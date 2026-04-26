# EduSnap

EduSnap is a full-stack tutor booking platform where students can find tutors, request sessions, pay securely, and chat in real time.  
It includes role-based dashboards, booking lifecycle management, and automated email reminders.

## Features

- Student and tutor authentication (`signup`, `login`, JWT auth, refresh token, profile update)
- Tutor discovery with filters (subject, rate, rating), tutor profile view, and availability management
- Booking lifecycle: `pending -> accepted -> confirmed -> completed`, plus cancel/reject flows
- Razorpay payment flow: create order, verify signature, payment status, and refunds
- Real-time updates using Socket.IO (booking notifications, status changes, chat events, typing indicators)
- Session chat per booking with unread counts and read receipts
- Reviews and ratings for completed sessions; tutor average rating auto-calculation
- Student/tutor dashboards with booking and earnings stats
- Automated background jobs:
  - Session reminder emails (~1 hour before confirmed sessions)
  - Auto-complete sessions after end time
- Security middleware: Helmet, CORS allowlist, rate limiting, Mongo sanitize, centralized error handling

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript (multi-page app)
- Backend: Node.js, Express.js, Socket.IO
- Database: MongoDB (Mongoose)
- Other tools: JWT, Joi validation, Nodemailer, Razorpay, Nodemon

## Project Structure

```text
EduSnap/
|-- backend/
|   |-- config/         # DB, email, payments, socket, schedulers
|   |-- controllers/    # Thin HTTP handlers
|   |-- services/       # Core business logic
|   |-- models/         # Mongoose models (Student, Tutor, Booking, Message, Payment)
|   |-- routes/         # API route modules
|   |-- middleware/     # Auth/role middleware
|   |-- validators/     # Joi request validation
|   |-- sockets/        # Socket event handlers (chat)
|   `-- server.js       # App entry point
|-- frontend/
|   |-- pages/          # App pages (login, dashboard, booking, chat, payment, etc.)
|   |-- js/             # Frontend API/socket helpers
|   |-- assets/         # CSS/static assets
|   `-- index.html      # Landing page
|-- EMAIL_SETUP.md
`-- RAZORPAY_SETUP.md
```

## Installation

```bash
git clone <repo-url>
cd EduSnap
cd backend
npm install
cp .env.example .env
```

Update `backend/.env` with your values, then run:

```bash
npm run dev
```

Open the app at:

```text
http://localhost:5000
```

## Environment Variables (`backend/.env`)

Required:

- `MONGO_URI`
- `JWT_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `EMAIL_FROM`

Common optional values:

- `PORT` (default: `5000`)
- `NODE_ENV` (default: `development`)
- `FRONTEND_URL` (used for CORS/socket origin checks)
- `JWT_REFRESH_SECRET` (optional; falls back to derived value from `JWT_SECRET`)

## Running Notes

- Frontend is served by Express from the same server (`backend/server.js`).
- Reminder and completion schedulers start automatically when the backend starts.
- Email verification routes exist, but verification enforcement is currently disabled in code for demo mode.

## API Overview

Base URL: `http://localhost:5000/api`

- Auth: `/auth/student/signup`, `/auth/student/login`, `/auth/tutor/signup`, `/auth/tutor/login`, `/auth/refresh`, `/auth/me`, `/auth/profile`
- Tutors: `GET /tutors`, `GET /tutors/search/:subject`, `GET /tutors/:id`, `PUT /tutors/:id`, `PUT /tutors/:id/availability`
- Bookings: create, list, upcoming, single booking, cancel, accept/reject, feedback, dashboard stats, tutor reviews, tutor students
- Messages: list/send/mark-read/unread-count per booking
- Payments: `POST /payments/order`, `POST /payments/verify`, `GET /payments/:bookingId`, `POST /payments/:bookingId/refund`
- Health: `GET /health`

## Key Workflows

1. Student requests session -> booking is created as `pending`.
2. Tutor accepts/rejects request (real-time event emitted).
3. On accept, student pays via Razorpay.
4. Payment verification marks booking `confirmed` and `paymentStatus=paid`.
5. Scheduler marks session `completed` after end time.
6. Student submits rating/feedback; tutor rating is recalculated.

