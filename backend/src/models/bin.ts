import mongoose from "mongoose";

const BinSchema = new mongoose.Schema({
  location: {
    type: { type: String, default: "Point" },
    coordinates: [Number],
  },
  type: { type: String, enum: ["Recycling", "Compost", "Trash"], required: true },
  status: { type: String, enum: ["Verified", "Pending"], default: "Pending" },
  addedBy: String,
  verificationCount: { type: Number, default: 0 },
});

// Important: Index for geospatial queries
BinSchema.index({ location: "2dsphere" });

export const Bin = mongoose.model("Bin", BinSchema);