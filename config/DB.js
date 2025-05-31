const mongoose = require("mongoose");
require("dotenv").config();

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("MongoDB already connected");
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URL, {
      bufferCommands: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      keepAlive: true,
      keepAliveInitialDelay: 300000,
    });
    isConnected = true;
    return conn.connection;
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    throw err;
  }
};

module.exports = connectDB;
