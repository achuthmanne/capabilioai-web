import express from "express";
import { generateRealCompanyTask, evaluateCode } from "../lib/anthropic.js";

const router = express.Router();

router.post("/generate-daily", async (req, res) => {
  try {
    const { role, elo, company } = req.body;
    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }
    
    // Generate task from Direct Anthropic API
    const task = await generateRealCompanyTask(role, elo || 400, company);
    
    res.json(task);
  } catch (error) {
    console.error("Task generation error:", error.message);
    res.status(500).json({ error: "Failed to generate daily task" });
  }
});


router.post("/evaluate", async (req, res) => {
  try {
    const { taskData, code, language = 'javascript' } = req.body;
    if (!taskData || !code) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const result = await evaluateCode(taskData, code, language);
    res.json(result);
  } catch (error) {
    console.error("Evaluation route error:", error);
    res.status(500).json({ error: "Failed to evaluate code" });
  }
});

export default router;
