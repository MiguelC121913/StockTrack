import mongoose from "mongoose";

// URI validated inside connectDB so this module is safe to import before .env is set
const uri = process.env.MONGODB_URI ?? "";

// Extend globalThis to cache Mongoose connection across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _mongooseConnection: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

const cached = global._mongooseConnection ?? { conn: null, promise: null };

if (!global._mongooseConnection) {
  global._mongooseConnection = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (!process.env.MONGODB_URI) {
    throw new Error('Missing environment variable: "MONGODB_URI"');
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { bufferCommands: false });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
