import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Deferred so the module loads safely when MONGODB_URI is not yet set.
// The promise rejects at runtime if the URI is missing or invalid.
function buildClientPromise(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    return Promise.reject(new Error('Missing environment variable: "MONGODB_URI"'));
  }
  try {
    return new MongoClient(process.env.MONGODB_URI).connect();
  } catch (e) {
    return Promise.reject(e);
  }
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = buildClientPromise();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = buildClientPromise();
}

export default clientPromise;
