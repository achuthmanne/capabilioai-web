-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║           CAPABILIO ARENA v2 — Supabase Migration               ║
-- ║                                                                   ║
-- ║  Run in Supabase SQL Editor (Dashboard → SQL Editor → Run)       ║
-- ║  Or: psql $DATABASE_URL < supabase-arena-v2-migration.sql        ║
-- ╚═══════════════════════════════════════════════════════════════════╝

-- ─── 1. CHALLENGE CATALOG ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenges (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT UNIQUE NOT NULL,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN (
    'dsa','sql','frontend','backend','fullstack','debugging',
    'system_design','data_analyst','case_study','devops',
    'cybersecurity','sap','finance','hr','product','ops','communication'
  )),
  domain               TEXT NOT NULL DEFAULT 'swe',
  difficulty           TEXT NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard','Expert')),
  estimated_mins       INT NOT NULL DEFAULT 30,
  elo_impact           INT NOT NULL DEFAULT 20,
  technologies         TEXT[] DEFAULT '{}',
  skills               TEXT[] DEFAULT '{}',
  sandbox_type         TEXT NOT NULL DEFAULT 'code',
  language             TEXT,
  starter_code         TEXT,
  test_cases           JSONB DEFAULT '[]',
  dataset_url          TEXT,
  dataset_schema       JSONB,

  -- Company & visibility
  company_id           UUID,
  company_name         TEXT,
  company_logo         TEXT,
  is_company_sponsored BOOLEAN DEFAULT false,
  is_recruiter_visible BOOLEAN DEFAULT true,
  proof_type           TEXT DEFAULT 'code',
  role_relevance       TEXT[] DEFAULT '{}',

  -- Catalog metadata
  participation_count  INT DEFAULT 0,
  solve_count          INT DEFAULT 0,
  status               TEXT DEFAULT 'active' CHECK (status IN ('active','draft','archived','contest')),
  is_daily             BOOLEAN DEFAULT false,
  is_contest           BOOLEAN DEFAULT false,
  contest_end          TIMESTAMPTZ,
  deadline             TIMESTAMPTZ,
  source               TEXT DEFAULT 'capabilio',
  college_ids          TEXT[] DEFAULT '{}',
  tags                 TEXT[] DEFAULT '{}',

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_type       ON challenges(type);
CREATE INDEX IF NOT EXISTS idx_challenges_domain     ON challenges(domain);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_status     ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_elo        ON challenges(elo_impact DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_company    ON challenges(company_id);

-- ─── 2. CHALLENGE ATTEMPTS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenge_attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id     UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  arena_mission_id TEXT,   -- link to AI-generated mission (arena_submissions) if applicable

  status           TEXT DEFAULT 'in_progress' CHECK (status IN (
    'in_progress','submitted','evaluated','failed','timed_out'
  )),
  attempt_number   INT DEFAULT 1,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  submitted_at     TIMESTAMPTZ,
  evaluated_at     TIMESTAMPTZ,

  code_snapshot    TEXT,
  code_history     JSONB DEFAULT '[]',
  proof_artifacts  JSONB DEFAULT '[]',

  score            INT CHECK (score BETWEEN 0 AND 100),
  elo_delta        INT DEFAULT 0,
  execution_result JSONB DEFAULT '{}',
  test_results     JSONB DEFAULT '[]',
  feedback         JSONB DEFAULT '{}',
  grade            TEXT,

  time_taken_secs  INT,
  is_timed_out     BOOLEAN DEFAULT false,
  recruiter_visible BOOLEAN DEFAULT true,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user      ON challenge_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_challenge ON challenge_attempts(challenge_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status    ON challenge_attempts(status);

-- ─── 3. STREAK EVENTS (daily heatmap data) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS streak_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_date      DATE NOT NULL,
  challenge_count INT DEFAULT 0,
  domains         TEXT[] DEFAULT '{}',
  elo_gained      INT DEFAULT 0,
  is_freeze_used  BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, event_date)
);

CREATE INDEX IF NOT EXISTS idx_streak_user_date ON streak_events(user_id, event_date DESC);

-- ─── 4. ELO HISTORY (full audit trail per dimension) ─────────────────────────

CREATE TABLE IF NOT EXISTS elo_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_id   UUID REFERENCES challenge_attempts(id),
  mission_id   TEXT,   -- arena_submissions.id for AI missions
  elo_before   INT NOT NULL,
  elo_after    INT NOT NULL,
  delta        INT NOT NULL,
  dimension    TEXT NOT NULL DEFAULT 'overall',
  reason       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elo_user      ON elo_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_elo_user_dim  ON elo_history(user_id, dimension);

-- ─── 5. LEADERBOARD SNAPSHOTS (multi-scope, pre-computed) ───────────────────

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type     TEXT NOT NULL,
  scope_id       TEXT NOT NULL,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rank           INT NOT NULL,
  elo            INT NOT NULL,
  solve_count    INT DEFAULT 0,
  quality_score  NUMERIC(5,2) DEFAULT 0,
  streak_score   INT DEFAULT 0,
  momentum       NUMERIC(5,2) DEFAULT 0,
  proof_trust    NUMERIC(5,2) DEFAULT 0,
  snapshot_date  DATE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(scope_type, scope_id, user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_lb_scope_rank ON leaderboard_snapshots(scope_type, scope_id, snapshot_date, rank);
CREATE INDEX IF NOT EXISTS idx_lb_user       ON leaderboard_snapshots(user_id, snapshot_date DESC);

-- ─── 6. CHALLENGE SAVES (bookmarks) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenge_saves (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- ─── 7. PROOF ARTIFACTS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS proof_artifacts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_id           UUID REFERENCES challenge_attempts(id),
  challenge_id         UUID REFERENCES challenges(id),

  artifact_type        TEXT NOT NULL,
  storage_url          TEXT NOT NULL,
  file_name            TEXT,
  file_size_kb         INT,
  mime_type            TEXT,

  challenge_title       TEXT,
  challenge_type        TEXT,
  skills_demonstrated   TEXT[] DEFAULT '{}',
  technologies_used     TEXT[] DEFAULT '{}',
  score                 INT,
  elo_change            INT,
  time_taken_secs       INT,
  attempts_count        INT,

  is_recruiter_visible  BOOLEAN DEFAULT true,
  trust_level           TEXT DEFAULT 'ai_graded',
  public_proof_url      TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proof_user      ON proof_artifacts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proof_challenge ON proof_artifacts(challenge_id);
CREATE INDEX IF NOT EXISTS idx_proof_recruiter ON proof_artifacts(is_recruiter_visible, created_at DESC);

-- ─── 8. ROW-LEVEL SECURITY ──────────────────────────────────────────────────

ALTER TABLE challenges          ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_saves     ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_artifacts     ENABLE ROW LEVEL SECURITY;

-- challenges: readable by all authenticated, writable by service role only
CREATE POLICY "challenges_read" ON challenges
  FOR SELECT TO authenticated USING (status = 'active');

-- attempts: users own their own
CREATE POLICY "attempts_own" ON challenge_attempts
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- streak_events: users own their own
CREATE POLICY "streaks_own" ON streak_events
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- elo_history: users own their own
CREATE POLICY "elo_own" ON elo_history
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- leaderboard_snapshots: readable by all authenticated (public proof)
CREATE POLICY "lb_read" ON leaderboard_snapshots
  FOR SELECT TO authenticated USING (true);

-- challenge_saves: users own their own
CREATE POLICY "saves_own" ON challenge_saves
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- proof_artifacts: own profile + recruiter-visible ones
CREATE POLICY "proof_own" ON proof_artifacts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_recruiter_visible = true);

CREATE POLICY "proof_write" ON proof_artifacts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ─── 9. HELPER FUNCTIONS ─────────────────────────────────────────────────────

-- Function to upsert streak event when a challenge is completed
CREATE OR REPLACE FUNCTION upsert_streak_event(
  p_user_id UUID,
  p_date DATE,
  p_domains TEXT[],
  p_elo_gained INT
) RETURNS void AS $$
BEGIN
  INSERT INTO streak_events (user_id, event_date, challenge_count, domains, elo_gained)
  VALUES (p_user_id, p_date, 1, p_domains, p_elo_gained)
  ON CONFLICT (user_id, event_date)
  DO UPDATE SET
    challenge_count = streak_events.challenge_count + 1,
    domains = array(SELECT DISTINCT unnest(streak_events.domains || EXCLUDED.domains)),
    elo_gained = streak_events.elo_gained + EXCLUDED.elo_gained,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment challenge participation count
CREATE OR REPLACE FUNCTION increment_challenge_participation(p_challenge_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE challenges
  SET participation_count = participation_count + 1,
      updated_at = NOW()
  WHERE id = p_challenge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 10. SEED CHALLENGE CATALOG ──────────────────────────────────────────────
-- Production-grade seed data: real challenge types, real company names,
-- real technologies, real skill requirements.

INSERT INTO challenges (slug, title, description, type, domain, difficulty, estimated_mins, elo_impact, technologies, skills, sandbox_type, language, starter_code, test_cases, is_recruiter_visible, proof_type, company_name, is_company_sponsored, tags, source)
VALUES

-- ── DSA: Two Sum (Easy, SWE) ─────────────────────────────────────────────────
('two-sum',
 'Two Sum',
 'Given an array of integers nums and a target integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution.',
 'dsa', 'swe', 'Easy', 25, 15,
 ARRAY['Python','Java','JavaScript','Go','C++'],
 ARRAY['Hash Map','Array Traversal','Two Pointers'],
 'code', 'Python',
 E'def two_sum(nums: list[int], target: int) -> list[int]:\n    # TODO: implement\n    pass\n\n# Test\nprint(two_sum([2, 7, 11, 15], 9))   # Expected: [0, 1]\nprint(two_sum([3, 2, 4], 6))         # Expected: [1, 2]',
 '[{"input":"[2,7,11,15], 9","expected":"[0,1]","description":"Basic case","hidden":false},{"input":"[3,2,4], 6","expected":"[1,2]","description":"Non-obvious pair","hidden":false},{"input":"[3,3], 6","expected":"[0,1]","description":"Same element","hidden":true}]',
 true, 'code', 'Capabilio', false,
 ARRAY['arrays','hashmap','leetcode-style'], 'capabilio'),

-- ── DSA: Longest Substring (Medium, SWE) ─────────────────────────────────────
('longest-substring-no-repeat',
 'Longest Substring Without Repeating Characters',
 'Given a string s, find the length of the longest substring without repeating characters. A substring is a contiguous sequence of characters within a string.',
 'dsa', 'swe', 'Medium', 35, 25,
 ARRAY['Python','Java','JavaScript','Go'],
 ARRAY['Sliding Window','Hash Set','String Manipulation'],
 'code', 'Python',
 E'def length_of_longest_substring(s: str) -> int:\n    # TODO: implement sliding window approach\n    pass\n\nprint(length_of_longest_substring("abcabcbb"))  # 3\nprint(length_of_longest_substring("bbbbb"))      # 1\nprint(length_of_longest_substring("pwwkew"))     # 3',
 '[{"input":"abcabcbb","expected":"3","description":"Standard case with repeats","hidden":false},{"input":"bbbbb","expected":"1","description":"All same characters","hidden":false},{"input":"","expected":"0","description":"Empty string","hidden":true},{"input":"au","expected":"2","description":"Two distinct chars","hidden":true}]',
 true, 'code', 'Capabilio', false,
 ARRAY['sliding-window','strings','medium'], 'capabilio'),

-- ── SQL: Customer Revenue Analysis (Medium, DBA) ──────────────────────────────
('customer-revenue-analysis',
 'Customer Revenue Analysis — Razorpay Data Challenge',
 'Razorpay''s analytics team needs a report of top 10 merchants by revenue for Q1 2026, broken down by payment method. Write a SQL query on the transactions table.',
 'sql', 'dba', 'Medium', 30, 22,
 ARRAY['PostgreSQL','SQL','CTEs','Window Functions'],
 ARRAY['GROUP BY','JOIN','CTE','Window Functions','Aggregate Functions'],
 'sql', 'SQL',
 E'-- transactions(id, merchant_id, amount, payment_method, created_at, status)\n-- merchants(id, name, category, city)\n\nWITH q1_revenue AS (\n  -- TODO: filter Q1 2026 successful transactions\n  SELECT \n    merchant_id,\n    payment_method,\n    SUM(amount) AS revenue\n  FROM transactions\n  WHERE status = ''success''\n    -- AND created_at BETWEEN ... AND ...\n  GROUP BY merchant_id, payment_method\n)\nSELECT \n  m.name,\n  -- TODO: pivot or aggregate per payment method\n  SUM(r.revenue) AS total_revenue\nFROM q1_revenue r\nJOIN merchants m ON m.id = r.merchant_id\nGROUP BY m.id, m.name\nORDER BY total_revenue DESC\nLIMIT 10;',
 '[{"input":"Q1 2026 data","expected":"Top 10 merchants with payment method breakdown","description":"Revenue aggregation","hidden":false}]',
 true, 'code', 'Razorpay', true,
 ARRAY['sql','analytics','fintech','company-sponsored'], 'capabilio'),

-- ── Frontend: React Virtual List (Hard, Frontend) ─────────────────────────────
('react-virtual-scroll-list',
 'Build a Virtualized Scrolling List — CRED Design Challenge',
 'CRED needs a high-performance list component that can render 10,000+ transaction items without lag. Build a virtualized scroll list in React that only renders visible items. No external virtualization libraries allowed.',
 'frontend', 'frontend', 'Hard', 60, 35,
 ARRAY['React','TypeScript','CSS','DOM APIs'],
 ARRAY['Virtualization','Windowing','React Hooks','Performance Optimization','DOM Measurement'],
 'react', 'TypeScript',
 E'// Build a VirtualList component that:\n// 1. Renders only visible items (+ small overscan buffer)\n// 2. Handles variable-height items\n// 3. Exposes scrollToIndex method\n// 4. Shows scroll position indicator\n\ninterface VirtualListProps {\n  items: Array<{ id: string; height: number; content: React.ReactNode }>\n  containerHeight: number\n  overscan?: number\n}\n\nexport function VirtualList({ items, containerHeight, overscan = 3 }: VirtualListProps) {\n  // TODO: implement virtualized list\n  return <div>Implement me</div>\n}',
 '[]',
 true, 'live_demo', 'CRED', true,
 ARRAY['react','performance','virtualization','company-sponsored','hard'], 'capabilio'),

-- ── Backend: Rate Limiter (Hard, Backend) ─────────────────────────────────────
('sliding-window-rate-limiter',
 'Implement a Sliding Window Rate Limiter',
 'PhonePe''s API gateway needs a rate limiter. Implement a sliding window rate limiter that allows N requests per M seconds per client ID. Must be thread-safe and handle burst traffic correctly.',
 'backend', 'backend', 'Hard', 50, 32,
 ARRAY['Node.js','TypeScript','Redis','Algorithms'],
 ARRAY['Sliding Window','Rate Limiting','Concurrency','Data Structures','System Design'],
 'code', 'TypeScript',
 E'// Implement a sliding window rate limiter\n// Requirements:\n// - N requests per M seconds per clientId\n// - O(1) amortized time per check\n// - Must handle concurrent requests correctly\n// - Use Map for in-memory storage (pretend it''s Redis)\n\nclass SlidingWindowRateLimiter {\n  private windows: Map<string, number[]> = new Map()\n\n  constructor(\n    private readonly maxRequests: number,\n    private readonly windowMs: number\n  ) {}\n\n  isAllowed(clientId: string): boolean {\n    // TODO: implement sliding window logic\n    throw new Error("Not implemented")\n  }\n\n  getRemainingRequests(clientId: string): number {\n    // TODO: how many requests left in window\n    throw new Error("Not implemented")\n  }\n}\n\n// Tests\nconst limiter = new SlidingWindowRateLimiter(5, 1000) // 5 req/sec',
 '[{"input":"5 requests in 1s window, 6th request","expected":"6th isAllowed returns false","description":"Basic rate limit","hidden":false},{"input":"After window expires, new requests allowed","expected":"true after window reset","description":"Window expiry","hidden":true}]',
 true, 'code', 'PhonePe', true,
 ARRAY['backend','algorithms','system-design','company-sponsored'], 'capabilio'),

-- ── Data Analyst: CSV Cleaning (Medium, Data) ─────────────────────────────────
('ecommerce-data-cleaning',
 'Clean and Analyze Flipkart Order Dataset',
 'You''ve received a messy CSV export from Flipkart''s order management system. Clean the dataset, handle nulls and outliers, standardize formats, and produce a summary report with key metrics.',
 'data_analyst', 'data', 'Medium', 40, 20,
 ARRAY['Python','Pandas','NumPy','Matplotlib'],
 ARRAY['Data Cleaning','EDA','Pandas','Data Wrangling','Statistical Analysis'],
 'notebook', 'Python',
 E'import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt\n\n# Dataset columns:\n# order_id, customer_id, product_name, category, price, quantity,\n# order_date, delivery_date, status, city, payment_method\n# Known issues: null values, duplicate orders, price outliers (negative!),\n# inconsistent date formats, city name variants (Mumbai/Bombay/mumbai)\n\n# TODO: Load and inspect the data\n# df = pd.read_csv(''flipkart_orders.csv'')\n\n# Step 1: Handle duplicates\n\n# Step 2: Fix null values (strategy: fill, drop, or flag)\n\n# Step 3: Standardize city names\n\n# Step 4: Fix date formats\n\n# Step 5: Handle price outliers\n\n# Step 6: Generate summary report\n# - Total revenue by category\n# - Delivery success rate by city\n# - Monthly order trend chart',
 '[{"input":"Messy CSV dataset","expected":"Clean dataframe + summary stats + at least 1 chart","description":"Full cleaning pipeline","hidden":false}]',
 true, 'report', 'Flipkart', true,
 ARRAY['data-cleaning','pandas','analytics','company-sponsored'], 'capabilio'),

-- ── System Design: URL Shortener (Medium, SWE) ───────────────────────────────
('design-url-shortener',
 'Design a URL Shortening Service — System Design',
 'Design a URL shortening service like bit.ly that handles 100M URLs and 1B redirects/day. Provide system architecture, data model, API design, and capacity estimates.',
 'system_design', 'swe', 'Medium', 45, 28,
 ARRAY['System Design','Databases','Caching','CDN','Load Balancing'],
 ARRAY['Capacity Estimation','API Design','Database Sharding','Caching Strategy','Consistency vs Availability'],
 'diagram', 'Markdown',
 E'# URL Shortener System Design\n\n## Capacity Estimation\n- Write QPS: 100M URLs / (365 * 24 * 3600) ≈ TODO req/s\n- Read QPS:  1B redirects / (365 * 24 * 3600) ≈ TODO req/s\n- Storage:   100M * 500 bytes ≈ TODO GB/year\n\n## API Design\n```\nPOST /shorten\n  Body: { url: string, custom_alias?: string, expires_at?: date }\n  Response: { short_url, slug, expires_at }\n\nGET /{slug}\n  Response: 301 Redirect to original URL\n```\n\n## Database Schema\n```sql\n-- TODO: design the URLs table\n```\n\n## Architecture Diagram\n```\n[Client] → [Load Balancer] → [API Servers] → [Cache (Redis)] → [DB]\n```\n\n## Key Design Decisions\n| Decision | Choice | Reasoning |\n|----------|--------|-----------|\n| Hash algorithm | TODO | |\n| Sharding strategy | TODO | |\n| Cache strategy | TODO | |',
 '[]',
 true, 'report', 'Capabilio', false,
 ARRAY['system-design','distributed-systems','medium'], 'capabilio'),

-- ── Debugging: Find the Memory Leak (Hard, Backend) ──────────────────────────
('debug-node-memory-leak',
 'Debug the Node.js Memory Leak',
 'A Swiggy microservice is crashing every 6 hours with OOM errors. The code below has a memory leak. Find it, explain why it leaks, and fix it. Also add a memory monitoring guard.',
 'debugging', 'backend', 'Hard', 40, 30,
 ARRAY['Node.js','JavaScript','Memory Management','Event Emitters'],
 ARRAY['Memory Leak Detection','Event Loop','Closures','WeakMap','Heap Analysis'],
 'code', 'JavaScript',
 E'// Swiggy Order Tracker — LEAKING CODE\n// This service tracks live order status updates.\n// It crashes with "JavaScript heap out of memory" every ~6 hours in production.\n// TASK: Find and fix all memory leaks. Add a memory guard.\n\nconst EventEmitter = require("events")\nconst emitter = new EventEmitter()\n\nconst orderCache = {}   // ← is this the problem?\nconst listeners = []    // ← or this?\n\nfunction trackOrder(orderId, onUpdate) {\n  // Cache the order\n  orderCache[orderId] = {\n    id: orderId,\n    status: "placed",\n    history: [],\n    listener: onUpdate,\n    // This closure captures the entire orderCache:\n    getAll: () => Object.values(orderCache)\n  }\n\n  // Subscribe to updates\n  const listener = (data) => {\n    if (data.orderId === orderId) {\n      orderCache[orderId].status = data.status\n      orderCache[orderId].history.push(data)\n      onUpdate(data)\n    }\n  }\n  listeners.push(listener)        // ← never cleaned up\n  emitter.on("order_update", listener)\n\n  // Simulate order completion after random time\n  setTimeout(() => {\n    emitter.emit("order_update", { orderId, status: "delivered" })\n    // TODO: cleanup here?\n  }, Math.random() * 3600000)\n}\n\n// Called thousands of times per day:\nmodule.exports = { trackOrder, emitter }',
 '[{"input":"Code review","expected":"All 3 leaks identified + fixed + memory guard added","description":"Memory leak analysis","hidden":false}]',
 true, 'code', 'Swiggy', true,
 ARRAY['debugging','nodejs','memory-leak','company-sponsored'], 'capabilio'),

-- ── Cybersecurity: Log Analysis (Medium, Cyber) ───────────────────────────────
('security-log-analysis',
 'Investigate the Security Incident — Log Analysis',
 'You''ve been handed 3 days of Apache access logs from a compromised Zepto server. Analyze the logs, identify the attack vector, find the attacker''s IP, determine what data was accessed, and write an incident report.',
 'cybersecurity', 'cyber', 'Medium', 35, 22,
 ARRAY['Linux','Bash','Python','Log Analysis','Security'],
 ARRAY['Log Analysis','SQL Injection Detection','OWASP Top 10','Incident Response','Pattern Recognition'],
 'terminal', 'Bash',
 E'#!/usr/bin/env bash\n# Investigate the Zepto server compromise\n# Log format: IP - - [timestamp] "METHOD /path HTTP/1.1" status bytes "referer" "user-agent"\n\n# TASK 1: Find all IPs with > 100 requests\n# TASK 2: Identify suspicious request patterns (SQLi, LFI, directory traversal)\n# TASK 3: Find the first exploit attempt timestamp\n# TASK 4: List all endpoints that returned 500 errors\n# TASK 5: Identify the user-agent string used by the attacker\n\n# Sample log lines are in /var/log/apache2/access.log\n# Use awk, grep, sort, uniq to analyze\n\necho "=== Top 10 IPs by request count ==="\n# TODO: awk/grep command here\n\necho "=== Suspicious requests (potential SQLi) ==="\n# TODO: grep for SQL injection patterns\n\necho "=== 500 Error endpoints ==="\n# TODO: filter and count',
 '[]',
 true, 'report', 'Zepto', true,
 ARRAY['cybersecurity','log-analysis','incident-response','company-sponsored'], 'capabilio'),

-- ── DevOps: CI/CD Pipeline (Medium, DevOps) ───────────────────────────────────
('github-actions-pipeline',
 'Build a Production-Grade CI/CD Pipeline',
 'Ola''s engineering team needs a GitHub Actions CI/CD pipeline for a Node.js microservice. Build a complete pipeline: lint → test → security scan → Docker build → staging deploy → prod deploy with manual approval.',
 'devops', 'devops', 'Medium', 45, 25,
 ARRAY['GitHub Actions','Docker','YAML','Node.js','Shell','Security Scanning'],
 ARRAY['CI/CD','Docker','GitHub Actions','YAML','Security Scanning','Deployment Strategies'],
 'code', 'YAML',
 E'# .github/workflows/ci-cd.yml\n# Ola Microservice CI/CD Pipeline\n# Requirements:\n# 1. Trigger: push to main + PRs\n# 2. Jobs: lint, test, security-scan, docker-build, deploy-staging, deploy-prod\n# 3. deploy-prod requires manual approval (GitHub Environment protection)\n# 4. Cache node_modules between runs\n# 5. Fail fast on test failures\n# 6. Send Slack notification on prod deploy\n\nname: CI/CD Pipeline\n\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\nenv:\n  REGISTRY: ghcr.io\n  IMAGE_NAME: ${{ github.repository }}\n\njobs:\n  lint:\n    name: Lint & Type Check\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      # TODO: setup Node, cache, run lint\n\n  test:\n    name: Run Tests\n    needs: lint\n    runs-on: ubuntu-latest\n    # TODO: needs postgres service container\n    steps:\n      - uses: actions/checkout@v4\n      # TODO: run tests with coverage\n\n  security-scan:\n    # TODO: Snyk or Trivy scan\n\n  docker-build:\n    # TODO: build and push to GHCR\n\n  deploy-staging:\n    # TODO: deploy to staging env\n\n  deploy-prod:\n    # TODO: manual approval + production deploy',
 '[]',
 true, 'code', 'Ola', true,
 ARRAY['devops','cicd','github-actions','company-sponsored'], 'capabilio'),

-- ── Full-Stack: Auth System (Hard, Fullstack) ─────────────────────────────────
('fullstack-auth-system',
 'Build a Secure Authentication System',
 'Groww needs a complete authentication system with email/password, Google OAuth, JWT access + refresh tokens, rate limiting on login, and a "forgot password" email flow. Build the Node.js backend + React frontend.',
 'fullstack', 'fullstack', 'Hard', 75, 38,
 ARRAY['Node.js','React','TypeScript','PostgreSQL','JWT','OAuth','Redis'],
 ARRAY['Authentication','OAuth 2.0','JWT','Session Management','Security','CORS','Rate Limiting'],
 'code', 'TypeScript',
 E'// Build a complete authentication system:\n//\n// Backend (Express + TypeScript):\n// POST /auth/register     - email + password, bcrypt hash\n// POST /auth/login        - returns access (15m) + refresh (7d) tokens\n// POST /auth/refresh      - rotate refresh token\n// POST /auth/logout       - revoke refresh token\n// POST /auth/forgot-password - send reset email\n// POST /auth/reset-password  - validate token + update password\n// GET  /auth/me           - protected route, return user\n// GET  /auth/google       - initiate Google OAuth\n// GET  /auth/google/callback - handle OAuth callback\n//\n// Frontend (React + TypeScript):\n// - Login / Register forms with validation\n// - Silent token refresh on 401\n// - Persistent session via localStorage (refresh token)\n// - Protected route HOC\n//\n// Security requirements:\n// - bcrypt cost factor >= 12\n// - JWT signed with RS256 (asymmetric)\n// - Refresh token stored in httpOnly cookie\n// - Rate limit login to 5 attempts/15 min per IP\n// - CSRF protection on state-changing endpoints',
 '[]',
 true, 'code', 'Groww', true,
 ARRAY['fullstack','authentication','security','hard','company-sponsored'], 'capabilio'),

-- ── Finance: Valuation Model (Medium, Finance) ───────────────────────────────
('dcf-valuation-model',
 'Build a DCF Valuation Model — Zerodha Finance Challenge',
 'Zerodha''s research team needs a Discounted Cash Flow (DCF) model for an Indian IT company. Build a Python model that reads financial data, projects 5 years of free cash flow, and computes intrinsic value.',
 'finance', 'data', 'Medium', 40, 20,
 ARRAY['Python','Pandas','NumPy','Finance'],
 ARRAY['DCF Valuation','Financial Modeling','WACC','Terminal Value','Free Cash Flow'],
 'notebook', 'Python',
 E'import pandas as pd\nimport numpy as np\n\n# Infosys Financial Data (FY2025, in Crores INR)\nfinancials = {\n    "revenue":        [147649, 159638, 175096, 183754, 196450],  # FY21-25\n    "ebit":           [27034,  30710,  33688,  29975,  33026],\n    "tax_rate":       [0.255,  0.257,  0.259,  0.258,  0.258],\n    "capex":          [1734,   1816,   2049,   2291,   2504],\n    "depreciation":   [3082,   3524,   3914,   4303,   4730],\n    "change_in_wc":   [2018,   1756,   2289,  -1204,   1870],\n}\n\n# DCF Parameters\nWACC           = 0.13   # Weighted Average Cost of Capital (13%)\nterminal_growth = 0.05  # Long-term growth rate (5%)\nforecast_years  = 5     # Projection period\n\nshares_outstanding = 4167  # Crores\nnet_debt           = 15234  # Crores (debt - cash)\n\n# TASK 1: Calculate historical Free Cash Flow (FCF)\n# FCF = EBIT * (1 - tax_rate) + Depreciation - CapEx - Change in WC\n\n# TASK 2: Project next 5 years FCF (use CAGR of historical revenue growth)\n\n# TASK 3: Calculate Terminal Value (Gordon Growth Model)\n# TV = FCF_year5 * (1 + g) / (WACC - g)\n\n# TASK 4: Discount all cash flows to PV\n# PV = CF_t / (1 + WACC)^t\n\n# TASK 5: Calculate intrinsic value per share\n# Enterprise Value = PV of FCFs + PV of Terminal Value\n# Equity Value = EV - Net Debt\n# Per Share = Equity Value / Shares Outstanding',
 '[]',
 true, 'report', 'Zerodha', true,
 ARRAY['finance','dcf','python','modeling','company-sponsored'], 'capabilio'),

-- ── Product: PRD Writing (Medium, Product) ────────────────────────────────────
('write-prd-feature',
 'Write a PRD — Meesho Cart Abandonment Recovery Feature',
 'Meesho''s conversion rate is 12% below target due to cart abandonment. As PM, write a complete Product Requirements Document for a cart abandonment recovery system with push notifications, email, and WhatsApp nudges.',
 'product', 'data', 'Medium', 45, 18,
 ARRAY['Product Management','PRD Writing','Analytics','User Research'],
 ARRAY['PRD Writing','Product Strategy','A/B Testing','User Segmentation','Metrics Definition'],
 'markdown', 'Markdown',
 E'# Cart Abandonment Recovery — PRD\n**Meesho | PM: [Your Name] | Date: June 2026 | Status: Draft**\n\n---\n\n## 1. Problem Statement\n<!-- What problem are we solving? Data to support it? -->\n\n## 2. Success Metrics\n<!-- Primary metric, secondary metrics, guardrail metrics -->\n| Metric | Current | Target | Why it matters |\n|--------|---------|--------|-----------------|\n| Cart recovery rate | TODO% | TODO% | TODO |\n\n## 3. Target Users\n<!-- User segments most likely to abandon. Include data/persona. -->\n\n## 4. Solution Overview\n<!-- High-level approach -->\n\n## 5. User Stories\n<!-- As a [user], I want to [action] so that [outcome] -->\n\n## 6. Requirements\n### 6.1 Functional Requirements\n\n### 6.2 Non-Functional Requirements\n\n## 7. Out of Scope\n\n## 8. A/B Test Design\n<!-- What will you test? Control vs treatment? Sample size? -->\n\n## 9. Go-to-Market Plan\n\n## 10. Risks & Mitigations\n| Risk | Likelihood | Impact | Mitigation |\n|------|------------|--------|------------|',
 '[]',
 true, 'report', 'Meesho', true,
 ARRAY['product','prd','strategy','company-sponsored'], 'capabilio')

ON CONFLICT (slug) DO UPDATE SET
  updated_at = NOW();

-- ─── 11. VERIFY MIGRATION ────────────────────────────────────────────────────
DO $$
DECLARE
  challenge_count INT;
BEGIN
  SELECT COUNT(*) INTO challenge_count FROM challenges;
  RAISE NOTICE '✅ Arena v2 migration complete. % challenges seeded.', challenge_count;
END;
$$;
