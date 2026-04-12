# 📚 EduSnap - Real-Time Tutor Booking and Feedback System

A beginner-friendly, scalable web platform where students can find tutors, book sessions in real-time, and provide feedback after sessions.

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Real-time**: Socket.IO
- **Authentication**: JWT

## 📁 Project Structure

```
EduSnap/
├── backend/
│   ├── config/           # Database connection
│   ├── models/           # MongoDB schemas (Student, Tutor)
│   ├── routes/           # API endpoints
│   ├── middleware/       # JWT verification
│   ├── server.js         # Express app
│   ├── .env              # Environment variables
│   └── package.json
│
└── frontend/
    ├── pages/            # HTML pages (signup, login, dashboard, etc.)
    ├── js/               # JavaScript logic
    ├── assets/           # CSS and images
    └── index.html        # Landing page
```

## 🚀 Getting Started

### Prerequisites
- Node.js and npm installed
- MongoDB running (locally or via MongoDB Atlas)

### Backend Setup

1. Navigate to backend folder
   ```bash
   cd backend
   npm install
   ```

2. Update `.env` with your MongoDB URI and JWT secret

3. Start the server
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:5000`

### Frontend Setup

1. Open `frontend/index.html` in a browser OR use a live server
   ```bash
   # Using Python (if available)
   python -m http.server 8000
   
   # Then visit: http://localhost:8000
   ```

## 📋 API Endpoints (Step 1: Authentication)

### Student Routes
- `POST /api/auth/student/signup` - Register student
- `POST /api/auth/student/login` - Login student

### Tutor Routes
- `POST /api/auth/tutor/signup` - Register tutor
- `POST /api/auth/tutor/login` - Login tutor

### Protected Routes
- `GET /api/auth/me` - Get current user (requires JWT token)

## 🔑 JWT Token Usage

After login, store the token in `localStorage`:
```javascript
localStorage.setItem('authToken', data.token);
```

For authenticated requests, add the token to the Authorization header:
```javascript
headers: {
  'Authorization': `Bearer ${authToken}`
}
```

## 📝 Step 1: Authentication System - COMPLETED ✓

- ✅ Database schemas (Student, Tutor)
- ✅ Authentication routes (signup, login)
- ✅ JWT middleware
- ✅ Password hashing (bcrypt)
- ✅ Frontend forms (signup.html, login.html)
- ✅ Frontend auth logic (auth.js)

## 🔜 Next Steps

**Step 2**: Tutor Management (view profile, update availability)
**Step 3**: Booking System (create, cancel, list bookings)
**Step 4**: Real-time Features (Socket.IO notifications)
**Step 5**: Feedback & Rating System

## 📞 Support

For issues or questions, check the code comments or ask for help!

Happy coding! 🚀
