// ─── Gemini AI client ─────────────────────────────────────────────────────────
// Handles three jobs:
//   1. Arena mission generation — primary model for /api/arena/daily (free tier: 1500 req/day)
//   2. Extraction  — PDF/resume/LinkedIn parsing (multimodal, no search needed)
//   3. Market data — skill gap / job trend queries with Google Search grounding

import { GoogleGenerativeAI } from "@google/generative-ai"
import { readFile } from "fs/promises"
import { getOrCreateDomainManifest } from "./domainManifest.js"

const key = () => {
  const k = process.env.GEMINI_API_KEY
  if (!k || k === "your_gemini_key_here") throw new Error("GEMINI_API_KEY not set in .env")
  return k
}

const client = () => new GoogleGenerativeAI(key())

// Exposed so callers outside geminiGenerateMission (e.g. arena.js's Groq
// fallback) can resolve a domain manifest without duplicating client setup.
export const getGenModel = () => client().getGenerativeModel({ model: GEMINI_FLASH })

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
  const fileData = await readFile(filePath)   // async — does not block event loop
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
export const DOMAIN_CONTEXT = {
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
    studentScenarioTypes: [
      "Load {company}'s CSV sales file into a DataFrame and print basic statistics — row count, column names, and null count per column",
      "Calculate total revenue and average order value from {company}'s orders dataset and print the results",
      "Find the top 5 best-selling products in {company}'s dataset by quantity sold and output a sorted list",
      "Clean {company}'s customer dataset — remove duplicate email rows and replace missing city values with 'Unknown'",
      "Plot a bar chart showing {company}'s monthly sales totals — label axes and add a title",
      "Filter {company}'s orders to only those above ₹1000 and count how many there are per city",
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
    studentScenarioTypes: [
      "Write a SQL query to calculate {company}'s total revenue by month for the last 3 months — show month name and total",
      "Write a SQL query to find {company}'s top 3 cities by number of orders placed",
      "Define 2 KPIs for {company}'s sales team and write the SQL to calculate each one",
      "Write a SQL GROUP BY query showing how many customers {company} has in each city, ordered by count",
      "Write a SQL query joining {company}'s orders and products tables to show the product name and total quantity sold",
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
    studentScenarioTypes: [
      "Write a Python script that reads {company}'s CSV file, removes rows with null values, and saves a clean version",
      "Fix a Python script at {company} that crashes when reading a JSON file — add error handling so it prints a message instead of crashing",
      "Write a Python function that reads {company}'s orders JSON data and returns a list of order totals",
      "Write a Python script that reads two CSV files and merges them into one based on a matching customer_id column",
      "Write a Python function that filters {company}'s transaction list and returns only transactions above a given amount",
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
    studentScenarioTypes: [
      "Write a SQL query to find all customers in {company}'s database who placed more than 2 orders",
      "Write a JOIN query combining {company}'s orders and customers tables — show customer name, email, and their total order count",
      "Write a SQL query to find the most expensive product in each category in {company}'s products table",
      "Add an index on {company}'s orders table for the status column — write the CREATE INDEX statement and explain in a comment why it helps",
      "Write a GROUP BY query showing {company}'s total sales amount per month, ordered from highest to lowest",
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
    studentScenarioTypes: [
      "Build a simple counter app for {company} — a button that increments a number and displays it on screen using React state",
      "Fix a broken React component at {company} — clicking the 'Add to Cart' button isn't updating the cart count",
      "Make {company}'s navigation bar responsive — it should show a hamburger icon on mobile and expand on desktop",
      "Add form validation to {company}'s signup form — show an error message if the email format is invalid or password is under 8 characters",
      "Fetch and display a list of products from {company}'s API using useEffect — show a loading spinner while fetching",
      "Build a simple search filter for {company}'s product list — as the user types, filter the displayed items in real-time",
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
    studentScenarioTypes: [
      "Build two REST API endpoints for {company} — GET /products to return a list and POST /products to add a new one",
      "Add input validation to {company}'s Express POST route — reject requests where the 'name' field is missing or empty",
      "Fix a bug in {company}'s login route — it's returning a 500 error for wrong passwords instead of a 401",
      "Add a simple middleware to {company}'s Express app that logs every incoming request's method and URL",
      "Connect {company}'s Node.js app to a PostgreSQL database and write a route that fetches all rows from a products table",
      "Add basic error handling to {company}'s Express app so unhandled errors return a JSON message instead of crashing",
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
    studentScenarioTypes: [
      "Build a simple note-taking app for {company} — React frontend to add and delete notes, Node.js backend storing notes in an array",
      "Add a login form to {company}'s React app that POSTs to a backend endpoint and shows the user's name on success",
      "Build {company}'s product search — a text input that filters a list of items fetched from a GET /products endpoint",
      "Connect {company}'s React form to an Express POST endpoint that saves the submitted name and email and returns a confirmation",
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
    studentScenarioTypes: [
      "Write a function for {company}'s search tool that checks if a given word exists in a list of product names",
      "Implement a simple stack for {company}'s undo feature — push, pop, and peek operations using a Python list",
      "Write a function that finds duplicate order IDs in {company}'s list and returns each duplicate once",
      "Write a function that checks if two strings are anagrams — needed for {company}'s fuzzy product search",
      "Write a function for {company}'s leaderboard that returns the top 3 scores from a list of integers",
      "Write a function that counts how many times each word appears in {company}'s customer feedback text",
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
    studentScenarioTypes: [
      "Write a Dockerfile for {company}'s simple Node.js app — the app serves a response on port 3000 and should run in a container",
      "Create a GitHub Actions workflow for {company} that runs `npm test` automatically on every push to the main branch",
      "A {company} Docker container exits immediately after starting — read the logs and describe what is causing the crash",
      "Move {company}'s hardcoded database URL and API key into environment variables in their Node.js app configuration",
      "Write a bash script for {company} that checks if their web server process is running and prints 'UP' or 'DOWN'",
      "Write a docker-compose.yml for {company} that runs a Node.js app alongside a PostgreSQL database container",
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
    studentScenarioTypes: [
      "Write the AWS CLI commands to create an S3 bucket for {company}, upload a file to it, and list the bucket contents",
      "Write a basic IAM policy that allows a {company} developer to read objects from one specific S3 bucket only",
      "Describe the 3 main differences between EC2 and Lambda and recommend which one {company} should use for a simple API that gets 100 requests per day",
      "Write a simple AWS Lambda function in Python that accepts a name and returns a greeting — include the test event JSON",
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
    studentScenarioTypes: [
      "Write Azure CLI commands to create a resource group for {company}, create a storage account, and upload a text file to it",
      "Write a simple Azure Function in Python that returns 'Hello from {company}' — include the function.json binding configuration",
      "Explain the difference between Azure Blob Storage and Azure SQL Database and recommend which {company} should use to store customer order history",
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
    studentScenarioTypes: [
      "List the kubectl commands you would run to investigate a {company} pod that keeps restarting — explain what each command tells you",
      "Write a simple bash health check script for {company}'s API — it should curl the endpoint and print UP or DOWN with a timestamp",
      "Write a basic incident response checklist for {company} — what are the first 5 steps if the website goes down at 2am?",
      "Explain what SLO, SLA, and SLI mean and give a simple example of each for {company}'s order API",
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
    studentScenarioTypes: [
      "Use grep and awk to find all HTTP 404 requests in {company}'s access log and list the top 5 most-requested missing URLs",
      "Count failed login attempts per IP address in {company}'s auth log — write the bash command and identify which IP looks suspicious",
      "Look at {company}'s login code — it stores passwords as plain text. Explain why this is dangerous and show what the fixed version should do differently",
      "Identify which of these 5 {company} URLs could be vulnerable to SQL injection — explain the signs and what an attacker could do",
      "Write a bash one-liner to find all files in {company}'s web directory that were modified in the last 24 hours",
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
    studentScenarioTypes: [
      "Review these 5 security alerts from {company}'s SIEM — classify each as True Positive or False Positive and explain your reasoning",
      "Find the 3 most suspicious IP addresses in {company}'s server access log by looking for unusual access patterns",
      "Write a basic Splunk search query to find all login events from {company}'s system that failed more than 5 times from the same IP",
      "An employee at {company} received a phishing email — list the 5 immediate steps the SOC analyst should take",
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
    studentScenarioTypes: [
      "Write 3 test cases for {company}'s login form — test a successful login, a wrong password, and an empty email field",
      "Find and write a bug report for one defect on {company}'s registration page — include steps to reproduce, expected result, and actual result",
      "Write a Playwright test that opens {company}'s homepage, checks the page title is correct, and takes a screenshot",
      "Write Jest unit tests for a simple {company} price calculation function — test normal input, zero, and negative numbers",
      "List 5 test scenarios for {company}'s 'Add to Cart' button — include edge cases like adding the same item twice",
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
    studentScenarioTypes: [
      "Write 3 user stories for {company}'s new password reset feature — each with a clear acceptance criterion",
      "A stakeholder at {company} wants to add a 'Save for Later' feature to the cart — write 5 clarifying questions you would ask before writing requirements",
      "Write a one-page PRD outline for {company}'s in-app notification feature — include goal, users, and 3 key requirements",
      "List 3 metrics {company} should track after launching a new checkout page and explain what each metric tells you",
      "Map out the steps a customer goes through to place an order at {company} — identify one step where they might get confused or drop off",
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
      "Write an I2C master driver for {company}'s temperature sensor — read a 16-bit register and convert to Celsius",
      "Implement a ring buffer for {company}'s UART receive ISR — handle overflow gracefully without losing data",
    ],
    studentScenarioTypes: [
      "Toggle an LED on {company}'s STM32 board using GPIO — configure the pin as output and blink at 1Hz using a delay loop",
      "Read an ADC value from {company}'s sensor pin and store it in a variable — use polling mode, not interrupts",
      "Configure a timer on {company}'s microcontroller to generate a 1kHz square wave on a GPIO pin",
      "Write a function that checks a button input on {company}'s board with software debounce — return 1 only on a stable press",
    ],
    // Scaffold only — no register addresses, no bit names, no solution hints in TODOs
    starterCode: `/* Embedded Systems Challenge: {company} */\n#include <stdint.h>\n#include <stdbool.h>\n\n/* ─── YOUR IMPLEMENTATION ─────────────────────────────────────────────────── */\n\nvoid setup(void) {\n    /* TODO */\n}\n\nvoid run(void) {\n    /* TODO */\n}\n\nint main(void) {\n    setup();\n    run();\n    return 0;\n}\n`,
  },
  // ── AI / ML ──────────────────────────────────────────────────────────────────
  ml: {
    type: "AI / ML Engineering",
    workstation: "notebook",
    tools: "Python, pandas, numpy, scikit-learn, matplotlib, model evaluation",
    lang: "Python",
    scenarioTypes: [
      "Build a churn-prediction model for {company} using their customer usage data — engineer features, train a classifier, and evaluate with precision/recall",
      "Debug a data-leakage issue in {company}'s fraud detection pipeline — the model scores 98% in training but fails badly in production",
      "{company}'s recommendation model has drifted from 82% to 61% precision over 3 months — diagnose the cause and propose a retraining plan",
      "Build a feature pipeline for {company}'s pricing model — handle categorical encoding, missing values, and scaling",
      "Compare 3 classification algorithms for {company}'s lead-scoring model and justify which to deploy, based on precision, recall, and inference latency",
    ],
    studentScenarioTypes: [
      "Load {company}'s customer CSV into a DataFrame and train a simple classifier to predict churn using scikit-learn",
      "Split {company}'s dataset into train/test sets and calculate the accuracy of a basic logistic regression model",
      "Clean {company}'s dataset by handling missing values and encoding one categorical column before training a model",
      "Train a simple decision tree on {company}'s dataset and print the accuracy on the test set",
      "Plot a confusion matrix for a trained classifier on {company}'s dataset and explain what the numbers mean",
    ],
    starterCode: `import pandas as pd\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.metrics import accuracy_score\n\n# ─── LOAD DATA ────────────────────────────────────────────────────────────────\n# In production: df = pd.read_csv('data.csv')\n# For this challenge, data is provided as a dict below\n\ndata = {\n    # TODO: data will be seeded in the challenge context\n}\n\ndf = pd.DataFrame(data)\nprint(df.head())\nprint(df.info())\n\n# ─── SPLIT ────────────────────────────────────────────────────────────────────\n# TODO: separate features (X) and target (y), then train_test_split\n\n# ─── TRAIN ────────────────────────────────────────────────────────────────────\n# TODO: choose and train a model\n\n# ─── EVALUATE ─────────────────────────────────────────────────────────────────\n# TODO: evaluate on the test set\n`,
  },
  // ── EEE ──────────────────────────────────────────────────────────────────────
  eee: {
    type: "Electrical & Electronics Engineering",
    workstation: "engineering_lab",
    category: "EEE",
    tools: "Circuit analysis, power systems, control theory, MATLAB/Simulink, PLC",
    lang: "Calculation/Pseudocode",
    scenarioTypes: [
      "Design a protection-relay coordination scheme for {company}'s substation feeder — calculate pickup currents and time delays for the overcurrent relays",
      "{company}'s induction motor is tripping on overload every 40 minutes — analyse the load profile and diagnose the root cause",
      "Model the transient response of {company}'s power distribution network after a sudden load switch",
      "Design a PID controller for {company}'s temperature regulation system — tune Kp, Ki, Kd for a 2-second settling time with minimal overshoot",
      "Calculate the power-factor correction capacitor bank size needed to bring {company}'s facility from 0.75 to 0.95 power factor",
    ],
    studentScenarioTypes: [
      "Calculate the total power drawn by {company}'s 3-phase induction motor, given voltage, current, and power factor",
      "Find the equivalent resistance of {company}'s series-parallel sensor circuit given 3 resistor values",
      "Calculate the time constant and cutoff frequency of a simple RC filter used in {company}'s sensor circuit",
      "Calculate the voltage drop across {company}'s transmission line given resistance, reactance, and load current",
      "Determine the transformer turns ratio needed to step {company}'s 11kV supply down to 415V",
    ],
    starterCode: `/* Electrical Engineering Challenge: {company} */\n\n/* ─── GIVEN PARAMETERS ────────────────────────────────────────────────────── */\n/* Values will be seeded in the challenge context */\n\n/* ─── YOUR CALCULATIONS ───────────────────────────────────────────────────── */\n/* TODO: show your working step by step */\n\n/* ─── RESULT ──────────────────────────────────────────────────────────────── */\n/* TODO: state the final answer with correct units */\n`,
  },
  // ── Civil ────────────────────────────────────────────────────────────────────
  civil: {
    type: "Civil Engineering",
    workstation: "engineering_lab",
    category: "Civil",
    tools: "Structural analysis, geotechnical design, load calculations, IS codes",
    lang: "Calculation/Pseudocode",
    scenarioTypes: [
      "Design the reinforcement for a simply-supported RCC beam at {company}'s new warehouse — given span, load, and material grade",
      "{company}'s site survey shows a soil bearing capacity of 120 kN/m² — size the isolated footing for a column carrying 850kN",
      "A retaining wall at {company}'s site is showing signs of tilting — analyse the likely failure mode and propose a fix",
      "Design the pavement thickness for {company}'s new access road given traffic load and subgrade CBR value",
      "Check the stability of a cantilever staircase at {company}'s building against the given load combinations",
    ],
    studentScenarioTypes: [
      "Calculate the total dead load and live load on a simply-supported slab at {company}'s site, given span and thickness",
      "Calculate the bending moment at mid-span for a simply-supported beam at {company} carrying a uniformly distributed load",
      "Determine the safe bearing capacity required for a footing at {company} given the column load and factor of safety",
      "Calculate the quantity of concrete (in cubic metres) needed for a rectangular column at {company} given its dimensions",
      "Calculate the slope (gradient) of a drainage pipe at {company}'s site given the invert levels and pipe length",
    ],
    starterCode: `/* Civil Engineering Challenge: {company} */\n\n/* ─── GIVEN PARAMETERS ────────────────────────────────────────────────────── */\n/* Values will be seeded in the challenge context */\n\n/* ─── YOUR CALCULATIONS ───────────────────────────────────────────────────── */\n/* TODO: show your working step by step, citing the relevant IS code clause */\n\n/* ─── RESULT ──────────────────────────────────────────────────────────────── */\n/* TODO: state the final answer with correct units */\n`,
  },
  // ── Mechanical ───────────────────────────────────────────────────────────────
  mechanical: {
    type: "Mechanical Engineering",
    workstation: "engineering_lab",
    category: "Mechanical",
    tools: "Thermodynamics, fluid mechanics, machine design, manufacturing, GD&T",
    lang: "Calculation/Pseudocode",
    scenarioTypes: [
      "Design the shaft diameter for {company}'s conveyor drive given torque, material yield strength, and factor of safety",
      "{company}'s heat exchanger is underperforming — calculate the required heat transfer area given the given flow rates and temperatures",
      "A gear in {company}'s gearbox is failing prematurely — analyse the likely failure mode from the given stress and cycle data",
      "Size the pump for {company}'s cooling loop given the required flow rate, head loss, and pipe friction losses",
      "Optimise the manufacturing tolerance stack-up for {company}'s assembly to meet the required fit without increasing cost",
    ],
    studentScenarioTypes: [
      "Calculate the power required to lift a given load at {company}'s site using a simple pulley system",
      "Calculate the stress in a mechanical component at {company} given the applied force and cross-sectional area",
      "Calculate the efficiency of {company}'s engine given input and output work values",
      "Determine the factor of safety for a mechanical component at {company} given yield strength and applied stress",
      "Calculate the flow rate through a pipe at {company}'s facility given velocity and cross-sectional area",
    ],
    starterCode: `/* Mechanical Engineering Challenge: {company} */\n\n/* ─── GIVEN PARAMETERS ────────────────────────────────────────────────────── */\n/* Values will be seeded in the challenge context */\n\n/* ─── YOUR CALCULATIONS ───────────────────────────────────────────────────── */\n/* TODO: show your working step by step */\n\n/* ─── RESULT ──────────────────────────────────────────────────────────────── */\n/* TODO: state the final answer with correct units */\n`,
  },
}

// "embedded" (default ECE branch role) shares the same firmware-focused content as "ece"
// — both are Electronics & Embedded Systems, just reached via different role paths
// (ece = analog/VLSI/IoT/RF sub-roles with explicit arenaKey "ece", embedded = the
// default role _resolveByBranch() picks for a plain "ECE" branch selection).
DOMAIN_CONTEXT.embedded = DOMAIN_CONTEXT.ece

// Resolves the DOMAIN_CONTEXT-shaped manifest for a domainKey: static map
// first (fast, reviewed, zero-cost), then the AI-generated/DB-cached manifest
// for anything outside it, finally falling back to the generic swe template.
// This is the ONLY place that decides which content template a mission uses —
// keeping it centralised means the static map and the auto-generated fallback
// can never disagree about which domain a given key resolves to.
export async function resolveDomainContext(genModel, domainKey, keyword) {
  if (DOMAIN_CONTEXT[domainKey]) return DOMAIN_CONTEXT[domainKey]
  const manifest = await getOrCreateDomainManifest(genModel, domainKey, keyword)
  return manifest || DOMAIN_CONTEXT.swe
}

// ── Build a domain-aware prompt ───────────────────────────────────────────────
function buildDomainPrompt({ ctx, domainKey, keyword, difficulty, weakAreas, eloGain, avoidSkills, path, completedMissions, eloRating, studentStage }) {
  const isStudent = path === "student"
  // 2026-08-03: Student/Job Seeker split. A job seeker is actively
  // interviewing, not learning fundamentals — the "keep it simple, one
  // skill only" beginner framing below is right for someone still enrolled,
  // but undersells a job seeker's actual hiring bar. Does not touch ELO/
  // difficulty CAPPING logic (still capped by the caller before this runs),
  // only the prompt tone/scope guidance sent to the model.
  const isJobSeeker = isStudent && studentStage === "job_seeker"

  // Student path: use beginner scenarios; professional path: use advanced ones
  const scenarioPool = (isStudent && ctx.studentScenarioTypes) ? ctx.studentScenarioTypes : ctx.scenarioTypes

  const companies = ["Swiggy","Razorpay","CRED","Zepto","Zomato","PhonePe","Meesho","Ola","Nykaa","Groww","Zerodha","Flipkart","BYJU'S","Paytm","Dunzo","Urban Company","Slice","Jupiter","Juspay","ShareChat"]
  const company = companies[Math.floor(Math.random() * companies.length)]
  const scenario = scenarioPool[Math.floor(Math.random() * scenarioPool.length)].replace(/\{company\}/g, company)
  const starter  = ctx.starterCode.replace(/\{company\}/g, company)
  const weakStr  = (weakAreas || []).slice(0, 3).join(", ") || "core fundamentals"

  // Cap difficulty for students — never throw Hard at a beginner. Job
  // seekers are exempt from this cap (see isJobSeeker above): they're
  // interviewing against a real hiring bar, not learning fundamentals.
  const effectiveDifficulty = isStudent && !isJobSeeker && difficulty === "Hard" ? "Medium" : difficulty
  const effectiveTime = effectiveDifficulty === "Hard" ? 55 : effectiveDifficulty === "Medium" ? 30 : 20

  // Completed mission exclusion — prevents repeating titles the user already finished
  const avoidMissionsStr = (completedMissions || []).length
    ? `\nSTRICTLY AVOID — user has already completed these missions. Your mission MUST cover a different skill/scenario:\n${(completedMissions || []).slice(0, 30).map(t => `  - "${t}"`).join("\n")}`
    : ""

  const studentNote = isJobSeeker ? `
JOB SEEKER PATH — HIRING-BAR RULES:
- This user has finished/left formal study and is actively interviewing for real roles right now
- Mirror the actual bar a company would set for an entry-level hire in ${keyword} — realistic scope and multi-step reasoning are fine, do not water it down to a classroom exercise
- Difficulty: ${effectiveDifficulty} — do not artificially soften it just because the path is "student"
- Time limit: ${effectiveTime} minutes` : isStudent ? `
STUDENT PATH — BEGINNER RULES:
- This user is a FRESHER or entry-level job seeker with minimal hands-on experience
- The challenge must be learnable by someone new to ${keyword} — do NOT assume any professional experience
- Scope it to ONE specific skill or concept only — not a multi-system or multi-component task
- Difficulty: ${effectiveDifficulty} — suitable for a student, not a working professional
- Time limit: ${effectiveTime} minutes — keep the scope achievable` : ""

  return `Generate exactly 1 ${isStudent ? "beginner-friendly" : "real-world"} ${ctx.type} Arena challenge for an Indian tech career platform.

Domain: ${keyword} (key: ${domainKey}) | ELO: ${eloRating || 800} | Difficulty: ${effectiveDifficulty}
Weak areas to address: ${weakStr}
${avoidSkills}${studentNote}${avoidMissionsStr}

SCENARIO TO BUILD THE CHALLENGE AROUND:
"${scenario}"

PRIMARY TOOLS FOR THIS ROLE: ${ctx.tools}
PREFERRED LANGUAGE/STACK: ${ctx.lang}

━━━ CRITICAL RULES — DO NOT GIVE SOLUTIONS ━━━
1. "scenario": describe ONLY the business problem and context. NEVER suggest tools, algorithms, data structures, or solution approaches.
2. "taskDescription": say WHAT to build or fix — not HOW. The user must figure out the approach independently.
3. "hints": write ONLY guiding questions that help the user think (e.g. "What happens if the input list is empty?" / "What structure would let you look up values in constant time?"). NEVER name algorithms, reveal the approach, or show solution steps. Maximum 2 hints.
4. NEVER include solution code, pseudocode, algorithm names, or step-by-step instructions anywhere in the mission.
5. The whole point is that the student discovers the solution themselves.
6. "starterCode": you MUST use the exact scaffold provided below — do NOT add register addresses, bit definitions, function names, or descriptive TODO comments. TODO comments must say only "/* TODO */" or "// TODO" — NEVER describe what to implement inside the comment (e.g. "// TODO: wait for TXE" is FORBIDDEN — it reveals the answer).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OTHER RULES:
7. Challenge must be specific to ${keyword} ${isStudent ? "learner" : "professional"} work — not generic
8. Workstation must be "${ctx.workstation}"
9. Use company name: ${company}
10. Starter code scaffolds the structure only — does NOT hint at the solution. Return the starterCode field exactly as provided.

Return a single JSON object:
{
  "id": "unique-kebab-slug",
  "title": "Max 8 words — specific to the task (NOT generic like 'Coding Challenge')",
  "company": "${company}",
  "difficulty": "${effectiveDifficulty}",
  "type": "${ctx.type}",
  "scenario": "2-3 sentences of business context only — what problem exists. Zero solution hints.",
  "taskDescription": "What to build or fix — observable outcome only, not how to do it",
  "objective": "One measurable success criterion — what does done look like?",
  "workstation": "${ctx.workstation}",
  "category": "${ctx.category || ctx.type}",
  "starterCode": ${JSON.stringify(starter)},
  "expectedOutput": "What the correct output or behaviour looks like — NOT the approach to get there",
  "eloGain": ${eloGain},
  "timeLimit": ${effectiveTime},
  "tags": ["${domainKey}", "${effectiveDifficulty.toLowerCase()}", "${ctx.type.toLowerCase().split(" ")[0]}"],
  "hints": ["A guiding question — NOT a solution hint", "A second guiding question — NOT a solution step"]
}`
}

export async function geminiGenerateMission({ keyword, domainKey, eloRating, difficulty, weakAreas, path, recentSkills, eloGain, completedMissions, studentStage }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const avoidSkills = recentSkills?.length
    ? `Avoid these recently practised skills (user has done these recently): ${recentSkills.slice(0, 5).join(", ")}.`
    : ""

  // Resolved ONCE and reused below — static DOMAIN_CONTEXT hit, or the
  // AI-generated/DB-cached manifest for a domainKey outside that map (see
  // domainManifest.js), or the generic swe fallback as a last resort.
  const ctx = await resolveDomainContext(genModel, domainKey, keyword)

  const prompt = buildDomainPrompt({ ctx, domainKey, keyword, difficulty, weakAreas, eloGain, avoidSkills, path, completedMissions, eloRating, studentStage })

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 1400,
      responseMimeType: "application/json",
    },
  })

  const parsed = JSON.parse(result.response.text())
  if (!parsed?.title) throw new Error("Gemini returned invalid mission structure")

  // ── Always replace starterCode with the domain template ───────────────────
  // The AI consistently ignores instructions about TODO comments and adds
  // solution hints (numbered steps, register values, pre-written function calls).
  // The ONLY safe approach is to never use the AI-generated starterCode —
  // always substitute our curated template which is guaranteed hint-free.
  if (ctx?.starterCode) {
    parsed.starterCode = ctx.starterCode.replace(/\{company\}/g, parsed.company || "Company")
  }
  // ── Force category for engineering_lab domains ─────────────────────────────
  // EngineeringLabWorkstation.jsx picks its tabs/units via
  // ENGINEERING_DOMAIN_CONFIG[mission.category], falling back to "ECE" if
  // unset or unrecognised. The AI is unreliable about echoing this field back
  // exactly (same reasoning as starterCode above), so force it from the
  // domain manifest rather than trusting the model's output.
  if (ctx?.category) {
    parsed.category = ctx.category
  }

  return parsed
}

// ── 6. Assessment MCQ generation ──────────────────────────────────────────────
// Replaces Groq (was 8,000 tokens on the big model — extremely wasteful).
// Sticky: generated once per assessment session, stored client-side until submitted.
// Returns { questions: [...] }
export async function geminiGenerateMCQ({ jobTitle, count, domainSkills, mix, summaryLine, contextLine }) {
  const genai    = client()
  // Use gemini-2.0-flash for MCQ — stable, available on v1beta, no thinking tokens.
  // gemini-2.5-flash is a thinking model: burns most of 8192 tokens internally,
  // leaving almost nothing for JSON output → truncation.
  // gemini-1.5-flash is not available on v1beta API → 404.
  const genModel = genai.getGenerativeModel({ model: "gemini-2.0-flash" })

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
    generationConfig: { maxOutputTokens: 8192, responseMimeType: "application/json" },
  })

  const raw = result.response.text()
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Attempt recovery from truncated JSON: find last complete question object
    const lastComma = raw.lastIndexOf("},")
    if (lastComma > 0) {
      try { parsed = JSON.parse(raw.slice(0, lastComma + 1) + "]}") } catch { parsed = {} }
    }
    if (!parsed?.questions?.length) throw new Error(`Gemini returned unparseable JSON (length ${raw.length})`)
    console.warn(`[gemini-mcq] Partial JSON recovery: salvaged ${parsed.questions.length} questions`)
  }
  const questions = Array.isArray(parsed) ? parsed : (parsed.questions || [])
  if (!questions.length) throw new Error("Gemini returned no MCQ questions")
  return { questions }
}

// ── 7. Skill Studio lesson generation ─────────────────────────────────────────
// Sticky: generated once per topic, stored in frontend state / Supabase until
// the user marks the module complete.
// Skill Studio Phase 1 (2026-07-30) — richer lesson schema. Additive: every
// field from the original schema (title/objective/sections/keyPoints/quiz/
// practiceTask/nextTopics) is unchanged, so any code still reading only
// those fields keeps working. New fields (hook, worked_example,
// common_mistake, checkpoint_question, diagram_spec) are optional in every
// consumer (contentGenerator.blocksFromLesson, AIExplainPanel) — a provider
// that omits them degrades to the old lesson shape instead of breaking.
export async function geminiGenerateLesson({ topic, jobTitle, skillLevel, duration, remedial = false, missedTopics = [] }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const remedialNote = remedial
    ? `\n\nThis is a REMEDIAL re-teach — the learner just failed a verification quiz on: ${missedTopics.join(", ") || "this topic"}. Do not repeat the same explanation. Focus the "hook", "worked_example", and "common_mistake" specifically on why those exact points are commonly misunderstood, with one additional fully-worked numeric example.`
    : ""

  const prompt = `Generate a ${duration}-minute structured micro-lesson on "${topic}" for a ${skillLevel} ${jobTitle} in the Indian tech industry.${remedialNote}

Return JSON:
{
  "title": "...",
  "objective": "1 sentence learning goal",
  "hook": "1-2 sentences — why this matters, a real business reason, said conversationally",
  "sections": [
    { "heading": "...", "content": "2-3 paragraphs", "codeExample": "// code if relevant, else omit" }
  ],
  "worked_example": {
    "company": "a real, plausible Indian company (e.g. Swiggy, Zomato, Flipkart, Razorpay)",
    "scenario": "1-2 sentence real business scenario using this skill",
    "walkthrough": "step-by-step solution, numbered, ending in a concrete numeric/factual result"
  },
  "common_mistake": {
    "wrong": "a realistic wrong approach/code/answer a learner would actually write",
    "correct": "the corrected version",
    "why": "1-2 sentences on why the wrong version fails"
  },
  "checkpoint_question": { "prompt": "one quick comprehension check tied directly to the hook/example above", "answer": "short correct answer" },
  "diagram_spec": {
    "type": "flow | merge | comparison | hierarchy",
    "nodes": [ { "id": "n1", "label": "..." } ],
    "edges": [ { "from": "n1", "to": "n2", "label": "optional" } ],
    "steps": [ "1-4 short strings, each describing what becomes visible/highlighted at that reveal step" ]
  },
  "keyPoints": ["...", "..."],
  "quiz": [
    { "question": "...", "options": ["a","b","c","d"], "correct": 0, "explanation": "..." }
  ],
  "practiceTask": "1 hands-on exercise",
  "nextTopics": ["...", "..."]
}

diagram_spec must be small (max 6 nodes, max 4 steps) and directly illustrate the core concept — omit it only if the topic has no natural visual structure.`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2600, responseMimeType: "application/json" },
  })

  const parsed = JSON.parse(result.response.text())
  if (!parsed?.title) throw new Error("Gemini returned invalid lesson structure")
  return parsed
}

// Lightweight follow-up call for a remedial supplement ONLY — used when a
// learner fails the module quiz (see quizEngine.MODULE_PASS_THRESHOLD) and
// needs one more targeted example, not a full lesson regeneration. Kept
// separate from geminiGenerateLesson's remedial mode above so the "just give
// me one more example" path is fast/cheap and never touches the shared
// content cache (this content is per-learner, never persisted to the shared
// modules/module_content_blocks tables).
export async function geminiGenerateRemedialSupplement({ topic, jobTitle, skillLevel, missedTopics }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const prompt = `A ${skillLevel} ${jobTitle} just failed a quiz on "${topic}", missing: ${missedTopics.join(", ") || topic}.
Give them ONE more targeted, fully-worked example plus a short plain-language explanation that directly addresses those gaps — do not repeat generic background they already saw.

Return JSON:
{ "extra_explanation": "2-4 sentences, plain language, targeted at the missed points", "extra_example": { "scenario": "...", "walkthrough": "step-by-step, ending in a concrete result" } }`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 700, responseMimeType: "application/json" },
  })
  return JSON.parse(result.response.text())
}

// Revision content — flashcards / cheat sheet / interview questions,
// generated once per module and cached (see module_revision_content in
// contentGenerator.js) exactly like the lesson itself: shared across every
// learner studying the same (skill, level) tuple, never per-user.
export async function geminiGenerateRevisionContent({ topic, jobTitle, skillLevel }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const prompt = `Create revision material for "${topic}" for a ${skillLevel} ${jobTitle}.

Return JSON:
{
  "flashcards": [ { "front": "short question/term", "back": "short answer" } ] (5-8 items),
  "cheat_sheet": ["short punchy fact/formula/syntax line", "..."] (5-10 items),
  "interview_qs": [ { "question": "...", "answer_outline": "2-3 sentence model answer outline" } ] (3-5 items)
}`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1400, responseMimeType: "application/json" },
  })
  return JSON.parse(result.response.text())
}

// Phase 2a narration script — turns a module's ALREADY-GENERATED lesson
// content (hook/sections/worked_example/common_mistake/diagram_spec steps)
// into a short, timed spoken-narration script for the "Watch" tab. This is
// NOT a second content-generation pass — no new facts/examples are invented
// here, it only rephrases existing lesson content into natural spoken form.
// Segments are capped (6-8) and short (TTS-friendly, <350 chars) — each maps
// 1:1 to a diagram_spec step when tiedToStep is set, so the client can drive
// DiagramSpecView's animation off the audio queue's current segment index
// instead of needing precise audio-duration timestamps.
export async function geminiGenerateNarrationScript({ topic, jobTitle, skillLevel, lessonSummary, diagramSteps = [] }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const prompt = `You are narrating an existing lesson on "${topic}" for a ${skillLevel} ${jobTitle}, out loud, as a short spoken walkthrough (not reading text verbatim — natural spoken phrasing, contractions ok, second person "you").

Lesson content already written (do not invent new facts beyond this):
${lessonSummary}

${diagramSteps.length > 0 ? `The lesson has an animated diagram with these steps, in order: ${diagramSteps.map((s, i) => `(${i}) ${s}`).join(" | ")}` : "This lesson has no animated diagram."}

Return JSON:
{
  "segments": [
    { "text": "1-2 short spoken sentences, under 350 characters", "tiedToStep": <diagram step index this segment narrates, or null if not tied to a diagram step> }
  ]
}
Rules: first segment is a short spoken hook/intro (tiedToStep null). ${diagramSteps.length > 0 ? "Include exactly one segment per diagram step, tiedToStep matching that step's index, in the same order." : ""} Last segment is a short spoken wrap-up (tiedToStep null). 6-8 segments total.`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 900, responseMimeType: "application/json" },
  })
  return JSON.parse(result.response.text())
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
