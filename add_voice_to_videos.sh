#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Capabilio Demo Video Voice Generator — ElevenLabs Edition
# Run: bash add_voice_to_videos.sh
# ═══════════════════════════════════════════════════════════════════

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP="$SCRIPT_DIR/tmp_voice"
mkdir -p "$TMP"

SCENE_DUR=13   # seconds per scene (must match video)

# ── ElevenLabs Voice Options ────────────────────────────────────────
# Paste your API key from: https://elevenlabs.io → Profile → API Key
# Free tier: 10,000 chars/month (these 4 videos use ~3,800 chars total)

ELEVENLABS_API_KEY=""   # ← PASTE YOUR API KEY HERE (or leave blank to be prompted)

# Voice presets — uncomment the one you want:
VOICE_ID="21m00Tcm4TlvDq8ikWAM"  # Rachel   — warm, natural female  ✅ RECOMMENDED
#VOICE_ID="TxGEqnHWrfWFTfGW9XjX"  # Josh     — deep, confident male
#VOICE_ID="pNInz6obpgDQGcFmaJgB"  # Adam     — neutral, professional male
#VOICE_ID="EXAVITQu4vr4xnSDxMaL"  # Bella    — soft, friendly female
#VOICE_ID="ErXwobaYiN019PkySvjV"  # Antoni   — well-rounded male
#VOICE_ID="yoZ06aMxZJJ28mfd3POQ"  # Sam      — casual, energetic male
#VOICE_ID="AZnzlk1XvdvUeBnXmlld"  # Domi     — strong, clear female

MODEL="eleven_multilingual_v2"

# ── Voice style settings ─────────────────────────────────────────────
STABILITY=0.45          # 0-1 (lower = more expressive)
SIMILARITY=0.80         # 0-1 (higher = more consistent)
STYLE=0.35              # 0-1 (adds emotion/style)
SPEAKER_BOOST=true      # clarity boost

# ════════════════════════════════════════════════════════════════════

echo ""
echo "🎙️  Capabilio Demo — ElevenLabs Voice Generator"
echo "═══════════════════════════════════════════════"

# ── Check dependencies ──────────────────────────────────────────────
if ! command -v ffmpeg &>/dev/null; then
  echo "⚠️  FFmpeg not found. Installing via Homebrew..."
  if command -v brew &>/dev/null; then
    brew install ffmpeg
  else
    echo "❌  Install Homebrew first, then: brew install ffmpeg"
    exit 1
  fi
fi

if ! command -v curl &>/dev/null; then
  echo "❌  curl not found (unexpected on macOS)"
  exit 1
fi

# ── Get API key ──────────────────────────────────────────────────────
if [ -z "$ELEVENLABS_API_KEY" ]; then
  echo ""
  echo "📌  Get your free API key at: https://elevenlabs.io → Profile → API Key"
  echo "    Free tier covers all 4 videos (~3,800 chars of the 10,000/month limit)"
  echo ""
  read -p "   Paste your ElevenLabs API key: " ELEVENLABS_API_KEY
  echo ""
fi

# Validate key with a quick API call
echo "🔑  Validating API key..."
CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  "https://api.elevenlabs.io/v1/user")

if [ "$CHECK" != "200" ]; then
  echo "❌  Invalid API key (HTTP $CHECK). Check your key and try again."
  exit 1
fi
echo "   ✅  API key valid!"
echo ""

# ── Function: generate one scene audio via ElevenLabs ───────────────
gen_audio() {
  local text="$1"
  local out="$2"
  local scene_label="$3"

  echo -n "     🔊 $scene_label ... "

  # Escape text for JSON
  local escaped
  escaped=$(echo "$text" | sed 's/"/\\"/g' | sed "s/'/\\'/g")

  # Call ElevenLabs API
  local http_code
  http_code=$(curl -s -w "%{http_code}" -o "${out}.mp3" \
    -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"text\": \"${escaped}\",
      \"model_id\": \"${MODEL}\",
      \"voice_settings\": {
        \"stability\": ${STABILITY},
        \"similarity_boost\": ${SIMILARITY},
        \"style\": ${STYLE},
        \"use_speaker_boost\": ${SPEAKER_BOOST}
      }
    }")

  if [ "$http_code" != "200" ]; then
    echo "❌ API error (HTTP $http_code)"
    # Fallback to macOS say
    say -r 175 "$text" -o "${out}.aiff"
    ffmpeg -y -i "${out}.aiff" -ar 44100 -ac 1 "${out}_raw.wav" 2>/dev/null
    rm -f "${out}.aiff"
  else
    # Convert MP3 to WAV
    ffmpeg -y -i "${out}.mp3" -ar 44100 -ac 1 "${out}_raw.wav" 2>/dev/null
    rm -f "${out}.mp3"
    echo -n "✅ "
  fi

  # Pad or trim to exact scene duration
  ffmpeg -y -i "${out}_raw.wav" \
    -af "apad=whole_dur=${SCENE_DUR},atrim=duration=${SCENE_DUR}" \
    -ar 44100 -ac 1 \
    "${out}.wav" 2>/dev/null
  rm -f "${out}_raw.wav"
  echo ""
}

# ── Function: assemble voiced video ──────────────────────────────────
build_video() {
  local aud="$1"
  local label="$2"
  local input_mp4="$SCRIPT_DIR/demo-${aud}.mp4"
  local output_mp4="$SCRIPT_DIR/demo-${aud}-voiced.mp4"

  echo ""
  echo "   🎬 Assembling ${label} video..."

  # Concat 8 scene wavs
  local inputs=""
  local filters=""
  for i in $(seq 0 7); do
    inputs="$inputs -i $TMP/${aud}_scene_${i}.wav"
    filters="${filters}[${i}:a]"
  done

  ffmpeg -y $inputs \
    -filter_complex "${filters}concat=n=8:v=0:a=1[out]" \
    -map "[out]" -ar 44100 -ac 1 \
    "$TMP/${aud}_full_audio.wav" 2>/dev/null

  # Merge into video
  ffmpeg -y \
    -i "$input_mp4" \
    -i "$TMP/${aud}_full_audio.wav" \
    -c:v copy \
    -c:a aac -b:a 128k \
    -shortest \
    "$output_mp4" 2>/dev/null

  echo "   ✅  demo-${aud}-voiced.mp4 ($(du -h "$output_mp4" | cut -f1))"
}

# ════════════════════════════════════════════════════════════════════
# STUDENT VIDEO — 8 scenes
# ════════════════════════════════════════════════════════════════════
echo "📚 Student Video"
gen_audio "Every student has a resume. But without proof, recruiters ignore your profile. Connections beat credentials. That is the reality thousands of students face today." "$TMP/student_scene_0" "Scene 1/8 - Problem"
gen_audio "Capabilio Arena changes everything. Complete real coding and system design missions, earn verified skill badges, and build a profile that actually proves your skills to any recruiter." "$TMP/student_scene_1" "Scene 2/8 - Solution"
gen_audio "Getting started takes under two minutes. Upload your resume and Capabilio reads every skill, project, and internship automatically. Your complete profile is built instantly." "$TMP/student_scene_2" "Scene 3/8 - Upload"
gen_audio "The Arena has missions in Data Structures, Python, Web Development, and System Design. Every mission you complete adds a verified badge to your profile. No one can fake it." "$TMP/student_scene_3" "Scene 4/8 - Missions"
gen_audio "As you complete missions, your Capabilio Career Score grows. This is an objective rank visible to every recruiter on the platform. Not a star rating — a real, measurable score." "$TMP/student_scene_4" "Scene 5/8 - Score"
gen_audio "Interview Forge gives you AI-driven mock interviews. You get scored on technical depth, communication, and confidence. Know exactly where you stand before the real interview." "$TMP/student_scene_5" "Scene 6/8 - Interview"
gen_audio "When your score is strong, recruiters come to you. Companies on Capabilio Launchpad filter by skill, score, and college — and send interview invites directly to your profile." "$TMP/student_scene_6" "Scene 7/8 - Launchpad"
gen_audio "Start free today at capabilio dot online. Upload your resume, complete your first mission, and build a career profile that actually proves your skills to every recruiter." "$TMP/student_scene_7" "Scene 8/8 - CTA"
build_video "student" "Student"

# ════════════════════════════════════════════════════════════════════
# PROFESSIONAL VIDEO — 8 scenes
# ════════════════════════════════════════════════════════════════════
echo ""
echo "💼 Professional Video"
gen_audio "You have years of experience. But without objective proof of your market value, salary negotiations and career moves are just guesswork. Capabilio Orbit changes that completely." "$TMP/professional_scene_0" "Scene 1/8 - Problem"
gen_audio "Capabilio Orbit gives professionals four career scores that together paint a complete, objective picture of exactly where you stand in the market right now." "$TMP/professional_scene_1" "Scene 2/8 - Orbit"
gen_audio "Upload your resume and Capabilio builds your career timeline instantly — extracting every role, skill, and gap. Your baseline scores are set and visible in under sixty seconds." "$TMP/professional_scene_2" "Scene 3/8 - Resume"
gen_audio "The Vault connects to EPFO and UAN to verify your employment history using government records. This is not self-reported. It is verified. That changes everything in a negotiation." "$TMP/professional_scene_3" "Scene 4/8 - Vault"
gen_audio "Forge modules help you improve every score systematically. Trust Forge builds credibility. Promotion Forge prepares your case with data. Interview Forge sharpens your delivery." "$TMP/professional_scene_4" "Scene 5/8 - Forge"
gen_audio "Comp Intelligence gives you real salary benchmarks from verified professionals in your exact role, city, and experience level. Know the precise number to walk into negotiations with." "$TMP/professional_scene_5" "Scene 6/8 - Comp"
gen_audio "Before switching jobs or asking for a promotion, run a readiness check. See exactly how your scores match the target role and get a personal step-by-step action plan." "$TMP/professional_scene_6" "Scene 7/8 - Readiness"
gen_audio "Start at capabilio dot online. Get your free baseline score today and see exactly where you stand in the market. Because knowing your worth is the first step to being paid it." "$TMP/professional_scene_7" "Scene 8/8 - CTA"
build_video "professional" "Professional"

# ════════════════════════════════════════════════════════════════════
# COLLEGE VIDEO — 8 scenes
# ════════════════════════════════════════════════════════════════════
echo ""
echo "🏛️  College Video"
gen_audio "Placement season arrives. Five hundred students. Zero real-time data. TPOs manage everything through WhatsApp groups and spreadsheets while companies demand verified talent." "$TMP/college_scene_0" "Scene 1/8 - Problem"
gen_audio "Capabilio gives institutions live placement intelligence. See every student's readiness score, skill gap, and placement status — updated in real time, every single day, automatically." "$TMP/college_scene_1" "Scene 2/8 - Solution"
gen_audio "Onboarding is just one step. Send a single invite link to your students. They sign up, upload their resume, and your institution dashboard populates automatically within hours." "$TMP/college_scene_2" "Scene 3/8 - Onboard"
gen_audio "Your institution dashboard shows live skill scores, domain readiness, and placement status for every student. Identify skill gaps by department before campus drives begin — not after." "$TMP/college_scene_3" "Scene 4/8 - Dashboard"
gen_audio "Companies access your institution's verified batch directly on Capabilio Launchpad. They filter by skill, score, and college — and reach out to students directly. No job fair needed." "$TMP/college_scene_4" "Scene 5/8 - Recruiter"
gen_audio "NAAC and NBA placement reports that used to take weeks now generate in one click. All placement data is auto-collected from Capabilio — company names, packages, and outcomes." "$TMP/college_scene_5" "Scene 6/8 - NAAC"
gen_audio "Institution plans start at just fifteen hundred rupees per month. Students always access Capabilio completely free. You pay only for the live dashboard and recruiter portal access." "$TMP/college_scene_6" "Scene 7/8 - Pricing"
gen_audio "Partner with Capabilio. Your students get verified profiles. Recruiters come directly to your batch. And your NAAC reports generate themselves. Start at capabilio dot online today." "$TMP/college_scene_7" "Scene 8/8 - CTA"
build_video "college" "College"

# ════════════════════════════════════════════════════════════════════
# RECRUITER VIDEO — 8 scenes
# ════════════════════════════════════════════════════════════════════
echo ""
echo "🏢 Recruiter Video"
gen_audio "You hired three engineers last quarter. All three exaggerated their skills. The cost — wasted months, failed probations, and lakhs in replacement hiring. It does not have to be this way." "$TMP/recruiter_scene_0" "Scene 1/8 - Problem"
gen_audio "Capabilio Launchpad is a talent pool where every candidate has proven their skills through real missions and verified their employment through government EPFO records. Not claimed. Proven." "$TMP/recruiter_scene_1" "Scene 2/8 - Launchpad"
gen_audio "Search by role, skill, minimum score, and location. Filter to only show EPFO-verified candidates with short notice periods. Get precise, verified matches in seconds — not weeks." "$TMP/recruiter_scene_2" "Scene 3/8 - Search"
gen_audio "Open any candidate profile and see four career scores, mission-earned badges, and EPFO-verified employment history. No resume to interpret. No guesswork. Just objective proof." "$TMP/recruiter_scene_3" "Scene 4/8 - Profile"
gen_audio "Every claim on a Capabilio profile is independently verified. Skills through live coding missions. Employment through EPFO government records. If it is on their profile, it is real." "$TMP/recruiter_scene_4" "Scene 5/8 - Zero Fraud"
gen_audio "Add candidates to your shortlist and message them directly inside Capabilio. No agency. No percentage fee on the salary. Export verified profiles to your ATS in one single click." "$TMP/recruiter_scene_5" "Scene 6/8 - Shortlist"
gen_audio "Capabilio customers cut time-to-hire by sixty percent and report zero bad hires in their first year. No agency fees. No unverified resumes. Just the right hire, faster and cheaper." "$TMP/recruiter_scene_6" "Scene 7/8 - ROI"
gen_audio "Access Capabilio Launchpad at capabilio dot online. Search verified talent, shortlist in minutes, and hire with confidence. Because life is too short for bad hires." "$TMP/recruiter_scene_7" "Scene 8/8 - CTA"
build_video "recruiter" "Recruiter"

# ── Cleanup ──────────────────────────────────────────────────────────
echo ""
echo "🧹 Cleaning up..."
rm -rf "$TMP"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅  All 4 ElevenLabs-voiced videos ready!"
echo ""
echo "   demo-student-voiced.mp4"
echo "   demo-professional-voiced.mp4"
echo "   demo-college-voiced.mp4"
echo "   demo-recruiter-voiced.mp4"
echo ""
echo "   To change voice, edit VOICE_ID= at the top:"
echo "   Rachel (female): 21m00Tcm4TlvDq8ikWAM"
echo "   Josh   (male):   TxGEqnHWrfWFTfGW9XjX"
echo "   Adam   (male):   pNInz6obpgDQGcFmaJgB"
echo "   Bella  (female): EXAVITQu4vr4xnSDxMaL"
echo "   Antoni (male):   ErXwobaYiN019PkySvjV"
echo "═══════════════════════════════════════════════════════"
