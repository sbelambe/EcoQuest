import express from "express";
import { Bin } from "../models/bin.js";
import axios from "axios";
import { env } from "../config/env.js"; // Import your env config

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const newBin = await Bin.create(req.body);

    // Use the protected URL from env
    if (env.IBM_BIN_QUEST_URL) {
      axios.post(env.IBM_BIN_QUEST_URL, {
        text: `🆕 NEW QUEST! A ${req.body.type} bin was added.`,
        location: newBin.location,
        type: newBin.type
      }).catch(err => console.error("❌ IBM Quest Call Failed:", err.message));
    }
    
    res.status(201).json(newBin);
  } catch (error) {
    res.status(500).json({ error: "Failed to create bin" });
  }
});

export { router as binRouter };