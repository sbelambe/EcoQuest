import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  if (!env.MONGODB_URI) {
    console.warn("MONGODB_URI is not set. Skipping DB connect.");
    return;
  }
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB");
}
