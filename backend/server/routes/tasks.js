import express from "express";
import { generateRealCompanyTask, evaluateCode } from "../lib/anthropic.js";
import { supabaseAdmin } from "../lib/supabase.js";

const router = express.Router();

router.post("/generate-daily", async (req, res) => {
  try {
    const { userId, role, elo, company } = req.body;
    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }
    
    // If we have a user, check DB for an existing task generated in the last 24 hours
    if (userId) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existingTasks, error } = await supabaseAdmin
        .from('daily_tasks')
        .select('task_data')
        .eq('user_id', userId)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (!error && existingTasks && existingTasks.length > 0) {
         return res.json(existingTasks[0].task_data);
      }
    }

    // Generate task from Direct Anthropic API
    const task = await generateRealCompanyTask(role, elo || 400, company);
    
    // Save to DB if user is logged in
    if (userId) {
       await supabaseAdmin.from('daily_tasks').insert({
          user_id: userId,
          task_data: task,
          status: 'pending'
       });
    }
    
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
