require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const http = require('http');
const path = require('path');
const connectDB = require('./config/db');
const { setupSocket } = require('./config/socket-config');
const { startReminderScheduler } = require('./config/email-reminders');
const authRoutes = require('./routes/auth');
const tutorRoutes = require('./routes/tutors');
const bookingRoutes = require('./routes/bookings');
const messageRoutes = require('./routes/messages');
const paymentRoutes = require('./routes/payments');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// ========== SECURITY MIDDLEWARE ==========

// Helmet — sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: false,  // Disable CSP for now (inline scripts in HTML pages)
  crossOriginEmbedderPolicy: false,
}));

// CORS — restrict to known origins (NOT wide-open *)
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting — prevent brute force and DDoS
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                  // 200 requests per window per IP
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                   // 15 login/signup attempts per window
  message: { message: 'Too many authentication attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many payment requests. Please try again later.' },
});

app.use('/api/', generalLimiter);

// Body parsers
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// NoSQL injection prevention — sanitize user input (strips $, . from keys)
app.use(mongoSanitize());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Connect to MongoDB
connectDB();

// ========== ROUTES ==========
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentLimiter, paymentRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// SPA fallback - serve index.html for unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ========== GLOBAL ERROR HANDLER ==========
// Must be after all routes — catches unhandled errors
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err);

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    message: isProduction ? 'Something went wrong' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

// Initialize Socket.IO
const io = setupSocket(server);

// Make io available to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 EduSnap — Tutor Booking System`);
  console.log(`🔒 Security: Helmet + CORS + Rate Limiting + Mongo Sanitize`);
  console.log(`⚡ Socket.IO enabled with JWT authentication\n`);
  
  // Start email reminder scheduler
  startReminderScheduler();
});
