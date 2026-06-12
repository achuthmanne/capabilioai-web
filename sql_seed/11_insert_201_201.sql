-- STEP 12: Problems 201–201 of 201
INSERT INTO problems (title,slug,difficulty,category,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate)
VALUES
($q$Design CRED Credit Score Service$q$,$q$design-credit-score-service$q$,$q$Medium$q$,$q$System Design$q$,ARRAY['system-design','ml-pipeline','database','api'],$q$## Problem

Design CRED's **credit score and bill payment tracking service**:

- Aggregate credit card bills from 50+ banks via bank APIs / PDF parsing
- Track payment history, credit utilization, credit score trends
- 10M users, each with 2-5 credit cards
- Refresh credit score monthly (from CIBIL/Experian)
- Detect missed payments and alert users
- Anonymized insights across all users

**Discuss:** bank data ingestion, score refresh pipeline, alert system.$q$,$q$10M users | 50+ bank integrations | Monthly score refresh | < 200ms score page load$q$,$q$[{"input": "User connects HDFC credit card", "output": "CRED fetches bill via account aggregator API, parses, stores bill history"}, {"input": "Credit score drops 20 points", "output": "Push notification within 24h of score refresh"}]$q$::jsonb,$q$[{"input": "Handle 50+ bank API formats", "expected_output": "Adapter pattern: one adapter per bank. Normalize to internal schema. Queue-based ingestion.", "is_hidden": false}, {"input": "Alert for missed payment", "expected_output": "Cron job checks upcoming due dates daily. Alert 3 days before. Alert again on miss. Kafka for alert events.", "is_hidden": true}]$q$::jsonb,$q$## Design

**Ingestion:** Account Aggregator (AA) framework (RBI-regulated). Bank adapters normalize data → `credit_accounts, bills, transactions`.

**Score Refresh:** Monthly Kafka trigger → CIBIL API call → store in `credit_scores(user_id, score, date, breakdown)`.

**Alerts:** Scheduled job checks `upcoming_payments` view. Publishes to notification service.

**Analytics:** Anonymized aggregates in ClickHouse. Opt-in data sharing.$q$,ARRAY['system-design'],0.58)
ON CONFLICT (slug) DO NOTHING;