import express from "express"
import { supabase } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import fetch from "node-fetch" 

const router = express.Router()

// ─── 1. Get current week's card (or generate it) ──────────────────────────────────
router.get("/current", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    // Simple week start logic (Sunday)
    const today = new Date()
    const diff = today.getDate() - today.getDay()
    const weekStart = new Date(today.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    // Check if user has a card for this week
    let { data: card, error } = await supabase
      .from("user_weekly_cards")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start_date", weekStartStr)
      .single()

    if (!card && error?.code === 'PGRST116') {
      // Create a new card (unscratched, empty assignments)
      const { data: newCard, error: insertError } = await supabase
        .from("user_weekly_cards")
        .insert({
          user_id: userId,
          week_start_date: weekStartStr,
          is_scratched: false,
          assigned_questions: null
        })
        .select()
        .single()
        
      if (insertError) throw insertError
      card = newCard
    } else if (error) {
      throw error
    }

    res.json({ card })
  } catch (error) {
    console.error("Error fetching current challenge card:", error)
    res.status(500).json({ error: "Failed to fetch card" })
  }
})

// ─── 2. Scratch the card (Assign questions) ───────────────────────────────────────
router.post("/scratch", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { cardId } = req.body

    // First, verify card belongs to user and is unscratched
    const { data: card } = await supabase
      .from("user_weekly_cards")
      .select("*")
      .eq("id", cardId)
      .eq("user_id", userId)
      .single()

    if (!card) return res.status(404).json({ error: "Card not found" })
    if (card.is_scratched) return res.status(400).json({ error: "Card already scratched" })

    // Determine user's branch (default to 'CSE' if not found in profile for safety)
    const { data: profile } = await supabase
      .from("profiles")
      .select("department, branch, stream")
      .eq("id", userId)
      .single()
      
    // Quick heuristic for branch
    const branch = profile?.branch || profile?.stream || 'CSE'

    // Fetch random 5-10 questions for this branch
    let { data: questions, error: qError } = await supabase
      .from("challenge_questions")
      .select("id")
      .eq("branch", branch)
      
    if (qError) throw qError
    
    // Fallback if no questions (Dummy it for now to CSE as requested)
    if (!questions || questions.length === 0) {
       const { data: fallbackQuestions } = await supabase
         .from("challenge_questions")
         .select("id")
         .eq("branch", "CSE")
       questions = fallbackQuestions || []
       
       if (questions.length === 0) {
         return res.status(400).json({ error: "No challenges available." })
       }
    }

    // Shuffle and pick 5 to 10
    const numQuestions = Math.floor(Math.random() * (10 - 5 + 1)) + 5
    const shuffled = questions.sort(() => 0.5 - Math.random())
    const selectedIds = shuffled.slice(0, numQuestions).map(q => q.id)

    // Update card
    const { data: updatedCard, error: updateError } = await supabase
      .from("user_weekly_cards")
      .update({
        is_scratched: true,
        assigned_questions: selectedIds
      })
      .eq("id", cardId)
      .select()
      .single()

    if (updateError) throw updateError

    res.json({ card: updatedCard })
  } catch (error) {
    console.error("Error scratching card:", error)
    res.status(500).json({ error: "Failed to scratch card" })
  }
})

// ─── 3. Get Questions Details for a Card ──────────────────────────────────────────
router.post("/questions", requireAuth, async (req, res) => {
  try {
    const { questionIds } = req.body
    if (!questionIds || questionIds.length === 0) return res.json({ questions: [] })

    const { data: questions, error } = await supabase
      .from("challenge_questions")
      .select("id, title, difficulty, workspace_type, points") // Omit description/test_cases for list view
      .in("id", questionIds)

    if (error) throw error
    res.json({ questions })
  } catch (error) {
    console.error("Error fetching challenge questions:", error)
    res.status(500).json({ error: "Failed to fetch questions" })
  }
})

// ─── 4. Get Single Question for Workspace ─────────────────────────────────────────
router.get("/questions/:id", requireAuth, async (req, res) => {
  try {
    const { data: question, error } = await supabase
      .from("challenge_questions")
      .select("*")
      .eq("id", req.params.id)
      .single()

    if (error) throw error
    res.json({ question })
  } catch (error) {
    console.error("Error fetching challenge question:", error)
    res.status(500).json({ error: "Failed to fetch question" })
  }
})

// ─── 5. Piston Evaluation Endpoint ────────────────────────────────────────────────
router.post("/evaluate", requireAuth, async (req, res) => {
  try {
    const { code, language, questionId, cardId } = req.body
    
    // Check if card is expired
    const { data: card } = await supabase
      .from("user_weekly_cards")
      .select("*")
      .eq("id", cardId)
      .single()
      
    if (!card) return res.status(404).json({ error: "Card not found" })
    
    // Expire on Saturday at midnight (handled dynamically)
    const today = new Date();
    if (today.getDay() === 0) {
        // It's Sunday! Mon-Sat is over.
        // Update expired flag in DB
        if (!card.expired) {
            await supabase.from("user_weekly_cards").update({ expired: true }).eq("id", cardId);
            // Drop Leaderboard Rank logic would go here.
            // Example: Decrease profile's stream ELO by 10
            const userId = req.user.id;
            await supabase.rpc('decrement_elo', { user_id: userId, amount: 10 });
        }
        return res.status(400).json({ error: "This challenge week has expired on Saturday. You missed the deadline and your branch rank has dropped!" })
    }

    if (card.completed_questions?.includes(questionId)) {
        return res.json({ passed: true, message: "Already completed." })
    }

    const { data: question } = await supabase
      .from("challenge_questions")
      .select("test_cases, points")
      .eq("id", questionId)
      .single()
      
    if (!question || !question.test_cases) return res.status(400).json({ error: "Invalid question data" })

    // Map language to Piston runtime
    const runtimeMap = {
      'javascript': { language: 'javascript', version: '18.15.0' },
      'python': { language: 'python', version: '3.10.0' },
      'java': { language: 'java', version: '15.0.2' },
      'cpp': { language: 'c++', version: '10.2.0' },
      'c': { language: 'c', version: '10.2.0' }
    }
    const runtime = runtimeMap[language] || runtimeMap['javascript']

    let allPassed = true
    const results = []

    for (const testCase of question.test_cases) {
       const pistonRes = await fetch('https://emkc.org/api/v2/piston/execute', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           language: runtime.language,
           version: runtime.version,
           files: [{ content: code }],
           stdin: testCase.input
         })
       })
       
       const execution = await pistonRes.json()
       const output = execution.run.stdout ? execution.run.stdout.trim() : ""
       const stderr = execution.run.stderr
       
       const passed = !stderr && output === String(testCase.expected_output).trim()
       if (!passed) allPassed = false
       
       results.push({
           input: testCase.input,
           expected: testCase.expected_output,
           actual: output,
           error: stderr,
           passed
       })
    }

    if (allPassed) {
       const completed = [...(card.completed_questions || []), questionId]
       const newScore = (card.score_earned || 0) + (question.points || 10)
       
       await supabase.from("user_weekly_cards").update({
           completed_questions: completed,
           score_earned: newScore
       }).eq("id", cardId)
       
       // Increase branch ELO / Leaderboard score
       await supabase.rpc('increment_elo', { user_id: req.user.id, amount: question.points || 10 });
    }

    res.json({ passed: allPassed, results, pointsEarned: allPassed ? question.points : 0 })

  } catch (error) {
    console.error("Evaluation error:", error)
    res.status(500).json({ error: "Failed to evaluate code" })
  }
})

export default router
