-- STEP 9: Insert problems 141–160
INSERT INTO problems (title,slug,difficulty,category,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate) VALUES
('Game Play Analysis First Login','game-play-analysis','Easy','SQL',ARRAY['sql','aggregation','groupby'],'## Problem

Given `Activity(PlayerId, DeviceId, EventDate, GamesPlayed)`, report each player''s **first login date**.','Table: Activity(PlayerId INT, DeviceId INT, EventDate DATE, GamesPlayed INT)','[{"input": "Activity:[(1,2,''2016-03-01'',5),(1,2,''2016-05-02'',6),(2,3,''2017-06-25'',1)]", "output": "[(1,''2016-03-01''),(2,''2017-06-25'')]"}]'::jsonb,'[{"input": "[(1,2,''2016-03-01'',5),(1,2,''2016-05-02'',6),(2,3,''2017-06-25'',1)]", "expected_output": "[(1,''2016-03-01''),(2,''2017-06-25'')]", "is_hidden": false}, {"input": "[(1,1,''2020-01-01'',3)]", "expected_output": "[(1,''2020-01-01'')]", "is_hidden": true}]'::jsonb,'SELECT PlayerId, MIN(EventDate) AS first_login FROM Activity GROUP BY PlayerId.',ARRAY['mysql','postgresql'],0.78),
('Human Traffic Stadium','human-traffic-stadium','Hard','SQL',ARRAY['sql','self-join','window-functions'],'## Problem

Durga Puja stadium `Stadium(Id, VisitDate, People)` — find all records where **3 or more consecutive rows** all have ≥ 100 people. Order by date.','Table: Stadium(Id INT, VisitDate DATE UNIQUE, People INT) | Id is consecutive','[{"input": "Stadium:[(1,''a'',100),(2,''b'',109),(3,''c'',150),(4,''d'',99),(5,''e'',145),(6,''f'',1455),(7,''g'',199)]", "output": "rows with Id 5,6,7"}]'::jsonb,'[{"input": "[(1,''a'',100),(2,''b'',109),(3,''c'',150),(4,''d'',99),(5,''e'',145),(6,''f'',1455),(7,''g'',199)]", "expected_output": "[(5,''e'',145),(6,''f'',1455),(7,''g'',199)]", "is_hidden": false}, {"input": "[(1,''a'',100),(2,''b'',99),(3,''c'',100)]", "expected_output": "[]", "is_hidden": true}]'::jsonb,'Self-join or window function with lag. Mark groups of consecutive >= 100 rows, filter groups of size >= 3.',ARRAY['mysql','postgresql'],0.28),
('Design URL Shortener (Bitly India)','design-url-shortener','Medium','System Design',ARRAY['system-design','hashing','database','cache'],'## Problem

Design a URL shortening service like **bit.ly** for the Indian market (`chota.link`). It should:
1. Accept a long URL and return a short 6-char alphanumeric code
2. Redirect `chota.link/abc123` to the original URL in < 10ms
3. Handle 100M URLs created/day, 10B redirects/day
4. Provide analytics (click count, geo data)

**Discuss:** data model, hash function, storage, CDN, caching, scaling.','100M new URLs/day | 10B reads/day (100:1 read:write) | URLs never expire unless requested | 99.99% uptime','[{"input": "POST /shorten {url: ''https://www.amazon.in/very-long-product-url''}", "output": "{short_url: ''https://chota.link/aX9kR2''}"}, {"input": "GET /aX9kR2", "output": "HTTP 302 Redirect to original URL"}]'::jsonb,'[{"input": "Design encode/decode functions", "expected_output": "Base62 encoding of auto-increment ID. 6 chars = 62^6 = 56B URLs", "is_hidden": false}, {"input": "Handle 10B reads/day", "expected_output": "~116K reads/sec. Use Redis cache for hot URLs, CDN edge nodes.", "is_hidden": true}]'::jsonb,'## Approach

**Data Model:** `urls(id BIGINT, short_code VARCHAR(8), long_url TEXT, created_at, user_id, click_count)`

**Encoding:** Auto-increment ID → Base62. Or MD5 hash → first 6 chars (handle collisions).

**Storage:** MySQL/PostgreSQL for URLs. Redis for short→long cache (LRU, 100GB covers ~90% traffic).

**Scale:** 
- Write: Single master DB. Rate limit per user.
- Read: Read replicas + CDN caching redirect responses.
- Analytics: Kafka → Spark → ClickHouse for async processing.

**API:** REST with rate limiting. 301 (permanent) vs 302 (temporary) redirect trade-off.',ARRAY['system-design'],0.62),
('Design Paytm Rate Limiter','design-rate-limiter','Medium','System Design',ARRAY['system-design','redis','token-bucket','sliding-window'],'## Problem

Design a **rate limiter** for Paytm''s payment API. Requirements:
- Limit users to 100 transactions/minute
- Limit per-endpoint (different limits for /pay vs /wallet)
- Distributed — multiple API servers share state
- Low latency (< 1ms overhead)
- Handle thundering herd (burst traffic during sale events)

**Discuss:** algorithm choice, storage, failure modes.','100K RPS total | < 1ms overhead | 99.9% uptime | Multi-region','[{"input": "User A makes 101st payment in 1 minute", "output": "HTTP 429 Too Many Requests with Retry-After header"}, {"input": "Algorithm comparison: token bucket vs fixed window vs sliding window", "output": "Token bucket recommended for bursty traffic with smooth rate"}]'::jsonb,'[{"input": "Implement token bucket in Redis", "expected_output": "MULTI/EXEC pipeline: get tokens, check, decrement, set expiry. Lua script for atomicity.", "is_hidden": false}, {"input": "Handle Redis failure", "expected_output": "Fail-open (allow requests) or fail-closed (reject). Paytm payments should fail-open with logging.", "is_hidden": true}]'::jsonb,'## Algorithms

**Token Bucket:** Each user has token bucket. Refilled at R tokens/sec. Allows bursts.
**Sliding Window Log:** Store timestamps in sorted set. Count last 60s. Accurate but memory-heavy.
**Sliding Window Counter:** Blend of fixed window counts. Good accuracy + efficiency.

**Implementation:** Redis sorted sets (ZRANGEBYSCORE, ZADD, EXPIRE). Lua scripts for atomicity.

**Distributed:** Centralized Redis cluster. Local cache as fallback (eventual consistency).

**Headers:** Return X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.',ARRAY['system-design'],0.58),
('Design Zomato Food Feed','design-news-feed','Hard','System Design',ARRAY['system-design','database','cache','fanout','kafka'],'## Problem

Design Zomato''s **restaurant/food discovery feed** for users. Users follow restaurants and cuisines. Feed shows recent posts, new menus, offers in chronological/ranked order.

Requirements:
- 50M daily active users
- Average user follows 30 restaurants
- Restaurant posts up to 10 items/day
- Feed loads in < 200ms
- Celebrity restaurants followed by 1M+ users (hotspot problem)

**Discuss:** fanout on write vs read, data model, caching, ranking.','50M DAU | 500M feed items | < 200ms p99 latency | Posts have images','[{"input": "User opens Zomato feed", "output": "See last 20 posts from followed restaurants, ranked by recency + relevance"}, {"input": "McDonald''s posts new item (followed by 2M users)", "output": "Fanout strategy for celebrity restaurant posts"}]'::jsonb,'[{"input": "Design fanout on write vs fanout on read", "expected_output": "Hybrid: push to feed cache for regular restaurants, pull on read for celebrity restaurants (>500K followers)", "is_hidden": false}, {"input": "User has 1M followers — how to handle post?", "expected_output": "Async fanout via Kafka. Worker pool fans out to pre-computed feeds. Rate-limit celebrity writes.", "is_hidden": true}]'::jsonb,'## Design

**Push (Fanout on Write):** On post, write to all followers'' feed lists (Redis sorted sets). Fast read. Expensive write for popular users.

**Pull (Fanout on Read):** Aggregate followed restaurants'' posts on read. Slow read. Simple write.

**Hybrid:** Push for normal users, pull for celebrity restaurants.

**Storage:** `posts(id,restaurant_id,content_url,created_at)`, `user_feed(user_id,post_id,score)` in Redis.

**Images:** S3/CDN. Async processing (thumbnail, compression).

**Ranking:** Recency score + engagement score. ML model for personalization.',ARRAY['system-design'],0.45),
('Design IRCTC Ticket Booking System','design-ticket-booking','Hard','System Design',ARRAY['system-design','database','distributed-locks','queue','race-condition'],'## Problem

Design IRCTC-scale **railway ticket booking system**. 

Requirements:
- 10M concurrent users during Tatkal booking (all try at 10:00 AM)
- A seat can only be booked once
- Show real-time seat availability
- Handle payment failures (rollback seat hold)
- Waiting list management
- PNR generation

**Critical:** solve the seat double-booking race condition.','10M concurrent users | 50K trains/day | 72 seats/coach | 24 coaches/train | < 5s booking time','[{"input": "100 users try to book the same last seat simultaneously", "output": "Exactly 1 succeeds, 99 get WAITLISTED or seat-not-available"}, {"input": "User books seat, payment fails after 10 minutes", "output": "Seat auto-released, next waitlisted user promoted"}]'::jsonb,'[{"input": "Prevent double booking", "expected_output": "Optimistic locking (version column) or SELECT FOR UPDATE or Redis distributed lock", "is_hidden": false}, {"input": "Handle 10M concurrent users at 10 AM Tatkal rush", "expected_output": "Queue-based booking: users enter virtual queue. Token-based seat hold (10 min expiry). Redis for availability.", "is_hidden": true}]'::jsonb,'## Key Design Decisions

**Seat Lock:** SELECT ... FOR UPDATE in transaction. Or Redis SETNX for distributed lock.

**Flow:** Check availability → Hold seat (Redis TTL=10min) → Payment → Confirm or release.

**Queue:** During peak, users join a queue (SQS/Kafka). Worker processes requests sequentially per train.

**Data Model:** `trains, coaches, seats, bookings, passengers, payments, waitlist`

**PNR:** `{train_id}{date}{seat}{random}` hashed to alphanumeric.

**Scale:** Shard by train_id. Read replicas for availability. Write masters per shard.',ARRAY['system-design'],0.38),
('Design WhatsApp India Chat','design-chat-system','Hard','System Design',ARRAY['system-design','websocket','message-queue','database'],'## Problem

Design a **WhatsApp-scale messaging system** for India.

Requirements:
- 500M DAU, 100B messages/day
- 1:1 and group messages (up to 1024 members)
- Message delivery receipts (sent ✓, delivered ✓✓, read ✓✓ blue)
- End-to-end encryption
- Offline message delivery
- Media sharing (images, videos)
- Last seen, online status

**Discuss:** WebSocket management, message storage, group fan-out.','500M DAU | 100B messages/day | < 100ms message delivery | 1.16M messages/sec','[{"input": "User A sends message to User B (offline)", "output": "Store in DB, deliver when B comes online via WebSocket"}, {"input": "Message to 1024-member group", "output": "Fan-out to all online members via WebSocket, queue for offline"}]'::jsonb,'[{"input": "Connection management for 500M concurrent users", "expected_output": "WebSocket servers with consistent hashing. User→server mapping in Redis/Zookeeper.", "is_hidden": false}, {"input": "Group messages to 1024 members", "expected_output": "Async fan-out via message queue. Batch sends. Limit group size to reduce fan-out cost.", "is_hidden": true}]'::jsonb,'## Architecture

**Connections:** WebSocket servers (1M connections/server needs 500 servers). Use Nginx/load balancer. UserID→ServerID in Redis.

**Message Flow:** Sender → WS Server → Message Service → DB + push to recipient WS server → Recipient.

**Storage:** Cassandra for messages (high write, time-series). MySQL for user data. S3 for media.

**Groups:** Store group membership. Fan-out via Kafka topic per group.

**Receipts:** Separate receipt_events table. Update on delivery + read.

**E2E Encryption:** Signal Protocol. Keys stored on device only.',ARRAY['system-design'],0.35),
('Design Ola Surge Pricing Engine','design-surge-pricing','Medium','System Design',ARRAY['system-design','stream-processing','geospatial','cache'],'## Problem

Design Ola''s **surge pricing engine** that dynamically adjusts ride prices based on supply/demand.

Requirements:
- Real-time computation of surge multiplier per geo area
- City divided into H3 hexagonal cells
- Update surge every 30 seconds
- Driver app shows live surge zones (map overlay)
- Surge = f(demand/supply ratio in hex cell)
- Handle 100K concurrent rides, 500K drivers

**Discuss:** data ingestion, computation, storage, map rendering.','500K drivers, 100K active rides | 30s refresh | < 100ms API latency | 50+ cities','[{"input": "Rain in Bengaluru → demand spikes in Koramangala area", "output": "Surge multiplier updates to 1.8x in Koramangala H3 cells within 30 seconds"}, {"input": "Driver app queries surge for current location", "output": "Returns hex cell surge multiplier < 50ms"}]'::jsonb,'[{"input": "Compute surge for each hex cell", "expected_output": "Kafka streams: aggregate demand events and supply pings by H3 cell ID in 30s windows. Flink/Spark streaming.", "is_hidden": false}, {"input": "Serve surge map to 500K driver apps", "expected_output": "Redis GeoHash for cell lookup. CDN-cached surge tiles refreshed every 30s.", "is_hidden": true}]'::jsonb,'## Architecture

**Ingestion:** Driver GPS pings (every 5s) → Kafka. Ride requests → Kafka.

**Computation:** Flink streaming job. 30s tumbling window. Group by H3 hex cell. Compute supply count and demand count. Surge = max(1.0, demand/supply).

**Storage:** Redis hash `{cell_id: surge_multiplier}`. TTL 60s (auto-fallback to 1.0).

**API:** GET /surge?lat=12.9&lon=77.6 → H3 cell ID → Redis lookup. < 10ms.

**Map:** Vector tiles with surge overlay. Client polls every 30s.',ARRAY['system-design'],0.55),
('Design Notification Service','design-notification-service','Medium','System Design',ARRAY['system-design','message-queue','push-notifications','kafka'],'## Problem

Design a **notification system** for a super-app (like Tata Neu) serving 100M users across push (FCM/APNS), SMS (via Airtel/Jio APIs), email (SES), and in-app notifications.

Requirements:
- Trigger notifications from multiple services (payments, offers, delivery)
- User notification preferences (opt-out per channel/type)
- Priority tiers: critical (OTP) vs transactional vs marketing
- Delivery receipts and retry logic
- Rate limiting (no more than 5 marketing msgs/day per user)
- Analytics dashboard','100M users | 10M notifications/day | OTP: < 5s delivery | Marketing: best-effort | 99.9% uptime','[{"input": "Payment success → send SMS + push notification", "output": "Both delivered within 3 seconds"}, {"input": "Diwali sale blast to 50M users", "output": "Batched over 2 hours respecting rate limits and user preferences"}]'::jsonb,'[{"input": "Architecture for 10M notifications/day", "expected_output": "Producer services → Kafka topics by priority → Consumer workers per channel → Channel APIs (FCM, SMS gateway)", "is_hidden": false}, {"input": "Retry failed notifications", "expected_output": "Exponential backoff with dead-letter queue. Mark failed after 3 attempts. Alert ops for systematic failures.", "is_hidden": true}]'::jsonb,'## Design

**Components:** Notification Service API → Kafka (3 priority topics) → Channel Workers → External APIs.

**User Preferences:** Redis cache of user prefs. `user_notification_prefs(user_id, channel, type, enabled)`.

**Rate Limiting:** Redis counter per user per day per notification type.

**Retry:** Kafka consumer with retry topic. 3 attempts with exponential backoff. DLQ for final failures.

**Templating:** Template engine with i18n. Variable substitution. A/B testing hooks.

**Analytics:** ClickHouse for delivery rates, open rates, CTR.',ARRAY['system-design'],0.6),
('Design Search Autocomplete Naukri','design-search-autocomplete','Hard','System Design',ARRAY['system-design','trie','cache','search'],'## Problem

Design a **real-time search autocomplete** system for Naukri.com (job search). As user types, suggest top 5 job titles/keywords.

Requirements:
- 10M daily active searches
- Suggestions within 100ms of keypress
- Ranked by search frequency and recency
- Personalization (weight by user''s domain)
- Handle new trending keywords within 1 hour
- Typo tolerance
- 50+ language support (Hindi, Tamil, Bengali...)

**Discuss:** data structure, ranking, update frequency, infrastructure.','10M DAU | < 100ms p99 | Top 5 suggestions | Typo tolerance for 1 char','[{"input": "User types ''data sc''", "output": "[''data scientist'', ''data science'', ''data science internship'', ''data science jobs'', ''data science course'']"}, {"input": "New keyword ''generative AI'' spikes in searches", "output": "Appears in suggestions within 1 hour of trend start"}]'::jsonb,'[{"input": "Data structure for prefix matching", "expected_output": "Trie with top-k cache at each node. Or Elasticsearch prefix query with Redis cache.", "is_hidden": false}, {"input": "Keep suggestions fresh with trending keywords", "expected_output": "Kafka stream of search queries → Spark aggregate per 15min → update trie/ES index.", "is_hidden": true}]'::jsonb,'## Architecture

**Storage:** Trie (in-memory) for fast prefix matching. Each node stores top-5 suggestions by score.

**Score:** `score = frequency × recency_decay × personalization_weight`

**Update:** Batch job every 15 min reads aggregated query logs. Update Trie nodes. Hot-swap via blue-green.

**API:** GET /suggest?q=data+sc&user_id=123 → Redis cache (TTL 5min) → Trie lookup.

**Scale:** Shard trie by first 2 chars. Deploy behind CDN for common prefixes.

**Typo:** BK-tree or Elasticsearch fuzzy query for edit distance 1.',ARRAY['system-design'],0.42),
('Design Swiggy Order Management','design-order-management','Hard','System Design',ARRAY['system-design','state-machine','database','event-driven','saga'],'## Problem

Design Swiggy''s **Order Management System** handling the full lifecycle:

Order states: `PLACED → RESTAURANT_ACCEPTED → PREPARING → READY → PICKED → OUT_FOR_DELIVERY → DELIVERED`

Requirements:
- 5M orders/day across 500+ cities
- Real-time order tracking (GPS every 5s)
- 3-way coordination: customer, restaurant, delivery partner
- Handle failures: restaurant rejects, partner drops order, payment reversal
- SLA monitoring and alerts
- Consistent state despite distributed failures

**Discuss:** state machine design, event sourcing, distributed transaction.','5M orders/day | 3-way coordination | < 1s state updates | Real-time GPS tracking','[{"input": "Restaurant rejects order after acceptance", "output": "Trigger cancellation flow: refund customer, release delivery partner, notify all parties"}, {"input": "Delivery partner app crashes mid-delivery", "output": "Order remains IN_DELIVERY state. Re-assign if no heartbeat for 5 minutes."}]'::jsonb,'[{"input": "Prevent duplicate state transitions", "expected_output": "Idempotent state machine with version/etag. Optimistic locking. Kafka exactly-once semantics.", "is_hidden": false}, {"input": "Distributed transaction across restaurant, payment, delivery", "expected_output": "Saga pattern (choreography): each service emits events. Compensating transactions on failure.", "is_hidden": true}]'::jsonb,'## Design

**State Machine:** `orders` table with `state` and `version` columns. State transitions via event-driven services.

**Event Sourcing:** Append-only `order_events` table. Current state derived from events. Easy audit trail.

**Saga:** Payment Service → Restaurant Service → Delivery Service. On failure, compensating actions propagate backward.

**GPS Tracking:** Driver app → Kafka → Location Service → WebSocket push to customer.

**SLA:** Prometheus metrics on each state duration. Alert if `PREPARING` > 15min.',ARRAY['system-design'],0.4),
('Design Zerodha Trading Platform','design-trading-platform','Hard','System Design',ARRAY['system-design','low-latency','websocket','matching-engine','database'],'## Problem

Design Zerodha''s stock trading platform to handle NSE/BSE integration.

Requirements:
- Real-time market data feed (tick data) for 5000+ stocks
- Order placement (market/limit/stop-loss) < 50ms latency
- Portfolio tracking and P&L
- Order book and trade history
- Handle 1M orders/day during peak (market open 9:15 AM)
- WebSocket push for live prices to 5M concurrent users
- Compliance: SEBI audit trail

**Discuss:** order matching, market data distribution, portfolio calculation, regulatory compliance.','1M orders/day | < 50ms order placement | 5M concurrent WebSocket connections | 5000 stock symbols','[{"input": "User places buy limit order for RELIANCE at ₹2500", "output": "Order stored, matched against existing sell orders at ≤ ₹2500, trade executed within 50ms"}, {"input": "5M users watching INFY live price", "output": "NSE feed → normalizer → Kafka → consumer groups → WebSocket servers → clients (fan-out)"}]'::jsonb,'[{"input": "Market data fan-out to 5M users", "expected_output": "Kafka topics per stock. Consumer groups per WS server cluster. WS server broadcasts to subscribed connections.", "is_hidden": false}, {"input": "Order book implementation", "expected_output": "Red-black tree (price-time priority) or sorted map. Bids descending, asks ascending. Match when bid ≥ ask.", "is_hidden": true}]'::jsonb,'## Architecture

**Market Data:** NSE multicast feed → normalizer → Kafka (1 topic/symbol) → Consumer groups → WS servers.

**Order Flow:** API Gateway → Order Validator → Risk Check → OMS → Broker API (NSE/BSE) → Trade Confirmation → Portfolio Update.

**Order Book:** In-memory red-black tree per symbol. Persist to PostgreSQL async.

**Portfolio:** Event-driven from trade confirmations. Redis for live P&L. PostgreSQL for holdings.

**Audit Trail:** Immutable append-only log in ClickHouse. SEBI-compliant retention (7 years).',ARRAY['system-design'],0.35),
('Zomato Delivery Window Minimum Size','minimum-size-subarray-sum','Medium','DSA',ARRAY['arrays','sliding-window','two-pointers'],'## Problem

Zomato''s SLA tracker needs the smallest contiguous delivery window whose total time ≥ `target`. Given `times` and `target`, return the **minimum length** of such a subarray. Return 0 if none exists.','1 ≤ n ≤ 10^5 | 1 ≤ times[i] ≤ 10^4 | 1 ≤ target ≤ 10^9','[{"input": "times = [2,3,1,2,4,3], target = 7", "output": "2", "explanation": "[4,3] has length 2"}]'::jsonb,'[{"input": "[2,3,1,2,4,3]\n7", "expected_output": "2", "is_hidden": false}, {"input": "[1,4,4]\n4", "expected_output": "1", "is_hidden": true}]'::jsonb,'Sliding window: expand right, shrink left while sum ≥ target. Track min length. O(n).',ARRAY['python','java','javascript','go','cpp'],0.53),
('Matrix Search Staircase','search-a-2d-matrix-ii','Medium','DSA',ARRAY['arrays','matrix','binary-search'],'## Problem

Each row and column of matrix is sorted ascending. Return `true` if `target` exists in the matrix, in O(m+n).','1 ≤ m,n ≤ 300 | -10^9 ≤ matrix[i][j] ≤ 10^9','[{"input": "matrix=[[1,4,7,11],[2,5,8,12],[3,6,9,16],[10,13,14,17]], target=5", "output": "true"}, {"input": "target=20", "output": "false"}]'::jsonb,'[{"input": "[[1,4,7,11],[2,5,8,12],[3,6,9,16],[10,13,14,17]]\n5", "expected_output": "true", "is_hidden": false}, {"input": "[[1,4,7,11],[2,5,8,12],[3,6,9,16],[10,13,14,17]]\n20", "expected_output": "false", "is_hidden": true}]'::jsonb,'Start top-right. If val > target move left; if val < target move down. O(m+n).',ARRAY['python','java','javascript','go','cpp'],0.56),
('Flipkart Inventory First Missing Positive','first-missing-positive','Hard','DSA',ARRAY['arrays','hash-map'],'## Problem

Flipkart''s SKU auditor needs the smallest positive integer **not present** in the inventory list. Given `nums`, find it in O(n) time and O(1) space.','1 ≤ n ≤ 3×10^5 | -2^31 ≤ nums[i] ≤ 2^31-1','[{"input": "nums = [1,2,0]", "output": "3"}, {"input": "nums = [3,4,-1,1]", "output": "2"}, {"input": "nums = [7,8,9,11,12]", "output": "1"}]'::jsonb,'[{"input": "[1,2,0]", "expected_output": "3", "is_hidden": false}, {"input": "[3,4,-1,1]", "expected_output": "2", "is_hidden": true}]'::jsonb,'Use array itself as hash: place nums[i] at index nums[i]-1. Then scan for first mismatch. O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.38),
('Stock With Fee BSE','best-time-buy-sell-stock-with-fee','Medium','DSA',ARRAY['dynamic-programming','greedy','arrays'],'## Problem

Buy/sell BSE stocks multiple times. Each transaction costs a `fee`. Maximize **total profit** (fee paid once per transaction).','1 ≤ n ≤ 5×10^4 | 1 ≤ prices[i] ≤ 10^4 | 0 ≤ fee ≤ 10^4','[{"input": "prices = [1,3,2,8,4,9], fee = 2", "output": "8", "explanation": "(3-1-2)+(9-4-2)=0+3+... optimal = 8"}]'::jsonb,'[{"input": "[1,3,2,8,4,9]\n2", "expected_output": "8", "is_hidden": false}, {"input": "[1,3,7,5,10,3]\n3", "expected_output": "6", "is_hidden": true}]'::jsonb,'States: cash (no stock), hold (has stock). cash=max(cash, hold+price-fee); hold=max(hold, cash-price). O(n).',ARRAY['python','java','javascript','go','cpp'],0.67),
('Find All Duplicates Array','find-all-duplicates-in-array','Medium','DSA',ARRAY['arrays','hash-map'],'## Problem

Given integer array `nums` of length n where all integers in [1,n] and each appears once or twice, find all that appear **twice**. O(n) time, O(1) extra space.','1 ≤ n ≤ 10^5 | 1 ≤ nums[i] ≤ n','[{"input": "nums = [4,3,2,7,8,2,3,1]", "output": "[2,3]"}]'::jsonb,'[{"input": "[4,3,2,7,8,2,3,1]", "expected_output": "[2,3]", "is_hidden": false}, {"input": "[1,1,2]", "expected_output": "[1]", "is_hidden": true}]'::jsonb,'For each nums[i], negate nums[abs(nums[i])-1]. If already negative, it''s a duplicate. O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.72),
('Minimum Path Sum Triangle','triangle-minimum-path-sum','Medium','DSA',ARRAY['dynamic-programming','arrays'],'## Problem

Given a `triangle` array, find the **minimum path sum** from top to bottom. Each step you may move to adjacent numbers on the row below. O(n) space.','1 ≤ n ≤ 200 | -10^4 ≤ triangle[i][j] ≤ 10^4','[{"input": "triangle = [[2],[3,4],[6,5,7],[4,1,8,3]]", "output": "11", "explanation": "2→3→5→1=11"}]'::jsonb,'[{"input": "[[2],[3,4],[6,5,7],[4,1,8,3]]", "expected_output": "11", "is_hidden": false}, {"input": "[[-10]]", "expected_output": "-10", "is_hidden": true}]'::jsonb,'Bottom-up DP on last row. dp[j]=triangle[i][j]+min(dp[j],dp[j+1]). O(n²) time O(n) space.',ARRAY['python','java','javascript','go','cpp'],0.57),
('Maximum Square of Ones','maximal-square','Medium','DSA',ARRAY['dynamic-programming','matrix'],'## Problem

Given binary matrix, find the area of the **largest square** containing only ''1''s.','1 ≤ m,n ≤ 300 | matrix[i][j] ∈ {''0'',''1''}','[{"input": "matrix=[[\"1\",\"0\",\"1\",\"0\"],[\"1\",\"0\",\"1\",\"1\"],[\"1\",\"1\",\"1\",\"1\"],[\"1\",\"0\",\"0\",\"1\"]]", "output": "4", "explanation": "2×2 square at bottom-left"}]'::jsonb,'[{"input": "[[\"1\",\"0\",\"1\",\"0\"],[\"1\",\"0\",\"1\",\"1\"],[\"1\",\"1\",\"1\",\"1\"],[\"1\",\"0\",\"0\",\"1\"]]", "expected_output": "4", "is_hidden": false}, {"input": "[[\"0\"]]", "expected_output": "0", "is_hidden": true}]'::jsonb,'dp[i][j]=min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1])+1 if matrix[i][j]=''1''. Answer=max(dp)². O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.48),
('Roman to Integer Panchang','roman-to-integer','Easy','DSA',ARRAY['strings','math','hash-map'],'## Problem

Convert a Roman numeral string `s` to an **integer**. Roman numerals: I=1, V=5, X=10, L=50, C=100, D=500, M=1000. Subtraction rule applies (e.g. IV=4).','1 ≤ len(s) ≤ 15 | s contains only valid Roman numerals | 1 ≤ result ≤ 3999','[{"input": "s = \"MCMXCIV\"", "output": "1994"}, {"input": "s = \"LVIII\"", "output": "58"}]'::jsonb,'[{"input": "\"MCMXCIV\"", "expected_output": "1994", "is_hidden": false}, {"input": "\"III\"", "expected_output": "3", "is_hidden": true}]'::jsonb,'Scan right-to-left. If current < previous, subtract; else add. O(n).',ARRAY['python','java','javascript','go','cpp'],0.74)
ON CONFLICT (slug) DO NOTHING;