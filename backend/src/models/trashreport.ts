import mongoose from "mongoose";

const TrashReportSchema = new mongoose.Schema({
  location: {
    type: { type: String, default: "Point" },
    coordinates: [Number],
  },
  severity: { type: Number, min: 1, max: 5 },
  description: String, // Snowflake analyzes this
  imageUrl: String,
  isCleaned: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

// Important: Index for geospatial queries
TrashReportSchema.index({ location: "2dsphere" });

export const TrashReport = mongoose.model("TrashReport", TrashReportSchema);