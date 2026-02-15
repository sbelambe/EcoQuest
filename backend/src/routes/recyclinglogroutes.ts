import express from "express";
import { RecyclingLog } from "../models/recyclinglog.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { userId, itemType, carbonSaved, location, timestamp } = req.body ?? {};

    if (!itemType || typeof carbonSaved !== "number") {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["itemType", "carbonSaved"],
      });
    }

    const created = await RecyclingLog.create({
      userId: userId || "demo-user",
      itemType,
      carbonSaved,
      location,
      timestamp,
    });

    console.log(
      `[recycling-logs] Saved log id=${created._id} userId=${created.userId} itemType=${created.itemType}`,
    );
    return res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[recycling-logs] Failed to create log:", message);
    return res.status(500).json({ error: "Failed to create recycling log", details: message });
  }
});

export { router as recyclingLogRouter };
