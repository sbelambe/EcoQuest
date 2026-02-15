import mongoose from "mongoose";

const RecyclingLogSchema = new mongoose.Schema({
  userId: { type: String, default: "demo-user", index: true }, // Optional for demo mode
  itemType: { type: String, required: true }, // e.g. "Plastic Bottle"
  carbonSaved: { type: Number, required: true }, // e.g. 0.05
  location: {
    type: { type: String, default: "Point" },
    coordinates: [Number], // [longitude, latitude]
  },
  timestamp: { type: Date, default: Date.now }, // The "When"
});

export const RecyclingLog = mongoose.model(
  "RecyclingLog",
  RecyclingLogSchema,
  "recycling-logs",
);
