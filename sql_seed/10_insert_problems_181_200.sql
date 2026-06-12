-- STEP 11: Insert problems 181–200
INSERT INTO problems (title,slug,difficulty,category,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate) VALUES
('Last Stone Weight Battle','last-stone-weight','Easy','DSA',ARRAY['heap','greedy'],'## Problem

Stones with weights `stones`. Each turn smash the two heaviest: if equal both destroyed; else difference remains. Return weight of last stone (or 0).','1 ≤ stones.length ≤ 30 | 1 ≤ stones[i] ≤ 1000','[{"input": "stones = [2,7,4,1,8,1]", "output": "1"}, {"input": "stones = [1]", "output": "1"}]'::jsonb,'[{"input": "[2,7,4,1,8,1]", "expected_output": "1", "is_hidden": false}, {"input": "[1]", "expected_output": "1", "is_hidden": true}]'::jsonb,'Max-heap. Pop two largest, push difference if non-zero. Repeat until ≤ 1 stone. O(n log n).',ARRAY['python','java','javascript','go','cpp'],0.78),
('Ugly Number II Smooth Numbers','ugly-number-ii','Medium','DSA',ARRAY['heap','dynamic-programming','math'],'## Problem

An **ugly number** has only prime factors 2, 3, 5. Return the `n`th ugly number. (1 is ugly.)','1 ≤ n ≤ 1690','[{"input": "n = 10", "output": "12", "explanation": "1,2,3,4,5,6,8,9,10,12"}]'::jsonb,'[{"input": "10", "expected_output": "12", "is_hidden": false}, {"input": "1", "expected_output": "1", "is_hidden": true}]'::jsonb,'Three pointers p2,p3,p5. Next ugly = min(dp[p2]×2, dp[p3]×3, dp[p5]×5). Advance pointer(s) that produced min. O(n).',ARRAY['python','java','javascript','go','cpp'],0.58),
('Power of Two Detection','power-of-two','Easy','DSA',ARRAY['bit-manipulation','math'],'## Problem

Given integer `n`, return `true` if it is a **power of two**.','-2^31 ≤ n ≤ 2^31-1','[{"input": "n = 1", "output": "true"}, {"input": "n = 16", "output": "true"}, {"input": "n = 3", "output": "false"}]'::jsonb,'[{"input": "16", "expected_output": "true", "is_hidden": false}, {"input": "3", "expected_output": "false", "is_hidden": true}]'::jsonb,'n > 0 and (n & (n-1)) == 0. Power of two has exactly one set bit. O(1).',ARRAY['python','java','javascript','go','cpp'],0.8),
('Hamming Distance Bit Difference','hamming-distance','Easy','DSA',ARRAY['bit-manipulation'],'## Problem

The **Hamming distance** between integers `x` and `y` = number of positions where their binary representations differ.','0 ≤ x,y ≤ 2^31-1','[{"input": "x=1, y=4", "output": "2", "explanation": "1(0001) vs 4(0100): 2 different bits"}]'::jsonb,'[{"input": "1\n4", "expected_output": "2", "is_hidden": false}, {"input": "3\n1", "expected_output": "1", "is_hidden": true}]'::jsonb,'XOR x^y then count set bits (popcount). O(1).',ARRAY['python','java','javascript','go','cpp'],0.82),
('Reverse Bits Integer','reverse-bits','Easy','DSA',ARRAY['bit-manipulation'],'## Problem

Reverse the bits of a 32-bit unsigned integer and return result.','Input is a 32-bit unsigned integer','[{"input": "n = 00000010100101000001111010011100", "output": "964176192 (00111001011110000010100101000000)"}]'::jsonb,'[{"input": "43261596", "expected_output": "964176192", "is_hidden": false}, {"input": "4294967293", "expected_output": "3221225471", "is_hidden": true}]'::jsonb,'Shift result left, add LSB of n, shift n right. Repeat 32 times. O(1).',ARRAY['python','java','javascript','go','cpp'],0.75),
('Bitwise AND Range','bitwise-and-of-numbers-range','Medium','DSA',ARRAY['bit-manipulation','math'],'## Problem

Return the **bitwise AND** of all numbers in range `[left, right]` inclusive.','0 ≤ left ≤ right ≤ 2^31-1','[{"input": "left=5, right=7", "output": "4", "explanation": "5&6&7 = 100"}, {"input": "left=0, right=0", "output": "0"}]'::jsonb,'[{"input": "5\n7", "expected_output": "4", "is_hidden": false}, {"input": "1\n2147483647", "expected_output": "0", "is_hidden": true}]'::jsonb,'Find common prefix of left and right in binary. Shift both right until equal; shift result left same amount. O(log n).',ARRAY['python','java','javascript','go','cpp'],0.64),
('Subsets II With Duplicates','subsets-ii','Medium','DSA',ARRAY['backtracking','arrays','sorting'],'## Problem

Given `nums` that **may contain duplicates**, return all possible subsets (no duplicate subsets).','1 ≤ n ≤ 10 | -10 ≤ nums[i] ≤ 10','[{"input": "nums = [1,2,2]", "output": "[[],[1],[1,2],[1,2,2],[2],[2,2]]"}]'::jsonb,'[{"input": "[1,2,2]", "expected_output": "[[],[1],[1,2],[1,2,2],[2],[2,2]]", "is_hidden": false}, {"input": "[0]", "expected_output": "[[],[0]]", "is_hidden": true}]'::jsonb,'Sort first. In backtracking, skip duplicates at same level: if nums[i]==nums[i-1] and i>start, skip. O(n×2^n).',ARRAY['python','java','javascript','go','cpp'],0.63),
('Combination Sum II Distinct','combination-sum-ii','Medium','DSA',ARRAY['backtracking','arrays','sorting'],'## Problem

Find all unique combinations from `candidates` that sum to `target`. Each number can only be used **once**. No duplicate combinations.','1 ≤ candidates.length ≤ 100 | 1 ≤ candidates[i] ≤ 50 | 1 ≤ target ≤ 30','[{"input": "candidates=[10,1,2,7,6,1,5], target=8", "output": "[[1,1,6],[1,2,5],[1,7],[2,6]]"}]'::jsonb,'[{"input": "[10,1,2,7,6,1,5]\n8", "expected_output": "[[1,1,6],[1,2,5],[1,7],[2,6]]", "is_hidden": false}, {"input": "[2,5,2,1,2]\n5", "expected_output": "[[1,2,2],[5]]", "is_hidden": true}]'::jsonb,'Sort. Backtrack from index start. Skip i>start if candidates[i]==candidates[i-1]. O(2^n).',ARRAY['python','java','javascript','go','cpp'],0.55),
('Permutations II With Duplicates','permutations-ii','Medium','DSA',ARRAY['backtracking','arrays'],'## Problem

Given `nums` which **may contain duplicates**, return all distinct permutations.','1 ≤ n ≤ 8 | -10 ≤ nums[i] ≤ 10','[{"input": "nums = [1,1,2]", "output": "[[1,1,2],[1,2,1],[2,1,1]]"}]'::jsonb,'[{"input": "[1,1,2]", "expected_output": "[[1,1,2],[1,2,1],[2,1,1]]", "is_hidden": false}, {"input": "[1,2,3]", "expected_output": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]", "is_hidden": true}]'::jsonb,'Sort. Use visited array. Skip if nums[i]==nums[i-1] and !visited[i-1] to avoid duplicates. O(n×n!).',ARRAY['python','java','javascript','go','cpp'],0.58),
('Palindrome Number Check','palindrome-number','Easy','DSA',ARRAY['math'],'## Problem

Determine if integer `x` is a **palindrome** (reads same forward and backward). Negative numbers are not palindromes. Solve without converting to string.','-2^31 ≤ x ≤ 2^31-1','[{"input": "x = 121", "output": "true"}, {"input": "x = -121", "output": "false"}, {"input": "x = 10", "output": "false"}]'::jsonb,'[{"input": "121", "expected_output": "true", "is_hidden": false}, {"input": "-121", "expected_output": "false", "is_hidden": true}]'::jsonb,'Reverse second half of number. Compare with first half. Negative or trailing zero (non-zero) → false. O(log n).',ARRAY['python','java','javascript','go','cpp'],0.78),
('Excel Sheet Column Number','excel-sheet-column-number','Easy','DSA',ARRAY['math','strings'],'## Problem

Convert Excel column title to its corresponding **column number**. A=1, B=2, ..., Z=26, AA=27, AB=28, ...','1 ≤ len(columnTitle) ≤ 7 | columnTitle consists of uppercase letters','[{"input": "columnTitle = \"A\"", "output": "1"}, {"input": "columnTitle = \"AB\"", "output": "28"}, {"input": "columnTitle = \"ZY\"", "output": "701"}]'::jsonb,'[{"input": "\"A\"", "expected_output": "1", "is_hidden": false}, {"input": "\"ZY\"", "expected_output": "701", "is_hidden": true}]'::jsonb,'Process left to right: result = result*26 + (char-''A''+1). O(n).',ARRAY['python','java','javascript','go','cpp'],0.79),
('GCD and LCM of Numbers','greatest-common-divisor','Easy','DSA',ARRAY['math','recursion'],'## Problem

Given two integers `a` and `b`, return their **Greatest Common Divisor** using Euclidean algorithm. Also return LCM = (a×b)/GCD.','1 ≤ a,b ≤ 10^9','[{"input": "a=12, b=18", "output": "GCD=6, LCM=36"}]'::jsonb,'[{"input": "12\n18", "expected_output": "6", "is_hidden": false}, {"input": "100\n75", "expected_output": "25", "is_hidden": true}]'::jsonb,'gcd(a,b) = gcd(b, a%b). Base: gcd(a,0)=a. Euclidean algorithm O(log min(a,b)).',ARRAY['python','java','javascript','go','cpp'],0.84),
('Integer Square Root Floor','sqrtx','Easy','DSA',ARRAY['math','binary-search'],'## Problem

Given non-negative integer `x`, return the **integer square root** (floor). Do not use built-in sqrt.','0 ≤ x ≤ 2^31-1','[{"input": "x = 4", "output": "2"}, {"input": "x = 8", "output": "2", "explanation": "sqrt(8) ≈ 2.82, floor = 2"}]'::jsonb,'[{"input": "4", "expected_output": "2", "is_hidden": false}, {"input": "8", "expected_output": "2", "is_hidden": true}]'::jsonb,'Binary search on [0, x]. Find largest k where k² ≤ x. O(log x).',ARRAY['python','java','javascript','go','cpp'],0.81),
('Flipkart Sales Total Revenue by Category','total-revenue-by-category','Easy','SQL',ARRAY['sql','aggregation','groupby','join'],'## Problem

Flipkart has `orders(order_id, product_id, quantity, price)` and `products(product_id, name, category)`. Write a query to find the **total revenue per category**, sorted descending by revenue.','Tables: orders(order_id INT, product_id INT, quantity INT, price DECIMAL) | products(product_id INT, name VARCHAR, category VARCHAR)','[{"input": "orders:[(1,1,2,100),(2,2,1,500)] products:[(1,''Phone'',''Electronics''),(2,''Shirt'',''Fashion'')]", "output": "[(''Electronics'',200),(''Fashion'',500)]"}]'::jsonb,'[{"input": "orders:[(1,1,2,100)] products:[(1,''A'',''B'')]", "expected_output": "[(''B'',200)]", "is_hidden": false}, {"input": "Empty orders", "expected_output": "[]", "is_hidden": true}]'::jsonb,'SELECT p.category, SUM(o.quantity * o.price) as revenue FROM orders o JOIN products p ON o.product_id=p.product_id GROUP BY p.category ORDER BY revenue DESC.',ARRAY['mysql','postgresql'],0.75),
('Swiggy Monthly Active Restaurants','monthly-active-restaurants','Medium','SQL',ARRAY['sql','date-functions','aggregation','window-functions'],'## Problem

Swiggy has `orders(order_id, restaurant_id, order_date, amount)`. Find restaurants with at least **10 orders in any single month** in 2024. Return restaurant_id and the month(s).','Table: orders(order_id INT, restaurant_id INT, order_date DATE, amount DECIMAL)','[{"input": "100 rows of orders data", "output": "List of restaurant_id, year_month pairs where monthly order count ≥ 10"}]'::jsonb,'[{"input": "orders with restaurant 1 having 15 orders in Jan 2024", "expected_output": "[(1,''2024-01'')]", "is_hidden": false}, {"input": "No restaurant has 10+ orders in any month", "expected_output": "[]", "is_hidden": true}]'::jsonb,'SELECT restaurant_id, DATE_FORMAT(order_date,''%Y-%m'') as month FROM orders GROUP BY restaurant_id, month HAVING COUNT(*) >= 10.',ARRAY['mysql','postgresql'],0.68),
('Customer Retention Cohort Analysis','customer-retention-cohort','Hard','SQL',ARRAY['sql','window-functions','self-join','date-functions'],'## Problem

Given `purchases(user_id, purchase_date)`, compute the **30-day retention rate**: of users who made their first purchase in a given week, what % made another purchase within 30 days?','Table: purchases(user_id INT, purchase_date DATE) | purchase_date ranges over 1 year','[{"input": "User 1 first purchase: Jan 1. Second purchase: Jan 20. User 2 first purchase: Jan 1. No second purchase.", "output": "Retention for week of Jan 1: 50%"}]'::jsonb,'[{"input": "2 users, 1 retained", "expected_output": "50.00", "is_hidden": false}, {"input": "All users retained", "expected_output": "100.00", "is_hidden": true}]'::jsonb,'CTE for first purchase per user. Join with all purchases where date between first and first+30. Group by cohort week. Retention = retained_users/cohort_size * 100.',ARRAY['mysql','postgresql'],0.32),
('Running Total Orders Cumulative','running-total-cumulative','Medium','SQL',ARRAY['sql','window-functions'],'## Problem

Given `daily_sales(sale_date, amount)`, compute the **running (cumulative) total** of sales ordered by date.','Table: daily_sales(sale_date DATE UNIQUE, amount DECIMAL)','[{"input": "daily_sales:[(2024-01-01,100),(2024-01-02,200),(2024-01-03,150)]", "output": "[(2024-01-01,100),(2024-01-02,300),(2024-01-03,450)]"}]'::jsonb,'[{"input": "[(2024-01-01,100),(2024-01-02,200)]", "expected_output": "[(2024-01-01,100),(2024-01-02,300)]", "is_hidden": false}, {"input": "[(2024-01-01,500)]", "expected_output": "[(2024-01-01,500)]", "is_hidden": true}]'::jsonb,'SELECT sale_date, SUM(amount) OVER (ORDER BY sale_date ROWS UNBOUNDED PRECEDING) as running_total FROM daily_sales.',ARRAY['mysql','postgresql'],0.72),
('Pivot Table Product Quarterly Sales','pivot-product-quarterly-sales','Hard','SQL',ARRAY['sql','pivot','aggregation','case-when'],'## Problem

Given `sales(product_id, quarter, revenue)` where quarter ∈ {Q1,Q2,Q3,Q4}, **pivot** the data to show one row per product with columns Q1, Q2, Q3, Q4.','Table: sales(product_id INT, quarter VARCHAR(2), revenue DECIMAL)','[{"input": "sales:[(1,''Q1'',100),(1,''Q2'',200),(2,''Q1'',300)]", "output": "[(1,100,200,0,0),(2,300,0,0,0)]"}]'::jsonb,'[{"input": "[(1,''Q1'',100),(1,''Q2'',200)]", "expected_output": "[(1,100,200,0,0)]", "is_hidden": false}, {"input": "Empty", "expected_output": "[]", "is_hidden": true}]'::jsonb,'SELECT product_id, SUM(CASE WHEN quarter=''Q1'' THEN revenue ELSE 0 END) as Q1, ... GROUP BY product_id.',ARRAY['mysql','postgresql'],0.55),
('Design Groww Stock Portfolio Service','design-portfolio-service','Medium','System Design',ARRAY['system-design','database','cache','real-time'],'## Problem

Design Groww''s **portfolio tracking service**:

- 10M users, each with up to 100 stock/MF holdings
- Real-time P&L (profit & loss) based on live NSE/BSE prices
- Historical performance (1D, 1W, 1M, 1Y, ALL)
- Portfolio value updates every 1 second during market hours (9:15 AM – 3:30 PM IST)
- Instant response on portfolio page load (< 200ms)

**Discuss:** data model, price ingestion, P&L computation, caching strategy, historical data.','10M users | Live prices every 1s | < 200ms page load | 6h market window/day','[{"input": "User opens portfolio at 2 PM", "output": "Total value, day gain, investment value — all current as of last 1s price tick"}, {"input": "User views 1Y performance chart", "output": "Daily closing values for last 365 days rendered in < 500ms"}]'::jsonb,'[{"input": "Real-time P&L for 10M users", "expected_output": "Push model: Kafka price ticks → compute engine per user segment → Redis portfolio cache per user", "is_hidden": false}, {"input": "Historical performance", "expected_output": "Pre-aggregate daily snapshots in TimescaleDB/ClickHouse. Query by user_id + date range.", "is_hidden": true}]'::jsonb,'## Design

**Holdings:** `holdings(user_id, symbol, quantity, avg_buy_price)` in PostgreSQL.

**Live Prices:** NSE feed → Kafka → Price Cache Service (Redis hash: symbol→price).

**P&L Compute:** On-demand: fetch holdings + prices from Redis → compute. Cache result in Redis (TTL 5s).

**Historical:** Daily cron job saves portfolio snapshot. ClickHouse for time-series queries.

**API:** GET /portfolio → Redis cache hit (< 5ms). Cache miss → compute + cache. O(holdings) per user.',ARRAY['system-design'],0.62),
('Design Dunzo Hyperlocal Delivery','design-hyperlocal-delivery','Hard','System Design',ARRAY['system-design','geospatial','matching','real-time','queue'],'## Problem

Design Dunzo''s **hyperlocal delivery matching system**:

- Match delivery partners to orders within 2km radius
- 100K concurrent active orders
- 50K delivery partners online
- Order pickup in < 3 minutes
- Dynamic pricing based on distance + surge
- Real-time tracking (GPS every 3s)
- Cancellation and re-assignment

**Discuss:** geospatial indexing, matching algorithm, order state machine.','100K concurrent orders | 50K delivery partners | < 30s match time | 2km search radius','[{"input": "New order placed at Koramangala, Bengaluru", "output": "Nearest available delivery partner within 2km assigned within 30 seconds"}, {"input": "Delivery partner declines order", "output": "Re-assign to next best partner. After 3 declines, increase search radius to 3km."}]'::jsonb,'[{"input": "Geospatial search for partners within 2km", "expected_output": "Redis GEORADIUS or H3 hex cells. Index partner locations by geo hash for O(1) cell lookup.", "is_hidden": false}, {"input": "Matching algorithm", "expected_output": "Score = f(distance, acceptance_rate, rating). Priority queue. Offer to top-3, first accept wins.", "is_hidden": true}]'::jsonb,'## Architecture

**Location Index:** Redis GEO commands. Partners ping location every 5s → GEOADD.

**Matching:** On order create, GEORADIUS search (2km). Score and rank candidates. Send push notification sequentially (timeout 30s each).

**Order State:** `PENDING → SEARCHING → ASSIGNED → PICKED_UP → DELIVERED`. Redis + DB.

**Pricing:** Base fare + distance_fee + surge multiplier (computed by separate surge service).

**Tracking:** Driver GPS → Kafka → WebSocket push to customer app.',ARRAY['system-design'],0.48)
ON CONFLICT (slug) DO NOTHING;