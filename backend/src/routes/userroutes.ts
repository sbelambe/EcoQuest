import express from "express";
import axios from "axios";
import { env } from "../config/env.js"; // Import your env config

const router = express.Router();

router.post("/send-report", async (req, res) => {
  try {
    const { email, totalWeight } = req.body;
    const carbonSaved = (totalWeight * 2.5).toFixed(2);

    // Use the protected URL from env
    if (env.IBM_CARBON_REPORT_URL) {
      await axios.post(env.IBM_CARBON_REPORT_URL, {
        email: email,
        totalWeight: totalWeight,
        carbon: carbonSaved
      });
    }

    res.json({ message: "Report sent successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send report" });
  }
});

export { router as userRouter };