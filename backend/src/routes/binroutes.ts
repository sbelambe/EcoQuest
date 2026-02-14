import express from "express";
import { Bin } from "../models/bin.ts"; // Make sure this path matches where you put Bin.ts

const router = express.Router();

// 1. POST: Create a new bin (This is what your curl command hits)
router.post("/", async (req, res) => {
  try {
    const newBin = await Bin.create(req.body);
    res.status(201).json(newBin);
  } catch (error) {
    console.error("Error creating bin:", error);
    res.status(500).json({ error: "Failed to create bin" });
  }
});

// 2. GET: Find nearby bins (You'll need this for the map later)
router.get("/", async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    
    // If coordinates are provided, do the spatial search
    if (lat && lng) {
        const bins = await Bin.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
                    $maxDistance: Number(radius) || 1000 // default 1000 meters
                }
            }
        });
        return res.json(bins);
    }
    
    // Otherwise just return all bins (good for debugging)
    const bins = await Bin.find().limit(50);
    res.json(bins);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bins" });
  }
});

export { router as binRouter };