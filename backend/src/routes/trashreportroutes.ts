import express from "express";
import { TrashReport } from "../models/trashreport.js"; 
import axios from "axios";
import { env } from "../config/env.js"; // Use the protected config

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    // 1. Save to MongoDB
    console.log("📝 Attempting to save Trash Report...");
    const newReport = await TrashReport.create(req.body);
    console.log("✅ Saved to MongoDB:", newReport._id);

    // 2. Notify IBM using the protected Env Link
    if (env.IBM_TRASH_REPORT_URL) {
      console.log("📡 Calling IBM Webhook...");
      
      try {
        const ibmResponse = await axios.post(
          env.IBM_TRASH_REPORT_URL, 
          {
            text: `🚨 LITTER ALERT! Severity: ${req.body.severity}. Location: ${JSON.stringify(req.body.location)}`
          },
          {
            headers: { "Content-Type": "application/json" } // IBM requirement
          }
        );
        console.log("✅ IBM Response:", ibmResponse.status);

      } catch (ibmError: any) { // Add ': any' here to stop the red squiggles
        console.error("❌ IBM Notification Failed, but report was saved.");
        if (ibmError.response) {
            console.error("   Reason:", ibmError.response.data);
        }
        }
    }

    // 3. Success response to your Mobile App
    res.status(201).json(newReport);

  } catch (error) {
    // This is where you'll see why MongoDB failed (e.g., missing required fields)
    console.error("❌ Fatal Error in Trash Report Route:", error.message);
    res.status(500).json({ 
      error: "Failed to create report", 
      details: error.message 
    });
  }
});

export { router as trashReportRouter };