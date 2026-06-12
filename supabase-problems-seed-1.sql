-- SEED 1: Arrays, Two Pointers, Sliding Window (55 problems)
-- Run after supabase-problems-schema.sql

INSERT INTO problems (title, slug, difficulty, category, sub_category, tags, statement, constraints, examples, test_cases, editorial, hint, languages, acceptance_rate) VALUES

-- ── 1 ────────────────────────────────────────────────────────────────────────
('Two Sum',
 'two-sum', 'Easy', 'DSA', 'Arrays',
 ARRAY['arrays','hash-map'],
$$## Zomato Delivery Pairing

You work on Zomato's dispatch system. Given an array `times` of estimated delivery durations (in minutes) and an integer `target`, return the **indices** of the two deliveries whose durations sum to `target`.

Exactly one solution exists. You cannot use the same delivery twice.$$,
$$- 2 ≤ times.length ≤ 10⁴
- -10⁹ ≤ times[i] ≤ 10⁹
- Exactly one valid answer exists.$$,
'[{"input":"times = [25,42,18,7], target = 43","output":"[0, 2]","explanation":"25 + 18 = 43"},{"input":"times = [30,30], target = 60","output":"[0, 1]","explanation":"30 + 30 = 60"}]'::jsonb,
'[{"input":"25 42 18 7\n43","expected_output":"0 2","is_hidden":false},{"input":"30 30\n60","expected_output":"0 1","is_hidden":false},{"input":"3 2 4\n6","expected_output":"1 2","is_hidden":false},{"input":"2 7 11 15\n9","expected_output":"0 1","is_hidden":true},{"input":"1 5 3\n4","expected_output":"0 2","is_hidden":true},{"input":"5 75 25 10 15\n100","expected_output":"1 2","is_hidden":true}]'::jsonb,
$$## Hash Map — O(n) time, O(n) space

For each element, check if its complement (`target - x`) is already in the map.

```python
def twoSum(times, target):
    seen = {}
    for i, t in enumerate(times):
        if target - t in seen:
            return [seen[target - t], i]
        seen[t] = i
```

**Why not O(n²)?** Brute force checks all pairs; hash map lookup is O(1).$$,
'Store each value and its index as you iterate. What do you need to find alongside the current element?',
ARRAY['python','java','javascript','go','cpp'], 72.4),

-- ── 2 ────────────────────────────────────────────────────────────────────────
('Contains Duplicate',
 'contains-duplicate', 'Easy', 'DSA', 'Arrays',
 ARRAY['arrays','hash-set'],
$$## Swiggy Duplicate Order Check

Swiggy's fraud team needs to flag batches where the same order ID appears more than once. Given an integer array `orders`, return `true` if any order ID appears at least twice, `false` if every element is distinct.$$,
$$- 1 ≤ orders.length ≤ 10⁵
- -10⁹ ≤ orders[i] ≤ 10⁹$$,
'[{"input":"orders = [1,2,3,1]","output":"true","explanation":"Order 1 appears at index 0 and index 3."},{"input":"orders = [1,2,3,4]","output":"false","explanation":"All order IDs are distinct."}]'::jsonb,
'[{"input":"1 2 3 1","expected_output":"true","is_hidden":false},{"input":"1 2 3 4","expected_output":"false","is_hidden":false},{"input":"1 1 1 3 3 4 3 2 4 2","expected_output":"true","is_hidden":false},{"input":"7","expected_output":"false","is_hidden":true},{"input":"10 20 30 40 50 60 70 80 90 10","expected_output":"true","is_hidden":true}]'::jsonb,
$$## Hash Set — O(n) time, O(n) space

```python
def containsDuplicate(orders):
    return len(orders) != len(set(orders))

# Alternatively, for early exit:
def containsDuplicate(orders):
    seen = set()
    for o in orders:
        if o in seen:
            return True
        seen.add(o)
    return False
```$$,
'A set only stores unique values. Compare its size to the array length.',
ARRAY['python','java','javascript','go','cpp'], 61.3),

-- ── 3 ────────────────────────────────────────────────────────────────────────
('Valid Anagram',
 'valid-anagram', 'Easy', 'DSA', 'Arrays',
 ARRAY['strings','hash-map','sorting'],
$$## Menu Name Validator — Zomato

Zomato allows restaurants to list dish aliases. Two dish names are considered aliases if one is an anagram of the other (same characters, possibly different order). Given strings `s` and `t`, return `true` if `t` is an anagram of `s`.$$,
$$- 1 ≤ s.length, t.length ≤ 5 × 10⁴
- s and t consist of lowercase English letters.$$,
'[{"input":"s = \"listen\", t = \"silent\"","output":"true","explanation":"Both contain l,i,s,t,e,n exactly once."},{"input":"s = \"rat\", t = \"car\"","output":"false","explanation":"r,a,t vs c,a,r — different characters."}]'::jsonb,
'[{"input":"listen\nsilent","expected_output":"true","is_hidden":false},{"input":"rat\ncar","expected_output":"false","is_hidden":false},{"input":"anagram\nnagaram","expected_output":"true","is_hidden":false},{"input":"a\nab","expected_output":"false","is_hidden":true},{"input":"aab\nbaa","expected_output":"true","is_hidden":true}]'::jsonb,
$$## Frequency Count — O(n) time

```python
from collections import Counter

def isAnagram(s, t):
    return Counter(s) == Counter(t)

# Without Counter:
def isAnagram(s, t):
    if len(s) != len(t): return False
    count = [0] * 26
    for a, b in zip(s, t):
        count[ord(a)-97] += 1
        count[ord(b)-97] -= 1
    return all(c == 0 for c in count)
```$$,
'Count character frequencies in both strings and compare.',
ARRAY['python','java','javascript','go','cpp'], 63.1),

-- ── 4 ────────────────────────────────────────────────────────────────────────
('Group Anagrams',
 'group-anagrams', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','hash-map','sorting','strings'],
$$## Flipkart Product Grouping

Flipkart''s search team wants to group product keywords that are anagrams of each other so they resolve to the same search results. Given an array of strings `words`, group all anagrams together and return the groups in any order.$$,
$$- 1 ≤ words.length ≤ 10⁴
- 0 ≤ words[i].length ≤ 100
- words[i] consists of lowercase English letters.$$,
'[{"input":"words = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]","output":"[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]","explanation":"eat/tea/ate are anagrams; tan/nat are anagrams; bat stands alone."},{"input":"words = [\"\"]","output":"[[\"\"]]","explanation":"Single empty string."}]'::jsonb,
'[{"input":"eat tea tan ate nat bat","expected_output":"[[\"ate\",\"eat\",\"tea\"],[\"nat\",\"tan\"],[\"bat\"]]","is_hidden":false},{"input":"","expected_output":"[[\"\"]]","is_hidden":false},{"input":"a","expected_output":"[[\"a\"]]","is_hidden":false},{"input":"abc bca cab xyz zyx","expected_output":"[[\"abc\",\"bca\",\"cab\"],[\"xyz\",\"zyx\"]]","is_hidden":true},{"input":"ab ba a b","expected_output":"[[\"ab\",\"ba\"],[\"a\"],[\"b\"]]","is_hidden":true}]'::jsonb,
$$## Sorted Key Hash Map — O(n·k·log k)

Use the sorted version of each word as the hash map key.

```python
from collections import defaultdict

def groupAnagrams(words):
    groups = defaultdict(list)
    for w in words:
        key = tuple(sorted(w))
        groups[key].append(w)
    return list(groups.values())
```

**Alternative key:** 26-length frequency array (O(n·k) but more complex to hash).$$,
'What property is identical for all anagrams of each other? Use it as a dictionary key.',
ARRAY['python','java','javascript','go','cpp'], 67.2),

-- ── 5 ────────────────────────────────────────────────────────────────────────
('Top K Frequent Elements',
 'top-k-frequent-elements', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','hash-map','heap','bucket-sort'],
$$## Trending Products on Meesho

Meesho tracks which products users view most. Given an integer array `views` (product IDs) and an integer `k`, return the `k` most frequently viewed product IDs. You may return the answer in any order.$$,
$$- 1 ≤ views.length ≤ 10⁵
- -10⁴ ≤ views[i] ≤ 10⁴
- k is in the range [1, number of unique elements]
- Answer is guaranteed to be unique.$$,
'[{"input":"views = [1,1,1,2,2,3], k = 2","output":"[1, 2]","explanation":"1 appears 3 times, 2 appears twice — they are the top 2."},{"input":"views = [1], k = 1","output":"[1]","explanation":"Only one element."}]'::jsonb,
'[{"input":"1 1 1 2 2 3\n2","expected_output":"1 2","is_hidden":false},{"input":"1\n1","expected_output":"1","is_hidden":false},{"input":"4 4 4 6 6 7 7 7 7\n2","expected_output":"7 4","is_hidden":false},{"input":"1 2 3 4 5 6 1 2 3 1\n3","expected_output":"1 2 3","is_hidden":true},{"input":"5 5 4 4 4 3 2 1\n1","expected_output":"4","is_hidden":true}]'::jsonb,
$$## Bucket Sort — O(n) time

Frequency count, then bucket by frequency (index = frequency count).

```python
from collections import Counter

def topKFrequent(views, k):
    freq = Counter(views)
    buckets = [[] for _ in range(len(views) + 1)]
    for val, cnt in freq.items():
        buckets[cnt].append(val)
    result = []
    for i in range(len(buckets)-1, 0, -1):
        result.extend(buckets[i])
        if len(result) >= k:
            return result[:k]
```

**Heap alternative:** `heapq.nlargest(k, freq, key=freq.get)` — O(n log k).$$,
'Count frequencies first, then find the top-k. Can you avoid sorting the entire frequency map?',
ARRAY['python','java','javascript','go','cpp'], 65.8),

-- ── 6 ────────────────────────────────────────────────────────────────────────
('Product of Array Except Self',
 'product-except-self', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','prefix-product'],
$$## Inventory Discount Calculator — Flipkart

Flipkart has an array of product weights `weights`. For each product, compute the product of all other products'' weights (excluding itself). Return the result array.

**Constraint:** Do not use division. Solve in O(n) time with O(1) extra space (output array does not count).$$,
$$- 2 ≤ weights.length ≤ 10⁵
- -30 ≤ weights[i] ≤ 30
- The product of any prefix or suffix fits in a 32-bit integer.$$,
'[{"input":"weights = [1,2,3,4]","output":"[24,12,8,6]","explanation":"24=2×3×4, 12=1×3×4, 8=1×2×4, 6=1×2×3"},{"input":"weights = [-1,1,0,-3,3]","output":"[0,0,9,0,0]","explanation":"Zero element makes most products 0."}]'::jsonb,
'[{"input":"1 2 3 4","expected_output":"24 12 8 6","is_hidden":false},{"input":"-1 1 0 -3 3","expected_output":"0 0 9 0 0","is_hidden":false},{"input":"2 3","expected_output":"3 2","is_hidden":false},{"input":"1 2 3 4 5","expected_output":"120 60 40 30 24","is_hidden":true},{"input":"0 0","expected_output":"0 0","is_hidden":true}]'::jsonb,
$$## Prefix × Suffix Pass — O(n) no division

```python
def productExceptSelf(weights):
    n = len(weights)
    out = [1] * n
    prefix = 1
    for i in range(n):
        out[i] = prefix
        prefix *= weights[i]
    suffix = 1
    for i in range(n-1, -1, -1):
        out[i] *= suffix
        suffix *= weights[i]
    return out
```

First pass: store prefix products. Second pass: multiply by suffix products.$$,
'Build a prefix product array left-to-right, then multiply by suffix products right-to-left.',
ARRAY['python','java','javascript','go','cpp'], 65.2),

-- ── 7 ────────────────────────────────────────────────────────────────────────
('Maximum Subarray',
 'maximum-subarray', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','dynamic-programming','kadane'],
$$## CRED Cashback Streak

CRED tracks daily cashback deltas for a user (positive = earned, negative = spent). Given array `deltas`, find the contiguous subarray with the largest sum and return that sum. At least one element must be chosen.$$,
$$- 1 ≤ deltas.length ≤ 10⁵
- -10⁴ ≤ deltas[i] ≤ 10⁴$$,
'[{"input":"deltas = [-2,1,-3,4,-1,2,1,-5,4]","output":"6","explanation":"Subarray [4,-1,2,1] has the largest sum = 6."},{"input":"deltas = [1]","output":"1","explanation":"Single element."},{"input":"deltas = [5,4,-1,7,8]","output":"23","explanation":"Entire array."}]'::jsonb,
'[{"input":"-2 1 -3 4 -1 2 1 -5 4","expected_output":"6","is_hidden":false},{"input":"1","expected_output":"1","is_hidden":false},{"input":"5 4 -1 7 8","expected_output":"23","is_hidden":false},{"input":"-1","expected_output":"-1","is_hidden":true},{"input":"-2 -3 4 -1 -2 1 5 -3","expected_output":"7","is_hidden":true},{"input":"1 2 -1 2 3 -4 5","expected_output":"13","is_hidden":true}]'::jsonb,
$$## Kadane''s Algorithm — O(n)

```python
def maxSubArray(deltas):
    max_sum = cur = deltas[0]
    for x in deltas[1:]:
        cur = max(x, cur + x)
        max_sum = max(max_sum, cur)
    return max_sum
```

**Intuition:** At each position, decide whether to extend the existing subarray or start fresh from the current element.$$,
'At each step, should you extend the running sum or restart from the current element?',
ARRAY['python','java','javascript','go','cpp'], 50.4),

-- ── 8 ────────────────────────────────────────────────────────────────────────
('Best Time to Buy and Sell Stock',
 'best-time-to-buy-sell-stock', 'Easy', 'DSA', 'Arrays',
 ARRAY['arrays','greedy'],
$$## Zerodha Stock Profit

You are given `prices[i]`, the price of a stock on day `i`. You may buy on one day and sell on a later day. Return the **maximum profit** you can achieve. If no profit is possible, return `0`.$$,
$$- 1 ≤ prices.length ≤ 10⁵
- 0 ≤ prices[i] ≤ 10⁴$$,
'[{"input":"prices = [7,1,5,3,6,4]","output":"5","explanation":"Buy at 1 (day 2), sell at 6 (day 5). Profit = 5."},{"input":"prices = [7,6,4,3,1]","output":"0","explanation":"Prices only decrease — no profit possible."}]'::jsonb,
'[{"input":"7 1 5 3 6 4","expected_output":"5","is_hidden":false},{"input":"7 6 4 3 1","expected_output":"0","is_hidden":false},{"input":"1 2","expected_output":"1","is_hidden":false},{"input":"3 3 5 0 0 3 1 4","expected_output":"4","is_hidden":true},{"input":"1","expected_output":"0","is_hidden":true},{"input":"2 4 1 7","expected_output":"6","is_hidden":true}]'::jsonb,
$$## One Pass — O(n) greedy

Track the minimum price seen so far; update max profit at each step.

```python
def maxProfit(prices):
    min_price = float('inf')
    max_profit = 0
    for p in prices:
        min_price = min(min_price, p)
        max_profit = max(max_profit, p - min_price)
    return max_profit
```$$,
'Track the cheapest price seen so far. At each day, what is the profit if you sell today?',
ARRAY['python','java','javascript','go','cpp'], 54.3),

-- ── 9 ────────────────────────────────────────────────────────────────────────
('Majority Element',
 'majority-element', 'Easy', 'DSA', 'Arrays',
 ARRAY['arrays','hash-map','boyer-moore'],
$$## PhonePe Transaction Majority

Given an array `txn` of transaction category codes, find the element that appears more than ⌊n/2⌋ times. It is guaranteed to always exist.$$,
$$- 1 ≤ txn.length ≤ 5 × 10⁴
- -10⁹ ≤ txn[i] ≤ 10⁹$$,
'[{"input":"txn = [3,2,3]","output":"3","explanation":"3 appears 2 times, n/2 = 1.5."},{"input":"txn = [2,2,1,1,1,2,2]","output":"2","explanation":"2 appears 4 times out of 7."}]'::jsonb,
'[{"input":"3 2 3","expected_output":"3","is_hidden":false},{"input":"2 2 1 1 1 2 2","expected_output":"2","is_hidden":false},{"input":"1","expected_output":"1","is_hidden":false},{"input":"6 5 5","expected_output":"5","is_hidden":true},{"input":"1 1 2 1 2 1 2 1","expected_output":"1","is_hidden":true}]'::jsonb,
$$## Boyer-Moore Voting — O(n) time, O(1) space

```python
def majorityElement(txn):
    candidate, count = None, 0
    for x in txn:
        if count == 0:
            candidate = x
        count += 1 if x == candidate else -1
    return candidate
```

**Intuition:** The majority element ''survives'' all cancellations because it appears more than all others combined.$$,
'Can you find the majority without extra space? Think about cancelling opposite votes.',
ARRAY['python','java','javascript','go','cpp'], 64.3),

-- ── 10 ───────────────────────────────────────────────────────────────────────
('Longest Consecutive Sequence',
 'longest-consecutive-sequence', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','hash-set'],
$$## Urban Company Booking Streak

Urban Company logs booking IDs. Find the length of the longest sequence of consecutive integers in the array `ids`. Algorithm must run in O(n) time.$$,
$$- 0 ≤ ids.length ≤ 10⁵
- -10⁹ ≤ ids[i] ≤ 10⁹$$,
'[{"input":"ids = [100,4,200,1,3,2]","output":"4","explanation":"Sequence 1,2,3,4 has length 4."},{"input":"ids = [0,3,7,2,5,8,4,6,0,1]","output":"9","explanation":"0 through 8 = length 9."}]'::jsonb,
'[{"input":"100 4 200 1 3 2","expected_output":"4","is_hidden":false},{"input":"0 3 7 2 5 8 4 6 0 1","expected_output":"9","is_hidden":false},{"input":"","expected_output":"0","is_hidden":false},{"input":"1","expected_output":"1","is_hidden":true},{"input":"9 1 4 7 3 2","expected_output":"4","is_hidden":true}]'::jsonb,
$$## Hash Set — O(n)

Only start counting from sequence beginnings (numbers with no predecessor).

```python
def longestConsecutive(ids):
    s = set(ids)
    best = 0
    for x in s:
        if x - 1 not in s:          # start of a sequence
            length = 1
            while x + length in s:
                length += 1
            best = max(best, length)
    return best
```$$,
'A sequence can only start at a number with no left neighbour. Check that condition before counting.',
ARRAY['python','java','javascript','go','cpp'], 49.1),

-- ── 11 ───────────────────────────────────────────────────────────────────────
('Move Zeroes',
 'move-zeroes', 'Easy', 'DSA', 'Arrays',
 ARRAY['arrays','two-pointers'],
$$## Blinkit Inventory Cleanup

Blinkit's stock array has zeroes representing empty slots. Given `stock`, move all zeroes to the end while preserving the relative order of non-zero items. Modify the array in place.$$,
$$- 1 ≤ stock.length ≤ 10⁴
- -2³¹ ≤ stock[i] ≤ 2³¹ − 1$$,
'[{"input":"stock = [0,1,0,3,12]","output":"[1,3,12,0,0]","explanation":"Non-zeroes stay in order; zeroes go to end."},{"input":"stock = [0]","output":"[0]","explanation":"Single zero."}]'::jsonb,
'[{"input":"0 1 0 3 12","expected_output":"1 3 12 0 0","is_hidden":false},{"input":"0","expected_output":"0","is_hidden":false},{"input":"1","expected_output":"1","is_hidden":false},{"input":"0 0 0 1","expected_output":"1 0 0 0","is_hidden":true},{"input":"4 2 4 0 0 3 0 5 1 0","expected_output":"4 2 4 3 5 1 0 0 0 0","is_hidden":true}]'::jsonb,
$$## Two Pointer — O(n) in place

```python
def moveZeroes(stock):
    write = 0
    for read in range(len(stock)):
        if stock[read] != 0:
            stock[write] = stock[read]
            write += 1
    while write < len(stock):
        stock[write] = 0
        write += 1
```$$,
'Use a slow pointer to track where the next non-zero should go.',
ARRAY['python','java','javascript','go','cpp'], 61.6),

-- ── 12 ───────────────────────────────────────────────────────────────────────
('Rotate Array',
 'rotate-array', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','two-pointers'],
$$## Rapido Shift Rotation

Rapido rotates driver shift schedules by `k` positions. Given array `shifts` and integer `k`, rotate the array to the right by `k` steps in place.$$,
$$- 1 ≤ shifts.length ≤ 10⁵
- -2³¹ ≤ shifts[i] ≤ 2³¹ − 1
- 0 ≤ k ≤ 10⁵$$,
'[{"input":"shifts = [1,2,3,4,5,6,7], k = 3","output":"[5,6,7,1,2,3,4]","explanation":"Rotate right 3 times."},{"input":"shifts = [-1,-100,3,99], k = 2","output":"[3,99,-1,-100]"}]'::jsonb,
'[{"input":"1 2 3 4 5 6 7\n3","expected_output":"5 6 7 1 2 3 4","is_hidden":false},{"input":"-1 -100 3 99\n2","expected_output":"3 99 -1 -100","is_hidden":false},{"input":"1 2\n3","expected_output":"2 1","is_hidden":false},{"input":"1 2 3\n0","expected_output":"1 2 3","is_hidden":true},{"input":"1 2 3 4 5\n7","expected_output":"4 5 1 2 3","is_hidden":true}]'::jsonb,
$$## Reverse Trick — O(n) time, O(1) space

```python
def rotate(shifts, k):
    n = len(shifts)
    k %= n
    shifts.reverse()
    shifts[:k] = shifts[:k][::-1]
    shifts[k:] = shifts[k:][::-1]
```

Reverse all → reverse first k → reverse remaining. Elegant and no extra array.$$,
'Reversing the whole array and then two subarrays achieves the rotation without extra space.',
ARRAY['python','java','javascript','go','cpp'], 39.7),

-- ── 13 ───────────────────────────────────────────────────────────────────────
('Jump Game',
 'jump-game', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','greedy'],
$$## OYO Room Hop

OYO has hotel rooms labeled by index. You start at room 0. `jumps[i]` is the maximum number of rooms you can jump forward from room `i`. Return `true` if you can reach the last room, `false` otherwise.$$,
$$- 1 ≤ jumps.length ≤ 10⁴
- 0 ≤ jumps[i] ≤ 10⁵$$,
'[{"input":"jumps = [2,3,1,1,4]","output":"true","explanation":"Jump 1 from index 0 to 1, then 3 to reach the last."},{"input":"jumps = [3,2,1,0,4]","output":"false","explanation":"Always land on index 3 which has jump 0."}]'::jsonb,
'[{"input":"2 3 1 1 4","expected_output":"true","is_hidden":false},{"input":"3 2 1 0 4","expected_output":"false","is_hidden":false},{"input":"0","expected_output":"true","is_hidden":false},{"input":"1 0 0","expected_output":"false","is_hidden":true},{"input":"2 0 0","expected_output":"true","is_hidden":true}]'::jsonb,
$$## Greedy — track max reachable index

```python
def canJump(jumps):
    max_reach = 0
    for i, j in enumerate(jumps):
        if i > max_reach:
            return False
        max_reach = max(max_reach, i + j)
    return True
```$$,
'Track the farthest index reachable so far. If current index exceeds it, you are stuck.',
ARRAY['python','java','javascript','go','cpp'], 38.4),

-- ── 14 ───────────────────────────────────────────────────────────────────────
('Jump Game II',
 'jump-game-ii', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','greedy','bfs'],
$$## OYO Room Hop — Minimum Jumps

Same hotel setup as before — you are guaranteed to reach the last room. Return the **minimum number of jumps** needed to reach the last room.$$,
$$- 1 ≤ jumps.length ≤ 10⁴
- 0 ≤ jumps[i] ≤ 1000
- You are guaranteed to reach the last room.$$,
'[{"input":"jumps = [2,3,1,1,4]","output":"2","explanation":"Jump from 0→1 (jump 1), then 1→4 (jump 3). 2 jumps."},{"input":"jumps = [2,3,0,1,4]","output":"2"}]'::jsonb,
'[{"input":"2 3 1 1 4","expected_output":"2","is_hidden":false},{"input":"2 3 0 1 4","expected_output":"2","is_hidden":false},{"input":"1","expected_output":"0","is_hidden":false},{"input":"1 1 1 1","expected_output":"3","is_hidden":true},{"input":"5 9 3 2 1 0 2 3 3 1 0","expected_output":"3","is_hidden":true}]'::jsonb,
$$## Greedy BFS — O(n)

Think in ''jump levels''. Track current level boundary and farthest reach.

```python
def jump(jumps):
    jumps_count = cur_end = cur_far = 0
    for i in range(len(jumps)-1):
        cur_far = max(cur_far, i + jumps[i])
        if i == cur_end:
            jumps_count += 1
            cur_end = cur_far
    return jumps_count
```$$,
'Think of BFS levels. When you finish the current level, count one jump and set the boundary to the farthest reachable.',
ARRAY['python','java','javascript','go','cpp'], 39.5),

-- ── 15 ───────────────────────────────────────────────────────────────────────
('Maximum Product Subarray',
 'maximum-product-subarray', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','dynamic-programming'],
$$## CRED Reward Multiplier

CRED assigns reward multipliers. Given integer array `multipliers`, find the contiguous subarray with the largest product and return that product.$$,
$$- 1 ≤ multipliers.length ≤ 2 × 10⁴
- -10 ≤ multipliers[i] ≤ 10$$,
'[{"input":"multipliers = [2,3,-2,4]","output":"6","explanation":"[2,3] has product 6."},{"input":"multipliers = [-2,0,-1]","output":"0","explanation":"[0] has the largest product."}]'::jsonb,
'[{"input":"2 3 -2 4","expected_output":"6","is_hidden":false},{"input":"-2 0 -1","expected_output":"0","is_hidden":false},{"input":"-2","expected_output":"-2","is_hidden":false},{"input":"-2 3 -4","expected_output":"24","is_hidden":true},{"input":"2 -5 -2 -4 3","expected_output":"24","is_hidden":true}]'::jsonb,
$$## Track Min and Max — O(n)

A negative × negative = positive. Track both max and min at each step.

```python
def maxProduct(nums):
    res = max_p = min_p = nums[0]
    for x in nums[1:]:
        candidates = (x, max_p * x, min_p * x)
        max_p, min_p = max(candidates), min(candidates)
        res = max(res, max_p)
    return res
```$$,
'Track both the current max and min product — negatives can flip them.',
ARRAY['python','java','javascript','go','cpp'], 34.5),

-- ── 16 ───────────────────────────────────────────────────────────────────────
('Set Matrix Zeroes',
 'set-matrix-zeroes', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','matrix'],
$$## Swiggy Grid Blackout

Swiggy''s delivery grid is an m×n matrix. If a cell contains 0 (zone outage), set its entire row and column to 0 in place. Use O(1) extra space.$$,
$$- m, n ≤ 200
- -2³¹ ≤ matrix[i][j] ≤ 2³¹ − 1$$,
'[{"input":"matrix = [[1,1,1],[1,0,1],[1,1,1]]","output":"[[1,0,1],[0,0,0],[1,0,1]]"},{"input":"matrix = [[0,1,2,0],[3,4,5,2],[1,3,1,5]]","output":"[[0,0,0,0],[0,4,5,0],[0,3,1,0]]"}]'::jsonb,
'[{"input":"[[1,1,1],[1,0,1],[1,1,1]]","expected_output":"[[1,0,1],[0,0,0],[1,0,1]]","is_hidden":false},{"input":"[[0,1,2,0],[3,4,5,2],[1,3,1,5]]","expected_output":"[[0,0,0,0],[0,4,5,0],[0,3,1,0]]","is_hidden":false},{"input":"[[1]]","expected_output":"[[1]]","is_hidden":true},{"input":"[[0]]","expected_output":"[[0]]","is_hidden":true}]'::jsonb,
$$## Use First Row/Col as Flags — O(1) space

```python
def setZeroes(matrix):
    R, C = len(matrix), len(matrix[0])
    first_row_zero = any(matrix[0][j] == 0 for j in range(C))
    first_col_zero = any(matrix[i][0] == 0 for i in range(R))
    for i in range(1, R):
        for j in range(1, C):
            if matrix[i][j] == 0:
                matrix[i][0] = matrix[0][j] = 0
    for i in range(1, R):
        for j in range(1, C):
            if matrix[i][0] == 0 or matrix[0][j] == 0:
                matrix[i][j] = 0
    if first_row_zero:
        for j in range(C): matrix[0][j] = 0
    if first_col_zero:
        for i in range(R): matrix[i][0] = 0
```$$,
'Can you use the first row and first column of the matrix itself as markers instead of extra space?',
ARRAY['python','java','javascript','go','cpp'], 52.1),

-- ── 17 ───────────────────────────────────────────────────────────────────────
('Spiral Matrix',
 'spiral-matrix', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','matrix','simulation'],
$$## Zepto Warehouse Scan

Zepto scans its warehouse grid in a clockwise spiral order for inventory. Given an m×n matrix `grid`, return all elements in spiral order.$$,
$$- m, n ≤ 10
- -100 ≤ grid[i][j] ≤ 100$$,
'[{"input":"grid = [[1,2,3],[4,5,6],[7,8,9]]","output":"[1,2,3,6,9,8,7,4,5]"},{"input":"grid = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]","output":"[1,2,3,4,8,12,11,10,9,5,6,7]"}]'::jsonb,
'[{"input":"[[1,2,3],[4,5,6],[7,8,9]]","expected_output":"1 2 3 6 9 8 7 4 5","is_hidden":false},{"input":"[[1,2,3,4],[5,6,7,8],[9,10,11,12]]","expected_output":"1 2 3 4 8 12 11 10 9 5 6 7","is_hidden":false},{"input":"[[1]]","expected_output":"1","is_hidden":true},{"input":"[[1,2],[3,4]]","expected_output":"1 2 4 3","is_hidden":true}]'::jsonb,
$$## Layer Peeling — O(m·n)

```python
def spiralOrder(grid):
    res = []
    top, bot, left, right = 0, len(grid)-1, 0, len(grid[0])-1
    while top <= bot and left <= right:
        for j in range(left, right+1): res.append(grid[top][j])
        top += 1
        for i in range(top, bot+1): res.append(grid[i][right])
        right -= 1
        if top <= bot:
            for j in range(right, left-1, -1): res.append(grid[bot][j])
            bot -= 1
        if left <= right:
            for i in range(bot, top-1, -1): res.append(grid[i][left])
            left += 1
    return res
```$$,
'Think in layers. Peel the outermost ring, then recurse inward.',
ARRAY['python','java','javascript','go','cpp'], 47.8),

-- ── 18 ───────────────────────────────────────────────────────────────────────
('Search a 2D Matrix',
 'search-2d-matrix', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','binary-search','matrix'],
$$## MakeMyTrip Seat Finder

MakeMyTrip stores seat prices in an m×n matrix where each row is sorted left to right, and the first element of each row is greater than the last of the previous row. Given integer `target`, return `true` if it exists.$$,
$$- m, n ≤ 100
- -10⁴ ≤ matrix[i][j] ≤ 10⁴$$,
'[{"input":"matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3","output":"true"},{"input":"matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13","output":"false"}]'::jsonb,
'[{"input":"[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n3","expected_output":"true","is_hidden":false},{"input":"[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n13","expected_output":"false","is_hidden":false},{"input":"[[1]]\n1","expected_output":"true","is_hidden":true},{"input":"[[1]]\n2","expected_output":"false","is_hidden":true}]'::jsonb,
$$## Treat as 1D Sorted Array — O(log(m·n))

```python
def searchMatrix(matrix, target):
    m, n = len(matrix), len(matrix[0])
    lo, hi = 0, m*n - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        val = matrix[mid // n][mid % n]
        if val == target: return True
        elif val < target: lo = mid + 1
        else: hi = mid - 1
    return False
```$$,
'The whole matrix, read row by row, forms a sorted array. Apply binary search on virtual index.',
ARRAY['python','java','javascript','go','cpp'], 49.5),

-- ── 19 ───────────────────────────────────────────────────────────────────────
('Sort Colors',
 'sort-colors', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','two-pointers','sorting'],
$$## Nykaa Product Tier Sort

Nykaa classifies products as Basic (0), Premium (1), or Luxury (2). Given array `tiers`, sort them in place so all 0s come first, then 1s, then 2s. One pass, O(1) space.$$,
$$- 1 ≤ tiers.length ≤ 300
- tiers[i] ∈ {0, 1, 2}$$,
'[{"input":"tiers = [2,0,2,1,1,0]","output":"[0,0,1,1,2,2]"},{"input":"tiers = [2,0,1]","output":"[0,1,2]"}]'::jsonb,
'[{"input":"2 0 2 1 1 0","expected_output":"0 0 1 1 2 2","is_hidden":false},{"input":"2 0 1","expected_output":"0 1 2","is_hidden":false},{"input":"0","expected_output":"0","is_hidden":true},{"input":"1 2 0 1 2 0","expected_output":"0 0 1 1 2 2","is_hidden":true}]'::jsonb,
$$## Dutch National Flag — O(n) one pass

```python
def sortColors(tiers):
    lo, mid, hi = 0, 0, len(tiers)-1
    while mid <= hi:
        if tiers[mid] == 0:
            tiers[lo], tiers[mid] = tiers[mid], tiers[lo]
            lo += 1; mid += 1
        elif tiers[mid] == 1:
            mid += 1
        else:
            tiers[mid], tiers[hi] = tiers[hi], tiers[mid]
            hi -= 1
```$$,
'Three-way partition: lo pointer for 0s, hi pointer for 2s, mid pointer walks forward.',
ARRAY['python','java','javascript','go','cpp'], 57.4),

-- ── 20 ───────────────────────────────────────────────────────────────────────
('Pascal''s Triangle',
 'pascals-triangle', 'Easy', 'DSA', 'Arrays',
 ARRAY['arrays','dynamic-programming'],
$$## Byju''s Binomial Coefficients

Byju''s quiz module displays Pascal''s triangle. Given integer `numRows`, return the first `numRows` rows of Pascal''s triangle.$$,
$$- 1 ≤ numRows ≤ 30$$,
'[{"input":"numRows = 5","output":"[[1],[1,1],[1,2,1],[1,3,3,1],[1,4,6,4,1]]"},{"input":"numRows = 1","output":"[[1]]"}]'::jsonb,
'[{"input":"5","expected_output":"[[1],[1,1],[1,2,1],[1,3,3,1],[1,4,6,4,1]]","is_hidden":false},{"input":"1","expected_output":"[[1]]","is_hidden":false},{"input":"3","expected_output":"[[1],[1,1],[1,2,1]]","is_hidden":true}]'::jsonb,
$$## Build Row by Row — O(n²)

```python
def generate(numRows):
    tri = [[1]]
    for _ in range(1, numRows):
        prev = tri[-1]
        row = [1] + [prev[j]+prev[j+1] for j in range(len(prev)-1)] + [1]
        tri.append(row)
    return tri
```$$,
'Each row starts and ends with 1. Interior values are sums of two adjacent values from the previous row.',
ARRAY['python','java','javascript','go','cpp'], 67.7),

-- ── 21 ───────────────────────────────────────────────────────────────────────
('Plus One',
 'plus-one', 'Easy', 'DSA', 'Arrays',
 ARRAY['arrays','math'],
$$## Paytm Account Increment

Paytm stores a large integer as digit array `digits`. Increment the integer by one and return the resulting digit array. The integer does not contain leading zeros.$$,
$$- 1 ≤ digits.length ≤ 100
- 0 ≤ digits[i] ≤ 9
- No leading zeros.$$,
'[{"input":"digits = [1,2,3]","output":"[1,2,4]","explanation":"123 + 1 = 124"},{"input":"digits = [9]","output":"[1,0]","explanation":"9 + 1 = 10"}]'::jsonb,
'[{"input":"1 2 3","expected_output":"1 2 4","is_hidden":false},{"input":"9","expected_output":"1 0","is_hidden":false},{"input":"9 9 9","expected_output":"1 0 0 0","is_hidden":false},{"input":"4 3 2 1","expected_output":"4 3 2 2","is_hidden":true}]'::jsonb,
$$## Carry Propagation — O(n)

```python
def plusOne(digits):
    for i in range(len(digits)-1, -1, -1):
        if digits[i] < 9:
            digits[i] += 1
            return digits
        digits[i] = 0
    return [1] + digits
```$$,
'Work right to left. If a digit is 9, it becomes 0 and carry moves left. If all 9s, prepend 1.',
ARRAY['python','java','javascript','go','cpp'], 69.3),

-- ── 22 ───────────────────────────────────────────────────────────────────────
('Merge Sorted Array',
 'merge-sorted-array', 'Easy', 'DSA', 'Arrays',
 ARRAY['arrays','two-pointers'],
$$## Flipkart Order Merge

Flipkart merges two sorted order queues. Given sorted arrays `nums1` (length m+n, last n slots zeroed) and `nums2` (length n), merge `nums2` into `nums1` in place in sorted order.$$,
$$- m, n ≥ 0
- -10⁹ ≤ nums1[i], nums2[j] ≤ 10⁹$$,
'[{"input":"nums1 = [1,2,3,0,0,0], m=3, nums2=[2,5,6]","output":"[1,2,2,3,5,6]"},{"input":"nums1=[1], m=1, nums2=[]","output":"[1]"}]'::jsonb,
'[{"input":"1 2 3 0 0 0\n3\n2 5 6","expected_output":"1 2 2 3 5 6","is_hidden":false},{"input":"1\n1\n","expected_output":"1","is_hidden":false},{"input":"0\n0\n1","expected_output":"1","is_hidden":false},{"input":"1 2 4 0 0 0\n3\n3 5 6","expected_output":"1 2 3 4 5 6","is_hidden":true}]'::jsonb,
$$## Merge from the End — O(m+n) in place

```python
def merge(nums1, m, nums2, n):
    i, j, k = m-1, n-1, m+n-1
    while j >= 0:
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[k] = nums1[i]; i -= 1
        else:
            nums1[k] = nums2[j]; j -= 1
        k -= 1
```

Start filling from the end to avoid overwriting unprocessed elements.$$,
'Fill from the back of nums1. Compare the largest unplaced elements from each array.',
ARRAY['python','java','javascript','go','cpp'], 46.3),

-- ── 23 ───────────────────────────────────────────────────────────────────────
('Remove Duplicates from Sorted Array',
 'remove-duplicates-sorted', 'Easy', 'DSA', 'Arrays',
 ARRAY['arrays','two-pointers'],
$$## Swiggy Deduplicate Orders

Swiggy''s sorted order log has duplicates. Given sorted array `orders`, remove duplicates in place so each value appears once. Return the count of unique orders. Relative order must be maintained.$$,
$$- 1 ≤ orders.length ≤ 3 × 10⁴
- -100 ≤ orders[i] ≤ 100
- orders is sorted non-decreasing.$$,
'[{"input":"orders = [1,1,2]","output":"2, orders = [1,2,_]","explanation":"Two unique values."},{"input":"orders = [0,0,1,1,1,2,2,3,3,4]","output":"5"}]'::jsonb,
'[{"input":"1 1 2","expected_output":"2","is_hidden":false},{"input":"0 0 1 1 1 2 2 3 3 4","expected_output":"5","is_hidden":false},{"input":"1","expected_output":"1","is_hidden":true},{"input":"1 2 3","expected_output":"3","is_hidden":true}]'::jsonb,
$$## Slow/Fast Pointer — O(n)

```python
def removeDuplicates(orders):
    if not orders: return 0
    k = 1
    for i in range(1, len(orders)):
        if orders[i] != orders[k-1]:
            orders[k] = orders[i]
            k += 1
    return k
```$$,
'Use a slow pointer k for the next write position. Only advance k when a new unique value is found.',
ARRAY['python','java','javascript','go','cpp'], 52.7),

-- ── 24 ───────────────────────────────────────────────────────────────────────
('Find Minimum in Rotated Sorted Array',
 'find-minimum-rotated', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','binary-search'],
$$## Groww Price Discovery

Groww stores daily stock prices in a sorted array that was rotated at an unknown pivot. Given `prices`, find the minimum price. Must run in O(log n).$$,
$$- 1 ≤ prices.length ≤ 5000
- -5000 ≤ prices[i] ≤ 5000
- All integers are unique.$$,
'[{"input":"prices = [3,4,5,1,2]","output":"1"},{"input":"prices = [4,5,6,7,0,1,2]","output":"0"}]'::jsonb,
'[{"input":"3 4 5 1 2","expected_output":"1","is_hidden":false},{"input":"4 5 6 7 0 1 2","expected_output":"0","is_hidden":false},{"input":"11 13 15 17","expected_output":"11","is_hidden":false},{"input":"2 1","expected_output":"1","is_hidden":true}]'::jsonb,
$$## Binary Search on Rotation — O(log n)

```python
def findMin(prices):
    lo, hi = 0, len(prices)-1
    while lo < hi:
        mid = (lo + hi) // 2
        if prices[mid] > prices[hi]:
            lo = mid + 1
        else:
            hi = mid
    return prices[lo]
```$$,
'In a rotated sorted array, the minimum is always in the unsorted half.',
ARRAY['python','java','javascript','go','cpp'], 49.3),

-- ── 25 ───────────────────────────────────────────────────────────────────────
('Search in Rotated Sorted Array',
 'search-rotated-array', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','binary-search'],
$$## Groww Price Search

Same rotated sorted price array from before. Given a `target` price, return its index or -1 if not found. Must run in O(log n).$$,
$$- 1 ≤ prices.length ≤ 5000
- -10⁴ ≤ prices[i] ≤ 10⁴
- All values are unique.$$,
'[{"input":"prices = [4,5,6,7,0,1,2], target = 0","output":"4"},{"input":"prices = [4,5,6,7,0,1,2], target = 3","output":"-1"}]'::jsonb,
'[{"input":"4 5 6 7 0 1 2\n0","expected_output":"4","is_hidden":false},{"input":"4 5 6 7 0 1 2\n3","expected_output":"-1","is_hidden":false},{"input":"1\n0","expected_output":"-1","is_hidden":false},{"input":"1\n1","expected_output":"0","is_hidden":true},{"input":"3 1 2\n1","expected_output":"1","is_hidden":true}]'::jsonb,
$$## Binary Search with Sorted Half Check

```python
def search(prices, target):
    lo, hi = 0, len(prices)-1
    while lo <= hi:
        mid = (lo+hi)//2
        if prices[mid] == target: return mid
        if prices[lo] <= prices[mid]:  # left half sorted
            if prices[lo] <= target < prices[mid]: hi = mid-1
            else: lo = mid+1
        else:  # right half sorted
            if prices[mid] < target <= prices[hi]: lo = mid+1
            else: hi = mid-1
    return -1
```$$,
'Determine which half is sorted, then check if the target falls within it.',
ARRAY['python','java','javascript','go','cpp'], 39.1),

-- ══ TWO POINTERS (26–37) ════════════════════════════════════════════════════

-- ── 26 ───────────────────────────────────────────────────────────────────────
('Valid Palindrome',
 'valid-palindrome', 'Easy', 'DSA', 'Two Pointers',
 ARRAY['strings','two-pointers'],
$$## Username Validation — Sharechat

Sharechat checks if usernames are palindromes for a fun feature. Given string `s`, keep only alphanumeric characters, convert to lowercase, then return `true` if it reads the same forwards and backwards.$$,
$$- 1 ≤ s.length ≤ 2 × 10⁵
- s consists of printable ASCII characters.$$,
'[{"input":"s = \"A man, a plan, a canal: Panama\"","output":"true"},{"input":"s = \"race a car\"","output":"false"}]'::jsonb,
'[{"input":"A man, a plan, a canal: Panama","expected_output":"true","is_hidden":false},{"input":"race a car","expected_output":"false","is_hidden":false},{"input":" ","expected_output":"true","is_hidden":false},{"input":"0P","expected_output":"false","is_hidden":true}]'::jsonb,
$$## Two Pointer — O(n)

```python
def isPalindrome(s):
    lo, hi = 0, len(s)-1
    while lo < hi:
        while lo < hi and not s[lo].isalnum(): lo += 1
        while lo < hi and not s[hi].isalnum(): hi -= 1
        if s[lo].lower() != s[hi].lower(): return False
        lo += 1; hi -= 1
    return True
```$$,
'Skip non-alphanumeric characters from both ends and compare.',
ARRAY['python','java','javascript','go','cpp'], 44.3),

-- ── 27 ───────────────────────────────────────────────────────────────────────
('3Sum',
 'three-sum', 'Medium', 'DSA', 'Two Pointers',
 ARRAY['arrays','two-pointers','sorting'],
$$## PhonePe Three-Transaction Balance

Given integer array `amounts` of transactions, find all unique triplets `[a, b, c]` such that `a + b + c = 0`. The solution must not contain duplicate triplets.$$,
$$- 3 ≤ amounts.length ≤ 3000
- -10⁵ ≤ amounts[i] ≤ 10⁵$$,
'[{"input":"amounts = [-1,0,1,2,-1,-4]","output":"[[-1,-1,2],[-1,0,1]]"},{"input":"amounts = [0,0,0]","output":"[[0,0,0]]"}]'::jsonb,
'[{"input":"-1 0 1 2 -1 -4","expected_output":"[[-1,-1,2],[-1,0,1]]","is_hidden":false},{"input":"0 0 0","expected_output":"[[0,0,0]]","is_hidden":false},{"input":"0 1 1","expected_output":"[]","is_hidden":false},{"input":"-2 0 1 1 2","expected_output":"[[-2,0,2],[-2,1,1]]","is_hidden":true}]'::jsonb,
$$## Sort + Two Pointer — O(n²)

```python
def threeSum(amounts):
    amounts.sort()
    res = []
    for i in range(len(amounts)-2):
        if i > 0 and amounts[i] == amounts[i-1]: continue
        lo, hi = i+1, len(amounts)-1
        while lo < hi:
            s = amounts[i] + amounts[lo] + amounts[hi]
            if s == 0:
                res.append([amounts[i], amounts[lo], amounts[hi]])
                while lo < hi and amounts[lo] == amounts[lo+1]: lo += 1
                while lo < hi and amounts[hi] == amounts[hi-1]: hi -= 1
                lo += 1; hi -= 1
            elif s < 0: lo += 1
            else: hi -= 1
    return res
```$$,
'Fix one element. Use two pointers on the remainder. Skip duplicates carefully.',
ARRAY['python','java','javascript','go','cpp'], 32.7),

-- ── 28 ───────────────────────────────────────────────────────────────────────
('Container With Most Water',
 'container-with-most-water', 'Medium', 'DSA', 'Two Pointers',
 ARRAY['arrays','two-pointers','greedy'],
$$## Solar Panel Water Storage — Tata Solar

Given `heights[i]` representing the height of vertical panels, find two panels that together with the x-axis form a container holding the most water. Return the maximum volume.$$,
$$- 2 ≤ heights.length ≤ 10⁵
- 0 ≤ heights[i] ≤ 10⁴$$,
'[{"input":"heights = [1,8,6,2,5,4,8,3,7]","output":"49","explanation":"Panels at index 1 (h=8) and 8 (h=7): min(8,7)×7 = 49"},{"input":"heights = [1,1]","output":"1"}]'::jsonb,
'[{"input":"1 8 6 2 5 4 8 3 7","expected_output":"49","is_hidden":false},{"input":"1 1","expected_output":"1","is_hidden":false},{"input":"4 3 2 1 4","expected_output":"16","is_hidden":false},{"input":"1 2 1","expected_output":"2","is_hidden":true}]'::jsonb,
$$## Two Pointer — O(n)

```python
def maxArea(heights):
    lo, hi = 0, len(heights)-1
    best = 0
    while lo < hi:
        water = min(heights[lo], heights[hi]) * (hi - lo)
        best = max(best, water)
        if heights[lo] < heights[hi]: lo += 1
        else: hi -= 1
    return best
```

Move the shorter panel inward — moving the taller one can never increase area.$$,
'Move the pointer at the shorter height. Why? Moving the taller one can only decrease the width without a guaranteed height gain.',
ARRAY['python','java','javascript','go','cpp'], 54.5),

-- ── 29 ───────────────────────────────────────────────────────────────────────
('Trapping Rain Water',
 'trapping-rain-water', 'Hard', 'DSA', 'Two Pointers',
 ARRAY['arrays','two-pointers','stack','dynamic-programming'],
$$## Mumbai Drainage Calculation

Mumbai''s civic engineers model rainwater trapping. Given `elevation[i]` representing building heights, calculate how much rainwater can be trapped after heavy rain.$$,
$$- 1 ≤ elevation.length ≤ 2 × 10⁴
- 0 ≤ elevation[i] ≤ 10⁵$$,
'[{"input":"elevation = [0,1,0,2,1,0,1,3,2,1,2,1]","output":"6"},{"input":"elevation = [4,2,0,3,2,5]","output":"9"}]'::jsonb,
'[{"input":"0 1 0 2 1 0 1 3 2 1 2 1","expected_output":"6","is_hidden":false},{"input":"4 2 0 3 2 5","expected_output":"9","is_hidden":false},{"input":"3 0 2 0 4","expected_output":"7","is_hidden":false},{"input":"1 0 1","expected_output":"1","is_hidden":true},{"input":"0 1 2 3 4 3 2 1 0","expected_output":"0","is_hidden":true}]'::jsonb,
$$## Two Pointer — O(n) time, O(1) space

```python
def trap(elevation):
    lo, hi = 0, len(elevation)-1
    max_l = max_r = water = 0
    while lo < hi:
        if elevation[lo] < elevation[hi]:
            if elevation[lo] >= max_l: max_l = elevation[lo]
            else: water += max_l - elevation[lo]
            lo += 1
        else:
            if elevation[hi] >= max_r: max_r = elevation[hi]
            else: water += max_r - elevation[hi]
            hi -= 1
    return water
```$$,
'Water at any column = min(max height to its left, max height to its right) - its own height.',
ARRAY['python','java','javascript','go','cpp'], 58.4),

-- ── 30 ───────────────────────────────────────────────────────────────────────
('Squares of a Sorted Array',
 'squares-sorted-array', 'Easy', 'DSA', 'Two Pointers',
 ARRAY['arrays','two-pointers','sorting'],
$$## Dream11 Score Squarer

Dream11 tracks player scores (can be negative for penalties). Given sorted array `scores`, return a sorted array of the squares. Must run in O(n).$$,
$$- 1 ≤ scores.length ≤ 10⁴
- -10⁴ ≤ scores[i] ≤ 10⁴
- scores is sorted non-decreasing.$$,
'[{"input":"scores = [-4,-1,0,3,10]","output":"[0,1,9,16,100]"},{"input":"scores = [-7,-3,2,3,11]","output":"[4,9,9,49,121]"}]'::jsonb,
'[{"input":"-4 -1 0 3 10","expected_output":"0 1 9 16 100","is_hidden":false},{"input":"-7 -3 2 3 11","expected_output":"4 9 9 49 121","is_hidden":false},{"input":"0 1 2 3 4","expected_output":"0 1 4 9 16","is_hidden":true}]'::jsonb,
$$## Two Pointer from Ends — O(n)

```python
def sortedSquares(scores):
    n = len(scores)
    res = [0]*n
    lo, hi, k = 0, n-1, n-1
    while lo <= hi:
        if abs(scores[lo]) > abs(scores[hi]):
            res[k] = scores[lo]**2; lo += 1
        else:
            res[k] = scores[hi]**2; hi -= 1
        k -= 1
    return res
```$$,
'Largest squares come from the ends (most negative or most positive). Fill the output from the right.',
ARRAY['python','java','javascript','go','cpp'], 71.5),

-- ── 31 ───────────────────────────────────────────────────────────────────────
('Is Subsequence',
 'is-subsequence', 'Easy', 'DSA', 'Two Pointers',
 ARRAY['strings','two-pointers','dynamic-programming'],
$$## Koo Hashtag Check

Koo checks if a short tag `s` is a subsequence of the longer tweet string `t` (characters of `s` appear in `t` in the same order, not necessarily contiguous). Return `true` if yes.$$,
$$- 0 ≤ s.length ≤ 100
- 0 ≤ t.length ≤ 10⁴
- Both consist of lowercase letters.$$,
'[{"input":"s = \"abc\", t = \"ahbgdc\"","output":"true"},{"input":"s = \"axc\", t = \"ahbgdc\"","output":"false"}]'::jsonb,
'[{"input":"abc\nahbgdc","expected_output":"true","is_hidden":false},{"input":"axc\nahbgdc","expected_output":"false","is_hidden":false},{"input":"\nahbgdc","expected_output":"true","is_hidden":false},{"input":"ace\nabcde","expected_output":"true","is_hidden":true}]'::jsonb,
$$## Two Pointer — O(n)

```python
def isSubsequence(s, t):
    i = j = 0
    while i < len(s) and j < len(t):
        if s[i] == t[j]: i += 1
        j += 1
    return i == len(s)
```$$,
'Advance the s pointer only on a match; always advance the t pointer.',
ARRAY['python','java','javascript','go','cpp'], 49.8),

-- ── 32 ───────────────────────────────────────────────────────────────────────
('4Sum',
 'four-sum', 'Medium', 'DSA', 'Two Pointers',
 ARRAY['arrays','two-pointers','sorting'],
$$## Razorpay Four-Party Settlement

Given array `amounts` and integer `target`, find all unique quadruplets `[a,b,c,d]` with `a+b+c+d = target`. Return in sorted order, no duplicates.$$,
$$- 1 ≤ amounts.length ≤ 200
- -10⁹ ≤ amounts[i] ≤ 10⁹
- -10⁹ ≤ target ≤ 10⁹$$,
'[{"input":"amounts = [1,0,-1,0,-2,2], target = 0","output":"[[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]"},{"input":"amounts = [2,2,2,2,2], target = 8","output":"[[2,2,2,2]]"}]'::jsonb,
'[{"input":"1 0 -1 0 -2 2\n0","expected_output":"[[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]","is_hidden":false},{"input":"2 2 2 2 2\n8","expected_output":"[[2,2,2,2]]","is_hidden":false},{"input":"1 2 3 4\n10","expected_output":"[[1,2,3,4]]","is_hidden":true}]'::jsonb,
$$## Sort + Two Nested Loops + Two Pointer — O(n³)

```python
def fourSum(nums, target):
    nums.sort(); res = []
    for i in range(len(nums)-3):
        if i>0 and nums[i]==nums[i-1]: continue
        for j in range(i+1, len(nums)-2):
            if j>i+1 and nums[j]==nums[j-1]: continue
            lo, hi = j+1, len(nums)-1
            while lo < hi:
                s = nums[i]+nums[j]+nums[lo]+nums[hi]
                if s == target:
                    res.append([nums[i],nums[j],nums[lo],nums[hi]])
                    while lo<hi and nums[lo]==nums[lo+1]: lo+=1
                    while lo<hi and nums[hi]==nums[hi-1]: hi-=1
                    lo+=1; hi-=1
                elif s < target: lo+=1
                else: hi-=1
    return res
```$$,
'Extend 3Sum: fix two elements, then use two pointer on the rest.',
ARRAY['python','java','javascript','go','cpp'], 36.8),

-- ══ SLIDING WINDOW (33–50) ══════════════════════════════════════════════════

-- ── 33 ───────────────────────────────────────────────────────────────────────
('Longest Substring Without Repeating Characters',
 'longest-substring-no-repeat', 'Medium', 'DSA', 'Sliding Window',
 ARRAY['strings','sliding-window','hash-map'],
$$## Juspay Session Token

Juspay generates session tokens as substrings. Given string `s`, find the length of the longest substring with no repeating characters.$$,
$$- 0 ≤ s.length ≤ 5 × 10⁴
- s consists of English letters, digits, symbols, spaces.$$,
'[{"input":"s = \"abcabcbb\"","output":"3","explanation":"\"abc\" is the longest, length 3."},{"input":"s = \"bbbbb\"","output":"1"},{"input":"s = \"pwwkew\"","output":"3","explanation":"\"wke\"."}]'::jsonb,
'[{"input":"abcabcbb","expected_output":"3","is_hidden":false},{"input":"bbbbb","expected_output":"1","is_hidden":false},{"input":"pwwkew","expected_output":"3","is_hidden":false},{"input":"","expected_output":"0","is_hidden":true},{"input":"dvdf","expected_output":"3","is_hidden":true}]'::jsonb,
$$## Sliding Window + Hash Map — O(n)

```python
def lengthOfLongestSubstring(s):
    seen = {}
    lo = best = 0
    for hi, c in enumerate(s):
        if c in seen and seen[c] >= lo:
            lo = seen[c] + 1
        seen[c] = hi
        best = max(best, hi - lo + 1)
    return best
```$$,
'Maintain a window [lo, hi]. Move lo forward when a repeat is found.',
ARRAY['python','java','javascript','go','cpp'], 33.7),

-- ── 34 ───────────────────────────────────────────────────────────────────────
('Minimum Window Substring',
 'minimum-window-substring', 'Hard', 'DSA', 'Sliding Window',
 ARRAY['strings','sliding-window','hash-map'],
$$## Search Query Coverage — Google India

Given strings `s` (document) and `t` (query), find the minimum window in `s` containing all characters of `t` (including duplicates). Return `""` if impossible.$$,
$$- 1 ≤ s.length, t.length ≤ 10⁵
- s, t consist of uppercase and lowercase English letters.$$,
'[{"input":"s = \"ADOBECODEBANC\", t = \"ABC\"","output":"\"BANC\""},{"input":"s = \"a\", t = \"a\"","output":"\"a\""},{"input":"s = \"a\", t = \"aa\"","output":"\"\""}]'::jsonb,
'[{"input":"ADOBECODEBANC\nABC","expected_output":"BANC","is_hidden":false},{"input":"a\na","expected_output":"a","is_hidden":false},{"input":"a\naa","expected_output":"","is_hidden":false},{"input":"OUZODYXAZV\nXYZ","expected_output":"YXAZ","is_hidden":true}]'::jsonb,
$$## Sliding Window with Need Count — O(n)

```python
from collections import Counter

def minWindow(s, t):
    need = Counter(t)
    missing = len(t)
    lo = best_lo = best_hi = 0
    for hi, c in enumerate(s, 1):
        if need[c] > 0: missing -= 1
        need[c] -= 1
        if missing == 0:
            while need[s[lo]] < 0: need[s[lo]] += 1; lo += 1
            if best_hi == 0 or hi - lo < best_hi - best_lo:
                best_lo, best_hi = lo, hi
            need[s[lo]] += 1; missing += 1; lo += 1
    return s[best_lo:best_hi]
```$$,
'Track how many required characters are still missing. Shrink from the left when all are covered.',
ARRAY['python','java','javascript','go','cpp'], 41.5),

-- ── 35 ───────────────────────────────────────────────────────────────────────
('Longest Repeating Character Replacement',
 'longest-repeating-char-replacement', 'Medium', 'DSA', 'Sliding Window',
 ARRAY['strings','sliding-window'],
$$## Ola Driver Code Normalizer

Ola normalizes driver codes. Given string `s` and integer `k`, you can replace at most `k` characters. Return the length of the longest substring containing the same letter you can get.$$,
$$- 1 ≤ s.length ≤ 10⁵
- s consists of uppercase English letters.
- 0 ≤ k ≤ s.length$$,
'[{"input":"s = \"ABAB\", k = 2","output":"4","explanation":"Replace two As or two Bs."},{"input":"s = \"AABABBA\", k = 1","output":"4"}]'::jsonb,
'[{"input":"ABAB\n2","expected_output":"4","is_hidden":false},{"input":"AABABBA\n1","expected_output":"4","is_hidden":false},{"input":"AAAA\n2","expected_output":"4","is_hidden":true},{"input":"ABCDE\n1","expected_output":"2","is_hidden":true}]'::jsonb,
$$## Sliding Window — O(n)

The window is valid when `window_size - max_freq <= k`.

```python
from collections import defaultdict

def characterReplacement(s, k):
    count = defaultdict(int)
    lo = max_f = best = 0
    for hi, c in enumerate(s):
        count[c] += 1
        max_f = max(max_f, count[c])
        while (hi - lo + 1) - max_f > k:
            count[s[lo]] -= 1; lo += 1
        best = max(best, hi - lo + 1)
    return best
```$$,
'The valid window condition: characters to replace = window length − max frequency ≤ k.',
ARRAY['python','java','javascript','go','cpp'], 50.6),

-- ── 36 ───────────────────────────────────────────────────────────────────────
('Permutation in String',
 'permutation-in-string', 'Medium', 'DSA', 'Sliding Window',
 ARRAY['strings','sliding-window','hash-map'],
$$## Sharechat Keyword Anagram Check

Sharechat''s search checks if any permutation of keyword `s1` exists as a substring in post `s2`. Return `true` if yes.$$,
$$- 1 ≤ s1.length, s2.length ≤ 10⁴
- s1, s2 consist of lowercase English letters.$$,
'[{"input":"s1 = \"ab\", s2 = \"eidbaooo\"","output":"true","explanation":"\"ba\" is a permutation of \"ab\"."},{"input":"s1 = \"ab\", s2 = \"eidboaoo\"","output":"false"}]'::jsonb,
'[{"input":"ab\neidbaooo","expected_output":"true","is_hidden":false},{"input":"ab\neidboaoo","expected_output":"false","is_hidden":false},{"input":"adc\ndcda","expected_output":"true","is_hidden":true}]'::jsonb,
$$## Fixed-size Sliding Window — O(n)

```python
from collections import Counter

def checkInclusion(s1, s2):
    if len(s1) > len(s2): return False
    need, have = Counter(s1), Counter(s2[:len(s1)])
    matches = sum(have[c] == need[c] for c in need)
    for i in range(len(s1), len(s2)):
        if matches == len(need): return True
        c_add, c_rem = s2[i], s2[i-len(s1)]
        have[c_add] += 1
        if c_add in need:
            if have[c_add] == need[c_add]: matches += 1
            elif have[c_add] == need[c_add]+1: matches -= 1
        have[c_rem] -= 1
        if c_rem in need:
            if have[c_rem] == need[c_rem]: matches += 1
            elif have[c_rem] == need[c_rem]-1: matches -= 1
    return matches == len(need)
```$$,
'Use a fixed window of size len(s1). Track how many character frequencies match.',
ARRAY['python','java','javascript','go','cpp'], 44.3),

-- ── 37 ───────────────────────────────────────────────────────────────────────
('Maximum Average Subarray I',
 'max-average-subarray-i', 'Easy', 'DSA', 'Sliding Window',
 ARRAY['arrays','sliding-window'],
$$## Unacademy Quiz Average

Unacademy computes the best average score over any `k` consecutive quiz questions. Given `scores` and integer `k`, return the maximum average of a subarray of length exactly `k`.$$,
$$- 1 ≤ k ≤ scores.length ≤ 10⁵
- -10⁴ ≤ scores[i] ≤ 10⁴$$,
'[{"input":"scores = [1,12,-5,-6,50,3], k = 4","output":"12.75","explanation":"Window [12,-5,-6,50] = 51/4 = 12.75"},{"input":"scores = [5], k = 1","output":"5.0"}]'::jsonb,
'[{"input":"1 12 -5 -6 50 3\n4","expected_output":"12.75","is_hidden":false},{"input":"5\n1","expected_output":"5.0","is_hidden":false},{"input":"0 4 0 3 2\n1","expected_output":"4.0","is_hidden":true}]'::jsonb,
$$## Fixed Window Sum — O(n)

```python
def findMaxAverage(scores, k):
    window = sum(scores[:k])
    best = window
    for i in range(k, len(scores)):
        window += scores[i] - scores[i-k]
        best = max(best, window)
    return best / k
```$$,
'Slide a window of size k, adding the new right element and removing the old left element.',
ARRAY['python','java','javascript','go','cpp'], 43.8),

-- ── 38 ───────────────────────────────────────────────────────────────────────
('Max Consecutive Ones III',
 'max-consecutive-ones-iii', 'Medium', 'DSA', 'Sliding Window',
 ARRAY['arrays','sliding-window','binary-search'],
$$## 5G Network Signal Recovery

A 5G tower logs signal binary data. Given binary array `signal` and integer `k` (max flips), return the max length of consecutive 1s you can achieve by flipping at most `k` zeros.$$,
$$- 1 ≤ signal.length ≤ 10⁵
- signal[i] ∈ {0, 1}
- 0 ≤ k ≤ signal.length$$,
'[{"input":"signal = [1,1,1,0,0,0,1,1,1,1,0], k = 2","output":"6"},{"input":"signal = [0,0,1,1,0,0,1,1,1,0,1,1,0,0,0,1,1,1,1], k = 3","output":"10"}]'::jsonb,
'[{"input":"1 1 1 0 0 0 1 1 1 1 0\n2","expected_output":"6","is_hidden":false},{"input":"0 0 1 1 0 0 1 1 1 0 1 1 0 0 0 1 1 1 1\n3","expected_output":"10","is_hidden":false},{"input":"1 1 1\n0","expected_output":"3","is_hidden":true}]'::jsonb,
$$## Sliding Window with Zero Count — O(n)

```python
def longestOnes(signal, k):
    lo = zeros = best = 0
    for hi, x in enumerate(signal):
        if x == 0: zeros += 1
        while zeros > k:
            if signal[lo] == 0: zeros -= 1
            lo += 1
        best = max(best, hi - lo + 1)
    return best
```$$,
'Keep a window where the number of zeros ≤ k. Shrink from the left when it exceeds k.',
ARRAY['python','java','javascript','go','cpp'], 63.6),

-- ── 39 ───────────────────────────────────────────────────────────────────────
('Fruit Into Baskets',
 'fruit-into-baskets', 'Medium', 'DSA', 'Sliding Window',
 ARRAY['arrays','sliding-window','hash-map'],
$$## Farmer''s Fruit Baskets — AgriStack

A farmer can carry only 2 types of fruit. Given array `fruits` (type at each tree), return the max fruits collectible in a contiguous sequence using only 2 basket types.$$,
$$- 1 ≤ fruits.length ≤ 10⁵
- 0 ≤ fruits[i] < fruits.length$$,
'[{"input":"fruits = [1,2,1]","output":"3","explanation":"All 3 trees — types 1 and 2."},{"input":"fruits = [0,1,2,2]","output":"3","explanation":"[1,2,2] — types 1 and 2."},{"input":"fruits = [1,2,3,2,2]","output":"4","explanation":"[2,3,2,2]."}]'::jsonb,
'[{"input":"1 2 1","expected_output":"3","is_hidden":false},{"input":"0 1 2 2","expected_output":"3","is_hidden":false},{"input":"1 2 3 2 2","expected_output":"4","is_hidden":false},{"input":"3 3 3 1 2 1 1 2 3 3 4","expected_output":"5","is_hidden":true}]'::jsonb,
$$## Sliding Window — At Most 2 Distinct — O(n)

```python
from collections import defaultdict

def totalFruit(fruits):
    basket = defaultdict(int)
    lo = best = 0
    for hi, f in enumerate(fruits):
        basket[f] += 1
        while len(basket) > 2:
            basket[fruits[lo]] -= 1
            if basket[fruits[lo]] == 0: del basket[fruits[lo]]
            lo += 1
        best = max(best, hi - lo + 1)
    return best
```$$,
'This is equivalent to "longest subarray with at most 2 distinct values".',
ARRAY['python','java','javascript','go','cpp'], 43.2),

-- ── 40 ───────────────────────────────────────────────────────────────────────
('Subarray Product Less Than K',
 'subarray-product-less-than-k', 'Medium', 'DSA', 'Sliding Window',
 ARRAY['arrays','sliding-window','two-pointers'],
$$## Razorpay Risk Score Windows

Given `scores` array and integer `k`, count contiguous subarrays where the product of all elements is strictly less than `k`.$$,
$$- 1 ≤ scores.length ≤ 3 × 10⁴
- 1 ≤ scores[i] ≤ 1000
- 0 ≤ k ≤ 10⁶$$,
'[{"input":"scores = [10,5,2,6], k = 100","output":"8","explanation":"Subarrays: [10],[5],[2],[6],[10,5],[5,2],[2,6],[5,2,6]."},{"input":"scores = [1,2,3], k = 0","output":"0"}]'::jsonb,
'[{"input":"10 5 2 6\n100","expected_output":"8","is_hidden":false},{"input":"1 2 3\n0","expected_output":"0","is_hidden":false},{"input":"1 1 1\n2","expected_output":"6","is_hidden":true}]'::jsonb,
$$## Sliding Window — O(n)

For each valid right endpoint, all subarrays ending there and starting ≥ lo are valid.

```python
def numSubarrayProductLessThanK(scores, k):
    if k <= 1: return 0
    lo = prod = count = 0
    for hi, x in enumerate(scores):
        prod *= x
        while prod >= k: prod //= scores[lo]; lo += 1
        count += hi - lo + 1
    return count
```$$,
'For each right end, count how many valid left starts exist: hi - lo + 1.',
ARRAY['python','java','javascript','go','cpp'], 43.7),

-- ── 41 ───────────────────────────────────────────────────────────────────────
('Find All Anagrams in a String',
 'find-all-anagrams', 'Medium', 'DSA', 'Sliding Window',
 ARRAY['strings','sliding-window','hash-map'],
$$## Koo Tag Scanner

Koo''s algorithm scans post body `s` for all positions where a permutation of tag `p` starts. Return all start indices.$$,
$$- 1 ≤ s.length, p.length ≤ 3 × 10⁴
- s, p consist of lowercase English letters.$$,
'[{"input":"s = \"cbaebabacd\", p = \"abc\"","output":"[0,6]"},{"input":"s = \"abab\", p = \"ab\"","output":"[0,1,2]"}]'::jsonb,
'[{"input":"cbaebabacd\nabc","expected_output":"0 6","is_hidden":false},{"input":"abab\nab","expected_output":"0 1 2","is_hidden":false},{"input":"aa\nbb","expected_output":"","is_hidden":true}]'::jsonb,
$$## Fixed Window Frequency Match — O(n)

```python
from collections import Counter

def findAnagrams(s, p):
    need = Counter(p)
    have = Counter(s[:len(p)])
    res = [0] if have == need else []
    for i in range(len(p), len(s)):
        have[s[i]] += 1
        old = s[i-len(p)]
        have[old] -= 1
        if have[old] == 0: del have[old]
        if have == need: res.append(i-len(p)+1)
    return res
```$$,
'Slide a fixed window of size len(p). At each step add new right char, remove old left char.',
ARRAY['python','java','javascript','go','cpp'], 48.3),

-- ── 42 ───────────────────────────────────────────────────────────────────────
('Minimum Size Subarray Sum',
 'min-size-subarray-sum', 'Medium', 'DSA', 'Sliding Window',
 ARRAY['arrays','sliding-window','binary-search'],
$$## Zepto Minimum Batch

Zepto''s packing algorithm needs to know the shortest contiguous batch of items whose total weight reaches `target`. Given `weights` and `target`, return the length. Return 0 if impossible.$$,
$$- 1 ≤ target ≤ 10⁹
- 1 ≤ weights.length ≤ 10⁵
- 1 ≤ weights[i] ≤ 10⁴$$,
'[{"input":"weights = [2,3,1,2,4,3], target = 7","output":"2","explanation":"[4,3] has length 2."},{"input":"weights = [1,4,4], target = 4","output":"1"}]'::jsonb,
'[{"input":"2 3 1 2 4 3\n7","expected_output":"2","is_hidden":false},{"input":"1 4 4\n4","expected_output":"1","is_hidden":false},{"input":"1 1 1 1 1 1 1 1\n11","expected_output":"0","is_hidden":false},{"input":"1 2 3 4 5\n11","expected_output":"3","is_hidden":true}]'::jsonb,
$$## Variable Sliding Window — O(n)

```python
def minSubArrayLen(target, weights):
    lo = total = 0
    best = float('inf')
    for hi, w in enumerate(weights):
        total += w
        while total >= target:
            best = min(best, hi - lo + 1)
            total -= weights[lo]; lo += 1
    return 0 if best == float('inf') else best
```$$,
'Expand right until sum ≥ target, then shrink from left to find the minimum length.',
ARRAY['python','java','javascript','go','cpp'], 43.9),

-- ── 43 ───────────────────────────────────────────────────────────────────────
('Sliding Window Maximum',
 'sliding-window-maximum', 'Hard', 'DSA', 'Sliding Window',
 ARRAY['arrays','sliding-window','deque','monotonic-queue'],
$$## Sensex Rolling Maximum

Given stock `prices` and window size `k`, return an array of the maximum price in each window of size `k`.$$,
$$- 1 ≤ k ≤ prices.length ≤ 10⁵
- -10⁴ ≤ prices[i] ≤ 10⁴$$,
'[{"input":"prices = [1,3,-1,-3,5,3,6,7], k = 3","output":"[3,3,5,5,6,7]"},{"input":"prices = [1], k = 1","output":"[1]"}]'::jsonb,
'[{"input":"1 3 -1 -3 5 3 6 7\n3","expected_output":"3 3 5 5 6 7","is_hidden":false},{"input":"1\n1","expected_output":"1","is_hidden":false},{"input":"9 11\n2","expected_output":"11","is_hidden":true},{"input":"4 -2","expected_output":"4","is_hidden":true}]'::jsonb,
$$## Monotonic Deque — O(n)

```python
from collections import deque

def maxSlidingWindow(prices, k):
    dq = deque()  # stores indices, decreasing values
    res = []
    for i, p in enumerate(prices):
        while dq and prices[dq[-1]] < p: dq.pop()
        dq.append(i)
        if dq[0] <= i - k: dq.popleft()
        if i >= k-1: res.append(prices[dq[0]])
    return res
```

The deque front always holds the index of the current window''s maximum.$$,
'Use a deque that stores indices in decreasing order of their values. Pop from back when a larger element is added.',
ARRAY['python','java','javascript','go','cpp'], 46.8),

-- ── 44 ───────────────────────────────────────────────────────────────────────
('Longest Subarray of 1s After Deleting One Element',
 'longest-subarray-ones-delete', 'Medium', 'DSA', 'Sliding Window',
 ARRAY['arrays','sliding-window','dynamic-programming'],
$$## Network Uptime Optimizer

A server log has 1 (online) and 0 (outage) per minute. You can delete exactly one minute from the log. Return the max length of consecutive 1s remaining.$$,
$$- 1 ≤ log.length ≤ 10⁵
- log[i] ∈ {0, 1}$$,
'[{"input":"log = [1,1,0,1]","output":"3"},{"input":"log = [0,1,1,1,0,1,1,0,1]","output":"5"}]'::jsonb,
'[{"input":"1 1 0 1","expected_output":"3","is_hidden":false},{"input":"0 1 1 1 0 1 1 0 1","expected_output":"5","is_hidden":false},{"input":"1 1 1","expected_output":"2","is_hidden":false},{"input":"0 0 0","expected_output":"0","is_hidden":true}]'::jsonb,
$$## Sliding Window — At Most 1 Zero (then subtract 1)

```python
def longestSubarray(log):
    lo = zeros = best = 0
    for hi, x in enumerate(log):
        if x == 0: zeros += 1
        while zeros > 1:
            if log[lo] == 0: zeros -= 1
            lo += 1
        best = max(best, hi - lo)  # -1 for the deleted element
    return best
```$$,
'Find the longest window with at most 1 zero. The answer is window length minus 1 (the deletion).',
ARRAY['python','java','javascript','go','cpp'], 57.0),

-- ── 45 ───────────────────────────────────────────────────────────────────────
('Number of Subarrays with K Odd Numbers',
 'subarrays-k-odd', 'Medium', 'DSA', 'Sliding Window',
 ARRAY['arrays','sliding-window','prefix-sum'],
$$## Odd Payment Count — Razorpay

Given array `transactions` of integers and integer `k`, return the number of subarrays containing exactly `k` odd-valued transactions.$$,
$$- 1 ≤ transactions.length ≤ 50000
- 1 ≤ transactions[i] ≤ 10⁵
- 1 ≤ k ≤ transactions.length$$,
'[{"input":"transactions = [1,1,2,1,1], k = 3","output":"2"},{"input":"transactions = [2,4,6], k = 1","output":"0"},{"input":"transactions = [2,2,2,1,2,2,1,2,2,2], k = 2","output":"16"}]'::jsonb,
'[{"input":"1 1 2 1 1\n3","expected_output":"2","is_hidden":false},{"input":"2 4 6\n1","expected_output":"0","is_hidden":false},{"input":"2 2 2 1 2 2 1 2 2 2\n2","expected_output":"16","is_hidden":false},{"input":"1 2 3\n1","expected_output":"4","is_hidden":true}]'::jsonb,
$$## Exactly K = At Most K − At Most K-1

```python
def numberOfSubarrays(nums, k):
    def atMost(k):
        lo = count = res = 0
        for hi, x in enumerate(nums):
            count += x % 2
            while count > k: count -= nums[lo] % 2; lo += 1
            res += hi - lo + 1
        return res
    return atMost(k) - atMost(k-1)
```$$,
'Exact count = at_most(k) - at_most(k-1). This avoids tracking both boundaries simultaneously.',
ARRAY['python','java','javascript','go','cpp'], 65.3),

-- ── 46 ───────────────────────────────────────────────────────────────────────
('Best Time to Buy and Sell Stock II',
 'best-time-buy-sell-stock-ii', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','greedy'],
$$## Zerodha Multi-Trade Profit

Same stock prices array. Now you can make as many transactions as you like (but must sell before buying again). Return the maximum total profit.$$,
$$- 1 ≤ prices.length ≤ 3 × 10⁴
- 0 ≤ prices[i] ≤ 10⁴$$,
'[{"input":"prices = [7,1,5,3,6,4]","output":"7","explanation":"Buy at 1, sell at 5 (+4). Buy at 3, sell at 6 (+3). Total = 7."},{"input":"prices = [1,2,3,4,5]","output":"4"}]'::jsonb,
'[{"input":"7 1 5 3 6 4","expected_output":"7","is_hidden":false},{"input":"1 2 3 4 5","expected_output":"4","is_hidden":false},{"input":"7 6 4 3 1","expected_output":"0","is_hidden":false},{"input":"3 3","expected_output":"0","is_hidden":true}]'::jsonb,
$$## Greedy: Collect all upward slopes

```python
def maxProfit(prices):
    return sum(max(0, prices[i+1]-prices[i]) for i in range(len(prices)-1))
```

Any upward move `prices[i+1] > prices[i]` contributes to profit. Collect every positive difference.$$,
'Every upward step is a profit opportunity. Collect them all.',
ARRAY['python','java','javascript','go','cpp'], 65.0),

-- ── 47 ───────────────────────────────────────────────────────────────────────
('Gas Station',
 'gas-station', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','greedy'],
$$## Rapido Fuel Circuit

There are `n` Rapido fuel stations arranged in a circle. `gas[i]` is fuel you gain; `cost[i]` is fuel to reach next station. Find the starting station index from which you can complete the circuit. Return -1 if impossible.$$,
$$- 1 ≤ n ≤ 10⁵
- 0 ≤ gas[i], cost[i] ≤ 10⁴
- Solution is guaranteed to be unique.$$,
'[{"input":"gas = [1,2,3,4,5], cost = [3,4,5,1,2]","output":"3"},{"input":"gas = [2,3,4], cost = [3,4,3]","output":"-1"}]'::jsonb,
'[{"input":"1 2 3 4 5\n3 4 5 1 2","expected_output":"3","is_hidden":false},{"input":"2 3 4\n3 4 3","expected_output":"-1","is_hidden":false},{"input":"5\n4","expected_output":"0","is_hidden":true}]'::jsonb,
$$## Greedy — O(n)

If total gas < total cost, no solution. Otherwise, track tank; reset start on negative.

```python
def canCompleteCircuit(gas, cost):
    if sum(gas) < sum(cost): return -1
    tank = start = 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0: tank = 0; start = i+1
    return start
```$$,
'If total gain ≥ total cost, a solution exists. The optimal start is reset whenever the tank goes negative.',
ARRAY['python','java','javascript','go','cpp'], 44.8),

-- ── 48 ───────────────────────────────────────────────────────────────────────
('Candy Distribution',
 'candy-distribution', 'Hard', 'DSA', 'Arrays',
 ARRAY['arrays','greedy'],
$$## Byju''s Reward Distribution

Byju''s distributes reward candies to n students ranked by performance. Each student must get at least 1 candy. Students with higher rank than their neighbours must get more. Return the minimum total candies.$$,
$$- 1 ≤ ratings.length ≤ 2 × 10⁴
- 0 ≤ ratings[i] ≤ 2 × 10⁴$$,
'[{"input":"ratings = [1,0,2]","output":"5","explanation":"[2,1,2] = 5"},{"input":"ratings = [1,2,2]","output":"4","explanation":"[1,2,1] = 4"}]'::jsonb,
'[{"input":"1 0 2","expected_output":"5","is_hidden":false},{"input":"1 2 2","expected_output":"4","is_hidden":false},{"input":"1","expected_output":"1","is_hidden":true},{"input":"1 3 2 2 1","expected_output":"7","is_hidden":true}]'::jsonb,
$$## Two Pass Greedy — O(n)

```python
def candy(ratings):
    n = len(ratings)
    c = [1]*n
    for i in range(1, n):
        if ratings[i] > ratings[i-1]: c[i] = c[i-1]+1
    for i in range(n-2, -1, -1):
        if ratings[i] > ratings[i+1]: c[i] = max(c[i], c[i+1]+1)
    return sum(c)
```

Left pass ensures left neighbour constraint; right pass ensures right neighbour constraint.$$,
'Two passes: left-to-right for left neighbour rule, right-to-left for right neighbour rule.',
ARRAY['python','java','javascript','go','cpp'], 36.6),

-- ── 49 ───────────────────────────────────────────────────────────────────────
('Encode and Decode Strings',
 'encode-decode-strings', 'Medium', 'DSA', 'Arrays',
 ARRAY['strings','design'],
$$## Juspay Message Packing

Design an algorithm to encode a list of strings into a single string and decode it back. The encoded string should be transmittable over a network without ambiguity.$$,
$$- 0 ≤ strs.length ≤ 200
- 0 ≤ strs[i].length ≤ 200
- strs[i] contains any ASCII character.$$,
'[{"input":"strs = [\"Hello\",\"World\"]","output":"\"Hello\" \"World\"","explanation":"Encode then decode returns the original list."},{"input":"strs = [\"\"]","output":"[\"\"]"}]'::jsonb,
'[{"input":"Hello World","expected_output":"Hello World","is_hidden":false},{"input":"","expected_output":"","is_hidden":false},{"input":"Hello#World","expected_output":"Hello#World","is_hidden":true}]'::jsonb,
$$## Length Prefix Encoding

```python
class Codec:
    def encode(self, strs):
        return "".join(f"{len(s)}#{s}" for s in strs)

    def decode(self, s):
        res, i = [], 0
        while i < len(s):
            j = s.index("#", i)
            length = int(s[i:j])
            res.append(s[j+1:j+1+length])
            i = j+1+length
        return res
```

`length#string` prefix ensures unambiguous parsing regardless of string content.$$,
'Prefix each string with its length and a delimiter character.',
ARRAY['python','java','javascript','go'], 34.1),

-- ── 50 ───────────────────────────────────────────────────────────────────────
('Best Time to Buy and Sell Stock with Cooldown',
 'buy-sell-cooldown', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','dynamic-programming'],
$$## Groww Cooldown Trading

Stock prices with one rule: after you sell, you must skip one day (cooldown) before buying again. Return the maximum profit with as many transactions as you like.$$,
$$- 1 ≤ prices.length ≤ 5000
- 0 ≤ prices[i] ≤ 1000$$,
'[{"input":"prices = [1,2,3,0,2]","output":"3","explanation":"Buy at 1, sell at 3, cooldown at 0, buy at 0, sell at 2."},{"input":"prices = [1]","output":"0"}]'::jsonb,
'[{"input":"1 2 3 0 2","expected_output":"3","is_hidden":false},{"input":"1","expected_output":"0","is_hidden":false},{"input":"2 1 4","expected_output":"3","is_hidden":true},{"input":"6 1 3 2 4 7","expected_output":"6","is_hidden":true}]'::jsonb,
$$## DP State Machine — O(n)

States: `hold` (own stock), `sold` (just sold), `rest` (cooldown or idle).

```python
def maxProfit(prices):
    hold = -float('inf')
    sold = rest = 0
    for p in prices:
        prev_sold = sold
        sold = hold + p
        hold = max(hold, rest - p)
        rest = max(rest, prev_sold)
    return max(sold, rest)
```$$,
'Model three states: holding, just sold (cooldown next), resting. Transition between them at each price.',
ARRAY['python','java','javascript','go','cpp'], 52.5),

-- ── 51 ───────────────────────────────────────────────────────────────────────
('Merge Intervals',
 'merge-intervals', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','sorting','intervals'],
$$## MakeMyTrip Booking Merge

MakeMyTrip merges overlapping booking windows. Given array of `intervals [start, end]`, merge all overlapping intervals and return the non-overlapping result.$$,
$$- 1 ≤ intervals.length ≤ 10⁴
- 0 ≤ start_i ≤ end_i ≤ 10⁴$$,
'[{"input":"intervals = [[1,3],[2,6],[8,10],[15,18]]","output":"[[1,6],[8,10],[15,18]]"},{"input":"intervals = [[1,4],[4,5]]","output":"[[1,5]]"}]'::jsonb,
'[{"input":"[[1,3],[2,6],[8,10],[15,18]]","expected_output":"[[1,6],[8,10],[15,18]]","is_hidden":false},{"input":"[[1,4],[4,5]]","expected_output":"[[1,5]]","is_hidden":false},{"input":"[[1,4],[0,4]]","expected_output":"[[0,4]]","is_hidden":false},{"input":"[[2,3],[4,5],[6,7],[8,9],[1,10]]","expected_output":"[[1,10]]","is_hidden":true}]'::jsonb,
$$## Sort + Linear Merge — O(n log n)

```python
def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    res = [intervals[0]]
    for s, e in intervals[1:]:
        if s <= res[-1][1]:
            res[-1][1] = max(res[-1][1], e)
        else:
            res.append([s, e])
    return res
```$$,
'Sort by start. For each interval, either merge with the last one (if overlapping) or append.',
ARRAY['python','java','javascript','go','cpp'], 46.2),

-- ── 52 ───────────────────────────────────────────────────────────────────────
('Non-overlapping Intervals',
 'non-overlapping-intervals', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','sorting','greedy','intervals'],
$$## Conference Room Scheduler — Zoho

Given interview `slots [start, end]`, find the minimum number of intervals to remove so the rest do not overlap.$$,
$$- 1 ≤ slots.length ≤ 10⁵
- -5 × 10⁴ ≤ start_i, end_i ≤ 5 × 10⁴$$,
'[{"input":"slots = [[1,2],[2,3],[3,4],[1,3]]","output":"1"},{"input":"slots = [[1,2],[1,2],[1,2]]","output":"2"}]'::jsonb,
'[{"input":"[[1,2],[2,3],[3,4],[1,3]]","expected_output":"1","is_hidden":false},{"input":"[[1,2],[1,2],[1,2]]","expected_output":"2","is_hidden":false},{"input":"[[1,2],[2,3]]","expected_output":"0","is_hidden":true}]'::jsonb,
$$## Greedy — Keep max non-overlapping (n - kept)

```python
def eraseOverlapIntervals(slots):
    slots.sort(key=lambda x: x[1])  # sort by end
    kept = prev_end = 0
    prev_end = -float('inf')
    for s, e in slots:
        if s >= prev_end:
            kept += 1; prev_end = e
    return len(slots) - kept
```$$,
'Sort by end time. Greedily keep intervals that start after the last kept interval ends.',
ARRAY['python','java','javascript','go','cpp'], 48.8),

-- ── 53 ───────────────────────────────────────────────────────────────────────
('Meeting Rooms II',
 'meeting-rooms-ii', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','sorting','heap','greedy'],
$$## Zoho Meeting Room Allocation

Given meeting `intervals [start, end]`, return the minimum number of conference rooms required to hold all meetings.$$,
$$- 0 ≤ intervals.length ≤ 10⁴
- 0 ≤ start_i < end_i ≤ 10⁶$$,
'[{"input":"intervals = [[0,30],[5,10],[15,20]]","output":"2"},{"input":"intervals = [[7,10],[2,4]]","output":"1"}]'::jsonb,
'[{"input":"[[0,30],[5,10],[15,20]]","expected_output":"2","is_hidden":false},{"input":"[[7,10],[2,4]]","expected_output":"1","is_hidden":false},{"input":"[[1,5],[2,6],[3,7]]","expected_output":"3","is_hidden":true}]'::jsonb,
$$## Min-Heap of End Times — O(n log n)

```python
import heapq

def minMeetingRooms(intervals):
    intervals.sort()
    heap = []  # end times
    for s, e in intervals:
        if heap and heap[0] <= s:
            heapq.heapreplace(heap, e)
        else:
            heapq.heappush(heap, e)
    return len(heap)
```$$,
'Sort by start. Use a min-heap of end times. If earliest ending room is free, reuse it; else open new.',
ARRAY['python','java','javascript','go','cpp'], 52.3),

-- ── 54 ───────────────────────────────────────────────────────────────────────
('Insert Interval',
 'insert-interval', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','intervals'],
$$## MakeMyTrip Booking Insert

Given non-overlapping sorted `intervals` and a `newInterval`, insert it (merging if necessary) and return the resulting list still in sorted, non-overlapping order.$$,
$$- 0 ≤ intervals.length ≤ 10⁴
- intervals is sorted by start.$$,
'[{"input":"intervals = [[1,3],[6,9]], newInterval = [2,5]","output":"[[1,5],[6,9]]"},{"input":"intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]","output":"[[1,2],[3,10],[12,16]]"}]'::jsonb,
'[{"input":"[[1,3],[6,9]]\n2 5","expected_output":"[[1,5],[6,9]]","is_hidden":false},{"input":"[]\n5 7","expected_output":"[[5,7]]","is_hidden":false},{"input":"[[1,5]]\n2 3","expected_output":"[[1,5]]","is_hidden":true}]'::jsonb,
$$## Linear Scan — O(n)

```python
def insert(intervals, new):
    res, i = [], 0
    while i < len(intervals) and intervals[i][1] < new[0]:
        res.append(intervals[i]); i += 1
    while i < len(intervals) and intervals[i][0] <= new[1]:
        new[0] = min(new[0], intervals[i][0])
        new[1] = max(new[1], intervals[i][1])
        i += 1
    res.append(new)
    res.extend(intervals[i:])
    return res
```$$,
'Three phases: add all intervals before new, merge overlapping ones, add all after.',
ARRAY['python','java','javascript','go','cpp'], 38.3),

-- ── 55 ───────────────────────────────────────────────────────────────────────
('H-Index',
 'h-index', 'Medium', 'DSA', 'Arrays',
 ARRAY['arrays','sorting','counting-sort'],
$$## Google Scholar H-Index

A researcher has published `n` papers with citation counts `citations[i]`. The h-index is the largest `h` such that `h` papers each have at least `h` citations. Return the h-index.$$,
$$- 1 ≤ citations.length ≤ 5000
- 0 ≤ citations[i] ≤ 1000$$,
'[{"input":"citations = [3,0,6,1,5]","output":"3","explanation":"3 papers have ≥3 citations each."},{"input":"citations = [1,3,1]","output":"1"}]'::jsonb,
'[{"input":"3 0 6 1 5","expected_output":"3","is_hidden":false},{"input":"1 3 1","expected_output":"1","is_hidden":false},{"input":"0","expected_output":"0","is_hidden":true},{"input":"1","expected_output":"1","is_hidden":true},{"input":"100","expected_output":"1","is_hidden":true}]'::jsonb,
$$## Bucket Sort — O(n)

```python
def hIndex(citations):
    n = len(citations)
    buckets = [0] * (n+1)
    for c in citations:
        buckets[min(c, n)] += 1
    total = 0
    for h in range(n, -1, -1):
        total += buckets[h]
        if total >= h: return h
    return 0
```$$,
'Use a frequency bucket of size n+1. Accumulate from right until count ≥ index.',
ARRAY['python','java','javascript','go','cpp'], 37.8);
