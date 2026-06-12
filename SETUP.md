# Capabilio Professional Path — Setup Guide

## Architecture
- **Frontend**: React 18 + Vite (port 3000)
- **Backend**: Express.js API server (port 4000)
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI**: Anthropic Claude + Groq (fast fallback) + Gemini (PDF/search)
- **Payments**: Razorpay
- **Storage**: Supabase Storage (profile photos, vault documents)

## Quick Start

### 1. Install dependencies
```bash
cd capabilio-web
npm install
cd frontend && npm install && cd ..
```

### 2. Environment variables
Copy `.env` and fill in all values. Critical ones:
- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (safe for browser)
- `SUPABASE_SERVICE_KEY` — Supabase service role key (server only, never expose)
- `ANTHROPIC_API_KEY` — Claude API key (AI interviews, forge evaluation, reports)
- `GROQ_API_KEY` — Groq API key (fast AI fallback)
- `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` — payment processing

### 3. Database setup
Run `supabase-professional-path.sql` in your Supabase SQL editor.
All tables are created with RLS enabled and safe to re-run.

### 4. Supabase Storage buckets
Create these buckets in Supabase Dashboard → Storage:
- `profile-photos` (public)
- `vault-documents` (private)
- `resume-uploads` (private)

Or use the Supabase CLI:
```bash
supabase storage create-bucket profile-photos --public
supabase storage create-bucket vault-documents
supabase storage create-bucket resume-uploads
```

### 5. Dev server
```bash
npm run dev:all    # starts both frontend (3000) and backend (4000)
```

### 6. Production build
```bash
npm run build
npm start          # serves built frontend + API on PORT
```

## Key API Modules

| Route prefix | File | Description |
|---|---|---|
| `/api/pro/profile` | professionalProfile.js | Profile CRUD, ELO, EPFO, visibility |
| `/api/pro/timeline` | careerTimeline.js | Career timeline + approval flow |
| `/api/pro/vault` | careerTimeline.js | Vault document management |
| `/api/pro/skills` | skillGraph.js | Skill graph with icons + proof |
| `/api/pro/forge` | forge.js | Forge missions + AI evaluation |
| `/api/pro/interview` | aiInterview.js | AI interview sessions + scoring |
| `/api/jobs` | recruiterComms.js | Job listings + applications |
| `/api/recruiter` | recruiterComms.js | Messaging + scheduling |
| `/api/offers` | recruiterComms.js | Offer management |
| `/api/mentors` | mentorHub.js | Mentor profiles + bookings + payouts |
| `/api/pulse` | pulseNexus.js | Social feed + interactions |
| `/api/nexus` | pulseNexus.js | Network + connections + notifications |
| `/api/orbit` | orbitPlans.js | Subscriptions + coupons |
| `/api/intel` | orbitPlans.js | Career intelligence reports |

## Database Tables

| Table | Purpose |
|---|---|
| profiles | Extended user profiles |
| career_timeline | Work history with verification states |
| vault_documents | Secure document storage |
| skill_graph | Skills with icons, ELO, proof |
| epfo_verifications | EPFO/UAN verification requests |
| forge_items | Career mission definitions |
| forge_submissions | User proof submissions |
| ai_interview_sessions | Interview session tracking |
| ai_interview_questions | Q&A with scores |
| jobs | Job listings |
| saved_jobs | User saved jobs |
| job_applications | Applications with stage tracking |
| recruiter_profiles | Recruiter accounts |
| recruiter_messages | Direct messaging |
| interview_schedules | Interview scheduling |
| offers | Offer letters |
| mentor_profiles | Mentor accounts |
| mentor_bookings | Session bookings + payments |
| mentor_payouts | Payout tracking |
| user_subscriptions | Orbit plan subscriptions |
| coupons | Discount codes |
| coupon_redemptions | Usage tracking |
| career_reports | Intelligence reports |
| pulse_posts | Social feed posts |
| post_interactions | Reactions/signals/saves |
| post_comments | Comments + replies |
| connections | Professional connections |
| follows | Follow relationships |
| notifications | Real-time notification queue |

## Orbit Plans

| Plan | Monthly | Yearly | Features |
|---|---|---|---|
| Free | ₹0 | ₹0 | 10 skills, 10 jobs/day, basic ELO |
| Orbit Pro | ₹499 | ₹4,799 | Unlimited skills, EPFO, comp intel, 5 interviews, 2 reports |
| Orbit Elite | ₹999 | ₹9,599 | Everything + unlimited interviews/reports, mentor monetization |

## Seeded Coupons (Test)
- `LAUNCH50` — 50% off Pro or Elite
- `ELITE30` — 30% off Elite
- `PRO999` — ₹500 flat off Pro
- `COUPLE2024` — 40% off for couple plans

## Environment Variables Reference

```env
# Frontend (VITE_ prefix = exposed to browser)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:4000
VITE_RAZORPAY_KEY_ID=rzp_...

# Backend (server-side only)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # Never expose this
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AI...
OPENAI_API_KEY=sk-proj-...   # Optional
DEEPGRAM_API_KEY=...          # Voice interviews
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
PROXYCURL_API_KEY=...         # LinkedIn extraction
GITHUB_TOKEN=...               # GitHub analysis
PINECONE_API_KEY=...           # Semantic job matching
PINECONE_HOST=https://...
PORT=4000
FRONTEND_URL=https://capabilio.online
```

## Security Checklist
- [ ] All Supabase tables have RLS enabled ✓
- [ ] Service role key is server-only ✓
- [ ] EPFO UAN is encrypted/server-side only ✓
- [ ] Vault documents require signed URLs ✓
- [ ] Offer letters require auth ✓
- [ ] Payments verified with Razorpay signature ✓
- [ ] File uploads validated for type + size ✓
- [ ] API routes protected with requireAuth middleware ✓
- [ ] CORS configured for specific origins ✓
- [ ] Secrets not in codebase ✓ (use .env)

## Deployment (Render / Railway / Fly.io)

The server.js serves the built React frontend in production:
1. Set `NODE_ENV=production`
2. Run `npm run build` (builds React to `/dist`)
3. Run `npm start` (serves both API and frontend from one process)

For separate deployments:
- Backend: Deploy `backend/` as Node.js app
- Frontend: Deploy to Vercel/Netlify with `VITE_API_URL` pointing to backend
