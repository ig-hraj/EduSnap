require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const { setupSocket } = require('./config/socket-config');
const authRoutes = require('./routes/auth');
const tutorRoutes = require('./routes/tutors');
const bookingRoutes = require('./routes/bookings');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static('../frontend'));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});

// Error handling - serve index.html for unmatched routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/../frontend/index.html');
});

// Initialize Socket.IO
const io = setupSocket(server);

// Make io available to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Tutor Booking System Backend`);
  console.log(`⚡ Socket.IO enabled for real-time updates\n`);
});
