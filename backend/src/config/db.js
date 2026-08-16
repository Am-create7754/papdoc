const mongoose = require('mongoose');
const { env } = require('./env');

async function connectDB() {
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });

  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected');
}

module.exports = { connectDB };
