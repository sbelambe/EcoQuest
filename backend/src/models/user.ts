import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  cityAffiliation: { type: String, enum: ["San Francisco", "Oakland"] },
  stats: {
    totalXp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    totalCarbonSaved: { type: Number, default: 0 },
  },
  pet: {
    skin: { type: String, default: "basic" },
    evolutionStage: { type: Number, default: 1 },
    happinessLevel: { type: Number, default: 100 },
  },
});

export const User = mongoose.model("User", UserSchema);