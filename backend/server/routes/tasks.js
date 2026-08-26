import express from "express";
import { generateRealCompanyTask } from "../lib/bedrock.js";

const router = express.Router();

router.post("/generate-daily", async (req, res) => {
  try {
    const { role, elo } = req.body;
    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }
    
    // Generate task from AWS Bedrock
    const task = await generateRealCompanyTask(role, elo || 400);
    
    res.json(task);
  } catch (error) {
    console.error("Task generation error:", error);
    res.status(500).json({ error: "Failed to generate daily task" });
  }
});

export default router;
