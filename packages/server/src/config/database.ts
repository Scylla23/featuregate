import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/featuregate';

export const connectDatabase = async (): Promise<void> => {
  try {
    const options: mongoose.ConnectOptions = {
      maxPoolSize: 10, // Limits concurrent operations
      minPoolSize: 2, // Keeps a few connections ready
      serverSelectionTimeoutMS: 5000, // Fail fast if DB is down
      socketTimeoutMS: 45000, // Close inactive sockets
    };

    mongoose.connection.on('connected', () => console.log('🍃 MongoDB connected'));
    mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err));
    mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB disconnected'));

    await mongoose.connect(MONGODB_URI, options);
  } catch (error) {
    console.error('💥 Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
export const closeDatabase = async (): Promise<void> => {
  await mongoose.connection.close();
  console.log('🍃 MongoDB connection closed');
};
