import mongoose, { Schema } from "mongoose";

const PointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: (v: number[]) => Array.isArray(v) && v.length === 2,
        message: "coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false }
);

const TrashCanSchema = new Schema(
  {
    source: { type: String, required: true, index: true },
    sourceId: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    address: { type: String },
    canColor: { type: String, default: "" },
    type: {
      type: String,
      enum: ["trash", "recycle", "compost"],
      default: "trash",
      index: true,
    },
    location: { type: PointSchema, required: true },
    properties: { type: Schema.Types.Mixed },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

TrashCanSchema.index({ location: "2dsphere" });

export const TrashCan =
  mongoose.models.TrashCan || mongoose.model("TrashCan", TrashCanSchema);
