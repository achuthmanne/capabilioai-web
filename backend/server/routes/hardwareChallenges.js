/**
 * Hardware Challenges Routes  —  /api/hardware/*
 *
 *   GET  /api/hardware/challenges          — list challenges (filterable by stream/category)
 *   GET  /api/hardware/challenges/:id      — challenge detail + steps
 *   POST /api/hardware/challenges/:id/attempt — submit answer → AI graded → ELO
 *   GET  /api/hardware/my-attempts         — user's submission history
 *   POST /api/hardware/challenges/:id/like — like/unlike a challenge
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { groq, GROQ_FAST } from "../lib/groq.js"

const router = Router()

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "Unauthorized" })
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: "Unauthorized" })
  req.user = user
  next()
}
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return next()
  supabaseAdmin.auth.getUser(token).then(({ data: { user } }) => { req.user = user; next() }).catch(() => next())
}

// ── Seed challenges (used if table is empty) ──────────────────────────────────
const SEED_CHALLENGES = [
  // ── ECE / EEE ──────────────────────────────────────────────────────────────
  {
    id: "ece-001",
    title: "LED Brightness Control with PWM",
    stream: "ECE",
    category: "Circuits",
    difficulty: "Beginner",
    elo_reward: 25,
    thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
    description: "Design a PWM circuit to control LED brightness using a 555 timer IC. Understand duty cycle and frequency relationships.",
    context: "PWM (Pulse Width Modulation) is fundamental in motor control, LED dimming, and power supplies. The 555 timer in astable mode generates a square wave whose duty cycle controls average voltage.",
    steps: [
      { step: 1, title: "Calculate frequency", instruction: "Given R1=1kΩ, R2=10kΩ, C=0.1µF — calculate the frequency of oscillation using f = 1.44/((R1+2R2)×C)" },
      { step: 2, title: "Duty cycle", instruction: "Calculate the duty cycle D = (R1+R2)/(R1+2R2). What % of time is the output HIGH?" },
      { step: 3, title: "LED current", instruction: "With Vcc=5V and LED forward voltage 2V, what resistor limits current to 20mA?" },
      { step: 4, title: "Design the circuit", instruction: "Draw the complete schematic: 555 timer astable → current-limiting resistor → LED. Label all component values." },
      { step: 5, title: "Describe your design", instruction: "Explain your complete circuit: component values chosen, expected LED brightness behaviour, and how you would vary the duty cycle." }
    ],
    rubric: "Award marks for: correct frequency calculation (20%), correct duty cycle (20%), correct current-limiting resistor (20%), clear circuit description with all components named (30%), explanation of PWM behaviour (10%)",
    tags: ["555 timer", "PWM", "LED", "Circuits"],
    attempts: 142, views: 891, likes: 34
  },
  {
    id: "ece-002",
    title: "Low-Pass RC Filter Design",
    stream: "ECE",
    category: "Signal Processing",
    difficulty: "Intermediate",
    elo_reward: 40,
    thumbnail: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80",
    description: "Design and analyse a first-order RC low-pass filter with cutoff frequency of 1kHz. Analyse frequency response.",
    context: "RC filters are the building blocks of audio equalizers, noise filters, and anti-aliasing circuits. Understanding the -3dB cutoff frequency and roll-off rate is essential for any signal processing role.",
    steps: [
      { step: 1, title: "Calculate R and C", instruction: "Using fc = 1/(2π×R×C), choose R and C values to give a cutoff of exactly 1kHz. Show your working." },
      { step: 2, title: "Phase shift", instruction: "At f = fc, what is the phase shift of the output signal relative to the input?" },
      { step: 3, title: "Attenuation at 10kHz", instruction: "Calculate the attenuation (in dB) at 10kHz — 10× above cutoff." },
      { step: 4, title: "Bode plot", instruction: "Describe the Bode magnitude plot: what is the slope in dB/decade above cutoff?" },
      { step: 5, title: "Full analysis", instruction: "Write your complete filter design: R and C values, cutoff frequency verification, phase response at cutoff, attenuation at 10kHz, and practical application of this filter." }
    ],
    rubric: "Award marks for: correct R and C values (25%), correct phase shift at cutoff (15%), correct attenuation at 10kHz (20%), correct Bode slope (15%), practical application and clear explanation (25%)",
    tags: ["RC filter", "Frequency response", "Signal processing", "Bode plot"],
    attempts: 98, views: 542, likes: 21
  },
  {
    id: "ece-003",
    title: "Op-Amp Inverting Amplifier",
    stream: "ECE",
    category: "Analog",
    difficulty: "Intermediate",
    elo_reward: 40,
    thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
    description: "Design an inverting amplifier with gain of -10 using an ideal op-amp. Understand virtual ground and feedback.",
    context: "Op-amp inverting amplifiers are ubiquitous in sensor conditioning, audio amplification, and instrumentation. The virtual ground concept and negative feedback are foundational.",
    steps: [
      { step: 1, title: "Virtual ground concept", instruction: "Explain why the inverting input of an ideal op-amp is at 0V (virtual ground) when the non-inverting input is grounded." },
      { step: 2, title: "Gain formula", instruction: "Derive the voltage gain Av = -Rf/Rin. With gain = -10, if Rin = 1kΩ, what is Rf?" },
      { step: 3, title: "Input impedance", instruction: "What is the input impedance of this inverting amplifier? Why is this important?" },
      { step: 4, title: "Output voltage", instruction: "If input Vin = 0.5V sinusoidal, what is Vout? Describe amplitude and phase." },
      { step: 5, title: "Complete design", instruction: "Describe your full amplifier design: component values, gain derivation, output for a 0.5V input, input impedance, and one real-world application of this circuit." }
    ],
    rubric: "Award marks for: correct explanation of virtual ground (20%), correct Rf value (20%), correct input impedance (15%), correct output description (20%), real-world application (25%)",
    tags: ["Op-amp", "Amplifier", "Analog", "Feedback"],
    attempts: 75, views: 421, likes: 18
  },
  // ── IoT ────────────────────────────────────────────────────────────────────
  {
    id: "iot-001",
    title: "Temperature Monitoring with Arduino + DHT11",
    stream: "IoT",
    category: "Sensors",
    difficulty: "Beginner",
    elo_reward: 25,
    thumbnail: "https://images.unsplash.com/photo-1553406830-ef2513450d76?w=600&q=80",
    description: "Build an IoT temperature monitoring system using Arduino Uno and DHT11 sensor. Send readings to serial monitor.",
    context: "Temperature sensing is the entry point for IoT. DHT11 communicates via single-wire protocol. Understanding pull-up resistors, timing requirements, and data parsing is fundamental for any IoT role.",
    steps: [
      { step: 1, title: "Circuit wiring", instruction: "DHT11 has 4 pins: VCC, Data, NC, GND. Describe how you connect it to Arduino Uno. What pull-up resistor is needed on the Data pin and why?" },
      { step: 2, title: "Library and code", instruction: "Which Arduino library handles DHT11 communication? Write pseudocode to read temperature and humidity every 2 seconds and print to Serial." },
      { step: 3, title: "Data validation", instruction: "DHT11 sends a checksum byte. Why is this important? What should your code do if the checksum fails?" },
      { step: 4, title: "Alert logic", instruction: "Add logic: if temperature > 35°C, turn on an LED on pin 13. Describe the code logic and any debounce considerations." },
      { step: 5, title: "Full system description", instruction: "Describe your complete system: wiring, code logic, data validation, alert behaviour, and how you would extend this to send data to a cloud dashboard like ThingSpeak." }
    ],
    rubric: "Award marks for: correct wiring description and pull-up explanation (20%), correct library usage and pseudocode (25%), checksum validation understanding (15%), alert logic (20%), cloud extension idea (20%)",
    tags: ["Arduino", "DHT11", "Sensors", "IoT", "Temperature"],
    attempts: 203, views: 1240, likes: 67
  },
  {
    id: "iot-002",
    title: "MQTT Smart Home Light Control",
    stream: "IoT",
    category: "Networking",
    difficulty: "Intermediate",
    elo_reward: 45,
    thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    description: "Design an MQTT-based smart home system where an ESP8266 controls a relay (light) based on messages from a mobile app.",
    context: "MQTT is the backbone of IoT networking — lightweight publish/subscribe protocol used in home automation (Home Assistant), industrial monitoring, and smart cities.",
    steps: [
      { step: 1, title: "MQTT concepts", instruction: "Explain: broker, publisher, subscriber, topic, QoS level 0 vs 1 vs 2. When would you use QoS 2 for a home automation system?" },
      { step: 2, title: "ESP8266 setup", instruction: "Which ESP8266 library connects to an MQTT broker? Write pseudocode to connect to broker at 192.168.1.100, subscribe to topic 'home/light', and toggle a relay on pin D5 when message is 'ON' or 'OFF'." },
      { step: 3, title: "Security", instruction: "The MQTT broker is on a home network. What are two security risks and how do you mitigate them? (Consider authentication and encryption.)" },
      { step: 4, title: "Last Will message", instruction: "What is an MQTT Last Will and Testament (LWT) message? How would you use it to detect if the ESP8266 goes offline?" },
      { step: 5, title: "Complete system", instruction: "Describe your full smart home light system: hardware connections, MQTT topic structure, ESP8266 code logic, security measures, and LWT implementation." }
    ],
    rubric: "Award marks for: correct MQTT concept explanation (20%), correct pseudocode with subscribe/relay logic (25%), security measures (20%), LWT explanation (15%), complete system description (20%)",
    tags: ["MQTT", "ESP8266", "Smart home", "IoT", "Networking"],
    attempts: 89, views: 567, likes: 29
  },
  // ── Mechanical ─────────────────────────────────────────────────────────────
  {
    id: "mech-001",
    title: "Cantilever Beam Deflection Analysis",
    stream: "Mechanical",
    category: "Structures",
    difficulty: "Intermediate",
    elo_reward: 40,
    thumbnail: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80",
    description: "Analyse the deflection and stress in a steel cantilever beam with a point load at the free end.",
    context: "Cantilever beams appear in bridges, aircraft wings, diving boards, and building overhangs. Deflection and stress analysis is the foundation of structural engineering and mechanical design.",
    steps: [
      { step: 1, title: "Problem setup", instruction: "Steel cantilever beam: Length L=2m, rectangular cross-section 50mm×100mm, point load P=5kN at free end. E(steel)=200GPa. Draw the free body diagram and identify the fixed support reactions." },
      { step: 2, title: "Bending moment", instruction: "Calculate the maximum bending moment. Where does it occur? Write the bending moment equation M(x) along the beam length." },
      { step: 3, title: "Maximum stress", instruction: "Calculate the maximum bending stress using σ = M×c/I where c is distance from neutral axis to outer fibre. Is this within the yield strength of steel (250MPa)?" },
      { step: 4, title: "Maximum deflection", instruction: "Use δmax = PL³/(3EI) to calculate the maximum deflection at the free end. Express in mm." },
      { step: 5, title: "Complete analysis", instruction: "Present your complete beam analysis: FBD, support reactions, bending moment diagram description, maximum stress, maximum deflection, and whether this design is safe. Suggest a design change if needed." }
    ],
    rubric: "Award marks for: correct FBD and reactions (20%), correct bending moment (20%), correct maximum stress with safety check (25%), correct deflection (20%), design recommendation (15%)",
    tags: ["Beam", "Deflection", "Stress analysis", "Structures", "Mechanics"],
    attempts: 67, views: 389, likes: 15
  },
  {
    id: "mech-002",
    title: "Gear Train Speed Reduction Design",
    stream: "Mechanical",
    category: "Machine Design",
    difficulty: "Beginner",
    elo_reward: 25,
    thumbnail: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80",
    description: "Design a two-stage gear train to reduce motor speed from 1440 RPM to 60 RPM with minimum package size.",
    context: "Gear trains are in every machine — from car transmissions to industrial reducers to robotics. Understanding gear ratios, module, and torque multiplication is fundamental for mechanical and production engineers.",
    steps: [
      { step: 1, title: "Overall gear ratio", instruction: "Calculate the required overall gear ratio to reduce 1440 RPM to 60 RPM. Distribute this across two stages so each stage ratio is between 3:1 and 6:1." },
      { step: 2, title: "Stage 1 design", instruction: "Stage 1: driver gear has 20 teeth. How many teeth does the driven gear need for your chosen Stage 1 ratio? What is the output RPM of Stage 1?" },
      { step: 3, title: "Stage 2 design", instruction: "Stage 2 must bring the speed from Stage 1 output down to 60 RPM. If the driver gear has 18 teeth, how many teeth on the driven gear?" },
      { step: 4, title: "Torque multiplication", instruction: "If motor output torque is 10 N·m, what is the output torque after the two-stage reduction? (Ignore friction losses.) Why does torque increase when speed decreases?" },
      { step: 5, title: "Complete design", instruction: "Describe your complete two-stage gear train: gear ratios for each stage, teeth counts, speed at each stage, final output torque, and one real machine where this reducer would be used." }
    ],
    rubric: "Award marks for: correct overall ratio and stage distribution (20%), correct Stage 1 teeth (20%), correct Stage 2 teeth (20%), correct output torque with explanation (25%), real application (15%)",
    tags: ["Gear train", "Speed reduction", "Machine design", "Torque"],
    attempts: 113, views: 678, likes: 28
  },
  // ── Civil ──────────────────────────────────────────────────────────────────
  {
    id: "civil-001",
    title: "Concrete Mix Design for M25 Grade",
    stream: "Civil",
    category: "Materials",
    difficulty: "Beginner",
    elo_reward: 25,
    thumbnail: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80",
    description: "Design a nominal concrete mix for M25 grade and calculate material quantities for 1 cubic metre of concrete.",
    context: "Concrete mix design determines the strength, durability, and workability of structures. M25 (25MPa characteristic strength) is widely used for slabs, beams, and columns in residential and commercial buildings.",
    steps: [
      { step: 1, title: "M25 meaning", instruction: "What does M25 mean? What is the characteristic compressive strength and after how many days is it tested? What is the target mean strength used in design?" },
      { step: 2, title: "Mix ratio", instruction: "The nominal mix ratio for M25 is 1:1:2 (cement:sand:aggregate). What does each number represent? Why do higher-grade concretes use less aggregate?" },
      { step: 3, title: "Material quantities", instruction: "For 1m³ of M25 concrete (density ≈ 2400 kg/m³), using ratio 1:1:2 with w/c ratio 0.5: calculate the quantities of cement, sand, aggregate, and water in kg." },
      { step: 4, title: "Water-cement ratio", instruction: "What is the significance of the w/c ratio? What happens to strength if you add extra water at the site? What is the maximum w/c ratio for M25 per IS:456?" },
      { step: 5, title: "Complete mix design", instruction: "Present your complete M25 mix design: grade meaning, target strength, material quantities per m³, w/c ratio and its importance, and quality control checks you would perform on site." }
    ],
    rubric: "Award marks for: correct M25 interpretation (20%), correct mix ratio explanation (15%), correct material quantities (30%), w/c ratio significance (20%), quality control checks (15%)",
    tags: ["Concrete", "Mix design", "M25", "Materials", "Civil"],
    attempts: 156, views: 934, likes: 42
  },
  {
    id: "civil-002",
    title: "Simply Supported Beam — BM and SF Diagrams",
    stream: "Civil",
    category: "Structural Analysis",
    difficulty: "Intermediate",
    elo_reward: 40,
    thumbnail: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80",
    description: "Draw Bending Moment and Shear Force diagrams for a simply supported beam with UDL and a point load.",
    context: "Shear force and bending moment diagrams are fundamental to structural design. Every beam in a building, bridge, or floor slab must be designed based on these diagrams.",
    steps: [
      { step: 1, title: "Support reactions", instruction: "Simply supported beam AB, span 6m. UDL of 10 kN/m over full span + point load 30 kN at 2m from A. Calculate reactions Ra and Rb using equilibrium equations ΣFy=0 and ΣM=0." },
      { step: 2, title: "Shear force diagram", instruction: "Calculate the shear force at: x=0 (just right of A), x=2m (just left and right of the point load), x=6m (just left of B). Describe the shape of the SFD." },
      { step: 3, title: "Point of zero shear", instruction: "The maximum bending moment occurs where shear force = 0. Find the location of zero shear between the point load and B. Show your calculation." },
      { step: 4, title: "Bending moment values", instruction: "Calculate bending moment at: x=2m (point load location), x=location of zero shear, x=0 and x=6m (supports). What are the values at the supports and why?" },
      { step: 5, title: "Complete analysis", instruction: "Present your complete analysis: support reactions, key SFD values and shape description, location and value of maximum BM, shape of BMD, and which cross-section requires the most reinforcement steel." }
    ],
    rubric: "Award marks for: correct support reactions (25%), correct SFD values (20%), correct zero shear location (20%), correct BMD values (20%), reinforcement conclusion (15%)",
    tags: ["Bending moment", "Shear force", "Beam", "Structural analysis", "Civil"],
    attempts: 88, views: 511, likes: 23
  },
]

// ── GET /hardware/challenges ──────────────────────────────────────────────────
router.get("/hardware/challenges", optionalAuth, async (req, res) => {
  try {
    const { stream, category, difficulty, search, page = 1, limit = 12 } = req.query
    const uid = req.user?.id

    // Try DB first, fall back to seed data
    let challenges = []
    try {
      let q = supabaseAdmin.from("hardware_challenges")
        .select("id,title,stream,category,difficulty,elo_reward,thumbnail,description,tags,attempts,views,likes,created_at")
        .order("views", { ascending: false })
        .range((page-1)*limit, page*limit-1)
      if (stream && stream !== "All") q = q.eq("stream", stream)
      if (category && category !== "All") q = q.eq("category", category)
      if (difficulty) q = q.eq("difficulty", difficulty)
      if (search) q = q.ilike("title", `%${search}%`)
      const { data } = await q
      if (data && data.length > 0) challenges = data
    } catch {}

    // Fall back to seed data with filtering
    if (challenges.length === 0) {
      challenges = SEED_CHALLENGES.filter(c => {
        if (stream && stream !== "All" && c.stream !== stream) return false
        if (category && category !== "All" && c.category !== category) return false
        if (difficulty && c.difficulty !== difficulty) return false
        if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
    }

    // If user is logged in, mark which ones they've attempted
    let attemptedIds = new Set()
    if (uid) {
      try {
        const { data: attempts } = await supabaseAdmin.from("hardware_submissions")
          .select("challenge_id").eq("user_id", uid)
        attemptedIds = new Set((attempts||[]).map(a => a.challenge_id))
      } catch {}
    }

    res.json({
      challenges: challenges.map(c => ({ ...c, attempted: attemptedIds.has(c.id) })),
      total: challenges.length,
      streams: ["All", "ECE", "IoT", "Mechanical", "Civil", "EEE"],
      categories: ["All", "Circuits", "Signal Processing", "Analog", "Sensors", "Networking", "Structures", "Machine Design", "Materials", "Structural Analysis"]
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /hardware/challenges/:id ──────────────────────────────────────────────
router.get("/hardware/challenges/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params

    // Try DB
    let challenge = null
    try {
      const { data } = await supabaseAdmin.from("hardware_challenges")
        .select("*").eq("id", id).single()
      if (data) challenge = data
    } catch {}

    // Fall back to seed
    if (!challenge) challenge = SEED_CHALLENGES.find(c => c.id === id)
    if (!challenge) return res.status(404).json({ error: "Challenge not found" })

    // Increment view count
    try {
      await supabaseAdmin.from("hardware_challenges")
        .update({ views: (challenge.views || 0) + 1 }).eq("id", id)
    } catch {}

    // Check if user already submitted
    let submission = null
    if (req.user?.id) {
      try {
        const { data } = await supabaseAdmin.from("hardware_submissions")
          .select("*").eq("challenge_id", id).eq("user_id", req.user.id)
          .order("created_at", { ascending: false }).limit(1).single()
        submission = data
      } catch {}
    }

    res.json({ challenge, submission })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /hardware/challenges/:id/attempt ─────────────────────────────────────
router.post("/hardware/challenges/:id/attempt", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { answer } = req.body
    const uid = req.user.id

    if (!answer?.trim() || answer.trim().length < 50) {
      return res.status(400).json({ error: "Please provide a detailed answer (at least 50 characters)" })
    }

    // Get challenge
    let challenge = null
    try {
      const { data } = await supabaseAdmin.from("hardware_challenges").select("*").eq("id", id).single()
      if (data) challenge = data
    } catch {}
    if (!challenge) challenge = SEED_CHALLENGES.find(c => c.id === id)
    if (!challenge) return res.status(404).json({ error: "Challenge not found" })

    // Build steps context for the AI
    const stepsText = (challenge.steps || []).map(s => `Step ${s.step} — ${s.title}: ${s.instruction}`).join("\n")

    // AI grading via Groq
    const gradingPrompt = `You are an expert ${challenge.stream} engineering professor grading a student submission.

CHALLENGE: ${challenge.title}
DESCRIPTION: ${challenge.description}

CHALLENGE STEPS STUDENTS SHOULD ADDRESS:
${stepsText}

GRADING RUBRIC:
${challenge.rubric}

STUDENT ANSWER:
${answer.trim()}

Grade this answer. Respond ONLY with valid JSON (no markdown):
{
  "score": <integer 0-100>,
  "grade": <"Excellent"|"Good"|"Satisfactory"|"Needs Improvement">,
  "elo_awarded": <integer — proportional to score: 0 if score<40, ${Math.round(challenge.elo_reward*0.5)} if 40-60, ${Math.round(challenge.elo_reward*0.75)} if 60-80, ${challenge.elo_reward} if 80+>,
  "strengths": ["<1-2 things student did well>"],
  "improvements": ["<1-2 specific things to improve>"],
  "model_insight": "<1 sentence of the key engineering insight the student should understand>",
  "verdict": "<2-3 sentence overall feedback personalised to their answer>"
}`

    let gradeResult = { score: 50, grade: "Satisfactory", elo_awarded: 0, strengths: ["Attempted the challenge"], improvements: ["Provide more detailed calculations"], model_insight: "Review the fundamental concepts.", verdict: "Your answer shows basic understanding. Study the steps more carefully." }

    try {
      const completion = await Promise.race([
        groq.chat.completions.create({
          model: GROQ_FAST,
          max_tokens: 800,
          temperature: 0.3,
          messages: [
            { role: "system", content: "You are a strict but fair engineering professor. Grade accurately — do not inflate scores. Respond ONLY with valid JSON." },
            { role: "user", content: gradingPrompt }
          ]
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000))
      ])
      const text = completion.choices[0]?.message?.content || "{}"
      const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
      gradeResult = JSON.parse(match ? (match[1] || match[0]) : text)
    } catch (aiErr) {
      console.warn("[hardware/attempt] AI grading failed:", aiErr.message)
    }

    // Save submission
    let submissionId = null
    try {
      const { data: sub } = await supabaseAdmin.from("hardware_submissions").insert({
        challenge_id: id,
        user_id: uid,
        answer: answer.trim(),
        score: gradeResult.score || 0,
        grade: gradeResult.grade || "Satisfactory",
        elo_awarded: gradeResult.elo_awarded || 0,
        feedback: gradeResult,
        created_at: new Date().toISOString()
      }).select("id").single()
      submissionId = sub?.id
    } catch {}

    // Update user ELO if points awarded
    if (gradeResult.elo_awarded > 0) {
      try {
        const { data: profile } = await supabaseAdmin.from("profiles").select("elo_rating").eq("id", uid).single()
        const currentElo = profile?.elo_rating || 400
        await supabaseAdmin.from("profiles").update({
          elo_rating: currentElo + gradeResult.elo_awarded,
          updated_at: new Date().toISOString()
        }).eq("id", uid)
      } catch {}

      // Update challenge attempt count
      try {
        await supabaseAdmin.from("hardware_challenges")
          .update({ attempts: (challenge.attempts || 0) + 1 }).eq("id", id)
      } catch {}
    }

    res.json({
      success: true,
      submission_id: submissionId,
      grade: gradeResult,
      elo_before: null, // client can read from profile
      message: gradeResult.elo_awarded > 0
        ? `+${gradeResult.elo_awarded} ELO awarded!`
        : "Keep practising — no ELO for scores below 40%"
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /hardware/my-attempts ─────────────────────────────────────────────────
router.get("/hardware/my-attempts", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("hardware_submissions")
      .select("*").eq("user_id", req.user.id)
      .order("created_at", { ascending: false }).limit(20)
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /hardware/challenges/:id/like ───────────────────────────────────────
router.post("/hardware/challenges/:id/like", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const challenge = SEED_CHALLENGES.find(c => c.id === id)
    const current = challenge?.likes || 0
    try {
      await supabaseAdmin.from("hardware_challenges")
        .update({ likes: current + 1 }).eq("id", id)
    } catch {}
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
