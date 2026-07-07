import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/brewery-finder";

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    const { host, port, name } = mongoose.connection;
    console.log(`MongoDB connected: ${host}:${port}/${name}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}
