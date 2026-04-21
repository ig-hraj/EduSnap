const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Deprecated options (useNewUrlParser, useUnifiedTopology) removed for Mongoose 7+
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 50,       // Production: handle concurrent connections
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    process.exit(1); // Exit with failure code
  }
};

module.exports = connectDB;
