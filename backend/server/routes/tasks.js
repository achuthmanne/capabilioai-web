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
        .select('task_data, status, created_at')
        .eq('user_id', userId)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (!error && existingTasks && existingTasks.length > 0) {
         const taskToReturn = existingTasks[0].task_data;
         taskToReturn.dbStatus = existingTasks[0].status;
         return res.json(taskToReturn);
      }
    }

    // Generate task from Direct Anthropic API
    let task;
    let isFallback = false;
    
    try {
      task = await generateRealCompanyTask(role, elo || 400, company);
    } catch (aiError) {
      console.warn("AI Generation Failed, attempting historical DB fallback:", aiError.message);
      
      let fallbackFound = false;
      if (userId) {
         // Fetch historical tasks for this user to use as fallback (e.g., failed or old tasks)
         const { data: pastTasks } = await supabaseAdmin
            .from('daily_tasks')
            .select('task_data, status, created_at')
            .eq('user_id', userId)
            .in('status', ['failed', 'failed_second_attempt']) // Only retry failed tasks
            .order('created_at', { ascending: true })
            .limit(10);
            
         if (pastTasks && pastTasks.length > 0) {
            // Pick a random historical task from their vault
            const randomIdx = Math.floor(Math.random() * pastTasks.length);
            task = pastTasks[randomIdx].task_data;
            fallbackFound = true;
            isFallback = true;
         }
      }
      
      if (!fallbackFound) {
         // If no user history, throw to outer catch to trigger the 500 error & frontend Swiggy fallback
         throw aiError;
      }
    }
    
    // Save to DB if user is logged in
    // Even if it's a fallback, we insert it so it registers as "today's" active task
    if (userId) {
       const initialStatus = isFallback ? 'fallback_retry' : 'pending';
       task.dbStatus = initialStatus;
       await supabaseAdmin.from('daily_tasks').insert({
          user_id: userId,
          task_data: task,
          status: initialStatus
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
    const { userId, taskData, code, language = 'javascript' } = req.body;
    if (!taskData || !code) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const result = await evaluateCode(taskData, code, language);
    
    // DB Update Logic for pass/fail tracking
    if (userId) {
       // Fetch the latest task for this user
       const { data: latestTasks } = await supabaseAdmin
          .from('daily_tasks')
          .select('id, status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
          
       if (latestTasks && latestTasks.length > 0) {
          const currentTask = latestTasks[0];
          const passed = result.passed === true;
          
          let newStatus = passed ? 'passed' : 'failed';
          
          if (currentTask.status === 'fallback_retry' || currentTask.status === 'failed_second_attempt') {
             newStatus = passed ? 'passed_second_attempt' : 'failed_second_attempt';
          }
          
          await supabaseAdmin
             .from('daily_tasks')
             .update({ status: newStatus })
             .eq('id', currentTask.id);
       }
    }
    
    res.json(result);
  } catch (error) {
    console.error("Evaluation route error:", error);
    res.status(500).json({ error: "Failed to evaluate code" });
  }
});

export default router;
