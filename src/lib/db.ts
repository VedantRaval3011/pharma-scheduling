import mongoose from 'mongoose';

declare global {
  // Global object for caching MongoDB connection in development
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

// Use global cache in development to avoid hot-reload issues
const globalWithMongoose = global as typeof globalThis & {
  mongooseCache?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};

let cached = globalWithMongoose.mongooseCache;

if (!cached) {
  cached = globalWithMongoose.mongooseCache = {
    conn: null,
    promise: null,
  };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not defined in environment variables');

    cached.promise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB, // optional, based on your config
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('✅ MongoDB connected');
    return cached.conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
};

export default connectDB;
