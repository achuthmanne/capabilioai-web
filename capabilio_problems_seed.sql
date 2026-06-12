-- ============================================================
-- Problems table + 201 DSA/SQL/System Design problems
-- Run this in your Supabase SQL Editor
-- ============================================================

create table if not exists problems (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  difficulty text check (difficulty in ('Easy','Medium','Hard')),
  category text,
  tags text[],
  statement text,
  constraints text,
  examples jsonb,
  test_cases jsonb,
  editorial text,
  languages text[],
  acceptance_rate float default 0,
  created_at timestamptz default now()
);

create index if not exists problems_difficulty_idx on problems(difficulty);
create index if not exists problems_category_idx on problems(category);
create index if not exists problems_tags_idx on problems using gin(tags);


INSERT INTO problems (title,slug,difficulty,category,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate) VALUES
('Zomato Order Pair Finder','two-sum','Easy','DSA',ARRAY['arrays','hash-map'],'## Problem

Zomato''s analytics team has a list of delivery order amounts (in rupees) and a target amount `T`. Find the indices of the **two orders** whose amounts add up to exactly `T`. You may assume exactly one valid answer exists, and you cannot use the same order twice.

Return the indices as `[i, j]` where `i < j`.','2 ≤ n ≤ 10^4 | 1 ≤ orders[i] ≤ 10^6 | 1 ≤ T ≤ 2×10^6','[{"input": "orders = [200, 50, 150, 400], T = 350", "output": "[0, 2]", "explanation": "orders[0] + orders[2] = 200 + 150 = 350"}]'::jsonb,'[{"input": "[200,50,150,400]\n350", "expected_output": "[0,2]", "is_hidden": false}, {"input": "[11,2,15,7]\n9", "expected_output": "[1,3]", "is_hidden": true}]'::jsonb,'Use a hash map: for each amount, check if T - amount exists. O(n) time, O(n) space.',ARRAY['python','java','javascript','go','cpp'],0.72),
('BSE Stock Profit Maximizer','best-time-to-buy-sell-stock','Easy','DSA',ARRAY['arrays','greedy'],'## Problem

You are given `prices[i]` = BSE stock price on day `i`. Buy once, sell once. Return the **maximum profit**. If no profit possible, return `0`.','1 ≤ n ≤ 10^5 | 0 ≤ prices[i] ≤ 10^4','[{"input": "prices = [310, 280, 420, 210, 500, 390]", "output": "290", "explanation": "Buy at 210 (day 4), sell at 500 (day 5) = 290"}]'::jsonb,'[{"input": "[310,280,420,210,500,390]", "expected_output": "290", "is_hidden": false}, {"input": "[900,800,700,600]", "expected_output": "0", "is_hidden": true}]'::jsonb,'Track running min price and max profit. Single pass O(n).',ARRAY['python','java','javascript','go','cpp'],0.68),
('Swiggy Rating Maximum Subarray','maximum-subarray','Easy','DSA',ARRAY['arrays','dynamic-programming','kadane'],'## Problem

Swiggy tracks daily net satisfaction scores (can be negative). Given `scores`, find the contiguous subarray with the **largest sum** (Kadane''s algorithm).','1 ≤ n ≤ 10^5 | -10^4 ≤ scores[i] ≤ 10^4','[{"input": "scores = [-2,1,-3,4,-1,2,1,-5,4]", "output": "6", "explanation": "Subarray [4,-1,2,1] = 6"}]'::jsonb,'[{"input": "[-2,1,-3,4,-1,2,1,-5,4]", "expected_output": "6", "is_hidden": false}, {"input": "[1]", "expected_output": "1", "is_hidden": true}]'::jsonb,'cur = max(x, cur+x); best = max(best, cur). O(n).',ARRAY['python','java','javascript','go','cpp'],0.63),
('IRCTC Train Schedule Merger','merge-intervals','Medium','DSA',ARRAY['arrays','sorting','intervals'],'## Problem

IRCTC needs to merge overlapping maintenance windows on a track. Given intervals `[[start,end],...]` in minutes from midnight, return merged non-overlapping intervals.','1 ≤ n ≤ 10^4 | 0 ≤ start ≤ end ≤ 1440','[{"input": "intervals = [[60,90],[80,120],[200,240],[230,300]]", "output": "[[60,120],[200,300]]", "explanation": "[60,90]+[80,120] overlap; [200,240]+[230,300] overlap"}]'::jsonb,'[{"input": "[[60,90],[80,120],[200,240],[230,300]]", "expected_output": "[[60,120],[200,300]]", "is_hidden": false}, {"input": "[[1,4],[4,5]]", "expected_output": "[[1,5]]", "is_hidden": true}]'::jsonb,'Sort by start. Extend last merged end if overlap. O(n log n).',ARRAY['python','java','javascript','go','cpp'],0.56),
('Flipkart Cart Three Sum','three-sum','Medium','DSA',ARRAY['arrays','two-pointers','sorting'],'## Problem

Flipkart offers price adjustments (positive = addition, negative = discount). Find all **unique triplets** from `prices` summing to **zero**.','3 ≤ n ≤ 3000 | -10^5 ≤ prices[i] ≤ 10^5','[{"input": "prices = [-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]"}]'::jsonb,'[{"input": "[-1,0,1,2,-1,-4]", "expected_output": "[[-1,-1,2],[-1,0,1]]", "is_hidden": false}, {"input": "[0,0,0]", "expected_output": "[[0,0,0]]", "is_hidden": true}]'::jsonb,'Sort. For each element, two pointers on rest. Skip duplicates. O(n²).',ARRAY['python','java','javascript','go','cpp'],0.41),
('Paytm Wallet Container Volume','container-with-most-water','Medium','DSA',ARRAY['arrays','two-pointers'],'## Problem

Given `n` wall heights, find two walls that together hold the **most water**. Return maximum water units.','2 ≤ n ≤ 10^5 | 0 ≤ height[i] ≤ 10^4','[{"input": "height = [1,8,6,2,5,4,8,3,7]", "output": "49", "explanation": "Walls at idx 1,8: min(8,7)×7=49"}]'::jsonb,'[{"input": "[1,8,6,2,5,4,8,3,7]", "expected_output": "49", "is_hidden": false}, {"input": "[1,1]", "expected_output": "1", "is_hidden": true}]'::jsonb,'Two pointers from both ends. Move pointer with smaller height. O(n).',ARRAY['python','java','javascript','go','cpp'],0.58),
('Mumbai Monsoon Water Trap','trapping-rain-water','Hard','DSA',ARRAY['arrays','two-pointers','stack'],'## Problem

Mumbai''s drainage engineers mapped city elevation. Given `heights`, compute how many units of rainwater can be trapped after monsoon rains.','1 ≤ n ≤ 2×10^4 | 0 ≤ heights[i] ≤ 10^5','[{"input": "heights = [0,1,0,2,1,0,1,3,2,1,2,1]", "output": "6"}]'::jsonb,'[{"input": "[0,1,0,2,1,0,1,3,2,1,2,1]", "expected_output": "6", "is_hidden": false}, {"input": "[4,2,0,3,2,5]", "expected_output": "9", "is_hidden": true}]'::jsonb,'Two-pointer: leftMax, rightMax. water[i]=min(leftMax,rightMax)-height[i]. O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.35),
('OYO Room Booking Jump Game','jump-game','Medium','DSA',ARRAY['arrays','greedy'],'## Problem

`jumps[i]` = max steps from position `i`. Starting at index 0, determine if you can **reach the last index**.','1 ≤ n ≤ 10^4 | 0 ≤ jumps[i] ≤ 10','[{"input": "jumps = [2,3,1,1,4]", "output": "true"}, {"input": "jumps = [3,2,1,0,4]", "output": "false"}]'::jsonb,'[{"input": "[2,3,1,1,4]", "expected_output": "true", "is_hidden": false}, {"input": "[3,2,1,0,4]", "expected_output": "false", "is_hidden": true}]'::jsonb,'Track maxReach. If i > maxReach, return false. O(n).',ARRAY['python','java','javascript','go','cpp'],0.49),
('Nykaa Product Self-Excluding Product','product-of-array-except-self','Medium','DSA',ARRAY['arrays','prefix-product'],'## Problem

Given `prices`, return array where `result[i]` = product of all elements **except** `prices[i]`. No division, O(n).','2 ≤ n ≤ 10^5 | -30 ≤ prices[i] ≤ 30','[{"input": "prices = [1,2,3,4]", "output": "[24,12,8,6]"}]'::jsonb,'[{"input": "[1,2,3,4]", "expected_output": "[24,12,8,6]", "is_hidden": false}, {"input": "[-1,1,0,-3,3]", "expected_output": "[0,0,9,0,0]", "is_hidden": true}]'::jsonb,'Prefix product left-to-right × suffix product right-to-left. O(n) O(1) extra.',ARRAY['python','java','javascript','go','cpp'],0.64),
('Reliance Jio Tower Spiral Read','spiral-matrix','Medium','DSA',ARRAY['arrays','matrix','simulation'],'## Problem

Given an `m×n` grid of signal strengths, return all elements in **clockwise spiral order**.','1 ≤ m,n ≤ 10 | -100 ≤ grid[i][j] ≤ 100','[{"input": "grid = [[1,2,3],[4,5,6],[7,8,9]]", "output": "[1,2,3,6,9,8,7,4,5]"}]'::jsonb,'[{"input": "[[1,2,3],[4,5,6],[7,8,9]]", "expected_output": "[1,2,3,6,9,8,7,4,5]", "is_hidden": false}, {"input": "[[1,2],[3,4]]", "expected_output": "[1,2,4,3]", "is_hidden": true}]'::jsonb,'Peel layers: top row, right col, bottom row, left col. Shrink boundaries. O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.52),
('IndiGo Seat Booking Subarray Sum','subarray-sum-equals-k','Medium','DSA',ARRAY['arrays','hash-map','prefix-sum'],'## Problem

Given loyalty `points` array and target `k`, count **contiguous subarrays** whose sum equals `k`.','1 ≤ n ≤ 2×10^4 | -1000 ≤ points[i] ≤ 1000 | -10^7 ≤ k ≤ 10^7','[{"input": "points = [1,1,1], k = 2", "output": "2"}]'::jsonb,'[{"input": "[1,1,1]\n2", "expected_output": "2", "is_hidden": false}, {"input": "[1,2,3]\n3", "expected_output": "2", "is_hidden": true}]'::jsonb,'Prefix sum + hashmap. For each sum S, count prev sums equal to S-k. O(n).',ARRAY['python','java','javascript','go','cpp'],0.48),
('Ola Ride Longest Consecutive Route','longest-consecutive-sequence','Medium','DSA',ARRAY['arrays','hash-set'],'## Problem

Given unsorted `checkpoints` array, find the **longest consecutive sequence** length. Solve in O(n).','0 ≤ n ≤ 10^5 | -10^9 ≤ checkpoints[i] ≤ 10^9','[{"input": "checkpoints = [100,4,200,1,3,2]", "output": "4", "explanation": "1,2,3,4"}]'::jsonb,'[{"input": "[100,4,200,1,3,2]", "expected_output": "4", "is_hidden": false}, {"input": "[0,3,7,2,5,8,4,6,0,1]", "expected_output": "9", "is_hidden": true}]'::jsonb,'HashSet. For each x where x-1 not in set, count consecutive. O(n).',ARRAY['python','java','javascript','go','cpp'],0.55),
('Hotstar Trending Majority Stream','majority-element','Easy','DSA',ARRAY['arrays','boyer-moore'],'## Problem

Given video ID stream `views`, find the video appearing more than `n/2` times (guaranteed to exist).','1 ≤ n ≤ 5×10^4 | Majority element always exists','[{"input": "views = [3,2,3]", "output": "3"}, {"input": "views = [2,2,1,1,1,2,2]", "output": "2"}]'::jsonb,'[{"input": "[3,2,3]", "expected_output": "3", "is_hidden": false}, {"input": "[2,2,1,1,1,2,2]", "expected_output": "2", "is_hidden": true}]'::jsonb,'Boyer-Moore Voting: candidate + count. If count=0, new candidate. O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.74),
('Myntra Discount Sort Colors','sort-colors','Medium','DSA',ARRAY['arrays','two-pointers','dutch-national-flag'],'## Problem

Clothing tiers: 0=no discount, 1=10% off, 2=50% off. Sort `tiers` in-place with single pass, O(1) extra.','1 ≤ n ≤ 300 | tiers[i] ∈ {0,1,2}','[{"input": "tiers = [2,0,2,1,1,0]", "output": "[0,0,1,1,2,2]"}]'::jsonb,'[{"input": "[2,0,2,1,1,0]", "expected_output": "[0,0,1,1,2,2]", "is_hidden": false}, {"input": "[2,0,1]", "expected_output": "[0,1,2]", "is_hidden": true}]'::jsonb,'Dutch National Flag: lo/mid/hi pointers. O(n).',ARRAY['python','java','javascript','go','cpp'],0.61),
('PhonePe Transaction Kth Largest','kth-largest-element','Medium','DSA',ARRAY['arrays','heap','quickselect'],'## Problem

Find the **Kth largest** transaction amount in an unsorted list. Not kth distinct.','1 ≤ k ≤ n ≤ 10^4 | -10^4 ≤ transactions[i] ≤ 10^4','[{"input": "transactions = [3,2,1,5,6,4], k = 2", "output": "5"}, {"input": "transactions = [3,2,3,1,2,4,5,5,6], k = 4", "output": "4"}]'::jsonb,'[{"input": "[3,2,1,5,6,4]\n2", "expected_output": "5", "is_hidden": false}, {"input": "[3,2,3,1,2,4,5,5,6]\n4", "expected_output": "4", "is_hidden": true}]'::jsonb,'Min-heap of size k. O(n log k). Or Quickselect O(n) avg.',ARRAY['python','java','javascript','go','cpp'],0.58),
('BigBasket Delivery Meeting Rooms','meeting-rooms-ii','Medium','DSA',ARRAY['arrays','sorting','heap','intervals'],'## Problem

Given delivery slot `meetings = [[start,end],...]`, find minimum **conference rooms** needed.','0 ≤ n ≤ 10^4 | 0 ≤ start < end ≤ 10^6','[{"input": "meetings = [[0,30],[5,10],[15,20]]", "output": "2"}]'::jsonb,'[{"input": "[[0,30],[5,10],[15,20]]", "expected_output": "2", "is_hidden": false}, {"input": "[[7,10],[2,4]]", "expected_output": "1", "is_hidden": true}]'::jsonb,'Sort by start. Min-heap of end times. Reuse room if heap.top ≤ start. Size = answer. O(n log n).',ARRAY['python','java','javascript','go','cpp'],0.54),
('Amazon India Warehouse Next Permutation','next-permutation','Medium','DSA',ARRAY['arrays','permutation'],'## Problem

Rearrange `digits` into the lexicographically **next greater permutation** in-place. If largest, rearrange to smallest.','1 ≤ n ≤ 100 | 0 ≤ digits[i] ≤ 9','[{"input": "digits = [1,2,3]", "output": "[1,3,2]"}, {"input": "digits = [3,2,1]", "output": "[1,2,3]"}]'::jsonb,'[{"input": "[1,2,3]", "expected_output": "[1,3,2]", "is_hidden": false}, {"input": "[3,2,1]", "expected_output": "[1,2,3]", "is_hidden": true}]'::jsonb,'Find rightmost i where arr[i]<arr[i+1]. Find rightmost j>i where arr[j]>arr[i]. Swap, reverse suffix.',ARRAY['python','java','javascript','go','cpp'],0.44),
('Dunzo Delivery Maximum Product Subarray','maximum-product-subarray','Medium','DSA',ARRAY['arrays','dynamic-programming'],'## Problem

Given efficiency `multipliers` array, find the contiguous subarray with **maximum product**.','1 ≤ n ≤ 2×10^4 | -10 ≤ multipliers[i] ≤ 10','[{"input": "multipliers = [2,3,-2,4]", "output": "6"}, {"input": "multipliers = [-2,0,-1]", "output": "0"}]'::jsonb,'[{"input": "[2,3,-2,4]", "expected_output": "6", "is_hidden": false}, {"input": "[-2,0,-1]", "expected_output": "0", "is_hidden": true}]'::jsonb,'Track curMax and curMin (negatives flip). At each step update both. O(n).',ARRAY['python','java','javascript','go','cpp'],0.46),
('Rapido Biker Find Duplicate','find-the-duplicate-number','Medium','DSA',ARRAY['arrays','floyd-cycle'],'## Problem

`n+1` integers in range `[1,n]` — one is duplicated. Find it without modifying array, O(1) extra space.','1 ≤ n ≤ 10^5 | Only one duplicate','[{"input": "rider_ids = [1,3,4,2,2]", "output": "2"}, {"input": "rider_ids = [3,1,3,4,2]", "output": "3"}]'::jsonb,'[{"input": "[1,3,4,2,2]", "expected_output": "2", "is_hidden": false}, {"input": "[3,1,3,4,2]", "expected_output": "3", "is_hidden": true}]'::jsonb,'Floyd cycle detection treating array as linked list. O(n) time, O(1) space.',ARRAY['python','java','javascript','go','cpp'],0.43),
('Set Matrix Zeroes Warehouse Grid','set-matrix-zeroes','Medium','DSA',ARRAY['arrays','matrix'],'## Problem

A Warehousing grid represents stock levels. If any cell is `0`, set its **entire row and column** to `0` in-place. Use O(1) extra space.','1 ≤ m,n ≤ 200 | -2^31 ≤ matrix[i][j] ≤ 2^31-1','[{"input": "matrix = [[1,1,1],[1,0,1],[1,1,1]]", "output": "[[1,0,1],[0,0,0],[1,0,1]]"}]'::jsonb,'[{"input": "[[1,1,1],[1,0,1],[1,1,1]]", "expected_output": "[[1,0,1],[0,0,0],[1,0,1]]", "is_hidden": false}, {"input": "[[0,1,2,0],[3,4,5,2],[1,3,1,5]]", "expected_output": "[[0,0,0,0],[0,4,5,0],[0,3,1,0]]", "is_hidden": true}]'::jsonb,'Use first row/col as markers. Two passes. O(m×n) time O(1) space.',ARRAY['python','java','javascript','go','cpp'],0.55)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO problems (title,slug,difficulty,category,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate) VALUES
('Swiggy Search Longest Unique Window','longest-substring-without-repeating','Medium','DSA',ARRAY['strings','sliding-window','hash-map'],'## Problem

Find the length of the **longest substring without repeating characters** in search string `s`.','0 ≤ len(s) ≤ 5×10^4 | s consists of printable ASCII','[{"input": "s = \"zomato\"", "output": "5", "explanation": "\"zomat\" length 5, o repeats"}, {"input": "s = \"bbbbb\"", "output": "1"}]'::jsonb,'[{"input": "\"zomato\"", "expected_output": "5", "is_hidden": false}, {"input": "\"bbbbb\"", "expected_output": "1", "is_hidden": true}]'::jsonb,'Sliding window + hashmap of last seen index. Move left past repeat. O(n).',ARRAY['python','java','javascript','go','cpp'],0.61),
('Shaadi.com Profile Anagram Check','valid-anagram','Easy','DSA',ARRAY['strings','hash-map'],'## Problem

Determine if strings `s` and `t` are **anagrams** of each other.','1 ≤ len(s),len(t) ≤ 5×10^4 | lowercase English letters','[{"input": "s = \"listen\", t = \"silent\"", "output": "true"}, {"input": "s = \"rat\", t = \"car\"", "output": "false"}]'::jsonb,'[{"input": "\"anagram\"\n\"nagaram\"", "expected_output": "true", "is_hidden": false}, {"input": "\"rat\"\n\"car\"", "expected_output": "false", "is_hidden": true}]'::jsonb,'Count char frequencies in array[26]. Compare. O(n).',ARRAY['python','java','javascript','go','cpp'],0.71),
('BookMyShow Ticket Group Anagrams','group-anagrams','Medium','DSA',ARRAY['strings','hash-map','sorting'],'## Problem

Group all strings in `tickets` that are anagrams of each other into sublists.','1 ≤ n ≤ 10^4 | 0 ≤ len(tickets[i]) ≤ 100','[{"input": "tickets = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]", "output": "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]"}]'::jsonb,'[{"input": "[\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]", "expected_output": "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]", "is_hidden": false}, {"input": "[\"\"]", "expected_output": "[[\"\"]]", "is_hidden": true}]'::jsonb,'Use sorted string as hashmap key. O(n·k·log k).',ARRAY['python','java','javascript','go','cpp'],0.65),
('Zepto QR Code Valid Parentheses','valid-parentheses','Easy','DSA',ARRAY['strings','stack'],'## Problem

Given string `s` with only `()[]{}`characters, determine if brackets are **validly matched**.','1 ≤ len(s) ≤ 10^4','[{"input": "s = \"()[]{}\"", "output": "true"}, {"input": "s = \"([)]\"", "output": "false"}]'::jsonb,'[{"input": "\"()[]{}\"", "expected_output": "true", "is_hidden": false}, {"input": "\"([)]\"", "expected_output": "false", "is_hidden": true}]'::jsonb,'Stack: push opening, on closing check top match. Empty at end = valid. O(n).',ARRAY['python','java','javascript','go','cpp'],0.77),
('MakeMyTrip Itinerary Palindrome','longest-palindromic-substring','Medium','DSA',ARRAY['strings','dynamic-programming','expand-around-center'],'## Problem

Given string `s`, return the **longest palindromic substring**.','1 ≤ len(s) ≤ 1000','[{"input": "s = \"babad\"", "output": "\"bab\""}, {"input": "s = \"cbbd\"", "output": "\"bb\""}]'::jsonb,'[{"input": "\"babad\"", "expected_output": "\"bab\"", "is_hidden": false}, {"input": "\"cbbd\"", "expected_output": "\"bb\"", "is_hidden": true}]'::jsonb,'Expand around each center (odd/even). Track max. O(n²) O(1).',ARRAY['python','java','javascript','go','cpp'],0.39),
('Urban Company Service Keyword Window','minimum-window-substring','Hard','DSA',ARRAY['strings','sliding-window','hash-map'],'## Problem

Find the **minimum window substring** of `s` that contains all characters of `t`.','1 ≤ len(s),len(t) ≤ 10^5','[{"input": "s = \"ADOBECODEBANC\", t = \"ABC\"", "output": "\"BANC\""}]'::jsonb,'[{"input": "\"ADOBECODEBANC\"\n\"ABC\"", "expected_output": "\"BANC\"", "is_hidden": false}, {"input": "\"a\"\n\"a\"", "expected_output": "\"a\"", "is_hidden": true}]'::jsonb,'Sliding window: expand right until covered, shrink left. Track min length. O(n).',ARRAY['python','java','javascript','go','cpp'],0.31),
('Naukri.com Resume Word Break','word-break','Medium','DSA',ARRAY['strings','dynamic-programming'],'## Problem

Return `true` if string `s` can be **segmented** into words all present in `wordDict`.','1 ≤ len(s) ≤ 300 | 1 ≤ len(wordDict) ≤ 1000','[{"input": "s = \"leetcode\", wordDict = [\"leet\",\"code\"]", "output": "true"}, {"input": "s = \"catsandog\", wordDict = [\"cats\",\"dog\",\"and\",\"cat\"]", "output": "false"}]'::jsonb,'[{"input": "\"leetcode\"\n[\"leet\",\"code\"]", "expected_output": "true", "is_hidden": false}, {"input": "\"catsandog\"\n[\"cats\",\"dog\",\"sand\",\"and\",\"cat\"]", "expected_output": "false", "is_hidden": true}]'::jsonb,'dp[i]=true if s[0..i] segmentable. For each i, try all j<i. O(n²).',ARRAY['python','java','javascript','go','cpp'],0.45),
('HDFC Bank OTP Decode Ways','decode-ways','Medium','DSA',ARRAY['strings','dynamic-programming'],'## Problem

A=1..Z=26. Given digit string `code`, return the **number of ways** to decode it.','1 ≤ len(code) ≤ 100 | Only digits','[{"input": "code = \"226\"", "output": "3", "explanation": "BZ, VF, BBF"}]'::jsonb,'[{"input": "\"226\"", "expected_output": "3", "is_hidden": false}, {"input": "\"06\"", "expected_output": "0", "is_hidden": true}]'::jsonb,'dp[i] = ways for s[0..i-1]. Add dp[i-1] if s[i-1]!=''0''; dp[i-2] if s[i-2..i-1] in [10,26]. O(n).',ARRAY['python','java','javascript','go','cpp'],0.42),
('Paytm UPI Handle Longest Common Prefix','longest-common-prefix','Easy','DSA',ARRAY['strings','trie'],'## Problem

Find the **longest common prefix** among `handles` array. Return empty string if none.','1 ≤ n ≤ 200 | 0 ≤ len(handles[i]) ≤ 200','[{"input": "handles = [\"flower\",\"flow\",\"flight\"]", "output": "\"fl\""}, {"input": "handles = [\"dog\",\"racecar\",\"car\"]", "output": "\"\""}]'::jsonb,'[{"input": "[\"flower\",\"flow\",\"flight\"]", "expected_output": "\"fl\"", "is_hidden": false}, {"input": "[\"dog\",\"racecar\",\"car\"]", "expected_output": "\"\"", "is_hidden": true}]'::jsonb,'Sort array. Compare only first and last string. O(n·m).',ARRAY['python','java','javascript','go','cpp'],0.69),
('WhatsApp India Reverse Words','reverse-words-in-string','Medium','DSA',ARRAY['strings','two-pointers'],'## Problem

Reverse the order of **words** in string `s`. Strip extra spaces.','1 ≤ len(s) ≤ 10^4','[{"input": "s = \"the sky is blue\"", "output": "\"blue is sky the\""}, {"input": "s = \"  hello world  \"", "output": "\"world hello\""}]'::jsonb,'[{"input": "\"the sky is blue\"", "expected_output": "\"blue is sky the\"", "is_hidden": false}, {"input": "\"  hello world  \"", "expected_output": "\"world hello\"", "is_hidden": true}]'::jsonb,'Split on whitespace, reverse list, join. O(n).',ARRAY['python','java','javascript','go','cpp'],0.59),
('Meesho Order Chain Reversal','reverse-linked-list','Easy','DSA',ARRAY['linked-list','recursion'],'## Problem

Reverse a singly linked list and return the new head.','0 ≤ n ≤ 5000 | -5000 ≤ val ≤ 5000','[{"input": "head = 1→2→3→4→5", "output": "5→4→3→2→1"}]'::jsonb,'[{"input": "[1,2,3,4,5]", "expected_output": "[5,4,3,2,1]", "is_hidden": false}, {"input": "[1,2]", "expected_output": "[2,1]", "is_hidden": true}]'::jsonb,'Iterative: prev=None. While cur: save next, point back, advance. O(n).',ARRAY['python','java','javascript','go','cpp'],0.78),
('CRED Bill Merge Sorted Lists','merge-two-sorted-lists','Easy','DSA',ARRAY['linked-list','recursion'],'## Problem

Merge two sorted linked lists into one sorted list.','0 ≤ n,m ≤ 50 | -100 ≤ val ≤ 100','[{"input": "list1 = 1→2→4, list2 = 1→3→4", "output": "1→1→2→3→4→4"}]'::jsonb,'[{"input": "[1,2,4]\n[1,3,4]", "expected_output": "[1,1,2,3,4,4]", "is_hidden": false}, {"input": "[]\n[]", "expected_output": "[]", "is_hidden": true}]'::jsonb,'Compare heads, attach smaller, recurse. O(n+m).',ARRAY['python','java','javascript','go','cpp'],0.76),
('Ather Scooter Route Cycle Detection','linked-list-cycle','Easy','DSA',ARRAY['linked-list','floyd-cycle'],'## Problem

Detect if linked list has a **cycle**. Use O(1) memory.','0 ≤ n ≤ 10^4 | pos is -1 or valid index','[{"input": "head = [3,2,0,-4], pos = 1", "output": "true", "explanation": "Tail connects back to index 1"}]'::jsonb,'[{"input": "[3,2,0,-4]\n1", "expected_output": "true", "is_hidden": false}, {"input": "[1]\n-1", "expected_output": "false", "is_hidden": true}]'::jsonb,'Floyd''s: slow 1 step, fast 2 steps. If they meet, cycle. O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.73),
('Groww Portfolio LRU Cache','lru-cache','Medium','DSA',ARRAY['linked-list','hash-map','design'],'## Problem

Design an **LRU Cache** with capacity `k`. `get(key)` and `put(key,value)` both O(1). Evict LRU on overflow.','1 ≤ capacity ≤ 3000 | At most 3×10^4 calls','[{"input": "LRUCache(2); put(1,1); put(2,2); get(1)→1; put(3,3); get(2)→-1", "output": "1, -1"}]'::jsonb,'[{"input": "cap=2\nput(1,1),put(2,2),get(1),put(3,3),get(2),get(3)", "expected_output": "1,-1,3", "is_hidden": false}, {"input": "cap=1\nput(2,1),get(2),put(3,2),get(2),get(3)", "expected_output": "1,-1,2", "is_hidden": true}]'::jsonb,'Doubly-linked list + hashmap. Most recent at head. O(1) get/put.',ARRAY['python','java','javascript','go','cpp'],0.38),
('Razorpay Payment Add Two Numbers','add-two-numbers','Medium','DSA',ARRAY['linked-list','math'],'## Problem

Two numbers stored as reversed linked lists of digits. Add them and return sum as reversed linked list.','1 ≤ n,m ≤ 100 | 0 ≤ digit ≤ 9','[{"input": "l1 = 2→4→3, l2 = 5→6→4", "output": "7→0→8", "explanation": "342 + 465 = 807"}]'::jsonb,'[{"input": "[2,4,3]\n[5,6,4]", "expected_output": "[7,0,8]", "is_hidden": false}, {"input": "[9,9,9]\n[1]", "expected_output": "[0,0,0,1]", "is_hidden": true}]'::jsonb,'Traverse both with carry. node = (sum%10), carry = sum//10. O(max(m,n)).',ARRAY['python','java','javascript','go','cpp'],0.51),
('Swiggy Delivery Remove Nth From End','remove-nth-node-from-end','Medium','DSA',ARRAY['linked-list','two-pointers'],'## Problem

Remove the **nth node from the end** of linked list in one pass.','1 ≤ n ≤ sz ≤ 30','[{"input": "head = 1→2→3→4→5, n = 2", "output": "1→2→3→5"}]'::jsonb,'[{"input": "[1,2,3,4,5]\n2", "expected_output": "[1,2,3,5]", "is_hidden": false}, {"input": "[1]\n1", "expected_output": "[]", "is_hidden": true}]'::jsonb,'Two pointers n+1 apart. Move both until fast=None. O(n).',ARRAY['python','java','javascript','go','cpp'],0.57),
('Copy List with Random Pointer','copy-list-with-random-pointer','Medium','DSA',ARRAY['linked-list','hash-map'],'## Problem

A linked list where each node has `next` and `random` pointers. Create a **deep copy** of the list.','0 ≤ n ≤ 1000 | -10^4 ≤ val ≤ 10^4 | random points to any node or null','[{"input": "head = [[7,null],[13,0],[11,4],[10,2],[1,0]]", "output": "[[7,null],[13,0],[11,4],[10,2],[1,0]]"}]'::jsonb,'[{"input": "[[7,null],[13,0],[11,4],[10,2],[1,0]]", "expected_output": "[[7,null],[13,0],[11,4],[10,2],[1,0]]", "is_hidden": false}, {"input": "[[1,1],[2,1]]", "expected_output": "[[1,1],[2,1]]", "is_hidden": true}]'::jsonb,'Hashmap from original to copy. Two passes: create nodes, then set next and random. O(n).',ARRAY['python','java','javascript','go','cpp'],0.55),
('Vedantu Course Tree Depth','maximum-depth-binary-tree','Easy','DSA',ARRAY['trees','dfs','recursion'],'## Problem

Find the **maximum depth** of a binary tree (longest root-to-leaf path).','0 ≤ n ≤ 10^4','[{"input": "root = [3,9,20,null,null,15,7]", "output": "3"}]'::jsonb,'[{"input": "[3,9,20,null,null,15,7]", "expected_output": "3", "is_hidden": false}, {"input": "[1,null,2]", "expected_output": "2", "is_hidden": true}]'::jsonb,'DFS: 1 + max(depth(left), depth(right)). Base: None→0. O(n).',ARRAY['python','java','javascript','go','cpp'],0.81),
('BYJU''s Concept Tree Invert','invert-binary-tree','Easy','DSA',ARRAY['trees','dfs'],'## Problem

Invert (mirror) a binary tree — swap all left and right children.','0 ≤ n ≤ 100','[{"input": "root = [4,2,7,1,3,6,9]", "output": "[4,7,2,9,6,3,1]"}]'::jsonb,'[{"input": "[4,2,7,1,3,6,9]", "expected_output": "[4,7,2,9,6,3,1]", "is_hidden": false}, {"input": "[2,1,3]", "expected_output": "[2,3,1]", "is_hidden": true}]'::jsonb,'Swap children, recurse. O(n).',ARRAY['python','java','javascript','go','cpp'],0.82),
('IIT Ranking BST Validate','validate-binary-search-tree','Medium','DSA',ARRAY['trees','dfs','bst'],'## Problem

Validate that a binary tree is a valid BST — each node''s value is strictly between all values in its subtrees.','1 ≤ n ≤ 10^4 | -2^31 ≤ val ≤ 2^31-1','[{"input": "root = [2,1,3]", "output": "true"}, {"input": "root = [5,1,4,null,null,3,6]", "output": "false"}]'::jsonb,'[{"input": "[2,1,3]", "expected_output": "true", "is_hidden": false}, {"input": "[5,1,4,null,null,3,6]", "expected_output": "false", "is_hidden": true}]'::jsonb,'DFS with (min,max) bounds. O(n).',ARRAY['python','java','javascript','go','cpp'],0.52)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO problems (title,slug,difficulty,category,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate) VALUES
('Infosys Org Chart LCA','lowest-common-ancestor-bst','Medium','DSA',ARRAY['trees','bst','dfs'],'## Problem

In a BST, find the **Lowest Common Ancestor** of nodes `p` and `q`.','2 ≤ n ≤ 10^5 | p and q both exist','[{"input": "root = [6,2,8,0,4,7,9], p=2, q=8", "output": "6"}, {"input": "root = [6,2,8,0,4,7,9], p=2, q=4", "output": "2"}]'::jsonb,'[{"input": "[6,2,8,0,4,7,9]\n2\n8", "expected_output": "6", "is_hidden": false}, {"input": "[6,2,8,0,4,7,9]\n2\n4", "expected_output": "2", "is_hidden": true}]'::jsonb,'If both < node go left; if both > go right; else current is LCA. O(h).',ARRAY['python','java','javascript','go','cpp'],0.65),
('Taj Hotel Floor Level Order','binary-tree-level-order-traversal','Medium','DSA',ARRAY['trees','bfs','queue'],'## Problem

Return the **level-order traversal** of a binary tree as nested sublists.','0 ≤ n ≤ 2000','[{"input": "root = [3,9,20,null,null,15,7]", "output": "[[3],[9,20],[15,7]]"}]'::jsonb,'[{"input": "[3,9,20,null,null,15,7]", "expected_output": "[[3],[9,20],[15,7]]", "is_hidden": false}, {"input": "[1]", "expected_output": "[[1]]", "is_hidden": true}]'::jsonb,'BFS with queue. Record level size, process exactly that many. O(n).',ARRAY['python','java','javascript','go','cpp'],0.69),
('Juspay Path Sum Problem','path-sum','Easy','DSA',ARRAY['trees','dfs'],'## Problem

Return `true` if there is a **root-to-leaf path** summing to `targetSum`.','0 ≤ n ≤ 5000 | -1000 ≤ val,targetSum ≤ 1000','[{"input": "root = [5,4,8,11,null,13,4,7,2], targetSum=22", "output": "true", "explanation": "5→4→11→2=22"}]'::jsonb,'[{"input": "[5,4,8,11,null,13,4,7,2,null,null,null,1]\n22", "expected_output": "true", "is_hidden": false}, {"input": "[1,2,3]\n5", "expected_output": "false", "is_hidden": true}]'::jsonb,'DFS subtract val. At leaf check remaining==0. O(n).',ARRAY['python','java','javascript','go','cpp'],0.7),
('Ola Maps Right Side Tree View','binary-tree-right-side-view','Medium','DSA',ARRAY['trees','bfs'],'## Problem

Return values of nodes visible from the **right side** of a binary tree (rightmost per level).','0 ≤ n ≤ 100','[{"input": "root = [1,2,3,null,5,null,4]", "output": "[1,3,4]"}]'::jsonb,'[{"input": "[1,2,3,null,5,null,4]", "expected_output": "[1,3,4]", "is_hidden": false}, {"input": "[1,null,3]", "expected_output": "[1,3]", "is_hidden": true}]'::jsonb,'BFS level order: last element of each level. O(n).',ARRAY['python','java','javascript','go','cpp'],0.68),
('Nagarro Binary Tree Max Path','binary-tree-maximum-path-sum','Hard','DSA',ARRAY['trees','dfs','dynamic-programming'],'## Problem

A **path** can go through any nodes. Find the **maximum path sum** (at least one node).','1 ≤ n ≤ 3×10^4 | -1000 ≤ val ≤ 1000','[{"input": "root = [-10,9,20,null,null,15,7]", "output": "42", "explanation": "Path 15→20→7"}]'::jsonb,'[{"input": "[-10,9,20,null,null,15,7]", "expected_output": "42", "is_hidden": false}, {"input": "[1,2,3]", "expected_output": "6", "is_hidden": true}]'::jsonb,'DFS returns max single-path gain. Update global max with left+val+right. O(n).',ARRAY['python','java','javascript','go','cpp'],0.33),
('BST Kth Smallest Element','kth-smallest-in-bst','Medium','DSA',ARRAY['trees','bst','dfs'],'## Problem

Given a BST and integer `k`, return the **kth smallest** element.','1 ≤ k ≤ n ≤ 10^4 | 0 ≤ val ≤ 10^4','[{"input": "root = [3,1,4,null,2], k=1", "output": "1"}, {"input": "root = [5,3,6,2,4,null,null,1], k=3", "output": "3"}]'::jsonb,'[{"input": "[3,1,4,null,2]\n1", "expected_output": "1", "is_hidden": false}, {"input": "[5,3,6,2,4,null,null,1]\n3", "expected_output": "3", "is_hidden": true}]'::jsonb,'In-order traversal (iterative or recursive). k-th visited node. O(h+k).',ARRAY['python','java','javascript','go','cpp'],0.71),
('Sorted Array to BST Construction','sorted-array-to-bst','Easy','DSA',ARRAY['trees','dfs','divide-conquer'],'## Problem

Convert a sorted `nums` array into a **height-balanced BST**.','1 ≤ n ≤ 10^4 | -10^4 ≤ nums[i] ≤ 10^4 | nums is sorted ascending','[{"input": "nums = [-10,-3,0,5,9]", "output": "[0,-3,9,-10,null,5]"}]'::jsonb,'[{"input": "[-10,-3,0,5,9]", "expected_output": "[0,-3,9,-10,null,5]", "is_hidden": false}, {"input": "[1,3]", "expected_output": "[3,1]", "is_hidden": true}]'::jsonb,'Recursively use mid as root, left half as left subtree, right half as right. O(n).',ARRAY['python','java','javascript','go','cpp'],0.77),
('Kerala Backwaters Island Counter','number-of-islands','Medium','DSA',ARRAY['graphs','dfs','bfs','union-find'],'## Problem

Given `m×n` grid of ''1'' (land) and ''0'' (water), count the **number of islands** (connected land groups).','1 ≤ m,n ≤ 300 | grid[i][j] ∈ {''0'',''1''}','[{"input": "grid = [[\"1\",\"1\",\"0\"],[\"0\",\"1\",\"0\"],[\"0\",\"0\",\"1\"]]", "output": "2"}]'::jsonb,'[{"input": "[[\"1\",\"1\",\"0\"],[\"0\",\"1\",\"0\"],[\"0\",\"0\",\"1\"]]", "expected_output": "2", "is_hidden": false}, {"input": "[[\"1\",\"1\",\"1\"],[\"1\",\"1\",\"1\"]]", "expected_output": "1", "is_hidden": true}]'::jsonb,'DFS/BFS from each unvisited ''1'', mark connected. Count DFS calls. O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.57),
('UPSC Exam Course Schedule','course-schedule','Medium','DSA',ARRAY['graphs','topological-sort','cycle-detection'],'## Problem

`n` subjects with `prerequisites[i]=[a,b]` meaning b before a. Can you finish all? (Detect cycle in directed graph.)','1 ≤ n ≤ 2000 | 0 ≤ prerequisites.length ≤ 5000','[{"input": "n=2, prerequisites=[[1,0]]", "output": "true"}, {"input": "n=2, prerequisites=[[1,0],[0,1]]", "output": "false"}]'::jsonb,'[{"input": "2\n[[1,0]]", "expected_output": "true", "is_hidden": false}, {"input": "2\n[[1,0],[0,1]]", "expected_output": "false", "is_hidden": true}]'::jsonb,'DFS cycle detection with 3 states. O(V+E).',ARRAY['python','java','javascript','go','cpp'],0.48),
('Course Schedule II Order','course-schedule-ii','Medium','DSA',ARRAY['graphs','topological-sort'],'## Problem

Return a valid **order** to finish all courses given prerequisites. If impossible, return empty array.','1 ≤ n ≤ 2000 | 0 ≤ prerequisites.length ≤ 5000','[{"input": "n=4, prerequisites=[[1,0],[2,0],[3,1],[3,2]]", "output": "[0,1,2,3]"}]'::jsonb,'[{"input": "4\n[[1,0],[2,0],[3,1],[3,2]]", "expected_output": "[0,1,2,3]", "is_hidden": false}, {"input": "2\n[[1,0]]", "expected_output": "[0,1]", "is_hidden": true}]'::jsonb,'Kahn''s algorithm (BFS) or DFS topological sort. Append to result in reverse finish order. O(V+E).',ARRAY['python','java','javascript','go','cpp'],0.51),
('Hyderabad Metro Network Delay','network-delay-time','Medium','DSA',ARRAY['graphs','dijkstra','shortest-path'],'## Problem

Given `n` stations, `times[i]=[src,dst,time]`, starting station `k`, return **min time** to reach all stations. Return -1 if impossible.','1 ≤ k ≤ n ≤ 100 | 1 ≤ times.length ≤ 6000','[{"input": "times=[[2,1,1],[2,3,1],[3,4,1]], n=4, k=2", "output": "2"}]'::jsonb,'[{"input": "[[2,1,1],[2,3,1],[3,4,1]]\n4\n2", "expected_output": "2", "is_hidden": false}, {"input": "[[1,2,1]]\n2\n2", "expected_output": "-1", "is_hidden": true}]'::jsonb,'Dijkstra from k. Answer = max dist. If any inf, return -1. O(E log V).',ARRAY['python','java','javascript','go','cpp'],0.51),
('Bangalore Traffic Rotting Mangoes','rotting-oranges','Medium','DSA',ARRAY['graphs','bfs','matrix'],'## Problem

Grid: 0=empty, 1=fresh mango, 2=rotten. Each minute fresh adjacent to rotten rots. Return min minutes, or -1.','1 ≤ m,n ≤ 10 | grid[i][j] ∈ {0,1,2}','[{"input": "grid = [[2,1,1],[1,1,0],[0,1,1]]", "output": "4"}]'::jsonb,'[{"input": "[[2,1,1],[1,1,0],[0,1,1]]", "expected_output": "4", "is_hidden": false}, {"input": "[[2,1,1],[0,1,1],[1,0,1]]", "expected_output": "-1", "is_hidden": true}]'::jsonb,'Multi-source BFS from all rotten. Minutes = BFS levels. O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.56),
('Indian Railways Cheapest Flight','cheapest-flights-within-k-stops','Medium','DSA',ARRAY['graphs','bellman-ford','dynamic-programming'],'## Problem

Find **cheapest price** from `src` to `dst` with at most `k` stops. Return -1 if impossible.','1 ≤ n ≤ 100 | 0 ≤ flights.length ≤ 6000 | 0 ≤ k ≤ n-1','[{"input": "n=3, flights=[[0,1,100],[1,2,100],[0,2,500]], src=0, dst=2, k=1", "output": "200"}]'::jsonb,'[{"input": "3\n[[0,1,100],[1,2,100],[0,2,500]]\n0\n2\n1", "expected_output": "200", "is_hidden": false}, {"input": "3\n[[0,1,100],[1,2,100],[0,2,500]]\n0\n2\n0", "expected_output": "500", "is_hidden": true}]'::jsonb,'Bellman-Ford k+1 rounds. Copy prev distances per round. O(k×E).',ARRAY['python','java','javascript','go','cpp'],0.4),
('Pacific Atlantic Water Flow','pacific-atlantic-water-flow','Medium','DSA',ARRAY['graphs','dfs','bfs','matrix'],'## Problem

An island grid: water flows to Pacific (top/left edges) or Atlantic (bottom/right edges) if it can reach lower/equal adjacent cells. Find cells that can flow to **both oceans**.','1 ≤ m,n ≤ 200 | 0 ≤ heights[i][j] ≤ 10^5','[{"input": "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]", "output": "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]"}]'::jsonb,'[{"input": "[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]", "expected_output": "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]", "is_hidden": false}, {"input": "[[1]]", "expected_output": "[[0,0]]", "is_hidden": true}]'::jsonb,'BFS/DFS from each ocean''s border going uphill. Intersection = answer. O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.49),
('Delhi Metro Surrounded Regions','surrounded-regions','Medium','DSA',ARRAY['graphs','dfs','bfs'],'## Problem

Given grid of ''X'' and ''O'', capture all ''O'' regions **completely surrounded** by ''X'' (4-directionally). Border-connected ''O''s are not captured.','1 ≤ m,n ≤ 200 | grid[i][j] ∈ {''X'',''O''}','[{"input": "board = [[\"X\",\"X\",\"X\"],[\"X\",\"O\",\"X\"],[\"X\",\"X\",\"X\"]]", "output": "[[\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\"]]"}]'::jsonb,'[{"input": "[[\"X\",\"X\",\"X\"],[\"X\",\"O\",\"X\"],[\"X\",\"X\",\"X\"]]", "expected_output": "[[\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\"]]", "is_hidden": false}, {"input": "[[\"X\"]]", "expected_output": "[[\"X\"]]", "is_hidden": true}]'::jsonb,'DFS from all border ''O''s, mark safe. Then flip remaining ''O'' to ''X''. O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.41),
('Stairs to ISRO Launch Pad','climbing-stairs','Easy','DSA',ARRAY['dynamic-programming','fibonacci'],'## Problem

`n` step launch pad. Climb 1 or 2 steps at a time. How many **distinct ways** to reach top?','1 ≤ n ≤ 45','[{"input": "n = 3", "output": "3", "explanation": "1+1+1, 1+2, 2+1"}, {"input": "n = 2", "output": "2"}]'::jsonb,'[{"input": "3", "expected_output": "3", "is_hidden": false}, {"input": "10", "expected_output": "89", "is_hidden": true}]'::jsonb,'dp[i]=dp[i-1]+dp[i-2]. Fibonacci. O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.83),
('Thief Looting Delhi Markets','house-robber','Easy','DSA',ARRAY['dynamic-programming'],'## Problem

Rob non-adjacent stalls. Given `money[i]` per stall, return **maximum money** without triggering alarms.','1 ≤ n ≤ 100 | 0 ≤ money[i] ≤ 400','[{"input": "money = [1,2,3,1]", "output": "4"}, {"input": "money = [2,7,9,3,1]", "output": "12"}]'::jsonb,'[{"input": "[1,2,3,1]", "expected_output": "4", "is_hidden": false}, {"input": "[2,7,9,3,1]", "expected_output": "12", "is_hidden": true}]'::jsonb,'dp[i]=max(dp[i-1], dp[i-2]+money[i]). O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.76),
('House Robber Circular Market','house-robber-ii','Medium','DSA',ARRAY['dynamic-programming'],'## Problem

Now the stalls form a **circle** (first and last are adjacent). Return max money.','1 ≤ n ≤ 100 | 0 ≤ money[i] ≤ 1000','[{"input": "money = [2,3,2]", "output": "3"}, {"input": "money = [1,2,3,1]", "output": "4"}]'::jsonb,'[{"input": "[2,3,2]", "expected_output": "3", "is_hidden": false}, {"input": "[1,2,3,1]", "expected_output": "4", "is_hidden": true}]'::jsonb,'Run House Robber on [0..n-2] and [1..n-1], take max. O(n).',ARRAY['python','java','javascript','go','cpp'],0.45),
('RBI Coin Change Minimum','coin-change','Medium','DSA',ARRAY['dynamic-programming','greedy'],'## Problem

Given coin `denominations` and `amount`, find **minimum coins** to make amount. Return -1 if impossible.','1 ≤ len(coins) ≤ 12 | 1 ≤ coins[i] ≤ 2^31-1 | 0 ≤ amount ≤ 10^4','[{"input": "coins = [1,5,6,9], amount = 11", "output": "2", "explanation": "5+6=11"}, {"input": "coins = [2], amount = 3", "output": "-1"}]'::jsonb,'[{"input": "[1,5,6,9]\n11", "expected_output": "2", "is_hidden": false}, {"input": "[2]\n3", "expected_output": "-1", "is_hidden": true}]'::jsonb,'dp[i]=min coins for amount i. For each amount try each coin. O(amount×coins).',ARRAY['python','java','javascript','go','cpp'],0.5),
('NSE Stock Longest Increasing Sequence','longest-increasing-subsequence','Medium','DSA',ARRAY['dynamic-programming','binary-search'],'## Problem

Find the length of the **longest strictly increasing subsequence** in `prices` array.','1 ≤ n ≤ 2500 | -10^4 ≤ prices[i] ≤ 10^4','[{"input": "prices = [10,9,2,5,3,7,101,18]", "output": "4", "explanation": "[2,3,7,18]"}]'::jsonb,'[{"input": "[10,9,2,5,3,7,101,18]", "expected_output": "4", "is_hidden": false}, {"input": "[0,1,0,3,2,3]", "expected_output": "4", "is_hidden": true}]'::jsonb,'O(n²) DP or O(n log n) patience sorting with binary search on tails array.',ARRAY['python','java','javascript','go','cpp'],0.53)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO problems (title,slug,difficulty,category,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate) VALUES
('Flipkart Delivery Unique Grid Paths','unique-paths','Medium','DSA',ARRAY['dynamic-programming','combinatorics'],'## Problem

Robot moves top-left to bottom-right of `m×n` grid, only right or down. Count **unique paths**.','1 ≤ m,n ≤ 100','[{"input": "m=3, n=7", "output": "28"}, {"input": "m=3, n=2", "output": "3"}]'::jsonb,'[{"input": "3\n7", "expected_output": "28", "is_hidden": false}, {"input": "3\n2", "expected_output": "3", "is_hidden": true}]'::jsonb,'dp[i][j]=dp[i-1][j]+dp[i][j-1]. Or C(m+n-2,m-1). O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.64),
('DRDO Robot Minimum Path Sum','minimum-path-sum','Medium','DSA',ARRAY['dynamic-programming','matrix'],'## Problem

Robot moves top-left to bottom-right of grid (only right/down). Find **minimum total cost** path.','1 ≤ m,n ≤ 200 | 0 ≤ grid[i][j] ≤ 100','[{"input": "grid = [[1,3,1],[1,5,1],[4,2,1]]", "output": "7", "explanation": "1→3→1→1→1"}]'::jsonb,'[{"input": "[[1,3,1],[1,5,1],[4,2,1]]", "expected_output": "7", "is_hidden": false}, {"input": "[[1,2],[1,1]]", "expected_output": "3", "is_hidden": true}]'::jsonb,'dp[i][j]=min(dp[i-1][j],dp[i][j-1])+grid[i][j]. O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.65),
('Tata Motors Partition Equal Subset','partition-equal-subset-sum','Medium','DSA',ARRAY['dynamic-programming','arrays'],'## Problem

Can `weights` array be partitioned into **two subsets with equal sum**?','1 ≤ n ≤ 200 | 1 ≤ weights[i] ≤ 100','[{"input": "weights = [1,5,11,5]", "output": "true"}, {"input": "weights = [1,2,3,5]", "output": "false"}]'::jsonb,'[{"input": "[1,5,11,5]", "expected_output": "true", "is_hidden": false}, {"input": "[1,2,3,5]", "expected_output": "false", "is_hidden": true}]'::jsonb,'0/1 knapsack: dp[j]=can form sum j? Total must be even. O(n×sum/2).',ARRAY['python','java','javascript','go','cpp'],0.48),
('Target Sum Assignments','target-sum','Medium','DSA',ARRAY['dynamic-programming','backtracking'],'## Problem

Given `nums` and `target`, assign `+` or `-` to each number. How many ways to make the **sum equal target**?','1 ≤ n ≤ 20 | 0 ≤ nums[i] ≤ 1000 | -1000 ≤ target ≤ 1000','[{"input": "nums = [1,1,1,1,1], target = 3", "output": "5"}]'::jsonb,'[{"input": "[1,1,1,1,1]\n3", "expected_output": "5", "is_hidden": false}, {"input": "[1]\n1", "expected_output": "1", "is_hidden": true}]'::jsonb,'DFS/DP. Reduce to subset sum: find S where sum(P) - sum(N) = target. O(n×sum).',ARRAY['python','java','javascript','go','cpp'],0.57),
('Zerodha Trading Min Stack','min-stack','Easy','DSA',ARRAY['stack','design'],'## Problem

Design a stack with `push`, `pop`, `top`, and `getMin` — all in **O(1)** time.','-2^31 ≤ val ≤ 2^31-1 | At most 3×10^4 calls','[{"input": "push(-2),push(0),push(-3),getMin()→-3,pop(),top()→0,getMin()→-2", "output": "-3,0,-2"}]'::jsonb,'[{"input": "push(1),push(2),getMin(),push(0),getMin()", "expected_output": "1,0", "is_hidden": false}, {"input": "push(-2),push(0),push(-3),getMin(),pop(),top(),getMin()", "expected_output": "-3,0,-2", "is_hidden": true}]'::jsonb,'Auxiliary min stack: push min(val,minStack.top) alongside. O(1).',ARRAY['python','java','javascript','go','cpp'],0.71),
('Sensex Daily Temperature Wait','daily-temperatures','Medium','DSA',ARRAY['stack','monotonic-stack'],'## Problem

For each day, how many days until a **higher closing value**? Return 0 if none.','1 ≤ n ≤ 10^5 | 1 ≤ closings[i] ≤ 10^4','[{"input": "closings = [73,74,75,71,69,72,76,73]", "output": "[1,1,4,2,1,1,0,0]"}]'::jsonb,'[{"input": "[73,74,75,71,69,72,76,73]", "expected_output": "[1,1,4,2,1,1,0,0]", "is_hidden": false}, {"input": "[30,40,50,60]", "expected_output": "[1,1,1,0]", "is_hidden": true}]'::jsonb,'Monotonic decreasing stack of indices. Pop when cur > stack top. O(n).',ARRAY['python','java','javascript','go','cpp'],0.62),
('Kolkata Tram Histogram Area','largest-rectangle-histogram','Hard','DSA',ARRAY['stack','monotonic-stack'],'## Problem

Given `heights` of histogram bars (width=1), find area of **largest rectangle** fitting within.','1 ≤ n ≤ 10^5 | 0 ≤ heights[i] ≤ 10^4','[{"input": "heights = [2,1,5,6,2,3]", "output": "10", "explanation": "Width 2, height 5 at bars 2,3"}]'::jsonb,'[{"input": "[2,1,5,6,2,3]", "expected_output": "10", "is_hidden": false}, {"input": "[2,4]", "expected_output": "4", "is_hidden": true}]'::jsonb,'Monotonic increasing stack. On pop, width=cur-stack.top-1. Area=height×width. O(n).',ARRAY['python','java','javascript','go','cpp'],0.33),
('NPCI Transaction Sliding Max','sliding-window-maximum','Hard','DSA',ARRAY['stack','deque','sliding-window'],'## Problem

For each window of `k` consecutive `transactions`, return the **maximum** value. One per window.','1 ≤ k ≤ n ≤ 10^5 | -10^4 ≤ transactions[i] ≤ 10^4','[{"input": "transactions = [1,3,-1,-3,5,3,6,7], k=3", "output": "[3,3,5,5,6,7]"}]'::jsonb,'[{"input": "[1,3,-1,-3,5,3,6,7]\n3", "expected_output": "[3,3,5,5,6,7]", "is_hidden": false}, {"input": "[1]\n1", "expected_output": "[1]", "is_hidden": true}]'::jsonb,'Deque of indices in decreasing value order. Pop expired front, smaller back. O(n).',ARRAY['python','java','javascript','go','cpp'],0.32),
('Decode String Expand','decode-string','Medium','DSA',ARRAY['stack','strings'],'## Problem

Decode string `s` where `k[encoded]` means `encoded` repeated `k` times. E.g. `3[a2[bc]]` → `abcbcabcbcabcbc`.','1 ≤ len(s) ≤ 30 | k ∈ [1,300] | No extra whitespace | Input is always valid','[{"input": "s = \"3[a]2[bc]\"", "output": "\"aaabcbc\""}, {"input": "s = \"3[a2[c]]\"", "output": "\"accaccacc\""}]'::jsonb,'[{"input": "\"3[a]2[bc]\"", "expected_output": "\"aaabcbc\"", "is_hidden": false}, {"input": "\"3[a2[c]]\"", "expected_output": "\"accaccacc\"", "is_hidden": true}]'::jsonb,'Stack: push (count, current_string) on ''[''. On '']'', pop and repeat. O(n × max_k).',ARRAY['python','java','javascript','go','cpp'],0.6),
('Air India Fuel Station','gas-station','Medium','DSA',ARRAY['greedy','arrays'],'## Problem

Circular route with `gas[i]` fuel and `cost[i]` to next station. Find **starting station** to complete circuit. Return -1 if impossible.','1 ≤ n ≤ 10^5 | 0 ≤ gas[i],cost[i] ≤ 10^4','[{"input": "gas = [1,2,3,4,5], cost = [3,4,5,1,2]", "output": "3"}]'::jsonb,'[{"input": "[1,2,3,4,5]\n[3,4,5,1,2]", "expected_output": "3", "is_hidden": false}, {"input": "[2,3,4]\n[3,4,3]", "expected_output": "-1", "is_hidden": true}]'::jsonb,'If total gas < total cost → -1. Greedily reset start when tank negative. O(n).',ARRAY['python','java','javascript','go','cpp'],0.47),
('Swiggy Delivery Task Scheduler','task-scheduler','Medium','DSA',ARRAY['greedy','heap'],'## Problem

Given `tasks` array and cooldown `n`, return **minimum intervals** (including idle) to finish all tasks.','1 ≤ tasks.length ≤ 10^4 | 0 ≤ n ≤ 100','[{"input": "tasks = [\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"], n=2", "output": "8", "explanation": "A→B→idle→A→B→idle→A→B"}]'::jsonb,'[{"input": "[\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"]\n2", "expected_output": "8", "is_hidden": false}, {"input": "[\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"]\n0", "expected_output": "6", "is_hidden": true}]'::jsonb,'(maxFreq-1)×(n+1)+countOfMaxFreq. Answer=max(this, tasks.length). O(n).',ARRAY['python','java','javascript','go','cpp'],0.56),
('Amazon India Non-Overlapping Intervals','non-overlapping-intervals','Medium','DSA',ARRAY['greedy','intervals','sorting'],'## Problem

Remove **minimum intervals** to make remaining non-overlapping.','1 ≤ n ≤ 2×10^4','[{"input": "intervals = [[1,2],[2,3],[3,4],[1,3]]", "output": "1"}, {"input": "intervals = [[1,2],[1,2],[1,2]]", "output": "2"}]'::jsonb,'[{"input": "[[1,2],[2,3],[3,4],[1,3]]", "expected_output": "1", "is_hidden": false}, {"input": "[[1,2],[1,2],[1,2]]", "expected_output": "2", "is_hidden": true}]'::jsonb,'Sort by end time. Greedily keep earliest-end intervals. Removals = n - kept. O(n log n).',ARRAY['python','java','javascript','go','cpp'],0.53),
('Partition Labels Delivery Zones','partition-labels','Medium','DSA',ARRAY['greedy','strings'],'## Problem

Partition string `s` into as many parts as possible so each **letter appears in at most one part**. Return list of partition sizes.','1 ≤ len(s) ≤ 500 | s consists of lowercase letters','[{"input": "s = \"ababcbacadefegdehijhklij\"", "output": "[9,7,8]"}]'::jsonb,'[{"input": "\"ababcbacadefegdehijhklij\"", "expected_output": "[9,7,8]", "is_hidden": false}, {"input": "\"eccbbbbdec\"", "expected_output": "[10]", "is_hidden": true}]'::jsonb,'Record last occurrence of each char. Greedily extend partition to cover all last occurrences. O(n).',ARRAY['python','java','javascript','go','cpp'],0.59),
('ISRO Countdown Fizz Buzz','fizz-buzz','Easy','DSA',ARRAY['math','simulation'],'## Problem

For 1 to n: output ''Agni'' (div by 3), ''Shakti'' (div by 5), ''AgniShakti'' (div by 15), else the number.','1 ≤ n ≤ 10^4','[{"input": "n = 5", "output": "[\"1\",\"2\",\"Agni\",\"4\",\"Shakti\"]"}]'::jsonb,'[{"input": "5", "expected_output": "[\"1\",\"2\",\"Agni\",\"4\",\"Shakti\"]", "is_hidden": false}, {"input": "15", "expected_output": "[\"1\",\"2\",\"Agni\",\"4\",\"Shakti\",\"Agni\",\"7\",\"8\",\"Agni\",\"Shakti\",\"11\",\"Agni\",\"13\",\"14\",\"AgniShakti\"]", "is_hidden": true}]'::jsonb,'Check div15 first, then 3, then 5, else number. O(n).',ARRAY['python','java','javascript','go','cpp'],0.85),
('RBI Prime Sieve','count-primes','Easy','DSA',ARRAY['math','sieve'],'## Problem

Count prime numbers **strictly less than** `n` using Sieve of Eratosthenes.','0 ≤ n ≤ 5×10^6','[{"input": "n = 10", "output": "4", "explanation": "Primes: 2,3,5,7"}]'::jsonb,'[{"input": "10", "expected_output": "4", "is_hidden": false}, {"input": "100", "expected_output": "25", "is_hidden": true}]'::jsonb,'Sieve: mark composites. Count True from 2 to n-1. O(n log log n).',ARRAY['python','java','javascript','go','cpp'],0.7),
('Reverse Integer Aadhaar','reverse-integer','Easy','DSA',ARRAY['math'],'## Problem

Given 32-bit integer `x`, return `x` with its digits **reversed**. If overflow occurs (outside [-2^31, 2^31-1]), return 0.','-2^31 ≤ x ≤ 2^31-1','[{"input": "x = 123", "output": "321"}, {"input": "x = -120", "output": "-21"}, {"input": "x = 120", "output": "21"}]'::jsonb,'[{"input": "123", "expected_output": "321", "is_hidden": false}, {"input": "-120", "expected_output": "-21", "is_hidden": true}]'::jsonb,'Pop digits (x%10) and push to result (result*10+digit). Check overflow before each push. O(log x).',ARRAY['python','java','javascript','go','cpp'],0.66),
('Aadhaar Single Unique ID','single-number','Easy','DSA',ARRAY['bit-manipulation','arrays'],'## Problem

Every ID appears **twice** except one. Find the unique ID using O(1) space. (No hash maps!)','1 ≤ n ≤ 3×10^4 | n is odd','[{"input": "nums = [4,1,2,1,2]", "output": "4"}]'::jsonb,'[{"input": "[4,1,2,1,2]", "expected_output": "4", "is_hidden": false}, {"input": "[2,2,1]", "expected_output": "1", "is_hidden": true}]'::jsonb,'XOR all elements. Pairs cancel. Result = unique. O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.79),
('BSNL Missing Subscriber ID','missing-number','Easy','DSA',ARRAY['bit-manipulation','math'],'## Problem

Array contains n distinct numbers in [0,n]. Find the **missing number**.','1 ≤ n ≤ 10^4 | 0 ≤ ids[i] ≤ n','[{"input": "ids = [3,0,1]", "output": "2"}, {"input": "ids = [9,6,4,2,3,5,7,0,1]", "output": "8"}]'::jsonb,'[{"input": "[3,0,1]", "expected_output": "2", "is_hidden": false}, {"input": "[0,1]", "expected_output": "2", "is_hidden": true}]'::jsonb,'Expected sum=n(n+1)/2. Missing=expected-actual. Or XOR. O(n).',ARRAY['python','java','javascript','go','cpp'],0.74),
('Number of 1 Bits Hamming','number-of-1-bits','Easy','DSA',ARRAY['bit-manipulation'],'## Problem

Return the number of **set bits (1s)** in the binary representation of unsigned integer `n`.','0 ≤ n ≤ 2^32-1','[{"input": "n = 11 (binary: 1011)", "output": "3"}, {"input": "n = 128 (binary: 10000000)", "output": "1"}]'::jsonb,'[{"input": "11", "expected_output": "3", "is_hidden": false}, {"input": "128", "expected_output": "1", "is_hidden": true}]'::jsonb,'n & (n-1) clears lowest set bit. Count until n=0. O(number of set bits).',ARRAY['python','java','javascript','go','cpp'],0.75),
('Durga Puja Guest Subsets','subsets','Medium','DSA',ARRAY['backtracking','arrays'],'## Problem

Return all possible **subsets** (power set) of unique `guests` array. No duplicates.','1 ≤ n ≤ 10 | -10 ≤ guests[i] ≤ 10 | All unique','[{"input": "guests = [1,2,3]", "output": "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]"}]'::jsonb,'[{"input": "[1,2,3]", "expected_output": "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]", "is_hidden": false}, {"input": "[0]", "expected_output": "[[],[0]]", "is_hidden": true}]'::jsonb,'Backtracking or bitmask 0..2^n-1. O(n×2^n).',ARRAY['python','java','javascript','go','cpp'],0.74)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO problems (title,slug,difficulty,category,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate) VALUES
('IIT JEE Combination Sum','combination-sum','Medium','DSA',ARRAY['backtracking','arrays'],'## Problem

Find all unique combinations from `marks` that sum to `target`. Numbers can be reused.','1 ≤ marks.length ≤ 30 | 2 ≤ marks[i] ≤ 40 | 1 ≤ target ≤ 40','[{"input": "marks = [2,3,6,7], target = 7", "output": "[[2,2,3],[7]]"}]'::jsonb,'[{"input": "[2,3,6,7]\n7", "expected_output": "[[2,2,3],[7]]", "is_hidden": false}, {"input": "[2,3,5]\n8", "expected_output": "[[2,2,2,2],[2,3,3],[3,5]]", "is_hidden": true}]'::jsonb,'Backtrack allowing reuse. Prune when remaining<0. O(n^(T/m)).',ARRAY['python','java','javascript','go','cpp'],0.67),
('Phone Keypad Letter Combinations','letter-combinations-phone-number','Medium','DSA',ARRAY['backtracking','strings'],'## Problem

Given a digit string `digits` (2-9), return all possible **letter combinations** it could represent on a phone keypad.','0 ≤ len(digits) ≤ 4 | digits[i] ∈ {''2'',...,''9''}','[{"input": "digits = \"23\"", "output": "[\"ad\",\"ae\",\"af\",\"bd\",\"be\",\"bf\",\"cd\",\"ce\",\"cf\"]"}]'::jsonb,'[{"input": "\"23\"", "expected_output": "[\"ad\",\"ae\",\"af\",\"bd\",\"be\",\"bf\",\"cd\",\"ce\",\"cf\"]", "is_hidden": false}, {"input": "\"\"", "expected_output": "[]", "is_hidden": true}]'::jsonb,'Backtracking: for each digit map letters, recurse. O(4^n × n) where n=len(digits).',ARRAY['python','java','javascript','go','cpp'],0.65),
('Chess Tournament N-Queens','n-queens','Hard','DSA',ARRAY['backtracking'],'## Problem

Place `n` queens on `n×n` board so none attack each other. Return all distinct solutions.','1 ≤ n ≤ 9','[{"input": "n = 4", "output": "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]"}]'::jsonb,'[{"input": "4", "expected_output": "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]", "is_hidden": false}, {"input": "1", "expected_output": "[[\"Q\"]]", "is_hidden": true}]'::jsonb,'Place queens row by row. Track col/diagonal/anti-diagonal sets. O(n!).',ARRAY['python','java','javascript','go','cpp'],0.27),
('Zerodha Top K Frequent Stocks','top-k-frequent-elements','Medium','DSA',ARRAY['heap','hash-map','bucket-sort'],'## Problem

Return the `k` **most frequently** occurring elements. Better than O(n log n).','1 ≤ n ≤ 10^5 | 1 ≤ k ≤ distinct elements','[{"input": "nums = [1,1,1,2,2,3], k=2", "output": "[1,2]"}]'::jsonb,'[{"input": "[1,1,1,2,2,3]\n2", "expected_output": "[1,2]", "is_hidden": false}, {"input": "[1]\n1", "expected_output": "[1]", "is_hidden": true}]'::jsonb,'Count freqs. Min-heap of size k or bucket sort. O(n log k).',ARRAY['python','java','javascript','go','cpp'],0.66),
('Stock Market Median Stream','find-median-from-data-stream','Hard','DSA',ARRAY['heap','design'],'## Problem

Design a data structure for `addNum(num)` and `findMedian()` on a running stream.','-10^5 ≤ num ≤ 10^5 | At most 5×10^4 calls','[{"input": "addNum(1),addNum(2),findMedian()→1.5,addNum(3),findMedian()→2.0", "output": "1.5,2.0"}]'::jsonb,'[{"input": "addNum(1),addNum(2),findMedian()", "expected_output": "1.5", "is_hidden": false}, {"input": "addNum(1),addNum(2),addNum(3),findMedian()", "expected_output": "2.0", "is_hidden": true}]'::jsonb,'Max-heap for lower half, min-heap for upper half. Balance after insert. O(log n) add, O(1) median.',ARRAY['python','java','javascript','go','cpp'],0.29),
('Flipkart Warehouse K Closest Items','k-closest-points-to-origin','Medium','DSA',ARRAY['heap','arrays'],'## Problem

Return the `k` closest `points` to origin (0,0). Distance = Euclidean (no sqrt needed for comparison).','1 ≤ k ≤ points.length ≤ 10^4 | -10^4 ≤ xi,yi ≤ 10^4','[{"input": "points = [[1,3],[-2,2]], k=1", "output": "[[-2,2]]"}]'::jsonb,'[{"input": "[[1,3],[-2,2]]\n1", "expected_output": "[[-2,2]]", "is_hidden": false}, {"input": "[[3,3],[5,-1],[-2,4]]\n2", "expected_output": "[[3,3],[-2,4]]", "is_hidden": true}]'::jsonb,'Max-heap of size k on x²+y². O(n log k). Or Quickselect O(n).',ARRAY['python','java','javascript','go','cpp'],0.67),
('Merge K Sorted Lists','merge-k-sorted-lists','Hard','DSA',ARRAY['heap','linked-list','divide-conquer'],'## Problem

Merge `k` sorted linked lists into one sorted linked list.','0 ≤ k ≤ 10^4 | 0 ≤ n ≤ 500 | -10^4 ≤ val ≤ 10^4 | Total nodes ≤ 10^4','[{"input": "lists = [[1,4,5],[1,3,4],[2,6]]", "output": "[1,1,2,3,4,4,5,6]"}]'::jsonb,'[{"input": "[[1,4,5],[1,3,4],[2,6]]", "expected_output": "[1,1,2,3,4,4,5,6]", "is_hidden": false}, {"input": "[[]]", "expected_output": "[]", "is_hidden": true}]'::jsonb,'Min-heap of (val, list_idx, node). Pop min, push next node from same list. O(N log k).',ARRAY['python','java','javascript','go','cpp'],0.4),
('Google India Search Trie','implement-trie','Medium','DSA',ARRAY['trie','design','strings'],'## Problem

Build a **Trie** with `insert(word)`, `search(word)`, and `startsWith(prefix)`.','1 ≤ len(word) ≤ 2000 | lowercase letters | At most 3×10^4 operations','[{"input": "insert(\"apple\"),search(\"apple\")→true,search(\"app\")→false,startsWith(\"app\")→true", "output": "true,false,true"}]'::jsonb,'[{"input": "insert(\"apple\"),search(\"apple\"),search(\"app\"),startsWith(\"app\")", "expected_output": "true,false,true", "is_hidden": false}, {"input": "insert(\"app\"),search(\"app\"),startsWith(\"ap\")", "expected_output": "true,true", "is_hidden": true}]'::jsonb,'TrieNode with children[26] and isEnd flag. O(m) per op where m=word length.',ARRAY['python','java','javascript','go','cpp'],0.58),
('Nykaa Product Replace Words','replace-words','Medium','DSA',ARRAY['trie','strings'],'## Problem

Replace every word in `sentence` with its shortest matching `root` from the dictionary. If no match, keep original.','1 ≤ roots.length ≤ 1000 | 1 ≤ len(root) ≤ 100','[{"input": "roots=[\"cat\",\"bat\",\"rat\"], sentence=\"the cattle was rattled by the battery\"", "output": "\"the cat was rat by the bat\""}]'::jsonb,'[{"input": "[\"cat\",\"bat\",\"rat\"]\n\"the cattle was rattled by the battery\"", "expected_output": "\"the cat was rat by the bat\"", "is_hidden": false}, {"input": "[\"a\",\"b\",\"c\"]\n\"aadsfasf absbs bbab cadsfafs\"", "expected_output": "\"a a b c\"", "is_hidden": true}]'::jsonb,'Build trie from roots. For each word traverse trie; replace on root end. O(total chars).',ARRAY['python','java','javascript','go','cpp'],0.64),
('Jump Game II Minimum Jumps','jump-game-ii','Medium','DSA',ARRAY['greedy','dynamic-programming','arrays'],'## Problem

Given `jumps[i]` = max steps from position `i`, return the **minimum number of jumps** to reach the last index. Always reachable.','1 ≤ n ≤ 10^4 | 0 ≤ jumps[i] ≤ 1000','[{"input": "jumps = [2,3,1,1,4]", "output": "2", "explanation": "Jump 1→3 (2 steps), then 3→last (1 step)"}]'::jsonb,'[{"input": "[2,3,1,1,4]", "expected_output": "2", "is_hidden": false}, {"input": "[2,3,0,1,4]", "expected_output": "2", "is_hidden": true}]'::jsonb,'Greedy BFS: track current range, next max reach. Increment jumps at range end. O(n).',ARRAY['python','java','javascript','go','cpp'],0.47),
('Binary Search IRCTC Ticket','binary-search','Easy','DSA',ARRAY['binary-search','arrays'],'## Problem

Given sorted `prices` array and `target` price, return the **index** if found, else return -1. Must be O(log n).','1 ≤ n ≤ 10^4 | -10^4 ≤ prices[i] ≤ 10^4 | Sorted ascending | All distinct','[{"input": "prices = [-1,0,3,5,9,12], target = 9", "output": "4"}, {"input": "prices = [-1,0,3,5,9,12], target = 2", "output": "-1"}]'::jsonb,'[{"input": "[-1,0,3,5,9,12]\n9", "expected_output": "4", "is_hidden": false}, {"input": "[-1,0,3,5,9,12]\n2", "expected_output": "-1", "is_hidden": true}]'::jsonb,'Standard binary search. lo=0, hi=n-1, mid=(lo+hi)//2. O(log n).',ARRAY['python','java','javascript','go','cpp'],0.8),
('Search Rotated Sorted Array','search-in-rotated-sorted-array','Medium','DSA',ARRAY['binary-search','arrays'],'## Problem

A sorted array was rotated at some pivot. Given `nums` and `target`, return index or -1 in O(log n).','1 ≤ n ≤ 5000 | -10^4 ≤ nums[i] ≤ 10^4 | All distinct','[{"input": "nums = [4,5,6,7,0,1,2], target = 0", "output": "4"}, {"input": "nums = [4,5,6,7,0,1,2], target = 3", "output": "-1"}]'::jsonb,'[{"input": "[4,5,6,7,0,1,2]\n0", "expected_output": "4", "is_hidden": false}, {"input": "[4,5,6,7,0,1,2]\n3", "expected_output": "-1", "is_hidden": true}]'::jsonb,'Binary search: determine which half is sorted, check if target falls in it. O(log n).',ARRAY['python','java','javascript','go','cpp'],0.48),
('Find Peak Element Terrain','find-peak-element','Medium','DSA',ARRAY['binary-search','arrays'],'## Problem

A peak element is strictly greater than its neighbors. Given `nums`, return the index of **any peak** in O(log n). Assume nums[-1] = nums[n] = -∞.','1 ≤ n ≤ 1000 | -2^31 ≤ nums[i] ≤ 2^31-1 | nums[i] ≠ nums[i+1]','[{"input": "nums = [1,2,3,1]", "output": "2"}, {"input": "nums = [1,2,1,3,5,6,4]", "output": "5"}]'::jsonb,'[{"input": "[1,2,3,1]", "expected_output": "2", "is_hidden": false}, {"input": "[1,2,1,3,5,6,4]", "expected_output": "5", "is_hidden": true}]'::jsonb,'Binary search: if nums[mid] < nums[mid+1], peak is on right. Else on left or at mid. O(log n).',ARRAY['python','java','javascript','go','cpp'],0.53),
('Median of Two Sorted Arrays','median-two-sorted-arrays','Hard','DSA',ARRAY['binary-search','arrays','divide-conquer'],'## Problem

Given two sorted arrays `nums1` and `nums2`, find the **median** of the combined sorted array. O(log(m+n)) required.','0 ≤ m,n ≤ 1000 | -10^6 ≤ nums[i] ≤ 10^6 | m+n ≥ 1','[{"input": "nums1 = [1,3], nums2 = [2]", "output": "2.0"}, {"input": "nums1 = [1,2], nums2 = [3,4]", "output": "2.5"}]'::jsonb,'[{"input": "[1,3]\n[2]", "expected_output": "2.0", "is_hidden": false}, {"input": "[1,2]\n[3,4]", "expected_output": "2.5", "is_hidden": true}]'::jsonb,'Binary search on smaller array to find correct partition. O(log(min(m,n))).',ARRAY['python','java','javascript','go','cpp'],0.25),
('Search 2D Matrix Flipkart','search-a-2d-matrix','Medium','DSA',ARRAY['binary-search','matrix'],'## Problem

Given an `m×n` matrix where each row is sorted and first element of each row > last element of previous row, determine if `target` exists. O(log(m×n)).','1 ≤ m,n ≤ 100 | -10^4 ≤ matrix[i][j],target ≤ 10^4','[{"input": "matrix=[[1,3,5,7],[10,11,16,20],[23,30,34,60]], target=3", "output": "true"}]'::jsonb,'[{"input": "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n3", "expected_output": "true", "is_hidden": false}, {"input": "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n13", "expected_output": "false", "is_hidden": true}]'::jsonb,'Treat matrix as flat sorted array. Binary search with (mid//n, mid%n). O(log(m×n)).',ARRAY['python','java','javascript','go','cpp'],0.55),
('Stock Buy Sell Multiple Times','best-time-buy-sell-stock-ii','Easy','DSA',ARRAY['greedy','arrays'],'## Problem

BSE stock: `prices[i]` = price on day `i`. You can buy/sell **multiple times** (hold at most one share at a time). Maximize total profit.','1 ≤ n ≤ 3×10^4 | 0 ≤ prices[i] ≤ 10^4','[{"input": "prices = [7,1,5,3,6,4]", "output": "7", "explanation": "Buy 1 sell 5 (+4), buy 3 sell 6 (+3)"}]'::jsonb,'[{"input": "[7,1,5,3,6,4]", "expected_output": "7", "is_hidden": false}, {"input": "[1,2,3,4,5]", "expected_output": "4", "is_hidden": true}]'::jsonb,'Sum all positive differences (prices[i]-prices[i-1] if positive). Greedy. O(n).',ARRAY['python','java','javascript','go','cpp'],0.7),
('Stock with Cooldown NSE','best-time-buy-sell-stock-cooldown','Medium','DSA',ARRAY['dynamic-programming','arrays'],'## Problem

Buy/sell multiple times but after selling you must wait 1 day (cooldown). Maximize profit.','1 ≤ n ≤ 5000 | 0 ≤ prices[i] ≤ 1000','[{"input": "prices = [1,2,3,0,2]", "output": "3", "explanation": "Buy 1 sell 3 (profit 2), cooldown, buy 0 sell 2 (profit 2) = wait actually optimal is 3"}]'::jsonb,'[{"input": "[1,2,3,0,2]", "expected_output": "3", "is_hidden": false}, {"input": "[1]", "expected_output": "0", "is_hidden": true}]'::jsonb,'States: held, sold, rest. held[i]=max(held[i-1],rest[i-1]-price); sold[i]=held[i-1]+price; rest[i]=max(rest[i-1],sold[i-1]). O(n).',ARRAY['python','java','javascript','go','cpp'],0.49),
('Word Search Grid Puzzle','word-search','Medium','DSA',ARRAY['backtracking','matrix','dfs'],'## Problem

Given `m×n` character grid `board` and string `word`, return `true` if the word can be constructed from **sequentially adjacent cells** (no reuse).','1 ≤ m,n ≤ 6 | 1 ≤ len(word) ≤ 15 | board and word consist of uppercase English letters','[{"input": "board=[[\"A\",\"B\",\"C\"],[\"S\",\"F\",\"C\"],[\"A\",\"D\",\"E\"]], word=\"ABCCED\"", "output": "true"}]'::jsonb,'[{"input": "[[\"A\",\"B\",\"C\"],[\"S\",\"F\",\"C\"],[\"A\",\"D\",\"E\"]]\n\"ABCCED\"", "expected_output": "true", "is_hidden": false}, {"input": "[[\"A\",\"B\",\"C\"],[\"S\",\"F\",\"C\"],[\"A\",\"D\",\"E\"]]\n\"ABCB\"", "expected_output": "false", "is_hidden": true}]'::jsonb,'DFS/backtracking from each cell. Mark visited, unmark on backtrack. O(m×n×4^len(word)).',ARRAY['python','java','javascript','go','cpp'],0.5),
('Permutations All Arrangements','permutations','Medium','DSA',ARRAY['backtracking','arrays'],'## Problem

Given array of **distinct** integers `nums`, return all possible permutations.','1 ≤ n ≤ 6 | -10 ≤ nums[i] ≤ 10 | All distinct','[{"input": "nums = [1,2,3]", "output": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]"}]'::jsonb,'[{"input": "[1,2,3]", "expected_output": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]", "is_hidden": false}, {"input": "[0,1]", "expected_output": "[[0,1],[1,0]]", "is_hidden": true}]'::jsonb,'Backtrack: swap elements at current position with each subsequent. O(n×n!).',ARRAY['python','java','javascript','go','cpp'],0.73),
('Generate All Valid Parentheses','generate-parentheses','Medium','DSA',ARRAY['backtracking','strings'],'## Problem

Generate all combinations of **n pairs of well-formed parentheses**.','1 ≤ n ≤ 8','[{"input": "n = 3", "output": "[\"((()))\",\"(()())\",\"(())()\",\"()(())\",\"()()()\"]"}]'::jsonb,'[{"input": "3", "expected_output": "[\"((()))\",\"(()())\",\"(())()\",\"()(())\",\"()()()\"]", "is_hidden": false}, {"input": "1", "expected_output": "[\"()\"]", "is_hidden": true}]'::jsonb,'Backtrack: add ''('' if open<n, add '')'' if close<open. O(4^n/sqrt(n)).',ARRAY['python','java','javascript','go','cpp'],0.69)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO problems (title,slug,difficulty,category,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate) VALUES
('Palindrome Partitioning','palindrome-partitioning','Medium','DSA',ARRAY['backtracking','dynamic-programming','strings'],'## Problem

Partition string `s` such that every substring is a **palindrome**. Return all possible partitionings.','1 ≤ len(s) ≤ 16 | s consists of lowercase letters','[{"input": "s = \"aab\"", "output": "[[\"a\",\"a\",\"b\"],[\"aa\",\"b\"]]"}]'::jsonb,'[{"input": "\"aab\"", "expected_output": "[[\"a\",\"a\",\"b\"],[\"aa\",\"b\"]]", "is_hidden": false}, {"input": "\"a\"", "expected_output": "[[\"a\"]]", "is_hidden": true}]'::jsonb,'Backtrack: for each prefix that is a palindrome, recurse on remainder. Precompute palindrome DP table. O(n×2^n).',ARRAY['python','java','javascript','go','cpp'],0.57),
('Serialize Deserialize Binary Tree','serialize-deserialize-binary-tree','Hard','DSA',ARRAY['trees','bfs','design'],'## Problem

Design an algorithm to **serialize** a binary tree to a string and **deserialize** the string back to the original tree.','0 ≤ n ≤ 10^4 | -1000 ≤ val ≤ 1000','[{"input": "root = [1,2,3,null,null,4,5]", "output": "[1,2,3,null,null,4,5]", "explanation": "Serialize then deserialize gives same tree"}]'::jsonb,'[{"input": "[1,2,3,null,null,4,5]", "expected_output": "[1,2,3,null,null,4,5]", "is_hidden": false}, {"input": "[]", "expected_output": "[]", "is_hidden": true}]'::jsonb,'BFS serialization with null markers. Split on comma to deserialize. O(n).',ARRAY['python','java','javascript','go','cpp'],0.3),
('Flatten Binary Tree to List','flatten-binary-tree-to-linked-list','Medium','DSA',ARRAY['trees','dfs'],'## Problem

Flatten a binary tree into a **linked list** in-place in pre-order traversal order (using right pointers).','0 ≤ n ≤ 2000 | -100 ≤ val ≤ 100','[{"input": "root = [1,2,5,3,4,null,6]", "output": "[1,null,2,null,3,null,4,null,5,null,6]"}]'::jsonb,'[{"input": "[1,2,5,3,4,null,6]", "expected_output": "[1,null,2,null,3,null,4,null,5,null,6]", "is_hidden": false}, {"input": "[]", "expected_output": "[]", "is_hidden": true}]'::jsonb,'Morris traversal or pre-order stack. For each node, right-most of left subtree points to right. O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.43),
('Graph Clone Adjacency','clone-graph','Medium','DSA',ARRAY['graphs','dfs','bfs','hash-map'],'## Problem

Given a reference to a graph node, return a **deep copy** of the entire connected undirected graph.','1 ≤ n ≤ 100 | 0 ≤ edges ≤ 100 | No self-loops or repeated edges','[{"input": "adjList = [[2,4],[1,3],[2,4],[1,3]]", "output": "[[2,4],[1,3],[2,4],[1,3]]"}]'::jsonb,'[{"input": "[[2,4],[1,3],[2,4],[1,3]]", "expected_output": "[[2,4],[1,3],[2,4],[1,3]]", "is_hidden": false}, {"input": "[[]]", "expected_output": "[[]]", "is_hidden": true}]'::jsonb,'DFS/BFS with hashmap from original→clone. Create clone if not exists, recurse neighbors. O(V+E).',ARRAY['python','java','javascript','go','cpp'],0.54),
('Union Find Components','number-of-connected-components','Medium','DSA',ARRAY['graphs','union-find','dfs'],'## Problem

Given `n` nodes and list of `edges`, return the **number of connected components** in the undirected graph.','1 ≤ n ≤ 2000 | 0 ≤ edges.length ≤ 5000','[{"input": "n=5, edges=[[0,1],[1,2],[3,4]]", "output": "2"}, {"input": "n=5, edges=[[0,1],[1,2],[2,3],[3,4]]", "output": "1"}]'::jsonb,'[{"input": "5\n[[0,1],[1,2],[3,4]]", "expected_output": "2", "is_hidden": false}, {"input": "5\n[[0,1],[1,2],[2,3],[3,4]]", "expected_output": "1", "is_hidden": true}]'::jsonb,'Union-Find or DFS. Count components by counting root nodes. O(n×α(n)) with Union-Find.',ARRAY['python','java','javascript','go','cpp'],0.62),
('01 Matrix Distance','01-matrix','Medium','DSA',ARRAY['graphs','bfs','dynamic-programming'],'## Problem

Given binary matrix, return a matrix where each cell contains the **distance to the nearest 0**.','1 ≤ m,n ≤ 10^4 | 0 ≤ matrix[i][j] ≤ 1 | At least one 0','[{"input": "mat = [[0,0,0],[0,1,0],[0,0,0]]", "output": "[[0,0,0],[0,1,0],[0,0,0]]"}, {"input": "mat = [[0,0,0],[0,1,0],[1,1,1]]", "output": "[[0,0,0],[0,1,0],[1,2,1]]"}]'::jsonb,'[{"input": "[[0,0,0],[0,1,0],[1,1,1]]", "expected_output": "[[0,0,0],[0,1,0],[1,2,1]]", "is_hidden": false}, {"input": "[[0,0,0],[0,1,0],[0,0,0]]", "expected_output": "[[0,0,0],[0,1,0],[0,0,0]]", "is_hidden": true}]'::jsonb,'Multi-source BFS from all 0s simultaneously. O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.55),
('Accounts Merge Social Network','accounts-merge','Medium','DSA',ARRAY['graphs','union-find','strings'],'## Problem

Merge accounts if any two accounts share an email. Each account = [name, email1, email2, ...]. Return merged accounts with sorted emails.','1 ≤ accounts.length ≤ 1000 | 2 ≤ accounts[i].length ≤ 10','[{"input": "accounts=[[\"John\",\"j@j.com\",\"j2@j.com\"],[\"John\",\"j3@j.com\"],[\"Mary\",\"m@m.com\"],[\"John\",\"j3@j.com\",\"j@j.com\"]]", "output": "[[\"John\",\"j@j.com\",\"j2@j.com\",\"j3@j.com\"],[\"Mary\",\"m@m.com\"]]"}]'::jsonb,'[{"input": "[[\"John\",\"j@j.com\",\"j2@j.com\"],[\"John\",\"j3@j.com\"],[\"Mary\",\"m@m.com\"],[\"John\",\"j3@j.com\",\"j@j.com\"]]", "expected_output": "[[\"John\",\"j@j.com\",\"j2@j.com\",\"j3@j.com\"],[\"Mary\",\"m@m.com\"]]", "is_hidden": false}, {"input": "[[\"Gabe\",\"Gabe0@m.co\",\"Gabe3@m.co\"],[\"Kevin\",\"Kevin3@m.co\",\"Kevin5@m.co\"]]", "expected_output": "[[\"Gabe\",\"Gabe0@m.co\",\"Gabe3@m.co\"],[\"Kevin\",\"Kevin3@m.co\",\"Kevin5@m.co\"]]", "is_hidden": true}]'::jsonb,'Union-Find on emails. Group by root, sort emails. O(A log A) where A = total emails.',ARRAY['python','java','javascript','go','cpp'],0.44),
('Word Ladder Transformation','word-ladder','Hard','DSA',ARRAY['graphs','bfs','strings'],'## Problem

Transform `beginWord` to `endWord` changing one letter at a time (all intermediates in `wordList`). Return the **length of shortest transformation sequence**, or 0 if impossible.','1 ≤ len(beginWord) ≤ 10 | 1 ≤ wordList.length ≤ 5000','[{"input": "beginWord=\"hit\", endWord=\"cog\", wordList=[\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]", "output": "5", "explanation": "hit→hot→dot→dog→cog"}]'::jsonb,'[{"input": "\"hit\"\n\"cog\"\n[\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]", "expected_output": "5", "is_hidden": false}, {"input": "\"hit\"\n\"cog\"\n[\"hot\",\"dot\",\"dog\",\"lot\",\"log\"]", "expected_output": "0", "is_hidden": true}]'::jsonb,'BFS: for each word, try all single-char substitutions. Use set for O(1) lookup. O(M²×N) where M=word length, N=words.',ARRAY['python','java','javascript','go','cpp'],0.28),
('Longest Common Subsequence DNA','longest-common-subsequence','Medium','DSA',ARRAY['dynamic-programming','strings'],'## Problem

Given strings `text1` and `text2`, return the length of their **longest common subsequence** (LCS). If none, return 0.','1 ≤ len(text1),len(text2) ≤ 1000 | lowercase letters','[{"input": "text1=\"abcde\", text2=\"ace\"", "output": "3", "explanation": "LCS is \"ace\""}, {"input": "text1=\"abc\", text2=\"abc\"", "output": "3"}]'::jsonb,'[{"input": "\"abcde\"\n\"ace\"", "expected_output": "3", "is_hidden": false}, {"input": "\"abc\"\n\"def\"", "expected_output": "0", "is_hidden": true}]'::jsonb,'dp[i][j] = LCS of text1[0..i] and text2[0..j]. If chars match +1, else max(dp[i-1][j], dp[i][j-1]). O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.58),
('Edit Distance Typo Correction','edit-distance','Hard','DSA',ARRAY['dynamic-programming','strings'],'## Problem

Given `word1` and `word2`, find the **minimum edit distance** (insert, delete, replace) to transform word1 to word2.','0 ≤ len(word1),len(word2) ≤ 500 | lowercase letters','[{"input": "word1=\"horse\", word2=\"ros\"", "output": "3", "explanation": "horse→rorse→rose→ros"}]'::jsonb,'[{"input": "\"horse\"\n\"ros\"", "expected_output": "3", "is_hidden": false}, {"input": "\"intention\"\n\"execution\"", "expected_output": "5", "is_hidden": true}]'::jsonb,'dp[i][j] = edit dist for word1[0..i], word2[0..j]. If chars match dp[i-1][j-1]; else min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1])+1. O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.38),
('Longest Palindromic Subsequence','longest-palindromic-subsequence','Medium','DSA',ARRAY['dynamic-programming','strings'],'## Problem

Given string `s`, find the length of the **longest palindromic subsequence**.','1 ≤ len(s) ≤ 1000 | s consists of lowercase letters','[{"input": "s = \"bbbab\"", "output": "4", "explanation": "\"bbbb\""}, {"input": "s = \"cbbd\"", "output": "2"}]'::jsonb,'[{"input": "\"bbbab\"", "expected_output": "4", "is_hidden": false}, {"input": "\"cbbd\"", "expected_output": "2", "is_hidden": true}]'::jsonb,'LPS(s) = LCS(s, reverse(s)). Or interval DP: dp[i][j]=dp[i+1][j-1]+2 if s[i]==s[j]. O(n²).',ARRAY['python','java','javascript','go','cpp'],0.51),
('Counting Bits Popcount','counting-bits','Easy','DSA',ARRAY['dynamic-programming','bit-manipulation'],'## Problem

Return array `ans` where `ans[i]` = number of **1 bits** in binary representation of `i`, for 0 ≤ i ≤ n.','0 ≤ n ≤ 10^5','[{"input": "n = 5", "output": "[0,1,1,2,1,2]", "explanation": "0→0, 1→1, 2→1, 3→2, 4→1, 5→2"}]'::jsonb,'[{"input": "5", "expected_output": "[0,1,1,2,1,2]", "is_hidden": false}, {"input": "2", "expected_output": "[0,1,1]", "is_hidden": true}]'::jsonb,'dp[i] = dp[i>>1] + (i&1). O(n).',ARRAY['python','java','javascript','go','cpp'],0.76),
('Candy Distribution CBSE','candy','Hard','DSA',ARRAY['greedy','arrays'],'## Problem

Teacher distributes candies to n students. Each student must get ≥1 candy. Students with higher rating than adjacent get more candies. Find **minimum total candies**.','1 ≤ n ≤ 2×10^4 | 0 ≤ ratings[i] ≤ 2×10^4','[{"input": "ratings = [1,0,2]", "output": "5", "explanation": "[2,1,2]"}, {"input": "ratings = [1,2,2]", "output": "4", "explanation": "[1,2,1]"}]'::jsonb,'[{"input": "[1,0,2]", "expected_output": "5", "is_hidden": false}, {"input": "[1,2,2]", "expected_output": "4", "is_hidden": true}]'::jsonb,'Two passes: left-to-right (increasing), right-to-left (decreasing). Take max at each position. O(n).',ARRAY['python','java','javascript','go','cpp'],0.33),
('Assign Cookies School Kids','assign-cookies','Easy','DSA',ARRAY['greedy','arrays','sorting'],'## Problem

Each child has a greed factor `g[i]`, each cookie has size `s[j]`. Cookie `j` satisfies child `i` if `s[j] >= g[i]`. Maximize satisfied children.','1 ≤ g.length ≤ 3×10^4 | 0 ≤ g[i],s[j] ≤ 2^31-1','[{"input": "g = [1,2,3], s = [1,1]", "output": "1"}, {"input": "g = [1,2], s = [1,2,3]", "output": "2"}]'::jsonb,'[{"input": "[1,2,3]\n[1,1]", "expected_output": "1", "is_hidden": false}, {"input": "[1,2]\n[1,2,3]", "expected_output": "2", "is_hidden": true}]'::jsonb,'Sort both. Two-pointer greedy: match smallest adequate cookie to smallest greedy child. O(n log n).',ARRAY['python','java','javascript','go','cpp'],0.66),
('Two City Scheduling Flight','two-city-scheduling','Medium','DSA',ARRAY['greedy','arrays','sorting'],'## Problem

2n people, each with cost to go to city A or B. Send exactly n to each city. Return **minimum total cost**.','2 ≤ n ≤ 100 | costs.length == 2n | 1 ≤ costs[i][j] ≤ 1000','[{"input": "costs = [[10,20],[30,200],[400,50],[30,20]]", "output": "110", "explanation": "Send persons 0,1 to A, persons 2,3 to B"}]'::jsonb,'[{"input": "[[10,20],[30,200],[400,50],[30,20]]", "expected_output": "110", "is_hidden": false}, {"input": "[[259,770],[448,54],[926,667],[184,139],[840,118],[577,469]]", "expected_output": "1859", "is_hidden": true}]'::jsonb,'Sort by (cost_A - cost_B). First n go to A, rest to B. O(n log n).',ARRAY['python','java','javascript','go','cpp'],0.64),
('Minimum Arrows Burst Balloons','minimum-number-arrows-burst-balloons','Medium','DSA',ARRAY['greedy','intervals','sorting'],'## Problem

Balloons at x-coordinates `[start, end]`. Vertical arrow shot at `x` bursts all balloons where `start ≤ x ≤ end`. Return **minimum arrows** to burst all balloons.','1 ≤ points.length ≤ 10^4 | -2^31 ≤ start ≤ end ≤ 2^31-1','[{"input": "points = [[10,16],[2,8],[1,6],[7,12]]", "output": "2"}]'::jsonb,'[{"input": "[[10,16],[2,8],[1,6],[7,12]]", "expected_output": "2", "is_hidden": false}, {"input": "[[1,2],[3,4],[5,6],[7,8]]", "expected_output": "4", "is_hidden": true}]'::jsonb,'Sort by end. Greedily shoot at current end. Move to next non-overlapping balloon. O(n log n).',ARRAY['python','java','javascript','go','cpp'],0.57),
('Power Function Fast Exponentiation','powx-n','Medium','DSA',ARRAY['math','recursion','binary-search'],'## Problem

Implement `pow(x, n)` — compute **x raised to the power n**. Handle negative n.','-100.0 < x < 100.0 | -2^31 ≤ n ≤ 2^31-1 | -10^4 < x^n < 10^4','[{"input": "x=2.0, n=10", "output": "1024.0"}, {"input": "x=2.1, n=3", "output": "9.261"}, {"input": "x=2.0, n=-2", "output": "0.25"}]'::jsonb,'[{"input": "2.0\n10", "expected_output": "1024.0", "is_hidden": false}, {"input": "2.0\n-2", "expected_output": "0.25", "is_hidden": true}]'::jsonb,'Fast exponentiation: if n even, pow(x*x, n/2). If n odd, x*pow(x*x, (n-1)/2). O(log n).',ARRAY['python','java','javascript','go','cpp'],0.62),
('Happy Number Cycle Detection','happy-number','Easy','DSA',ARRAY['math','hash-set','floyd-cycle'],'## Problem

A happy number: repeatedly replace with sum of squares of digits; if reaches 1 → happy. If cycles without reaching 1 → not happy. Return true if `n` is happy.','1 ≤ n ≤ 2^31-1','[{"input": "n = 19", "output": "true", "explanation": "1²+9²=82 → 8²+2²=68 → ... → 1"}, {"input": "n = 2", "output": "false"}]'::jsonb,'[{"input": "19", "expected_output": "true", "is_hidden": false}, {"input": "2", "expected_output": "false", "is_hidden": true}]'::jsonb,'Use set or Floyd''s to detect cycle. O(log n) per step.',ARRAY['python','java','javascript','go','cpp'],0.72),
('XOR Maximum Pair Bitwise','maximum-xor-two-numbers','Hard','DSA',ARRAY['bit-manipulation','trie'],'## Problem

Given integer array `nums`, find the **maximum XOR** of any two elements.','1 ≤ n ≤ 2×10^5 | 0 ≤ nums[i] ≤ 2^31-1','[{"input": "nums = [3,10,5,25,2,8]", "output": "28", "explanation": "5 XOR 25 = 28"}]'::jsonb,'[{"input": "[3,10,5,25,2,8]", "expected_output": "28", "is_hidden": false}, {"input": "[0]", "expected_output": "0", "is_hidden": true}]'::jsonb,'Build trie of binary representations. For each num, traverse trie greedily choosing opposite bit. O(n×32).',ARRAY['python','java','javascript','go','cpp'],0.38),
('Sudoku Solver Game','sudoku-solver','Hard','DSA',ARRAY['backtracking','matrix'],'## Problem

Solve a Sudoku puzzle by filling in empty cells marked `''.''`. One valid solution guaranteed.','board is 9×9 | digits 1-9 and ''.'' | Valid puzzle with unique solution','[{"input": "board = [[\"5\",\"3\",\".\",\".\",\"7\",...]]", "output": "Solved board"}]'::jsonb,'[{"input": "[[\"5\",\"3\",\".\",\".\",\"7\",\".\",\".\",\".\",\".\"],[\"6\",\".\",\".\",\"1\",\"9\",\"5\",\".\",\".\",\".\"],[\".\",\"9\",\"8\",\".\",\".\",\".\",\".\",\"6\",\".\"],[\"8\",\".\",\".\",\".\",\"6\",\".\",\".\",\".\",\"3\"],[\"4\",\".\",\".\",\"8\",\".\",\"3\",\".\",\".\",\"1\"],[\"7\",\".\",\".\",\".\",\"2\",\".\",\".\",\".\",\"6\"],[\".\",\"6\",\".\",\".\",\".\",\".\",\"2\",\"8\",\".\"],[\".\",\".\",\".\",\"4\",\"1\",\"9\",\".\",\".\",\"5\"],[\".\",\".\",\".\",\".\",\"8\",\".\",\".\",\"7\",\"9\"]]", "expected_output": "[[\"5\",\"3\",\"4\",\"6\",\"7\",\"8\",\"9\",\"1\",\"2\"],[\"6\",\"7\",\"2\",\"1\",\"9\",\"5\",\"3\",\"4\",\"8\"],[\"1\",\"9\",\"8\",\"3\",\"4\",\"2\",\"5\",\"6\",\"7\"],[\"8\",\"5\",\"9\",\"7\",\"6\",\"1\",\"4\",\"2\",\"3\"],[\"4\",\"2\",\"6\",\"8\",\"5\",\"3\",\"7\",\"9\",\"1\"],[\"7\",\"1\",\"3\",\"9\",\"2\",\"4\",\"8\",\"5\",\"6\"],[\"9\",\"6\",\"1\",\"5\",\"3\",\"7\",\"2\",\"8\",\"4\"],[\"2\",\"8\",\"7\",\"4\",\"1\",\"9\",\"6\",\"3\",\"5\"],[\"3\",\"4\",\"5\",\"2\",\"8\",\"6\",\"1\",\"7\",\"9\"]]", "is_hidden": false}]'::jsonb,'Backtrack: for each ''.'' cell, try 1-9, check row/col/box validity, recurse. O(9^empty_cells).',ARRAY['python','java','javascript','go','cpp'],0.22)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO problems (title,slug,difficulty,category,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate) VALUES
('Sort Merge Algorithm','sort-list','Medium','DSA',ARRAY['linked-list','sorting','divide-conquer'],'## Problem

Sort a linked list in **O(n log n)** time using **O(1)** extra space.','0 ≤ n ≤ 5×10^4 | -10^5 ≤ val ≤ 10^5','[{"input": "head = 4→2→1→3", "output": "1→2→3→4"}, {"input": "head = -1→5→3→4→0", "output": "-1→0→3→4→5"}]'::jsonb,'[{"input": "[4,2,1,3]", "expected_output": "[1,2,3,4]", "is_hidden": false}, {"input": "[-1,5,3,4,0]", "expected_output": "[-1,0,3,4,5]", "is_hidden": true}]'::jsonb,'Find mid with slow/fast pointers. Split. Recursively sort. Merge. O(n log n) time, O(log n) recursion stack.',ARRAY['python','java','javascript','go','cpp'],0.48),
('Reorder Delivery List','reorder-list','Medium','DSA',ARRAY['linked-list','two-pointers'],'## Problem

Given linked list `L0→L1→...→Ln`, reorder to `L0→Ln→L1→Ln-1→L2→Ln-2→...` in-place.','1 ≤ n ≤ 5×10^4 | 1 ≤ val ≤ 1000','[{"input": "head = 1→2→3→4", "output": "1→4→2→3"}, {"input": "head = 1→2→3→4→5", "output": "1→5→2→4→3"}]'::jsonb,'[{"input": "[1,2,3,4]", "expected_output": "[1,4,2,3]", "is_hidden": false}, {"input": "[1,2,3,4,5]", "expected_output": "[1,5,2,4,3]", "is_hidden": true}]'::jsonb,'Find mid, reverse second half, merge two halves alternately. O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.52),
('Palindrome Linked List Check','palindrome-linked-list','Easy','DSA',ARRAY['linked-list','two-pointers','stack'],'## Problem

Determine if a linked list is a **palindrome** in O(n) time and O(1) space.','1 ≤ n ≤ 10^5 | 0 ≤ val ≤ 9','[{"input": "head = 1→2→2→1", "output": "true"}, {"input": "head = 1→2", "output": "false"}]'::jsonb,'[{"input": "[1,2,2,1]", "expected_output": "true", "is_hidden": false}, {"input": "[1,2]", "expected_output": "false", "is_hidden": true}]'::jsonb,'Find mid, reverse second half, compare with first half, restore. O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.59),
('Symmetric Tree Mirror','symmetric-tree','Easy','DSA',ARRAY['trees','dfs','bfs'],'## Problem

Determine if a binary tree is a **mirror image** of itself (symmetric around center).','1 ≤ n ≤ 1000 | -100 ≤ val ≤ 100','[{"input": "root = [1,2,2,3,4,4,3]", "output": "true"}, {"input": "root = [1,2,2,null,3,null,3]", "output": "false"}]'::jsonb,'[{"input": "[1,2,2,3,4,4,3]", "expected_output": "true", "is_hidden": false}, {"input": "[1,2,2,null,3,null,3]", "expected_output": "false", "is_hidden": true}]'::jsonb,'DFS isMirror(left, right): check vals, recurse isMirror(l.left,r.right) and isMirror(l.right,r.left). O(n).',ARRAY['python','java','javascript','go','cpp'],0.75),
('Diameter of Binary Tree','diameter-of-binary-tree','Easy','DSA',ARRAY['trees','dfs'],'## Problem

Find the **diameter** of a binary tree — the length of the longest path between any two nodes (may not pass through root).','1 ≤ n ≤ 10^4 | -100 ≤ val ≤ 100','[{"input": "root = [1,2,3,4,5]", "output": "3", "explanation": "Path [4,2,1,3] has length 3"}]'::jsonb,'[{"input": "[1,2,3,4,5]", "expected_output": "3", "is_hidden": false}, {"input": "[1,2]", "expected_output": "1", "is_hidden": true}]'::jsonb,'DFS returns depth. At each node update ans = max(ans, leftDepth+rightDepth). O(n).',ARRAY['python','java','javascript','go','cpp'],0.79),
('Balanced Binary Tree Check','balanced-binary-tree','Easy','DSA',ARRAY['trees','dfs'],'## Problem

Determine if a binary tree is **height-balanced** — for every node, the heights of left and right subtrees differ by at most 1.','0 ≤ n ≤ 5000 | -10^4 ≤ val ≤ 10^4','[{"input": "root = [3,9,20,null,null,15,7]", "output": "true"}, {"input": "root = [1,2,2,3,3,null,null,4,4]", "output": "false"}]'::jsonb,'[{"input": "[3,9,20,null,null,15,7]", "expected_output": "true", "is_hidden": false}, {"input": "[1,2,2,3,3,null,null,4,4]", "expected_output": "false", "is_hidden": true}]'::jsonb,'DFS: return -1 if unbalanced subtree found. Otherwise return height. O(n).',ARRAY['python','java','javascript','go','cpp'],0.71),
('Reorganize String No Adjacent','reorganize-string','Medium','DSA',ARRAY['heap','greedy','strings'],'## Problem

Rearrange `s` so that **no two adjacent characters are the same**. Return any valid arrangement, or "" if impossible.','1 ≤ len(s) ≤ 500 | s consists of lowercase letters','[{"input": "s = \"aab\"", "output": "\"aba\""}, {"input": "s = \"aaab\"", "output": "\"\""}]'::jsonb,'[{"input": "\"aab\"", "expected_output": "\"aba\"", "is_hidden": false}, {"input": "\"aaab\"", "expected_output": "\"\"", "is_hidden": true}]'::jsonb,'Max-heap by frequency. Always pick most frequent that differs from last placed. O(n log n).',ARRAY['python','java','javascript','go','cpp'],0.52),
('Remove K Digits Make Smallest','remove-k-digits','Medium','DSA',ARRAY['stack','greedy','strings'],'## Problem

Given number string `num` and integer `k`, remove `k` digits to make the **smallest possible number**. No leading zeros.','1 ≤ len(num) ≤ 10^5 | 0 ≤ k ≤ len(num) | num contains only digits','[{"input": "num = \"1432219\", k = 3", "output": "\"1219\""}, {"input": "num = \"10200\", k = 1", "output": "\"200\""}]'::jsonb,'[{"input": "\"1432219\"\n3", "expected_output": "\"1219\"", "is_hidden": false}, {"input": "\"10200\"\n1", "expected_output": "\"200\"", "is_hidden": true}]'::jsonb,'Monotonic increasing stack. Pop larger digits while k>0. Trim leading zeros. O(n).',ARRAY['python','java','javascript','go','cpp'],0.45),
('Infosys Employee Second Highest Salary','second-highest-salary','Easy','SQL',ARRAY['sql','subquery','aggregation'],'## Problem

The Infosys HR database has an `Employee` table:
```sql
| Id | Salary |
|----|--------|
| 1  | 100000 |
| 2  | 200000 |
| 3  | 300000 |
```
Write a SQL query to find the **second highest salary**. Return `null` if it doesn''t exist.','Table: Employee(Id INT, Salary INT) | May have duplicate salaries','[{"input": "Employee: [(1,100000),(2,200000),(3,300000)]", "output": "200000"}, {"input": "Employee: [(1,100000)]", "output": "null"}]'::jsonb,'[{"input": "[(1,100),(2,200),(3,300)]", "expected_output": "200", "is_hidden": false}, {"input": "[(1,100)]", "expected_output": "null", "is_hidden": true}]'::jsonb,'SELECT MAX(Salary) FROM Employee WHERE Salary < (SELECT MAX(Salary) FROM Employee). Or use OFFSET 1.',ARRAY['mysql','postgresql'],0.65),
('TCS Rank Employee Scores','rank-scores','Medium','SQL',ARRAY['sql','window-functions','ranking'],'## Problem

TCS''s performance database has a `Scores` table. Write a SQL query to **rank scores** — same scores get same rank, ranks are consecutive (dense rank). Sort by score descending.','Table: Scores(Id INT, Score DECIMAL) | No NULL scores','[{"input": "Scores: [(1,3.50),(2,3.65),(3,4.00),(4,3.85),(5,4.00),(6,3.65)]", "output": "[(4.00,1),(4.00,1),(3.85,2),(3.65,3),(3.65,3),(3.50,4)]"}]'::jsonb,'[{"input": "[(1,3.50),(2,3.65),(3,4.00)]", "expected_output": "[(4.00,1),(3.65,2),(3.50,3)]", "is_hidden": false}, {"input": "[(1,1.0)]", "expected_output": "[(1.0,1)]", "is_hidden": true}]'::jsonb,'SELECT Score, DENSE_RANK() OVER (ORDER BY Score DESC) AS ''Rank'' FROM Scores ORDER BY Score DESC.',ARRAY['mysql','postgresql'],0.58),
('Wipro Rising Temperature Days','rising-temperature','Easy','SQL',ARRAY['sql','self-join','date-functions'],'## Problem

Wipro''s data center temperature log has a `Weather` table (Id, RecordDate, Temperature). Find all dates where temperature was **higher than the previous day**. Return the IDs.','Table: Weather(Id INT, RecordDate DATE, Temperature INT)','[{"input": "Weather: [(1,''2015-01-01'',10),(2,''2015-01-02'',25),(3,''2015-01-03'',20),(4,''2015-01-04'',30)]", "output": "[2,4]"}]'::jsonb,'[{"input": "[(1,''2015-01-01'',10),(2,''2015-01-02'',25)]", "expected_output": "[2]", "is_hidden": false}, {"input": "[(1,''2015-01-01'',10),(2,''2015-01-03'',25)]", "expected_output": "[2]", "is_hidden": true}]'::jsonb,'Self-join or LAG window function. WHERE w1.Temperature > w2.Temperature AND DATEDIFF(w1.RecordDate, w2.RecordDate) = 1.',ARRAY['mysql','postgresql'],0.72),
('Amazon India Customers Without Orders','customers-who-never-order','Easy','SQL',ARRAY['sql','left-join','subquery'],'## Problem

Amazon India has `Customers(Id, Name)` and `Orders(Id, CustomerId)` tables. Find all customers who **never placed an order**.','Tables: Customers(Id INT, Name VARCHAR) | Orders(Id INT, CustomerId INT)','[{"input": "Customers:[(1,''Henry''),(2,''Arun''),(3,''Priya'')] | Orders:[(1,3),(2,1)]", "output": "[''Arun'']", "explanation": "Customer 2 (Arun) has no orders"}]'::jsonb,'[{"input": "Customers:[(1,''A''),(2,''B'')] Orders:[(1,1)]", "expected_output": "[''B'']", "is_hidden": false}, {"input": "Customers:[(1,''A'')] Orders:[(1,1)]", "expected_output": "[]", "is_hidden": true}]'::jsonb,'SELECT Name FROM Customers LEFT JOIN Orders ON CustomerId=Id WHERE Orders.Id IS NULL. Or NOT IN subquery.',ARRAY['mysql','postgresql'],0.77),
('Flipkart Employee Manager Salary','employees-earning-more-than-managers','Easy','SQL',ARRAY['sql','self-join'],'## Problem

Flipkart''s HR has `Employee(Id, Name, Salary, ManagerId)`. Find employees who earn **more than their manager**.','ManagerId references Id in same table | May be NULL for top-level employees','[{"input": "[(1,''Rohan'',100000,3),(2,''Priya'',85000,1),(3,''Suresh'',70000,null)]", "output": "[''Rohan'']", "explanation": "Rohan earns 100000 > manager Suresh''s 70000"}]'::jsonb,'[{"input": "[(1,''Rohan'',100000,3),(2,''Priya'',85000,1),(3,''Suresh'',70000,null)]", "expected_output": "[''Rohan'']", "is_hidden": false}, {"input": "[(1,''A'',1000,null)]", "expected_output": "[]", "is_hidden": true}]'::jsonb,'SELECT e.Name FROM Employee e JOIN Employee m ON e.ManagerId=m.Id WHERE e.Salary > m.Salary.',ARRAY['mysql','postgresql'],0.75),
('HCL Delete Duplicate Emails','delete-duplicate-emails','Easy','SQL',ARRAY['sql','delete','subquery'],'## Problem

HCL''s user table `Person(Id, Email)` has duplicate emails. Delete all **duplicate emails**, keeping the row with smallest Id.','Table: Person(Id INT PRIMARY KEY, Email VARCHAR)','[{"input": "Person: [(1,''a@a.com''),(2,''b@b.com''),(3,''a@a.com'')]", "output": "Keep: [(1,''a@a.com''),(2,''b@b.com'')]"}]'::jsonb,'[{"input": "[(1,''a@a.com''),(2,''b@b.com''),(3,''a@a.com'')]", "expected_output": "[(1,''a@a.com''),(2,''b@b.com'')]", "is_hidden": false}, {"input": "[(1,''a@a.com''),(2,''a@a.com'')]", "expected_output": "[(1,''a@a.com'')]", "is_hidden": true}]'::jsonb,'DELETE FROM Person WHERE Id NOT IN (SELECT MIN(Id) FROM Person GROUP BY Email).',ARRAY['mysql','postgresql'],0.69),
('Combine Customer Orders Tables','combine-two-tables','Easy','SQL',ARRAY['sql','left-join'],'## Problem

Given `Person(PersonId, FirstName, LastName)` and `Address(AddressId, PersonId, City, State)`, report FirstName, LastName, City, State for each person. Include persons **without address** (NULL for missing).','PersonId in Person, Address references it','[{"input": "Person:[(1,''A'',''B'')] Address:[]", "output": "[(''A'',''B'',null,null)]"}]'::jsonb,'[{"input": "Person:[(1,''Wang'',''Fang'')] Address:[(1,1,''Nanjing'',''Jiangsu'')]", "expected_output": "[(''Wang'',''Fang'',''Nanjing'',''Jiangsu'')]", "is_hidden": false}, {"input": "Person:[(1,''A'',''B'')] Address:[]", "expected_output": "[(''A'',''B'',null,null)]", "is_hidden": true}]'::jsonb,'SELECT FirstName,LastName,City,State FROM Person LEFT JOIN Address ON Person.PersonId=Address.PersonId.',ARRAY['mysql','postgresql'],0.82),
('Consecutive Numbers Logging','consecutive-numbers','Medium','SQL',ARRAY['sql','window-functions','self-join'],'## Problem

Find all numbers in `Logs(Id, Num)` that appear **at least three times consecutively**.','Table: Logs(Id INT AUTO_INCREMENT, Num VARCHAR)','[{"input": "Logs:[(1,1),(2,1),(3,1),(4,2),(5,1),(6,2),(7,2)]", "output": "[1]", "explanation": "1 appears three times consecutively at rows 1,2,3"}]'::jsonb,'[{"input": "[(1,1),(2,1),(3,1),(4,2)]", "expected_output": "[1]", "is_hidden": false}, {"input": "[(1,1),(2,1),(3,2),(4,2),(5,2)]", "expected_output": "[2]", "is_hidden": true}]'::jsonb,'Self-join L1,L2,L3 where L1.Id+1=L2.Id, L2.Id+1=L3.Id and all nums equal. Or LAG/LEAD window functions.',ARRAY['mysql','postgresql'],0.48),
('Department Highest Salary Finder','department-highest-salary','Medium','SQL',ARRAY['sql','subquery','aggregation','join'],'## Problem

Given `Employee(Id,Name,Salary,DepartmentId)` and `Department(Id,Name)`, find the **employee(s) with highest salary** in each department.','At least one employee per department | Multiple employees may share highest salary','[{"input": "Employee:[(1,''Arjun'',70000,1),(2,''Bob'',80000,1),(3,''Priya'',60000,2)] Department:[(1,''IT''),(2,''HR'')]", "output": "[(''IT'',''Bob'',80000),(''HR'',''Priya'',60000)]"}]'::jsonb,'[{"input": "Emp:[(1,''A'',70000,1),(2,''B'',80000,1)] Dept:[(1,''IT'')]", "expected_output": "[(''IT'',''B'',80000)]", "is_hidden": false}, {"input": "Emp:[(1,''A'',70000,1),(2,''B'',70000,1)] Dept:[(1,''IT'')]", "expected_output": "[(''IT'',''A'',70000),(''IT'',''B'',70000)]", "is_hidden": true}]'::jsonb,'SELECT d.Name, e.Name, e.Salary FROM Employee e JOIN Department d ON e.DeptId=d.Id WHERE (e.DeptId,e.Salary) IN (SELECT DeptId,MAX(Salary) FROM Employee GROUP BY DeptId).',ARRAY['mysql','postgresql'],0.53),
('Department Top Three Salaries','department-top-three-salaries','Hard','SQL',ARRAY['sql','window-functions','dense-rank'],'## Problem

Find employees who earn in the **top three unique salaries** within their department.','Same tables as Department Highest Salary | Top 3 unique salary values','[{"input": "Employee:[(1,''A'',100,1),(2,''B'',90,1),(3,''C'',80,1),(4,''D'',70,1)] Department:[(1,''IT'')]", "output": "[(''IT'',''A'',100),(''IT'',''B'',90),(''IT'',''C'',80)]"}]'::jsonb,'[{"input": "Emp:[(1,''A'',100,1),(2,''B'',90,1),(3,''C'',80,1),(4,''D'',70,1)] Dept:[(1,''IT'')]", "expected_output": "[(''IT'',''A'',100),(''IT'',''B'',90),(''IT'',''C'',80)]", "is_hidden": false}, {"input": "Emp:[(1,''A'',100,1),(2,''A'',100,1),(3,''B'',90,1)] Dept:[(1,''IT'')]", "expected_output": "[(''IT'',''A'',100),(''IT'',''A'',100),(''IT'',''B'',90)]", "is_hidden": true}]'::jsonb,'DENSE_RANK() OVER (PARTITION BY DepartmentId ORDER BY Salary DESC) ≤ 3.',ARRAY['mysql','postgresql'],0.35),
('Paytm Active Users Monthly','active-users','Medium','SQL',ARRAY['sql','window-functions','date-functions'],'## Problem

Given `Logins(UserId, LoginDate)`, find users who logged in for **5 or more consecutive days**. Return user IDs (no duplicates).','Table: Logins(UserId INT, LoginDate DATE) | Dates are unique per user','[{"input": "Logins:[(1,''2021-01-01''),(1,''2021-01-02''),(1,''2021-01-03''),(1,''2021-01-04''),(1,''2021-01-05''),(2,''2021-01-01'')]", "output": "[1]"}]'::jsonb,'[{"input": "[(1,''2021-01-01''),(1,''2021-01-02''),(1,''2021-01-03''),(1,''2021-01-04''),(1,''2021-01-05'')]", "expected_output": "[1]", "is_hidden": false}, {"input": "[(1,''2021-01-01''),(1,''2021-01-03'')]", "expected_output": "[]", "is_hidden": true}]'::jsonb,'Use ROW_NUMBER() partitioned by UserId ordered by LoginDate. LoginDate - ROW_NUMBER() = constant for consecutive days. Count groups ≥ 5.',ARRAY['mysql','postgresql'],0.42),
('Nth Highest Salary Generic','nth-highest-salary','Medium','SQL',ARRAY['sql','subquery','offset'],'## Problem

Create a SQL function `getNthHighestSalary(N INT)` that returns the **Nth highest salary** from `Employee` table. Return NULL if fewer than N distinct salaries.','Table: Employee(Id INT, Salary INT) | 1 ≤ N','[{"input": "Employee:[(1,300),(2,200),(3,100)], N=2", "output": "200"}, {"input": "Employee:[(1,100)], N=2", "output": "null"}]'::jsonb,'[{"input": "N=2\n[(1,300),(2,200),(3,100)]", "expected_output": "200", "is_hidden": false}, {"input": "N=2\n[(1,100)]", "expected_output": "null", "is_hidden": true}]'::jsonb,'SELECT DISTINCT Salary FROM Employee ORDER BY Salary DESC LIMIT 1 OFFSET N-1. Wrap in function with NULL check.',ARRAY['mysql','postgresql'],0.55)
ON CONFLICT (slug) DO NOTHING;

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

INSERT INTO problems (title,slug,difficulty,category,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate) VALUES
('Integer to Roman Numeral','integer-to-roman','Medium','DSA',ARRAY['strings','math','greedy'],'## Problem

Convert an integer `num` to a **Roman numeral** string.','1 ≤ num ≤ 3999','[{"input": "num = 1994", "output": "\"MCMXCIV\""}, {"input": "num = 58", "output": "\"LVIII\""}]'::jsonb,'[{"input": "1994", "expected_output": "\"MCMXCIV\"", "is_hidden": false}, {"input": "3749", "expected_output": "\"MMMDCCXLIX\"", "is_hidden": true}]'::jsonb,'Table of values/symbols descending. Greedily subtract largest fitting value, append symbol. O(1) since bounded by 3999.',ARRAY['python','java','javascript','go','cpp'],0.66),
('Count and Say Sequence','count-and-say','Medium','DSA',ARRAY['strings','simulation'],'## Problem

The count-and-say sequence: 1→"1", 2→"11", 3→"21", 4→"1211", 5→"111221". Return the **nth term**.','1 ≤ n ≤ 30','[{"input": "n = 4", "output": "\"1211\""}, {"input": "n = 1", "output": "\"1\""}]'::jsonb,'[{"input": "4", "expected_output": "\"1211\"", "is_hidden": false}, {"input": "6", "expected_output": "\"312211\"", "is_hidden": true}]'::jsonb,'Start with "1". For each step, scan current string counting consecutive chars, build next. O(2^n).',ARRAY['python','java','javascript','go','cpp'],0.59),
('Isomorphic Strings Check','isomorphic-strings','Easy','DSA',ARRAY['strings','hash-map'],'## Problem

Two strings `s` and `t` are isomorphic if characters in `s` can be replaced to get `t` (preserving order, one-to-one mapping). Return `true` if isomorphic.','1 ≤ len(s) = len(t) ≤ 5×10^4 | s and t consist of printable ASCII','[{"input": "s=\"egg\", t=\"add\"", "output": "true"}, {"input": "s=\"foo\", t=\"bar\"", "output": "false"}, {"input": "s=\"paper\", t=\"title\"", "output": "true"}]'::jsonb,'[{"input": "\"egg\"\n\"add\"", "expected_output": "true", "is_hidden": false}, {"input": "\"foo\"\n\"bar\"", "expected_output": "false", "is_hidden": true}]'::jsonb,'Two hashmaps s→t and t→s. For each pair, check consistency of both mappings. O(n).',ARRAY['python','java','javascript','go','cpp'],0.69),
('String Compression Encoding','string-compression','Medium','DSA',ARRAY['strings','two-pointers'],'## Problem

Compress string `chars` array in-place: consecutive repeats become char+count (e.g. [''a'',''a'',''b''] → [''a'',''2'',''b'']). Single chars have no count. Return new length. O(1) extra space.','1 ≤ len(chars) ≤ 2000 | chars[i] is lowercase letter, digit, or symbol','[{"input": "chars = [''a'',''a'',''b'',''b'',''c'',''c'',''c'']", "output": "6 (array becomes [''a'',''2'',''b'',''2'',''c'',''3''])"}, {"input": "chars = [''a'']", "output": "1"}]'::jsonb,'[{"input": "[''a'',''a'',''b'',''b'',''c'',''c'',''c'']", "expected_output": "6", "is_hidden": false}, {"input": "[''a'',''b'',''b'',''b'',''b'',''b'',''b'',''b'',''b'',''b'',''b'',''b'',''b'']", "expected_output": "4", "is_hidden": true}]'::jsonb,'Two pointers: read and write. Count consecutive, write char then count digits. O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.51),
('Ransom Note Magazine','ransom-note','Easy','DSA',ARRAY['strings','hash-map'],'## Problem

Given `ransomNote` and `magazine`, return `true` if `ransomNote` can be constructed using letters from `magazine` (each letter used at most once).','1 ≤ len(ransomNote),len(magazine) ≤ 10^5 | Both consist of lowercase letters','[{"input": "ransomNote=\"a\", magazine=\"b\"", "output": "false"}, {"input": "ransomNote=\"aa\", magazine=\"aab\"", "output": "true"}]'::jsonb,'[{"input": "\"a\"\n\"b\"", "expected_output": "false", "is_hidden": false}, {"input": "\"aa\"\n\"aab\"", "expected_output": "true", "is_hidden": true}]'::jsonb,'Count chars in magazine. For each char in ransomNote decrement; if goes < 0, return false. O(n).',ARRAY['python','java','javascript','go','cpp'],0.76),
('Implement strStr Substring Search','find-needle-in-haystack','Easy','DSA',ARRAY['strings','kmp','sliding-window'],'## Problem

Given `haystack` and `needle`, return the **index** of needle''s first occurrence in haystack. Return -1 if not present.','1 ≤ len(haystack),len(needle) ≤ 10^4 | Both consist of lowercase letters','[{"input": "haystack=\"sadbutsad\", needle=\"sad\"", "output": "0"}, {"input": "haystack=\"leetcode\", needle=\"leeto\"", "output": "-1"}]'::jsonb,'[{"input": "\"sadbutsad\"\n\"sad\"", "expected_output": "0", "is_hidden": false}, {"input": "\"leetcode\"\n\"leeto\"", "expected_output": "-1", "is_hidden": true}]'::jsonb,'Built-in find() or KMP for O(n+m). Sliding window O(n×m) also accepted for this constraint.',ARRAY['python','java','javascript','go','cpp'],0.72),
('Zigzag Conversion Rail Fence','zigzag-conversion','Medium','DSA',ARRAY['strings','simulation'],'## Problem

Write `s` in zigzag pattern on `numRows` rows (like a fence), then read row by row. Return the result string.','1 ≤ len(s) ≤ 1000 | 1 ≤ numRows ≤ 1000','[{"input": "s=\"PAYPALISHIRING\", numRows=3", "output": "\"PAHNAPLSIIGYIR\""}, {"input": "s=\"PAYPALISHIRING\", numRows=4", "output": "\"PINALSIGYAHRPI\""}]'::jsonb,'[{"input": "\"PAYPALISHIRING\"\n3", "expected_output": "\"PAHNAPLSIIGYIR\"", "is_hidden": false}, {"input": "\"A\"\n1", "expected_output": "\"A\"", "is_hidden": true}]'::jsonb,'Simulate: row idx oscillates 0..numRows-1 and back. Append char to corresponding row string. O(n).',ARRAY['python','java','javascript','go','cpp'],0.55),
('Construct Tree from Preorder Inorder','construct-binary-tree-preorder-inorder','Medium','DSA',ARRAY['trees','dfs','divide-conquer'],'## Problem

Given `preorder` and `inorder` traversal arrays of a binary tree, construct and return the **binary tree**.','1 ≤ n ≤ 3000 | -3000 ≤ val ≤ 3000 | All values are unique | preorder and inorder are valid for the same tree','[{"input": "preorder=[3,9,20,15,7], inorder=[9,3,15,20,7]", "output": "[3,9,20,null,null,15,7]"}]'::jsonb,'[{"input": "[3,9,20,15,7]\n[9,3,15,20,7]", "expected_output": "[3,9,20,null,null,15,7]", "is_hidden": false}, {"input": "[-1]\n[-1]", "expected_output": "[-1]", "is_hidden": true}]'::jsonb,'preorder[0]=root. Find root in inorder → splits left/right subtrees. Recurse. Hashmap for O(1) lookup. O(n).',ARRAY['python','java','javascript','go','cpp'],0.6),
('Populating Next Right Pointers','populating-next-right-pointers','Medium','DSA',ARRAY['trees','bfs'],'## Problem

Fill each node''s `next` pointer to point to the **next right node** on the same level. If no next right, set to NULL. Use O(1) extra space (no queue).','1 ≤ n ≤ 6000 | -100 ≤ val ≤ 100 | Perfect binary tree','[{"input": "root = [1,2,3,4,5,6,7]", "output": "[1,#,2,3,#,4,5,6,7,#]"}]'::jsonb,'[{"input": "[1,2,3,4,5,6,7]", "expected_output": "[1,#,2,3,#,4,5,6,7,#]", "is_hidden": false}, {"input": "[]", "expected_output": "[]", "is_hidden": true}]'::jsonb,'Iterate levels using existing next pointers. Connect children level by level. O(n) O(1).',ARRAY['python','java','javascript','go','cpp'],0.67),
('Count Complete Tree Nodes','count-complete-tree-nodes','Medium','DSA',ARRAY['trees','binary-search'],'## Problem

Given a **complete binary tree**, count nodes in less than O(n). A complete tree has all levels full except possibly the last, which is filled from left.','0 ≤ n < 5×10^4 | 0 ≤ val ≤ 5×10^4','[{"input": "root = [1,2,3,4,5,6]", "output": "6"}]'::jsonb,'[{"input": "[1,2,3,4,5,6]", "expected_output": "6", "is_hidden": false}, {"input": "[]", "expected_output": "0", "is_hidden": true}]'::jsonb,'Compute left height and right height. If equal → left subtree is perfect (2^h-1 nodes). Binary search last node position. O(log²n).',ARRAY['python','java','javascript','go','cpp'],0.64),
('Critical Connections Network Bridge','critical-connections-in-network','Hard','DSA',ARRAY['graphs','dfs','tarjan'],'## Problem

Given `n` servers connected by `connections` (undirected), find all **critical connections** — edges whose removal disconnects the network.','2 ≤ n ≤ 10^5 | n-1 ≤ connections.length ≤ 10^5','[{"input": "n=4, connections=[[0,1],[1,2],[2,0],[1,3]]", "output": "[[1,3]]", "explanation": "Removing [1,3] disconnects server 3"}]'::jsonb,'[{"input": "4\n[[0,1],[1,2],[2,0],[1,3]]", "expected_output": "[[1,3]]", "is_hidden": false}, {"input": "2\n[[0,1]]", "expected_output": "[[0,1]]", "is_hidden": true}]'::jsonb,'Tarjan''s bridge algorithm. Track discovery time and low value. Edge (u,v) is bridge if low[v] > disc[u]. O(V+E).',ARRAY['python','java','javascript','go','cpp'],0.29),
('Minimum Spanning Tree Roads','minimum-spanning-tree','Hard','DSA',ARRAY['graphs','kruskal','union-find','prim'],'## Problem

Given `n` cities and `edges[i]=[u,v,cost]`, find the **minimum cost** to connect all cities (Minimum Spanning Tree). Return total cost. Return -1 if impossible.','1 ≤ n ≤ 1000 | 1 ≤ edges.length ≤ 10^4 | 1 ≤ cost ≤ 10^4','[{"input": "n=4, edges=[[0,1,1],[0,2,4],[1,2,2],[1,3,5],[2,3,1]]", "output": "4", "explanation": "Edges (0,1,1)+(1,2,2)+(2,3,1)=4"}]'::jsonb,'[{"input": "4\n[[0,1,1],[0,2,4],[1,2,2],[1,3,5],[2,3,1]]", "expected_output": "4", "is_hidden": false}, {"input": "2\n[[0,1,5]]", "expected_output": "5", "is_hidden": true}]'::jsonb,'Kruskal''s: sort edges, add if no cycle (Union-Find). Or Prim''s with min-heap. O(E log E).',ARRAY['python','java','javascript','go','cpp'],0.58),
('Redundant Connection Cycle Finder','redundant-connection','Medium','DSA',ARRAY['graphs','union-find','dfs'],'## Problem

Given a tree with `n` nodes and one extra edge (making it have a cycle), find the **redundant edge** that can be removed to restore a valid tree. If multiple answers, return the last one in input.','3 ≤ n ≤ 1000 | edges[i] = [u,v], 1-indexed','[{"input": "edges = [[1,2],[1,3],[2,3]]", "output": "[2,3]"}, {"input": "edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]", "output": "[1,4]"}]'::jsonb,'[{"input": "[[1,2],[1,3],[2,3]]", "expected_output": "[2,3]", "is_hidden": false}, {"input": "[[1,2],[2,3],[3,4],[1,4],[1,5]]", "expected_output": "[1,4]", "is_hidden": true}]'::jsonb,'Union-Find: for each edge, if both endpoints already connected → redundant. O(n×α(n)).',ARRAY['python','java','javascript','go','cpp'],0.64),
('Find the Town Judge','find-the-town-judge','Easy','DSA',ARRAY['graphs','arrays'],'## Problem

In a village of `n` people, the town judge trusts nobody and everybody (except the judge) trusts the judge. Given `trust[i]=[a,b]` (a trusts b), find the **judge''s label**. Return -1 if none.','1 ≤ n ≤ 1000 | 0 ≤ trust.length ≤ 10^4 | trust[i] are distinct','[{"input": "n=3, trust=[[1,3],[2,3]]", "output": "3"}, {"input": "n=3, trust=[[1,3],[2,3],[3,1]]", "output": "-1"}]'::jsonb,'[{"input": "3\n[[1,3],[2,3]]", "expected_output": "3", "is_hidden": false}, {"input": "3\n[[1,3],[2,3],[3,1]]", "expected_output": "-1", "is_hidden": true}]'::jsonb,'Count trust-in and trust-out per person. Judge has trust-in=n-1 and trust-out=0. O(n+E).',ARRAY['python','java','javascript','go','cpp'],0.74),
('Coin Change II Count Ways','coin-change-ii','Medium','DSA',ARRAY['dynamic-programming'],'## Problem

Given coin `denominations` and `amount`, return the **number of combinations** (not permutations) that make up the amount. Infinite coins.','1 ≤ coins.length ≤ 300 | 1 ≤ coins[i] ≤ 5000 | 0 ≤ amount ≤ 5000','[{"input": "coins=[1,2,5], amount=5", "output": "4", "explanation": "5;2+2+1;2+1+1+1;1×5"}, {"input": "coins=[2], amount=3", "output": "0"}]'::jsonb,'[{"input": "[1,2,5]\n5", "expected_output": "4", "is_hidden": false}, {"input": "[2]\n3", "expected_output": "0", "is_hidden": true}]'::jsonb,'dp[i]+=dp[i-coin] for each coin. Outer loop over coins (not amount) to avoid permutations. O(amount×coins).',ARRAY['python','java','javascript','go','cpp'],0.61),
('Interleaving String Verification','interleaving-string','Medium','DSA',ARRAY['dynamic-programming','strings'],'## Problem

Given `s1`, `s2`, `s3`, determine if `s3` is formed by an **interleaving** of `s1` and `s2` (preserving relative order).','0 ≤ len(s1),len(s2) ≤ 100 | len(s3) = len(s1)+len(s2) | All consist of lowercase letters','[{"input": "s1=\"aabcc\", s2=\"dbbca\", s3=\"aadbbcbcac\"", "output": "true"}, {"input": "s1=\"aabcc\", s2=\"dbbca\", s3=\"aadbbbaccc\"", "output": "false"}]'::jsonb,'[{"input": "\"aabcc\"\n\"dbbca\"\n\"aadbbcbcac\"", "expected_output": "true", "is_hidden": false}, {"input": "\"aabcc\"\n\"dbbca\"\n\"aadbbbaccc\"", "expected_output": "false", "is_hidden": true}]'::jsonb,'dp[i][j]=can form s3[0..i+j-1] using s1[0..i-1] and s2[0..j-1]. Transitions from dp[i-1][j] and dp[i][j-1]. O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.44),
('Burst Balloons Maximum Coins','burst-balloons','Hard','DSA',ARRAY['dynamic-programming','divide-conquer'],'## Problem

Burst all balloons with values `nums`. Bursting balloon `i` gives `nums[i-1]*nums[i]*nums[i+1]` coins. Maximize total coins. Add 1 padding at both ends.','1 ≤ n ≤ 300 | 0 ≤ nums[i] ≤ 100','[{"input": "nums = [3,1,5,8]", "output": "167", "explanation": "Burst 1(3×1×5), burst 5(3×5×8), burst 3(1×3×8), burst 8(1×8×1) = 15+120+24+8=167"}]'::jsonb,'[{"input": "[3,1,5,8]", "expected_output": "167", "is_hidden": false}, {"input": "[1,5]", "expected_output": "10", "is_hidden": true}]'::jsonb,'Interval DP: think of last balloon to burst in range [l,r]. dp[l][r]=max over k of nums[l-1]*nums[k]*nums[r+1]+dp[l][k-1]+dp[k+1][r]. O(n³).',ARRAY['python','java','javascript','go','cpp'],0.28),
('Wildcard Pattern Matching','wildcard-matching','Hard','DSA',ARRAY['dynamic-programming','strings','recursion'],'## Problem

Match string `s` against pattern `p` where `?` matches any single char and `*` matches any sequence (including empty). Return `true` if full match.','0 ≤ len(s) ≤ 2000 | 0 ≤ len(p) ≤ 2000 | s contains only lowercase letters | p contains lowercase letters, ''?'', ''*''','[{"input": "s=\"aa\", p=\"a\"", "output": "false"}, {"input": "s=\"aa\", p=\"*\"", "output": "true"}, {"input": "s=\"cb\", p=\"?a\"", "output": "false"}]'::jsonb,'[{"input": "\"aa\"\n\"*\"", "expected_output": "true", "is_hidden": false}, {"input": "\"cb\"\n\"?a\"", "expected_output": "false", "is_hidden": true}]'::jsonb,'dp[i][j]=s[0..i-1] matches p[0..j-1]. If p[j-1]=''*'': dp[i-1][j] or dp[i][j-1]. If ''?'' or match: dp[i-1][j-1]. O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.3),
('Regular Expression Matching','regular-expression-matching','Hard','DSA',ARRAY['dynamic-programming','strings','recursion'],'## Problem

Match `s` against pattern `p` where `.` matches any single char and `*` matches zero or more of the preceding element. Full string match required.','1 ≤ len(s) ≤ 20 | 1 ≤ len(p) ≤ 30 | s contains only lowercase letters | p contains lowercase letters, ''.'', ''*''','[{"input": "s=\"aa\", p=\"a*\"", "output": "true"}, {"input": "s=\"ab\", p=\".*\"", "output": "true"}, {"input": "s=\"aab\", p=\"c*a*b\"", "output": "true"}]'::jsonb,'[{"input": "\"aa\"\n\"a*\"", "expected_output": "true", "is_hidden": false}, {"input": "\"mississippi\"\n\"mis*is*p*.\"", "expected_output": "false", "is_hidden": true}]'::jsonb,'dp[i][j]=s[0..i-1] matches p[0..j-1]. Handle ''*'' by checking zero occurrence dp[i][j-2] or one more dp[i-1][j]. O(m×n).',ARRAY['python','java','javascript','go','cpp'],0.26),
('Minimum Cost Connect Sticks','minimum-cost-to-connect-sticks','Medium','DSA',ARRAY['heap','greedy'],'## Problem

Connect `n` sticks into one stick. Cost of connecting two sticks = sum of their lengths. Return **minimum total cost**.','1 ≤ sticks.length ≤ 10^4 | 1 ≤ sticks[i] ≤ 10^4','[{"input": "sticks = [2,4,3]", "output": "14", "explanation": "Connect 2+3=5(cost 5), then 4+5=9(cost 9): total 14"}, {"input": "sticks = [1,8,3,5]", "output": "30"}]'::jsonb,'[{"input": "[2,4,3]", "expected_output": "14", "is_hidden": false}, {"input": "[1,8,3,5]", "expected_output": "30", "is_hidden": true}]'::jsonb,'Huffman coding: always merge two smallest. Min-heap: pop two, push sum, add to total. O(n log n).',ARRAY['python','java','javascript','go','cpp'],0.62)
ON CONFLICT (slug) DO NOTHING;

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

INSERT INTO problems (title,slug,difficulty,category,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate) VALUES
('Design CRED Credit Score Service','design-credit-score-service','Medium','System Design',ARRAY['system-design','ml-pipeline','database','api'],'## Problem

Design CRED''s **credit score and bill payment tracking service**:

- Aggregate credit card bills from 50+ banks via bank APIs / PDF parsing
- Track payment history, credit utilization, credit score trends
- 10M users, each with 2-5 credit cards
- Refresh credit score monthly (from CIBIL/Experian)
- Detect missed payments and alert users
- Anonymized insights across all users

**Discuss:** bank data ingestion, score refresh pipeline, alert system.','10M users | 50+ bank integrations | Monthly score refresh | < 200ms score page load','[{"input": "User connects HDFC credit card", "output": "CRED fetches bill via account aggregator API, parses, stores bill history"}, {"input": "Credit score drops 20 points", "output": "Push notification within 24h of score refresh"}]'::jsonb,'[{"input": "Handle 50+ bank API formats", "expected_output": "Adapter pattern: one adapter per bank. Normalize to internal schema. Queue-based ingestion.", "is_hidden": false}, {"input": "Alert for missed payment", "expected_output": "Cron job checks upcoming due dates daily. Alert 3 days before. Alert again on miss. Kafka for alert events.", "is_hidden": true}]'::jsonb,'## Design

**Ingestion:** Account Aggregator (AA) framework (RBI-regulated). Bank adapters normalize data → `credit_accounts, bills, transactions`.

**Score Refresh:** Monthly Kafka trigger → CIBIL API call → store in `credit_scores(user_id, score, date, breakdown)`.

**Alerts:** Scheduled job checks `upcoming_payments` view. Publishes to notification service.

**Analytics:** Anonymized aggregates in ClickHouse. Opt-in data sharing.',ARRAY['system-design'],0.58)
ON CONFLICT (slug) DO NOTHING;
