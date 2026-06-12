// ─── Gemini AI client ─────────────────────────────────────────────────────────
// Handles three jobs:
//   1. Arena mission generation — primary model for /api/arena/daily (free tier: 1500 req/day)
//   2. Extraction  — PDF/resume/LinkedIn parsing (multimodal, no search needed)
//   3. Market data — skill gap / job trend queries with Google Search grounding

import { GoogleGenerativeAI } from "@google/generative-ai"
import fs from "fs"

const key = () => {
  const k = process.env.GEMINI_API_KEY
  if (!k || k === "your_gemini_key_here") throw new Error("GEMINI_API_KEY not set in .env")
  return k
}

const client = () => new GoogleGenerativeAI(key())

// ── Models ─────────────────────────────────────────────────────────────────────
const GEMINI_FLASH   = "gemini-2.5-flash"        // fast, free tier, supports search + PDF
const GEMINI_PRO     = "gemini-2.5-flash"        // use flash for everything on free tier

// ── 1. Plain text generation (no search) ──────────────────────────────────────
export async function gemini(prompt, {
  model      = GEMINI_FLASH,
  json       = false,
  maxTokens  = 2048,
} = {}) {
  const genai     = client()
  const genModel  = genai.getGenerativeModel({ model })
  const result    = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  })
  return result.response.text()
}

// ── 2. Live web search via Google Search grounding ────────────────────────────
// This is what replaces Perplexity — Gemini searches Google natively.
// Free tier: 1,500 requests/day, 15 rpm
export async function geminiSearch(prompt, { maxTokens = 2048 } = {}) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({
    model: GEMINI_FLASH,
    tools: [{ googleSearch: {} }],   // ← Google Search grounding
  })
  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens },
  })
  const text    = result.response.text()
  // Extract search grounding metadata if available
  const grounds = result.response.candidates?.[0]?.groundingMetadata?.searchEntryPoint
  return { text, sources: grounds || null }
}

// ── 3. PDF extraction (send file as base64) ───────────────────────────────────
// Gemini reads the actual PDF layout — columns, tables, logos — not just text.
export async function geminiExtractPDF(filePath, prompt) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_PRO })
  const fileData = fs.readFileSync(filePath)
  const base64   = fileData.toString("base64")

  const result = await genModel.generateContent({
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: "application/pdf", data: base64 } },
        { text: prompt },
      ],
    }],
    generationConfig: { maxOutputTokens: 4096, responseMimeType: "application/json" },
  })
  try { return JSON.parse(result.response.text()) }
  catch { return { raw: result.response.text() } }
}

// ── 4. Image/screenshot extraction ───────────────────────────────────────────
// gemini-2.5-flash supports PDF and image inline data — use it for both
export async function geminiExtractImage(base64Image, mimeType, prompt) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })
  const result   = await genModel.generateContent({
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt },
      ],
    }],
    generationConfig: { maxOutputTokens: 4096, responseMimeType: "application/json" },
  })
  try { return JSON.parse(result.response.text()) }
  catch { return { raw: result.response.text() } }
}

// ── 5. Arena mission generation ───────────────────────────────────────────────
// Primary model for /api/arena/daily.
// Tasks are sticky — generated once, stored in Supabase, reused until completed.
// Free tier: 1,500 requests/day — more than sufficient for sticky missions.
// Returns a parsed mission object or throws on failure.
// ── Domain-specific context for realistic mission generation ──────────────────
const DOMAIN_CONTEXT = {
  // ── Data & Analytics ────────────────────────────────────────────────────────
  data: {
    type: "Data Analysis",
    workstation: "notebook",
    tools: "Python, pandas, numpy, matplotlib, seaborn, SQL",
    lang: "Python",
    scenarioTypes: [
      "Analyse {company}'s sales dataset — find top-performing products, seasonal trends, and write an executive summary with charts",
      "Clean a messy {company} customer database: handle nulls, remove duplicates, fix inconsistent date formats, standardise city names",
      "Perform cohort analysis on {company}'s user signup data to calculate 30-day, 60-day, and 90-day retention rates",
      "Investigate a sudden 23% drop in {company}'s DAU last week — identify which segment drove the drop and why",
      "Build a funnel analysis for {company}'s checkout flow — find the biggest drop-off step and suggest fixes",
      "Segment {company}'s customers into groups by purchase behaviour using RFM analysis (Recency, Frequency, Monetary)",
    ],
    starterCode: `import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt\n\n# ─── LOAD DATA ────────────────────────────────────────────────────────────────\n# In production: df = pd.read_csv('data.csv')\n# For this challenge, data is provided as a dict below\n\ndata = {\n    # TODO: data will be seeded in the challenge context\n}\n\ndf = pd.DataFrame(data)\nprint(df.head())\nprint(df.info())\n\n# ─── YOUR ANALYSIS ────────────────────────────────────────────────────────────\n# TODO: Implement the analysis\n`,
  },
  bi_analyst: {
    type: "Business Intelligence",
    workstation: "dashboard",
    tools: "SQL, Power BI, Tableau, Excel, DAX",
    lang: "SQL",
    scenarioTypes: [
      "Build a monthly sales dashboard for {company} — show revenue trend, top 10 SKUs, city-wise breakdown, and MoM growth rate",
      "Define the North Star Metric and 5 supporting KPIs for {company}'s growth team — justify each with a SQL query",
      "Create a daily operations report for {company}'s ops team showing: order volume, SLA breaches, average delivery time, and cancellation rate",
      "Write a SQL report showing {company}'s weekly revenue by channel (app, web, partner) with period-over-period comparison",
      "Build a customer health score dashboard for {company} — define scoring logic and implement the SQL query",
    ],
    starterCode: `-- BI Challenge: {company}\n-- Implement your SQL queries below\n\n-- ─── PART 1: Define the metric ─────────────────────────────────────────────\n-- Document your KPI definition here as a SQL comment\n-- KPI Name: \n-- Formula: \n-- Data Source: \n\n-- ─── PART 2: Write the SQL ──────────────────────────────────────────────────\nSELECT\n    -- TODO: implement your reporting query\nFROM orders o\nJOIN customers c ON o.customer_id = c.id\nWHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'\nGROUP BY 1\nORDER BY 1;\n`,
  },
  data_engineer: {
    type: "Data Engineering",
    workstation: "notebook",
    tools: "Python, PySpark, dbt, Apache Airflow, SQL, Kafka",
    lang: "Python",
    scenarioTypes: [
      "Build an ETL pipeline for {company} that ingests raw transaction logs, validates schema, deduplicates, and loads to a clean table",
      "Debug a broken {company} Airflow DAG — the daily_orders_sync pipeline has been failing for 3 days with a schema mismatch error",
      "Write a dbt model for {company}'s data warehouse that transforms raw events into a clean user_sessions table with session attribution",
      "Design and implement an incremental data pipeline for {company} that only processes new records since the last successful run",
      "Optimise a slow PySpark job for {company} — the daily aggregation takes 4 hours, reduce it to under 30 minutes",
    ],
    starterCode: `import pandas as pd\nfrom datetime import datetime\n\n# ─── EXTRACT ──────────────────────────────────────────────────────────────────\ndef extract(source: str) -> pd.DataFrame:\n    \"\"\"Extract raw data from source system\"\"\"\n    # TODO: implement extraction logic\n    pass\n\n# ─── TRANSFORM ────────────────────────────────────────────────────────────────\ndef transform(df: pd.DataFrame) -> pd.DataFrame:\n    \"\"\"Apply business rules and clean the data\"\"\"\n    # TODO: implement transformations\n    # - Remove duplicates\n    # - Handle nulls\n    # - Validate schema\n    # - Apply business rules\n    pass\n\n# ─── LOAD ─────────────────────────────────────────────────────────────────────\ndef load(df: pd.DataFrame, target: str) -> dict:\n    \"\"\"Load to target and return run statistics\"\"\"\n    # TODO: implement load logic\n    pass\n\ndef run_pipeline(config: dict) -> dict:\n    raw = extract(config['source'])\n    clean = transform(raw)\n    return load(clean, config['target'])\n`,
  },
  dba: {
    type: "Database Engineering",
    workstation: "sql",
    tools: "PostgreSQL, MySQL, query optimisation, indexing, schema design",
    lang: "SQL",
    scenarioTypes: [
      "A critical {company} query that joins orders, customers, and products runs in 14 seconds on 5M rows — optimise it to under 200ms",
      "Design the database schema for {company}'s new loyalty programme — support points, tiers, redemptions, and expiry logic",
      "The {company} DBA left — the orders table has no indexes and queries are timing out. Add the right indexes without breaking existing queries",
      "Investigate a deadlock occurring in {company}'s checkout flow — identify the conflicting transactions and rewrite to prevent it",
      "Normalise {company}'s denormalised legacy orders table from 1NF to 3NF — write the migration SQL",
    ],
    starterCode: `-- Database Challenge: {company}\n-- Schema is pre-loaded. Write your solution below.\n\n-- ─── CURRENT SLOW QUERY (do not modify) ─────────────────────────────────────\nEXPLAIN ANALYZE\nSELECT o.id, c.name, p.title, o.amount\nFROM orders o\nJOIN customers c ON o.customer_id = c.id\nJOIN products p ON o.product_id = p.id\nWHERE o.created_at > NOW() - INTERVAL '90 days'\nORDER BY o.amount DESC;\n\n-- ─── YOUR SOLUTION ────────────────────────────────────────────────────────────\n-- Add indexes, rewrite the query, or redesign the schema as required\n-- TODO:\n`,
  },
  // ── Engineering ─────────────────────────────────────────────────────────────
  frontend: {
    type: "Frontend Engineering",
    workstation: "react",
    tools: "React, TypeScript, CSS, HTML, accessibility, web performance",
    lang: "TypeScript/JSX",
    scenarioTypes: [
      "Build {company}'s product listing page — infinite scroll, skeleton loading, search filter, and responsive layout",
      "Fix 3 accessibility bugs in {company}'s checkout form — missing labels, keyboard traps, and colour contrast failures",
      "Optimise {company}'s homepage — it scores 34 on Lighthouse. Find the rendering bottlenecks and improve to 85+",
      "Build a reusable data table component for {company}'s admin dashboard — sortable columns, pagination, row selection, and export",
      "Implement {company}'s notification bell — real-time updates, mark as read, empty state, and mobile-responsive dropdown",
    ],
    starterCode: `import { useState, useEffect } from 'react'\n\n// Challenge: Build the component below\n// Company: {company}\n\nexport default function Solution() {\n  const [data, setData] = useState([])\n  const [loading, setLoading] = useState(true)\n  const [error, setError] = useState(null)\n\n  useEffect(() => {\n    // TODO: fetch and handle data\n  }, [])\n\n  if (loading) return <div>Loading...</div>\n  if (error)   return <div>Error: {error}</div>\n\n  return (\n    <div>\n      {/* TODO: implement the component */}\n    </div>\n  )\n}\n`,
  },
  backend: {
    type: "Backend Engineering",
    workstation: "api",
    tools: "Node.js / Python / Go, REST APIs, PostgreSQL, Redis, authentication",
    lang: "JavaScript",
    scenarioTypes: [
      "Build {company}'s order status API — GET /orders/:id with auth, rate limiting, and proper error codes",
      "Debug a memory leak in {company}'s Node.js notification service — it crashes every 6 hours with OOM",
      "Implement {company}'s OTP authentication endpoint — send, verify, rate-limit, and expire tokens securely",
      "A {company} API endpoint takes 4 seconds to respond. Profile the code, find the N+1 query, and fix it",
      "Write a Redis-backed session management system for {company} — create, validate, refresh, and revoke sessions",
    ],
    starterCode: `// Backend Challenge: {company}\nconst express = require('express')\nconst app = express()\napp.use(express.json())\n\n// ─── TODO: Implement the required endpoints ────────────────────────────────────\n// Follow RESTful conventions\n// Handle errors with appropriate HTTP status codes\n// Add input validation\n\napp.get('/health', (req, res) => res.json({ status: 'ok' }))\n\n// YOUR SOLUTION BELOW\n\nmodule.exports = app\n`,
  },
  fullstack: {
    type: "Full-Stack Engineering",
    workstation: "code",
    tools: "React, Node.js/Python, PostgreSQL, REST APIs, authentication",
    lang: "TypeScript",
    scenarioTypes: [
      "Build {company}'s user profile page — frontend form, backend PATCH API, DB update, and real-time preview",
      "Implement {company}'s search feature end-to-end — React search bar, debounced API call, indexed DB query, and results display",
      "Add a file upload feature to {company}'s dashboard — drag-and-drop UI, multipart upload API, S3-compatible storage, and progress display",
      "Build {company}'s activity feed — backend pagination API, frontend infinite scroll, optimistic UI updates",
    ],
    starterCode: `// Full-Stack Challenge: {company}\n// This challenge requires both frontend and backend implementation\n\n// ─── BACKEND (server.js) ─────────────────────────────────────────────────────\nconst express = require('express')\nconst app = express()\napp.use(express.json())\n\n// TODO: Implement API endpoints\n\n// ─── FRONTEND (App.jsx) ──────────────────────────────────────────────────────\n// import React, { useState, useEffect } from 'react'\n// TODO: Implement UI component that calls your API\n`,
  },
  swe: {
    type: "Software Engineering",
    workstation: "code",
    tools: "Python, Java, JavaScript, data structures, algorithms, system design",
    lang: "Python",
    scenarioTypes: [
      "Implement {company}'s rate limiter for their API gateway — sliding window algorithm, thread-safe, 1000 req/min per user",
      "Design and implement {company}'s LRU cache for their product catalog — O(1) get/put, with TTL support",
      "Write {company}'s CSV batch processor — parse 100k rows, validate, transform, and write results without loading all into memory",
      "Implement {company}'s job queue — push tasks, pop with priority, retry failed tasks, and dead letter queue",
      "Build {company}'s URL shortener core — encode, decode, handle collisions, and track click analytics",
    ],
    starterCode: `# Software Engineering Challenge: {company}\n# Implement your solution below\n\nfrom typing import Optional, List, Dict\nimport time\n\nclass Solution:\n    def __init__(self):\n        # TODO: initialise your data structures\n        pass\n    \n    def solve(self, *args):\n        \"\"\"\n        TODO: Implement the required functionality\n        Consider: time complexity, space complexity, edge cases\n        \"\"\"\n        raise NotImplementedError("Implement your solution")\n\n\n# ─── TESTS ────────────────────────────────────────────────────────────────────\nif __name__ == '__main__':\n    sol = Solution()\n    # TODO: add test cases\n    print("All tests passed!")\n`,
  },
  // ── Platform & Security ──────────────────────────────────────────────────────
  devops: {
    type: "DevOps Engineering",
    workstation: "terminal",
    tools: "Docker, GitHub Actions, Kubernetes, Terraform, Bash, CI/CD pipelines",
    lang: "YAML/Bash",
    scenarioTypes: [
      "The {company} staging deployment pipeline has been failing for 2 days — fix the broken GitHub Actions workflow (Docker build, test, and push stages)",
      "Write a production-ready Dockerfile for {company}'s Node.js microservice — multi-stage build, non-root user, health check, minimal image",
      "The {company} Kubernetes deployment is stuck in CrashLoopBackOff — diagnose and fix the misconfiguration",
      "Write a complete CI/CD pipeline for {company}: lint → unit tests → security scan → build Docker image → deploy to staging → manual approval → prod",
      "Optimise {company}'s Docker image from 1.2GB to under 200MB without breaking functionality",
    ],
    starterCode: `#!/usr/bin/env bash\n# DevOps Challenge: {company}\nset -euo pipefail\n\n# ─── CONFIGURATION ────────────────────────────────────────────────────────────\nAPP_NAME="{company}-app"\nENV="\${ENV:-staging}"\n\n# ─── FUNCTIONS ────────────────────────────────────────────────────────────────\nlog() { echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$*"; }\nerr() { log "ERROR: \$*" >&2; exit 1; }\n\n# ─── MAIN ─────────────────────────────────────────────────────────────────────\nmain() {\n    log "Starting deployment for \$APP_NAME in \$ENV"\n    # TODO: implement deployment logic\n}\n\nmain "\$@"\n`,
  },
  aws: {
    type: "Cloud Engineering (AWS)",
    workstation: "terminal",
    tools: "AWS (EC2, S3, Lambda, RDS, IAM, CloudFormation), Terraform, CLI",
    lang: "YAML/Terraform",
    scenarioTypes: [
      "Design and implement a serverless image processing pipeline for {company} using S3, Lambda, and SQS",
      "The {company} RDS instance is at 95% CPU — diagnose the root cause and implement auto-scaling with proper alarms",
      "Write a Terraform module for {company}'s VPC — public/private subnets, NAT gateway, security groups, and bastion host",
      "Reduce {company}'s AWS bill by 35% — analyse current usage, identify waste, and implement Reserved Instance and S3 lifecycle policies",
    ],
    starterCode: `# AWS Infrastructure Challenge: {company}\n# Write your solution below\n\n# ─── OPTION A: AWS CLI Commands ──────────────────────────────────────────────\n# aws s3 ...\n# aws ec2 ...\n# aws lambda ...\n\n# ─── OPTION B: Terraform ─────────────────────────────────────────────────────\n# provider "aws" {\n#   region = "ap-south-1"\n# }\n\n# ─── OPTION C: CloudFormation YAML ───────────────────────────────────────────\n# AWSTemplateFormatVersion: '2010-09-09'\n# Resources:\n#   TODO:\n`,
  },
  azure: {
    type: "Cloud Engineering (Azure)",
    workstation: "terminal",
    tools: "Azure (AKS, Functions, Blob Storage, SQL, Entra ID), ARM, Bicep, CLI",
    lang: "YAML/Bicep",
    scenarioTypes: [
      "Deploy {company}'s containerised API to AKS with horizontal pod autoscaling, health probes, and a LoadBalancer service",
      "Write a KQL query to detect failed logins and suspicious activity patterns in {company}'s Azure Monitor logs",
      "Configure RBAC for {company}'s Azure subscription — assign least-privilege roles for dev, staging, and prod environments",
    ],
    starterCode: `# Azure Infrastructure Challenge: {company}\n\n# ─── AZURE CLI ────────────────────────────────────────────────────────────────\n# az login\n# az group create --name {company}-rg --location eastus\n# az aks create ...\n\n# ─── BICEP TEMPLATE ───────────────────────────────────────────────────────────\n# param appName string = '{company}'\n# resource aksCluster 'Microsoft.ContainerService/managedClusters@2024-01-01' = {\n#   TODO:\n# }\n`,
  },
  sre: {
    type: "SRE / Platform Engineering",
    workstation: "terminal",
    tools: "Kubernetes, Prometheus, Grafana, PromQL, incident response, runbooks",
    lang: "YAML/Bash",
    scenarioTypes: [
      "{company}'s payment-service is in CrashLoopBackOff — OOMKilled 14 times in 45 minutes. Diagnose and fix the root cause",
      "Define SLOs for {company}'s core APIs — availability, latency p99, error rate — and write the Prometheus alerting rules",
      "Write the incident postmortem for a 2-hour {company} outage — timeline, root cause, impact, and action items",
      "A {company} Kubernetes node is at 97% memory — identify the runaway pods and implement resource limits and eviction policies",
    ],
    starterCode: `# SRE Challenge: {company}\n# Use the simulated kubectl terminal to diagnose and fix the issue\n\n# ─── START HERE ───────────────────────────────────────────────────────────────\n# kubectl get pods -n production\n# kubectl describe pod <pod-name>\n# kubectl logs <pod-name> --previous\n# kubectl top pods\n\n# ─── YOUR SOLUTION ────────────────────────────────────────────────────────────\n# Document your diagnosis and fix below:\n\n# Root Cause:\n# Fix:\n# Prevention:\n`,
  },
  cyber: {
    type: "Cybersecurity",
    workstation: "terminal",
    tools: "SIEM, log analysis, vulnerability assessment, OWASP, network security",
    lang: "Bash/Python",
    scenarioTypes: [
      "Analyse 72 hours of {company}'s Apache access logs — find the attack vector, attacker IP, and compromised endpoints",
      "A penetration tester found an SQL injection in {company}'s search API — write the vulnerable code, exploit it, then fix it",
      "Review {company}'s authentication code for OWASP Top 10 vulnerabilities — find, document, and fix each one",
      "Investigate a potential data breach at {company} — analyse the provided network logs, identify the exfiltration path, and write the incident report",
    ],
    starterCode: `#!/usr/bin/env bash\n# Security Investigation: {company}\n\n# ─── AVAILABLE TOOLS ──────────────────────────────────────────────────────────\n# grep, awk, cut, sort, uniq, sed — for log analysis\n# python3 — for custom analysis scripts\n\n# ─── LOG ANALYSIS ─────────────────────────────────────────────────────────────\n# Logs are in /var/log/apache2/access.log (simulated)\n# Format: IP - - [timestamp] "METHOD /path HTTP/1.1" status bytes\n\n# Start your investigation:\n# cat /var/log/apache2/access.log | grep "40[0-9]" | ...\n\n# ─── FINDINGS ─────────────────────────────────────────────────────────────────\n# Document your findings below as comments:\n# Attacker IP:\n# Attack type:\n# Compromised endpoint:\n# Timeline:\n`,
  },
  soc: {
    type: "SOC / Incident Response",
    workstation: "terminal",
    tools: "SIEM, alert triage, MITRE ATT&CK, Splunk/Elastic, incident response",
    lang: "SPL/KQL",
    scenarioTypes: [
      "Triage today's {company} alert queue — 12 alerts, classify each as true/false positive, prioritise P1s, and write a shift handover",
      "A {company} endpoint triggered a ransomware alert — follow the IR playbook, contain the incident, and write the initial report",
      "Write Splunk detection rules for {company} to catch brute force, lateral movement, and C2 beaconing behaviour",
      "Investigate a phishing campaign targeting {company} employees — extract IoCs, scope the blast radius, and recommend remediation",
    ],
    starterCode: `# SOC Investigation: {company}\n# Alert ID: SOC-2024-${Math.floor(Math.random()*9999)}\n\n# ─── TRIAGE CHECKLIST ─────────────────────────────────────────────────────────\n# 1. Classify: True Positive / False Positive / Benign True Positive\n# 2. Severity: P1 (Critical) / P2 (High) / P3 (Medium) / P4 (Low)\n# 3. Affected systems:\n# 4. IoCs extracted:\n# 5. Immediate actions taken:\n\n# ─── SIEM QUERY (Splunk) ──────────────────────────────────────────────────────\n# index=main sourcetype=auth\n# | stats count by src_ip, user, action\n# | where action="FAILED" AND count > 5\n# | sort -count\n\n# ─── YOUR ANALYSIS ────────────────────────────────────────────────────────────\n`,
  },
  qa: {
    type: "QA / Test Automation",
    workstation: "code",
    tools: "Playwright, Cypress, Jest, API testing, test design, bug reporting",
    lang: "TypeScript",
    scenarioTypes: [
      "Write a Playwright test suite for {company}'s checkout flow — add to cart, apply coupon, enter address, pay, confirm order",
      "The {company} login page has 4 bugs — find them all, write detailed bug reports, and write regression tests for each",
      "Write API tests for {company}'s /orders endpoints — happy path, auth failures, validation errors, and rate limiting",
      "Increase test coverage for {company}'s payment module from 32% to 80% — identify untested paths and write the missing tests",
      "Design the test strategy for {company}'s new feature: real-time order tracking — what to test, how, at what level",
    ],
    starterCode: `// QA Challenge: {company}\nimport { test, expect } from '@playwright/test'\n\n// ─── TEST SUITE ───────────────────────────────────────────────────────────────\ntest.describe('{company} - Feature Tests', () => {\n  test.beforeEach(async ({ page }) => {\n    await page.goto('http://localhost:3000')\n    // TODO: set up test state\n  })\n\n  test('should complete the happy path', async ({ page }) => {\n    // TODO: implement test steps\n    // await page.click('...')\n    // await expect(page.locator('...')).toBeVisible()\n  })\n\n  test('should handle error states', async ({ page }) => {\n    // TODO: test error handling\n  })\n\n  test('should be accessible', async ({ page }) => {\n    // TODO: check WCAG compliance\n  })\n})\n`,
  },
  ba_product: {
    type: "Business / Product Analysis",
    workstation: "markdown",
    tools: "Requirements writing, SQL, metrics, process mapping, stakeholder management",
    lang: "Markdown",
    scenarioTypes: [
      "Write the complete PRD for {company}'s cart abandonment recovery feature — user stories, acceptance criteria, metrics, and rollout plan",
      "{company}'s checkout conversion dropped from 68% to 51% last month — investigate the data, identify root cause, and propose fixes",
      "Define the metrics framework for {company}'s new loyalty programme — North Star Metric, KPIs, guardrails, and measurement plan",
      "A {company} stakeholder wants to add 5 new features to Q3 — prioritise them using RICE scoring, defend your choices with data",
      "Map {company}'s current order fulfilment process, identify 3 bottlenecks, and write the requirements for an improved process",
    ],
    starterCode: `# Business Analysis Challenge: {company}\n\n## Executive Summary\n<!-- Summarise the problem in 2-3 sentences -->\n\n## Problem Statement\n<!-- What is broken? Who is affected? What is the business impact? -->\n\n## Proposed Solution\n<!-- High-level approach -->\n\n## User Stories\n<!-- As a [user], I want to [action], so that [benefit] -->\n\n### Story 1:\n**As a** \n**I want to** \n**So that** \n\n**Acceptance Criteria:**\n- [ ] Given... When... Then...\n\n## Success Metrics\n| Metric | Baseline | Target | Measurement |\n|--------|----------|--------|-------------|\n|        |          |        |             |\n\n## Risks & Dependencies\n`,
  },
  medical: {
    type: "Medical Coding & Healthcare",
    workstation: "markdown",
    tools: "ICD-10, CPT codes, medical terminology, HIPAA, clinical documentation",
    lang: "Markdown",
    scenarioTypes: [
      "Assign the correct ICD-10-CM codes for a complex multi-diagnosis case involving {company}'s patient records",
      "Identify and correct 5 coding errors in a {company} hospital claim — wrong principal diagnosis, unbundling, and upcoding",
      "Write a clinical documentation improvement query for {company} — the physician's note lacks specificity for billing",
    ],
    starterCode: `# Medical Coding Challenge: {company}\n\n## Patient Encounter Summary\n<!-- Review the provided clinical notes -->\n\n## ICD-10-CM Diagnosis Codes\n| Code | Description | Sequence |\n|------|-------------|----------|\n|      |             | Principal |\n|      |             | Secondary |\n\n## CPT Procedure Codes\n| Code | Description | Modifier |\n|------|-------------|----------|\n|      |             |          |\n\n## Coding Rationale\n<!-- Justify your code selection with clinical documentation references -->\n`,
  },
  ece: {
    type: "Electronics & Embedded Systems",
    workstation: "code",
    tools: "Verilog, VHDL, C/C++, embedded C, microcontrollers, digital logic",
    lang: "C",
    scenarioTypes: [
      "Implement an UART transmitter module in Verilog for {company}'s IoT device — 9600 baud, 8N1, with FIFO buffer",
      "Debug a race condition in {company}'s embedded sensor driver — it intermittently returns corrupt ADC readings",
      "Optimise {company}'s interrupt service routine — currently takes 850μs, needs to be under 50μs",
    ],
    starterCode: `/* Embedded Systems Challenge: {company} */\n#include <stdint.h>\n#include <stdbool.h>\n\n/* ─── HARDWARE ABSTRACTION ────────────────────────────────────────────────── */\n#define REG_BASE    0x40000000U\n#define GPIO_OUT    (*(volatile uint32_t*)(REG_BASE + 0x00))\n#define UART_DATA   (*(volatile uint32_t*)(REG_BASE + 0x04))\n#define UART_STATUS (*(volatile uint32_t*)(REG_BASE + 0x08))\n\n/* ─── YOUR SOLUTION ───────────────────────────────────────────────────────── */\nvoid init(void) {\n    /* TODO: initialise peripherals */\n}\n\nvoid solve(void) {\n    /* TODO: implement solution */\n}\n\nint main(void) {\n    init();\n    solve();\n    return 0;\n}\n`,
  },
}

// ── Build a domain-aware prompt ───────────────────────────────────────────────
function buildDomainPrompt({ domainKey, keyword, difficulty, weakAreas, eloGain, avoidSkills }) {
  const ctx = DOMAIN_CONTEXT[domainKey] || DOMAIN_CONTEXT.swe
  const companies = ["Swiggy","Razorpay","CRED","Zepto","Zomato","PhonePe","Meesho","Ola","Nykaa","Groww","Zerodha","Flipkart","BYJU'S","Paytm","Dunzo","Urban Company","Slice","Jupiter","Juspay","ShareChat"]
  const company = companies[Math.floor(Math.random() * companies.length)]
  const scenario = ctx.scenarioTypes[Math.floor(Math.random() * ctx.scenarioTypes.length)].replace(/\{company\}/g, company)
  const starter  = ctx.starterCode.replace(/\{company\}/g, company)
  const weakStr  = (weakAreas || []).slice(0, 3).join(", ") || "core fundamentals"

  return `Generate exactly 1 real-world ${ctx.type} Arena challenge for an Indian tech career platform.

Domain: ${keyword} (key: ${domainKey}) | ELO: ${eloRating || 800} | Difficulty: ${difficulty}
Weak areas to address: ${weakStr}
${avoidSkills}

SCENARIO TO BUILD THE CHALLENGE AROUND:
"${scenario}"

PRIMARY TOOLS FOR THIS ROLE: ${ctx.tools}
PREFERRED LANGUAGE/STACK: ${ctx.lang}

IMPORTANT RULES:
1. The challenge must be genuinely specific to a ${keyword} professional's day-to-day work
2. Do NOT generate a generic coding/algorithm challenge — this must reflect real ${keyword} job tasks
3. The workstation must be "${ctx.workstation}" (this is the UI environment the user sees)
4. Use company name: ${company}
5. Starter code must use the appropriate language/format for ${ctx.type}

Return a single JSON object:
{
  "id": "unique-kebab-slug",
  "title": "Max 8-word title specific to the ${keyword} task",
  "company": "${company}",
  "difficulty": "${difficulty}",
  "type": "${ctx.type}",
  "scenario": "2-3 sentences of realistic business context for ${company}",
  "taskDescription": "Specific task the ${keyword} must complete",
  "objective": "What success looks like — measurable and specific",
  "workstation": "${ctx.workstation}",
  "starterCode": ${JSON.stringify(starter)},
  "expectedOutput": "Concrete description of the correct output/deliverable",
  "eloGain": ${eloGain},
  "timeLimit": ${difficulty === "Hard" ? 60 : difficulty === "Medium" ? 40 : 25},
  "tags": ["${domainKey}", "${difficulty.toLowerCase()}", "${ctx.type.toLowerCase().split(" ")[0]}"],
  "hints": ["Hint specific to ${keyword} approach", "Second targeted hint for this task type"]
}`
}

export async function geminiGenerateMission({ keyword, domainKey, eloRating, difficulty, weakAreas, path, recentSkills, eloGain }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const avoidSkills = recentSkills?.length
    ? `Avoid these recently practised skills: ${recentSkills.slice(0, 5).join(", ")}.`
    : ""

  const prompt = buildDomainPrompt({ domainKey, keyword, difficulty, weakAreas, eloGain, avoidSkills, eloRating })

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 1400,
      responseMimeType: "application/json",
    },
  })

  const parsed = JSON.parse(result.response.text())
  if (!parsed?.title) throw new Error("Gemini returned invalid mission structure")
  return parsed
}

// ── 6. Assessment MCQ generation ──────────────────────────────────────────────
// Replaces Groq (was 8,000 tokens on the big model — extremely wasteful).
// Sticky: generated once per assessment session, stored client-side until submitted.
// Returns { questions: [...] }
export async function geminiGenerateMCQ({ jobTitle, count, domainSkills, mix, summaryLine, contextLine }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const prompt = `Generate exactly ${count} fresher-level multiple-choice questions for an Indian tech assessment (Wipro/TCS/Infosys campus level).

Role: "${jobTitle}"
Skills to cover (use EXACTLY as category name):
${domainSkills.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Each skill needs at least ${Math.max(1, Math.floor(count / domainSkills.length))} question(s).
Type mix: mcq:${mix.mcq}, code_output:${mix.code_output}, problem_solving:${mix.problem_solving}, scenario:${mix.scenario}, fill_blank:${mix.fill_blank}
${summaryLine || ""}
${contextLine || ""}

CRITICAL RULES — EVERY question MUST follow these or it will be discarded:
1. "options" MUST be an array of EXACTLY 4 non-empty strings. NEVER omit this field.
2. Do NOT prefix options with "A)", "B)", "1.", etc. — plain text only.
3. "correct" is the 0-based index of the right answer (0, 1, 2, or 3).
4. "category" must be one of the exact skill names listed above.

QUESTION PHRASING RULES:
- NEVER start a question with "Write a..." or "Create a..." — those are open-ended, not MCQ.
- For code/config topics, phrase as: "Which of the following correctly..." or "What is the output of..." or "Which command/syntax..."
- For code_output type: show a short code snippet (≤6 lines) in the "question" field and ask "What is the output?" — options are the 4 possible outputs.
- For fill_blank type: use "___" in the question text, options are 4 completions.

BAD example (never do this):
  question: "Write a Dockerfile for a Node.js app"
  options: [] ← WRONG, will be discarded

GOOD example:
  question: "Which of the following Dockerfiles correctly creates a Node.js application image?"
  options: ["FROM node:18\\nWORKDIR /app\\nCOPY . .\\nRUN npm install\\nCMD [\\"node\\", \\"server.js\\"]", "FROM node:18\\nRUN npm install\\nCMD node server.js", "COPY . /app\\nFROM node:18\\nCMD node server.js", "FROM ubuntu\\nRUN apt install nodejs\\nCMD node server.js"]
  correct: 0

Return ONLY this JSON (no markdown, no extra text):
{
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "category": "<exact skill from list>",
      "question": "<question text — never 'Write a...' or 'Create a...'>",
      "options": ["<option 1>", "<option 2>", "<option 3>", "<option 4>"],
      "correct": 0,
      "explanation": "<2 sentences why the correct answer is right>"
    }
  ]
}`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 6000, responseMimeType: "application/json" },
  })

  const parsed = JSON.parse(result.response.text())
  const questions = Array.isArray(parsed) ? parsed : (parsed.questions || [])
  if (!questions.length) throw new Error("Gemini returned no MCQ questions")
  return { questions }
}

// ── 7. Skill Studio lesson generation ─────────────────────────────────────────
// Sticky: generated once per topic, stored in frontend state / Supabase until
// the user marks the module complete.
export async function geminiGenerateLesson({ topic, jobTitle, skillLevel, duration }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const prompt = `Generate a ${duration}-minute structured micro-lesson on "${topic}" for a ${skillLevel} ${jobTitle} in the Indian tech industry.

Return JSON:
{
  "title": "...",
  "objective": "1 sentence learning goal",
  "sections": [
    { "heading": "...", "content": "2-3 paragraphs", "codeExample": "// code if relevant, else omit" }
  ],
  "keyPoints": ["...", "..."],
  "quiz": [
    { "question": "...", "options": ["a","b","c","d"], "correct": 0, "explanation": "..." }
  ],
  "practiceTask": "1 hands-on exercise",
  "nextTopics": ["...", "..."]
}`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2000, responseMimeType: "application/json" },
  })

  const parsed = JSON.parse(result.response.text())
  if (!parsed?.title) throw new Error("Gemini returned invalid lesson structure")
  return parsed
}

// ── 8. Skill Studio learning path generation ───────────────────────────────────
// Sticky: generated once per user profile, cached until skills change significantly.
export async function geminiGenerateLearningPath({ jobTitle, skillGraph, weakAreas, eloRating }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const skillsSummary = (skillGraph || []).slice(0, 8)
    .map(s => `${s.label || s.skill}: ${s.value || s.score}%`).join(", ")

  const prompt = `Build a personalised learning path for an Indian tech professional.

Role: ${jobTitle} | ELO: ${eloRating}
Weak areas: ${(weakAreas || []).slice(0, 5).join(", ") || "fundamentals"}
Current skills: ${skillsSummary || "not provided"}

Return JSON:
{
  "phases": [
    {
      "phase": 1,
      "title": "...",
      "duration": "X weeks",
      "focus": "...",
      "skills": ["..."],
      "actions": [
        { "type": "learn|practice|prove", "skill": "...", "title": "...", "level": "Beginner|Intermediate|Advanced", "xp": 50 }
      ]
    }
  ],
  "totalDuration": "X weeks",
  "expectedEloGain": 150,
  "milestones": ["...", "..."]
}`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2000, responseMimeType: "application/json" },
  })

  const parsed = JSON.parse(result.response.text())
  if (!parsed?.phases) throw new Error("Gemini returned invalid learning path structure")
  return parsed
}
