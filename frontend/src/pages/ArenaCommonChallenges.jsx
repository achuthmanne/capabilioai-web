/**
 * ArenaCommonChallenges.jsx
 * LeetCode-style common challenge page for Capabilio Arena.
 *
 * Layout modes:
 *   "list"   → full-width sortable problem table  (like leetcode.com/problemset)
 *   "solve"  → left description panel + right code editor (like leetcode.com/problems/X)
 *
 * Tabs: Challenges | History | Leaderboard
 *
 * Features:
 *   • Challenge list with difficulty, acceptance rate, status (✓ solved)
 *   • Challenge locked after first solve — re-attempts allowed at reduced ELO
 *   • Run Tests → calls /api/arena/run-tests, shows per-case pass/fail
 *   • Submit → calls /api/arena/review, stores in arena_history, updates ELO (both fields)
 *   • Attempt counter — shown in AI feedback, ELO penalty on retry
 *   • History tab → reads arena_history (same table as domain challenges)
 *   • Leaderboard → reads arena_leaderboard
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { arenaDb, userDoc } from "../lib/db"
import { createClient } from "@supabase/supabase-js"

// ─── Separate read-only client for challenge content ──────────────────────────
const problemsDb = createClient(
  "https://cbrjdfllxfmmvalijpej.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicmpkZmxseGZtbXZhbGlqcGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTE0MzYsImV4cCI6MjA5NTY4NzQzNn0.P2zSjd4AiVV2SlVb-bWMzzMQSCjkKFfLh1OvJU6tM-s"
)

const SERVER = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:       "#F9F9F6",
  surface:  "#FFFFFF",
  ink:      "#1A1A18",
  ink2:     "#3A3A38",
  ink3:     "#6B6B68",
  ink4:     "#9A9A97",
  border:   "rgba(26,26,24,0.09)",
  indigo:   "#3D4EAC",
  indigo2:  "#5B6FD4",
  indigo3:  "#EEF0FB",
  green:    "#16A34A",
  green2:   "#F0FDF4",
  amber:    "#D97706",
  amber2:   "#FFFBEB",
  red:      "#DC2626",
  red2:     "#FEF2F2",
  purple:   "#7C3AED",
  purple2:  "#F5F3FF",
  editor:   "#1E1E1E",
}

const DIFF_STYLE = {
  Easy:   { color: T.green,  bg: T.green2  },
  Medium: { color: T.amber,  bg: T.amber2  },
  Hard:   { color: T.red,    bg: T.red2    },
  Expert: { color: T.purple, bg: T.purple2 },
}

// ─── Inline challenge seed (works without backend) ────────────────────────────
const SEED_CHALLENGES = [
  { id:"c-1",  slug:"two-sum",                  title:"Two Sum",                             difficulty:"Easy",   eloReward:5,  acceptance:74, topic_group:"Arrays",          skills:["Hash Map","Array"],          estimated_mins:20 },
  { id:"c-2",  slug:"longest-substring",         title:"Longest Substring Without Repeating", difficulty:"Medium", eloReward:10, acceptance:35, topic_group:"Sliding Window",   skills:["Hash Map","String"],         estimated_mins:30 },
  { id:"c-3",  slug:"median-two-arrays",         title:"Median of Two Sorted Arrays",         difficulty:"Hard",   eloReward:15, acceptance:38, topic_group:"Binary Search",    skills:["Binary Search","Array"],     estimated_mins:45 },
  { id:"c-4",  slug:"valid-parentheses",         title:"Valid Parentheses",                   difficulty:"Easy",   eloReward:5,  acceptance:41, topic_group:"Stack",            skills:["Stack","String"],            estimated_mins:20 },
  { id:"c-5",  slug:"merge-intervals",           title:"Merge Intervals",                     difficulty:"Medium", eloReward:10, acceptance:47, topic_group:"Arrays",           skills:["Sorting","Array"],           estimated_mins:35 },
  { id:"c-6",  slug:"lru-cache",                 title:"LRU Cache",                           difficulty:"Medium", eloReward:10, acceptance:42, topic_group:"Design",           skills:["Hash Map","Doubly Linked List"], estimated_mins:40 },
  { id:"c-7",  slug:"word-search",               title:"Word Search",                         difficulty:"Medium", eloReward:10, acceptance:40, topic_group:"Backtracking",     skills:["DFS","Backtracking"],        estimated_mins:40 },
  { id:"c-8",  slug:"trapping-rain-water",       title:"Trapping Rain Water",                 difficulty:"Hard",   eloReward:15, acceptance:60, topic_group:"Two Pointers",     skills:["Two Pointers","DP"],         estimated_mins:45 },
  { id:"c-9",  slug:"coin-change",               title:"Coin Change",                         difficulty:"Medium", eloReward:10, acceptance:44, topic_group:"Dynamic Programming",skills:["DP","BFS"],                estimated_mins:35 },
  { id:"c-10", slug:"binary-tree-level-order",   title:"Binary Tree Level Order Traversal",   difficulty:"Medium", eloReward:10, acceptance:67, topic_group:"Trees",            skills:["BFS","Queue","Tree"],        estimated_mins:30 },
  { id:"c-11", slug:"number-of-islands",         title:"Number of Islands",                   difficulty:"Medium", eloReward:10, acceptance:57, topic_group:"Graphs",           skills:["DFS","BFS","Union Find"],    estimated_mins:35 },
  { id:"c-12", slug:"climbing-stairs",           title:"Climbing Stairs",                     difficulty:"Easy",   eloReward:5,  acceptance:52, topic_group:"Dynamic Programming",skills:["DP","Math"],               estimated_mins:20 },
  { id:"c-13", slug:"product-except-self",       title:"Product of Array Except Self",        difficulty:"Medium", eloReward:10, acceptance:65, topic_group:"Arrays",           skills:["Prefix Sum","Array"],        estimated_mins:30 },
  { id:"c-14", slug:"find-min-rotated",          title:"Find Minimum in Rotated Sorted Array", difficulty:"Medium",eloReward:10, acceptance:49, topic_group:"Binary Search",    skills:["Binary Search"],             estimated_mins:25 },
  { id:"c-15", slug:"course-schedule",           title:"Course Schedule",                     difficulty:"Medium", eloReward:10, acceptance:46, topic_group:"Graphs",           skills:["Topological Sort","DFS"],    estimated_mins:40 },
  { id:"c-16", slug:"house-robber",              title:"House Robber",                        difficulty:"Medium", eloReward:10, acceptance:51, topic_group:"Dynamic Programming",skills:["DP"],                      estimated_mins:30 },
  { id:"c-17", slug:"construct-binary-tree",     title:"Construct Binary Tree from Preorder", difficulty:"Medium", eloReward:10, acceptance:61, topic_group:"Trees",            skills:["DFS","Recursion","Tree"],    estimated_mins:40 },
  { id:"c-18", slug:"maximum-subarray",          title:"Maximum Subarray",                    difficulty:"Medium", eloReward:10, acceptance:50, topic_group:"Dynamic Programming",skills:["Kadane's Algorithm","DP"],  estimated_mins:25 },
  { id:"c-19", slug:"3sum",                      title:"3Sum",                                difficulty:"Medium", eloReward:10, acceptance:33, topic_group:"Two Pointers",     skills:["Two Pointers","Sorting"],    estimated_mins:35 },
  { id:"c-20", slug:"search-2d-matrix",          title:"Search a 2D Matrix",                  difficulty:"Medium", eloReward:10, acceptance:50, topic_group:"Binary Search",    skills:["Binary Search","Matrix"],    estimated_mins:25 },
]

// Full descriptions keyed by slug — all 20 challenges
const CHALLENGE_DETAILS = {
  "two-sum": {
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers* such that they add up to \`target\`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.`,
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { input: "nums = [3,2,4], target = 6",      output: "[1,2]", explanation: "nums[1] + nums[2] == 6, return [1, 2]." },
      { input: "nums = [3,3], target = 6",         output: "[0,1]", explanation: "nums[0] + nums[1] == 6, return [0, 1]." },
    ],
    constraints: ["2 ≤ nums.length ≤ 10⁴", "-10⁹ ≤ nums[i] ≤ 10⁹", "-10⁹ ≤ target ≤ 10⁹", "Only one valid answer exists."],
    hints: ["A brute force approach is O(n²) — try every pair. Can you do it in O(n)?", "For each nums[i], you need target - nums[i]. Use a hash map to look this up in O(1)."],
    testCases: [
      { input: "[2,7,11,15]\n9",  expectedOutput: "[0,1]" },
      { input: "[3,2,4]\n6",       expectedOutput: "[1,2]" },
      { input: "[3,3]\n6",         expectedOutput: "[0,1]" },
    ],
    starterCode: {
      Python: `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Your solution here\n        pass\n`,
      JavaScript: `var twoSum = function(nums, target) {\n    // Your solution here\n};\n`,
      TypeScript: `function twoSum(nums: number[], target: number): number[] {\n    // Your solution here\n    return [];\n};\n`,
      Java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your solution here\n        return new int[]{};\n    }\n}\n`,
    }
  },

  "longest-substring": {
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.`,
    examples: [
      { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc", with the length of 3. Notice that "bcabcbb" has repeating characters.' },
      { input: 's = "bbbbb"',    output: "1", explanation: 'The answer is "b", with the length of 1.' },
      { input: 's = "pwwkew"',   output: "3", explanation: 'The answer is "wke", with the length of 3. "pwke" is a subsequence, not a substring.' },
    ],
    constraints: ["0 ≤ s.length ≤ 5 × 10⁴", "s consists of English letters, digits, symbols and spaces."],
    hints: ["Use a sliding window with two pointers (left, right).", "Keep a set or map of characters in the current window. When a duplicate is found, shrink the window from the left."],
    testCases: [
      { input: '"abcabcbb"', expectedOutput: "3" },
      { input: '"bbbbb"',    expectedOutput: "1" },
      { input: '"pwwkew"',   expectedOutput: "3" },
    ],
    starterCode: {
      Python: `class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        # Your solution here\n        pass\n`,
      JavaScript: `var lengthOfLongestSubstring = function(s) {\n    // Your solution here\n};\n`,
      TypeScript: `function lengthOfLongestSubstring(s: string): number {\n    // Your solution here\n    return 0;\n};\n`,
      Java: `class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Your solution here\n        return 0;\n    }\n}\n`,
    }
  },

  "median-two-arrays": {
    description: `Given two sorted arrays \`nums1\` and \`nums2\` of size \`m\` and \`n\` respectively, return **the median** of the two sorted arrays.\n\nThe overall run time complexity should be **O(log(m+n))**.`,
    examples: [
      { input: "nums1 = [1,3], nums2 = [2]", output: "2.0", explanation: "Merged array = [1,2,3] and median is 2." },
      { input: "nums1 = [1,2], nums2 = [3,4]", output: "2.5", explanation: "Merged array = [1,2,3,4] and median is (2+3)/2 = 2.5." },
      { input: "nums1 = [0,0], nums2 = [0,0]", output: "0.0", explanation: "Merged array = [0,0,0,0] and median is 0.0." },
    ],
    constraints: ["nums1.length == m", "nums2.length == n", "0 ≤ m, n ≤ 1000", "1 ≤ m + n ≤ 2000", "-10⁶ ≤ nums1[i], nums2[i] ≤ 10⁶"],
    hints: ["Binary search on the smaller array to find the correct partition.", "For a valid partition: maxLeft1 ≤ minRight2 and maxLeft2 ≤ minRight1.", "The median depends on whether the total length is odd or even."],
    testCases: [
      { input: "[1,3]\n[2]",   expectedOutput: "2.0" },
      { input: "[1,2]\n[3,4]", expectedOutput: "2.5" },
      { input: "[]\n[1]",      expectedOutput: "1.0" },
    ],
    starterCode: {
      Python: `class Solution:\n    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:\n        # Your solution here\n        pass\n`,
      JavaScript: `var findMedianSortedArrays = function(nums1, nums2) {\n    // Your solution here\n};\n`,
      TypeScript: `function findMedianSortedArrays(nums1: number[], nums2: number[]): number {\n    // Your solution here\n    return 0;\n};\n`,
      Java: `class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        // Your solution here\n        return 0.0;\n    }\n}\n`,
    }
  },

  "valid-parentheses": {
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is **valid**.\n\nAn input string is valid if:\n\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      { input: 's = "()"',     output: "true",  explanation: "One open, one close of same type." },
      { input: 's = "()[]{}"', output: "true",  explanation: "Each pair matches and is properly nested." },
      { input: 's = "(]"',     output: "false", explanation: "Open '(' is closed by ']' — wrong type." },
    ],
    constraints: ["1 ≤ s.length ≤ 10⁴", "s consists of parentheses characters only '()[]{}'."],
    hints: ["Use a stack. Push open brackets onto the stack.", "When you see a closing bracket, check if it matches the top of the stack. If not, return false.", "At the end, the stack should be empty."],
    testCases: [
      { input: '"()"',     expectedOutput: "true" },
      { input: '"()[]{}"', expectedOutput: "true" },
      { input: '"(]"',     expectedOutput: "false" },
    ],
    starterCode: {
      Python: `class Solution:\n    def isValid(self, s: str) -> bool:\n        # Your solution here\n        pass\n`,
      JavaScript: `var isValid = function(s) {\n    // Your solution here\n};\n`,
      TypeScript: `function isValid(s: string): boolean {\n    // Your solution here\n    return false;\n};\n`,
      Java: `class Solution {\n    public boolean isValid(String s) {\n        // Your solution here\n        return false;\n    }\n}\n`,
    }
  },

  "merge-intervals": {
    description: `Given an array of \`intervals\` where \`intervals[i] = [start_i, end_i]\`, merge all **overlapping intervals**, and return an array of the non-overlapping intervals that cover all the intervals in the input.`,
    examples: [
      { input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]", explanation: "Intervals [1,3] and [2,6] overlap → merge to [1,6]." },
      { input: "intervals = [[1,4],[4,5]]",               output: "[[1,5]]",                explanation: "[1,4] and [4,5] are considered overlapping (they share endpoint 4)." },
      { input: "intervals = [[1,4],[0,4]]",               output: "[[0,4]]",                explanation: "Sort by start: [[0,4],[1,4]] → merge to [0,4]." },
    ],
    constraints: ["1 ≤ intervals.length ≤ 10⁴", "intervals[i].length == 2", "0 ≤ start_i ≤ end_i ≤ 10⁴"],
    hints: ["Sort the intervals by their start time.", "Iterate through: if current start ≤ previous end, merge (extend end). Otherwise start a new interval."],
    testCases: [
      { input: "[[1,3],[2,6],[8,10],[15,18]]", expectedOutput: "[[1,6],[8,10],[15,18]]" },
      { input: "[[1,4],[4,5]]",               expectedOutput: "[[1,5]]" },
      { input: "[[1,4],[0,4]]",               expectedOutput: "[[0,4]]" },
    ],
    starterCode: {
      Python: `class Solution:\n    def merge(self, intervals: list[list[int]]) -> list[list[int]]:\n        # Your solution here\n        pass\n`,
      JavaScript: `var merge = function(intervals) {\n    // Your solution here\n};\n`,
      TypeScript: `function merge(intervals: number[][]): number[][] {\n    // Your solution here\n    return [];\n};\n`,
      Java: `class Solution {\n    public int[][] merge(int[][] intervals) {\n        // Your solution here\n        return new int[][]{};\n    }\n}\n`,
    }
  },

  "lru-cache": {
    description: `Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.\n\nImplement the \`LRUCache\` class:\n- \`LRUCache(int capacity)\` Initialize the LRU cache with **positive size** \`capacity\`.\n- \`int get(int key)\` Return the value of the \`key\` if it exists, otherwise return \`-1\`.\n- \`void put(int key, int value)\` Update or insert the value. If the cache reaches capacity, **evict the least recently used** key before inserting.\n\nBoth operations must run in **O(1)** average time complexity.`,
    examples: [
      { input: 'LRUCache(2), put(1,1), put(2,2), get(1), put(3,3), get(2), put(4,4), get(1), get(3), get(4)', output: "[null,null,null,1,null,-1,null,-1,3,4]", explanation: "After put(3,3), key 2 is evicted (least recently used). After put(4,4), key 1 is evicted." },
    ],
    constraints: ["1 ≤ capacity ≤ 3000", "0 ≤ key ≤ 10⁴", "0 ≤ value ≤ 10⁵", "At most 2×10⁵ calls will be made to get and put."],
    hints: ["Use a hash map + doubly linked list. The map gives O(1) lookup; the linked list maintains recency order.", "On every get or put, move the accessed node to the front (most recently used). Evict from the back.", "Use dummy head and tail nodes to simplify edge cases."],
    testCases: [
      { input: '2\n[["put","put","get","put","get","put","get","get","get"],[[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]]', expectedOutput: "[null,null,1,null,-1,null,-1,3,4]" },
    ],
    starterCode: {
      Python: `class LRUCache:\n    def __init__(self, capacity: int):\n        # Your initialisation here\n        pass\n\n    def get(self, key: int) -> int:\n        # Return value if key exists else -1\n        pass\n\n    def put(self, key: int, value: int) -> None:\n        # Insert or update; evict LRU if over capacity\n        pass\n`,
      JavaScript: `class LRUCache {\n    constructor(capacity) {\n        // Your initialisation here\n    }\n    get(key) {\n        // Return value or -1\n    }\n    put(key, value) {\n        // Insert / update\n    }\n}\n`,
      TypeScript: `class LRUCache {\n    constructor(capacity: number) {\n        // Your initialisation here\n    }\n    get(key: number): number {\n        return -1;\n    }\n    put(key: number, value: number): void {\n        // Insert / update\n    }\n}\n`,
      Java: `import java.util.*;\nclass LRUCache {\n    public LRUCache(int capacity) {\n        // Your initialisation here\n    }\n    public int get(int key) {\n        return -1;\n    }\n    public void put(int key, int value) {\n        // Insert / update\n    }\n}\n`,
    }
  },

  "word-search": {
    description: `Given an \`m × n\` grid of characters \`board\` and a string \`word\`, return \`true\` if \`word\` exists in the grid.\n\nThe word can be constructed from letters of **sequentially adjacent cells**, where adjacent cells are horizontally or vertically neighboring. The **same letter cell may not be used more than once**.`,
    examples: [
      { input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"', output: "true", explanation: "Path: A(0,0)→B(0,1)→C(0,2)→C(1,2)→E(2,2)→D(2,1)" },
      { input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"',    output: "true", explanation: "Path: S(1,3)→E(2,3)→E(2,2)" },
      { input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"',   output: "false", explanation: "Cannot reuse cell B(0,1)." },
    ],
    constraints: ["m == board.length", "n = board[i].length", "1 ≤ m, n ≤ 6", "1 ≤ word.length ≤ 15", "board and word consist of only lowercase and uppercase English letters."],
    hints: ["Use DFS/backtracking starting from every cell that matches word[0].", "Mark cells as visited before recursing; restore them after (backtrack).", "Prune early: if board[r][c] != word[idx], return false immediately."],
    testCases: [
      { input: '[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]]\n"ABCCED"', expectedOutput: "true" },
      { input: '[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]]\n"SEE"',    expectedOutput: "true" },
      { input: '[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]]\n"ABCB"',   expectedOutput: "false" },
    ],
    starterCode: {
      Python: `class Solution:\n    def exist(self, board: list[list[str]], word: str) -> bool:\n        # Your solution here\n        pass\n`,
      JavaScript: `var exist = function(board, word) {\n    // Your solution here\n};\n`,
      TypeScript: `function exist(board: string[][], word: string): boolean {\n    // Your solution here\n    return false;\n};\n`,
      Java: `class Solution {\n    public boolean exist(char[][] board, String word) {\n        // Your solution here\n        return false;\n    }\n}\n`,
    }
  },

  "trapping-rain-water": {
    description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.\n\nWater trapped at position \`i\` = min(max_left[i], max_right[i]) - height[i]`,
    examples: [
      { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6", explanation: "6 units of rain water are trapped (shown in blue in the classic diagram)." },
      { input: "height = [4,2,0,3,2,5]",             output: "9", explanation: "9 units of water are trapped between the walls." },
      { input: "height = [1,0,1]",                   output: "1", explanation: "1 unit trapped between height 1 walls." },
    ],
    constraints: ["n == height.length", "1 ≤ n ≤ 2 × 10⁴", "0 ≤ height[i] ≤ 10⁵"],
    hints: ["Brute force: for each index, find max height on left and right. O(n²).", "Optimize with two-pointer approach: maintain left_max and right_max pointers from both ends.", "Water at position i = min(left_max, right_max) - height[i]. Only process the side with smaller max."],
    testCases: [
      { input: "[0,1,0,2,1,0,1,3,2,1,2,1]", expectedOutput: "6" },
      { input: "[4,2,0,3,2,5]",             expectedOutput: "9" },
      { input: "[1,0,1]",                   expectedOutput: "1" },
    ],
    starterCode: {
      Python: `class Solution:\n    def trap(self, height: list[int]) -> int:\n        # Your solution here\n        pass\n`,
      JavaScript: `var trap = function(height) {\n    // Your solution here\n};\n`,
      TypeScript: `function trap(height: number[]): number {\n    // Your solution here\n    return 0;\n};\n`,
      Java: `class Solution {\n    public int trap(int[] height) {\n        // Your solution here\n        return 0;\n    }\n}\n`,
    }
  },

  "coin-change": {
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.\n\nReturn the **fewest number of coins** that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.\n\nYou may assume that you have an **infinite number** of each kind of coin.`,
    examples: [
      { input: "coins = [1,5,11,25], amount = 30", output: "2",  explanation: "25 + 5 = 30. Two coins." },
      { input: "coins = [2], amount = 3",           output: "-1", explanation: "3 cannot be formed with only coin of value 2." },
      { input: "coins = [1], amount = 0",            output: "0",  explanation: "No coins needed to make amount 0." },
    ],
    constraints: ["1 ≤ coins.length ≤ 12", "1 ≤ coins[i] ≤ 2³¹ - 1", "0 ≤ amount ≤ 10⁴"],
    hints: ["Use bottom-up dynamic programming. Define dp[i] = min coins to make amount i.", "Base case: dp[0] = 0. For each amount, try every coin.", "Transition: dp[i] = min(dp[i], dp[i - coin] + 1) for each coin ≤ i."],
    testCases: [
      { input: "[1,5,11,25]\n30", expectedOutput: "2" },
      { input: "[2]\n3",          expectedOutput: "-1" },
      { input: "[1]\n0",          expectedOutput: "0" },
    ],
    starterCode: {
      Python: `class Solution:\n    def coinChange(self, coins: list[int], amount: int) -> int:\n        # Your solution here\n        pass\n`,
      JavaScript: `var coinChange = function(coins, amount) {\n    // Your solution here\n};\n`,
      TypeScript: `function coinChange(coins: number[], amount: number): number {\n    // Your solution here\n    return -1;\n};\n`,
      Java: `class Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Your solution here\n        return -1;\n    }\n}\n`,
    }
  },

  "binary-tree-level-order": {
    description: `Given the \`root\` of a binary tree, return the **level order traversal** of its nodes' values (i.e., from left to right, level by level).`,
    examples: [
      { input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]", explanation: "Level 0: [3], Level 1: [9,20], Level 2: [15,7]." },
      { input: "root = [1]",                      output: "[[1]]",              explanation: "Single node tree." },
      { input: "root = []",                        output: "[]",                explanation: "Empty tree." },
    ],
    constraints: ["The number of nodes in the tree is in the range [0, 2000].", "-1000 ≤ Node.val ≤ 1000"],
    hints: ["Use a queue (BFS). Start by adding root.", "For each level, process all nodes currently in the queue — that's one complete level.", "Track the queue size at the start of each level iteration."],
    testCases: [
      { input: "[3,9,20,null,null,15,7]", expectedOutput: "[[3],[9,20],[15,7]]" },
      { input: "[1]",                      expectedOutput: "[[1]]" },
      { input: "[]",                        expectedOutput: "[]" },
    ],
    starterCode: {
      Python: `from collections import deque\nfrom typing import Optional\n\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\nclass Solution:\n    def levelOrder(self, root: Optional[TreeNode]) -> list[list[int]]:\n        # Your solution here\n        pass\n`,
      JavaScript: `var levelOrder = function(root) {\n    // Your solution here\n};\n`,
      TypeScript: `function levelOrder(root: TreeNode | null): number[][] {\n    // Your solution here\n    return [];\n};\n`,
      Java: `class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n}\n`,
    }
  },

  "number-of-islands": {
    description: `Given an \`m × n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return the **number of islands**.\n\nAn **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.`,
    examples: [
      { input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', output: "1", explanation: "All land cells are connected, forming one island." },
      { input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', output: "3", explanation: "Three separate groups of connected land cells." },
      { input: 'grid = [["1","0","1"],["0","0","0"],["1","0","1"]]',                                              output: "4", explanation: "Four isolated land cells, each is its own island." },
    ],
    constraints: ["m == grid.length", "n == grid[i].length", "1 ≤ m, n ≤ 300", "grid[i][j] is '0' or '1'."],
    hints: ["Use DFS or BFS. When you find a '1', increment counter and flood-fill (mark all connected '1's as visited by setting them to '0').", "This avoids revisiting the same island twice.", "4-directional adjacency: up, down, left, right."],
    testCases: [
      { input: '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', expectedOutput: "1" },
      { input: '[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', expectedOutput: "3" },
      { input: '[["1","0","1"],["0","0","0"],["1","0","1"]]',                                              expectedOutput: "4" },
    ],
    starterCode: {
      Python: `class Solution:\n    def numIslands(self, grid: list[list[str]]) -> int:\n        # Your solution here\n        pass\n`,
      JavaScript: `var numIslands = function(grid) {\n    // Your solution here\n};\n`,
      TypeScript: `function numIslands(grid: string[][]): number {\n    // Your solution here\n    return 0;\n};\n`,
      Java: `class Solution {\n    public int numIslands(char[][] grid) {\n        // Your solution here\n        return 0;\n    }\n}\n`,
    }
  },

  "climbing-stairs": {
    description: `You are climbing a staircase. It takes \`n\` steps to reach the top.\n\nEach time you can either climb \`1\` or \`2\` steps. In how many **distinct ways** can you climb to the top?`,
    examples: [
      { input: "n = 2", output: "2",  explanation: "Two ways: (1+1) or (2)." },
      { input: "n = 3", output: "3",  explanation: "Three ways: (1+1+1), (1+2), (2+1)." },
      { input: "n = 5", output: "8",  explanation: "Eight distinct ways to climb 5 stairs." },
    ],
    constraints: ["1 ≤ n ≤ 45"],
    hints: ["To reach step n, you must come from step n-1 (take 1 step) or step n-2 (take 2 steps).", "So ways(n) = ways(n-1) + ways(n-2). This is the Fibonacci sequence!", "Base cases: ways(1) = 1, ways(2) = 2."],
    testCases: [
      { input: "2", expectedOutput: "2" },
      { input: "3", expectedOutput: "3" },
      { input: "5", expectedOutput: "8" },
    ],
    starterCode: {
      Python: `class Solution:\n    def climbStairs(self, n: int) -> int:\n        # Your solution here\n        pass\n`,
      JavaScript: `var climbStairs = function(n) {\n    // Your solution here\n};\n`,
      TypeScript: `function climbStairs(n: number): number {\n    // Your solution here\n    return 0;\n};\n`,
      Java: `class Solution {\n    public int climbStairs(int n) {\n        // Your solution here\n        return 0;\n    }\n}\n`,
    }
  },

  "product-except-self": {
    description: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the **product of all elements** of \`nums\` **except** \`nums[i]\`.\n\nThe product of any prefix or suffix of \`nums\` is **guaranteed** to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in **O(n)** time and **without using the division operation**.`,
    examples: [
      { input: "nums = [1,2,3,4]",  output: "[24,12,8,6]",   explanation: "answer[0]=2×3×4=24, answer[1]=1×3×4=12, answer[2]=1×2×4=8, answer[3]=1×2×3=6." },
      { input: "nums = [-1,1,0,-3,3]", output: "[0,0,9,0,0]", explanation: "Any element where 0 appears in the product is 0." },
      { input: "nums = [2,3,4,5]",  output: "[60,40,30,24]", explanation: "Products of all elements except self." },
    ],
    constraints: ["2 ≤ nums.length ≤ 10⁵", "-30 ≤ nums[i] ≤ 30", "The product of any prefix or suffix fits in 32-bit integer."],
    hints: ["Build two arrays: prefix products (left of i) and suffix products (right of i).", "answer[i] = prefix[i] × suffix[i]. This uses O(n) extra space.", "Optimize to O(1) extra: compute prefix on the fly in the result array, then multiply suffix from the right in a second pass."],
    testCases: [
      { input: "[1,2,3,4]",      expectedOutput: "[24,12,8,6]" },
      { input: "[-1,1,0,-3,3]",  expectedOutput: "[0,0,9,0,0]" },
      { input: "[2,3,4,5]",      expectedOutput: "[60,40,30,24]" },
    ],
    starterCode: {
      Python: `class Solution:\n    def productExceptSelf(self, nums: list[int]) -> list[int]:\n        # Your solution here\n        pass\n`,
      JavaScript: `var productExceptSelf = function(nums) {\n    // Your solution here\n};\n`,
      TypeScript: `function productExceptSelf(nums: number[]): number[] {\n    // Your solution here\n    return [];\n};\n`,
      Java: `class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        // Your solution here\n        return new int[]{};\n    }\n}\n`,
    }
  },

  "find-min-rotated": {
    description: `Suppose an array of length \`n\` sorted in ascending order is **rotated** between \`1\` and \`n\` times. Given the sorted rotated array \`nums\` of **unique** elements, return the **minimum element** of this array.\n\nYou must write an algorithm that runs in **O(log n)** time.`,
    examples: [
      { input: "nums = [3,4,5,1,2]",             output: "1",  explanation: "Original: [1,2,3,4,5]. Rotated 3 times." },
      { input: "nums = [4,5,6,7,0,1,2]",         output: "0",  explanation: "Original: [0,1,2,4,5,6,7]. Rotated 4 times." },
      { input: "nums = [11,13,15,17]",            output: "11", explanation: "Array not rotated — minimum is the first element." },
    ],
    constraints: ["n == nums.length", "1 ≤ n ≤ 5000", "-5000 ≤ nums[i] ≤ 5000", "All integers in nums are unique.", "nums is sorted and rotated between 1 and n times."],
    hints: ["Use binary search. The array has at most two sorted halves.", "If nums[mid] > nums[right], the minimum is in the right half. Otherwise it's in the left half (including mid).", "Stop when left == right — that's the minimum."],
    testCases: [
      { input: "[3,4,5,1,2]",     expectedOutput: "1" },
      { input: "[4,5,6,7,0,1,2]", expectedOutput: "0" },
      { input: "[11,13,15,17]",   expectedOutput: "11" },
    ],
    starterCode: {
      Python: `class Solution:\n    def findMin(self, nums: list[int]) -> int:\n        # Your solution here\n        pass\n`,
      JavaScript: `var findMin = function(nums) {\n    // Your solution here\n};\n`,
      TypeScript: `function findMin(nums: number[]): number {\n    // Your solution here\n    return 0;\n};\n`,
      Java: `class Solution {\n    public int findMin(int[] nums) {\n        // Your solution here\n        return 0;\n    }\n}\n`,
    }
  },

  "course-schedule": {
    description: `There are a total of \`numCourses\` courses you have to take, labeled from \`0\` to \`numCourses - 1\`. You are given an array \`prerequisites\` where \`prerequisites[i] = [a_i, b_i]\` indicates that you **must** take course \`b_i\` first if you want to take course \`a_i\`.\n\nReturn \`true\` if you can finish all courses. Otherwise, return \`false\`.\n\n*(This is a cycle detection problem on a directed graph.)*`,
    examples: [
      { input: "numCourses = 2, prerequisites = [[1,0]]",       output: "true",  explanation: "Take course 0 first, then course 1. No cycle." },
      { input: "numCourses = 2, prerequisites = [[1,0],[0,1]]", output: "false", explanation: "Course 0 requires 1 and course 1 requires 0 — circular dependency." },
      { input: "numCourses = 3, prerequisites = [[1,0],[2,1]]", output: "true",  explanation: "0 → 1 → 2. No cycle." },
    ],
    constraints: ["1 ≤ numCourses ≤ 2000", "0 ≤ prerequisites.length ≤ 5000", "prerequisites[i].length == 2", "All pairs prerequisites[i] are unique."],
    hints: ["Build a directed graph. The problem reduces to: does the graph have a cycle?", "Use DFS with 3 states: unvisited (0), in-progress (1), done (2). Cycle detected if you reach an in-progress node.", "Alternatively use Kahn's algorithm (BFS topological sort): if all nodes can be processed, no cycle exists."],
    testCases: [
      { input: "2\n[[1,0]]",       expectedOutput: "true" },
      { input: "2\n[[1,0],[0,1]]", expectedOutput: "false" },
      { input: "3\n[[1,0],[2,1]]", expectedOutput: "true" },
    ],
    starterCode: {
      Python: `class Solution:\n    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:\n        # Your solution here\n        pass\n`,
      JavaScript: `var canFinish = function(numCourses, prerequisites) {\n    // Your solution here\n};\n`,
      TypeScript: `function canFinish(numCourses: number, prerequisites: number[][]): boolean {\n    // Your solution here\n    return false;\n};\n`,
      Java: `class Solution {\n    public boolean canFinish(int numCourses, int[][] prerequisites) {\n        // Your solution here\n        return false;\n    }\n}\n`,
    }
  },

  "house-robber": {
    description: `You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. The only constraint stopping you from robbing each house is that **adjacent houses have security systems** connected — it will automatically contact the police if **two adjacent houses** are broken into on the same night.\n\nGiven an integer array \`nums\` representing the amount of money in each house, return **the maximum amount** you can rob tonight without alerting the police.`,
    examples: [
      { input: "nums = [1,2,3,1]", output: "4",  explanation: "Rob house 1 (₹1) then house 3 (₹3). Total = 4." },
      { input: "nums = [2,7,9,3,1]", output: "12", explanation: "Rob house 1 (₹2), house 3 (₹9), house 5 (₹1). Total = 12." },
      { input: "nums = [5,1,1,5]",   output: "10", explanation: "Rob house 1 (₹5) and house 4 (₹5). Total = 10." },
    ],
    constraints: ["1 ≤ nums.length ≤ 100", "0 ≤ nums[i] ≤ 400"],
    hints: ["At each house, you choose: rob it (add nums[i] + dp[i-2]) or skip it (take dp[i-1]).", "dp[i] = max(nums[i] + dp[i-2], dp[i-1])", "Only two previous values matter — optimize to O(1) space with two variables."],
    testCases: [
      { input: "[1,2,3,1]",   expectedOutput: "4" },
      { input: "[2,7,9,3,1]", expectedOutput: "12" },
      { input: "[5,1,1,5]",   expectedOutput: "10" },
    ],
    starterCode: {
      Python: `class Solution:\n    def rob(self, nums: list[int]) -> int:\n        # Your solution here\n        pass\n`,
      JavaScript: `var rob = function(nums) {\n    // Your solution here\n};\n`,
      TypeScript: `function rob(nums: number[]): number {\n    // Your solution here\n    return 0;\n};\n`,
      Java: `class Solution {\n    public int rob(int[] nums) {\n        // Your solution here\n        return 0;\n    }\n}\n`,
    }
  },

  "construct-binary-tree": {
    description: `Given two integer arrays \`preorder\` and \`inorder\` where \`preorder\` is the preorder traversal and \`inorder\` is the inorder traversal of the same tree, construct and return **the binary tree**.\n\nReturn the tree as a level-order array (use \`null\` for missing nodes).`,
    examples: [
      { input: "preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]", output: "[3,9,20,null,null,15,7]", explanation: "Root is 3 (first in preorder). 9 is in left subtree (left of 3 in inorder). 20,15,7 form the right subtree." },
      { input: "preorder = [-1], inorder = [-1]",                    output: "[-1]",                    explanation: "Single node tree." },
      { input: "preorder = [1,2], inorder = [2,1]",                  output: "[1,2]",                   explanation: "Node 1 is root, node 2 is its left child." },
    ],
    constraints: ["1 ≤ preorder.length ≤ 3000", "inorder.length == preorder.length", "-3000 ≤ preorder[i], inorder[i] ≤ 3000", "preorder and inorder consist of unique values."],
    hints: ["The first element of preorder is always the root.", "Find the root's index in inorder — everything to its left is the left subtree, everything to its right is the right subtree.", "Recurse: buildTree(preorder[1:1+leftSize], leftInorder) for left, buildTree(preorder[1+leftSize:], rightInorder) for right."],
    testCases: [
      { input: "[3,9,20,15,7]\n[9,3,15,20,7]", expectedOutput: "[3,9,20,null,null,15,7]" },
      { input: "[-1]\n[-1]",                    expectedOutput: "[-1]" },
      { input: "[1,2]\n[2,1]",                  expectedOutput: "[1,2]" },
    ],
    starterCode: {
      Python: `from typing import Optional\n\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\nclass Solution:\n    def buildTree(self, preorder: list[int], inorder: list[int]) -> Optional[TreeNode]:\n        # Your solution here\n        pass\n`,
      JavaScript: `var buildTree = function(preorder, inorder) {\n    // Your solution here\n};\n`,
      TypeScript: `function buildTree(preorder: number[], inorder: number[]): TreeNode | null {\n    // Your solution here\n    return null;\n};\n`,
      Java: `class Solution {\n    public TreeNode buildTree(int[] preorder, int[] inorder) {\n        // Your solution here\n        return null;\n    }\n}\n`,
    }
  },

  "maximum-subarray": {
    description: `Given an integer array \`nums\`, find the **subarray** with the largest sum and return **its sum**.\n\nA **subarray** is a contiguous non-empty sequence of elements within an array.\n\n*(Classic Kadane's Algorithm problem)*`,
    examples: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6",  explanation: "Subarray [4,-1,2,1] has the largest sum = 6." },
      { input: "nums = [1]",                      output: "1",  explanation: "Single element, sum is 1." },
      { input: "nums = [5,4,-1,7,8]",             output: "23", explanation: "Entire array [5,4,-1,7,8] sums to 23." },
    ],
    constraints: ["1 ≤ nums.length ≤ 10⁵", "-10⁴ ≤ nums[i] ≤ 10⁴"],
    hints: ["Kadane's Algorithm: keep a running sum. If adding the next element helps, keep going. If the running sum goes negative, reset it to 0 (start fresh).", "max_sum = max(max_sum, current_sum) at each step.", "Time complexity: O(n). Space: O(1)."],
    testCases: [
      { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6" },
      { input: "[1]",                      expectedOutput: "1" },
      { input: "[5,4,-1,7,8]",             expectedOutput: "23" },
    ],
    starterCode: {
      Python: `class Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        # Your solution here\n        pass\n`,
      JavaScript: `var maxSubArray = function(nums) {\n    // Your solution here\n};\n`,
      TypeScript: `function maxSubArray(nums: number[]): number {\n    // Your solution here\n    return 0;\n};\n`,
      Java: `class Solution {\n    public int maxSubArray(int[] nums) {\n        // Your solution here\n        return 0;\n    }\n}\n`,
    }
  },

  "3sum": {
    description: `Given an integer array \`nums\`, return all the triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`.\n\nNotice that the solution set **must not contain duplicate triplets**.`,
    examples: [
      { input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]",  explanation: "nums[0]+nums[1]+nums[2]=-1+0+1=0 and nums[0]+nums[3]+nums[4]=-1+2+(-1)=0." },
      { input: "nums = [0,1,1]",          output: "[]",                     explanation: "No triplet sums to zero." },
      { input: "nums = [0,0,0]",          output: "[[0,0,0]]",              explanation: "Only one valid triplet." },
    ],
    constraints: ["3 ≤ nums.length ≤ 3000", "-10⁵ ≤ nums[i] ≤ 10⁵"],
    hints: ["Sort the array first. Then for each element nums[i], use two pointers (left=i+1, right=end) to find pairs that sum to -nums[i].", "Skip duplicates: if nums[i] == nums[i-1], skip. Similarly skip duplicate left/right pointer values after finding a valid triplet.", "Time: O(n²), Space: O(1) excluding output."],
    testCases: [
      { input: "[-1,0,1,2,-1,-4]", expectedOutput: "[[-1,-1,2],[-1,0,1]]" },
      { input: "[0,1,1]",          expectedOutput: "[]" },
      { input: "[0,0,0]",          expectedOutput: "[[0,0,0]]" },
    ],
    starterCode: {
      Python: `class Solution:\n    def threeSum(self, nums: list[int]) -> list[list[int]]:\n        # Your solution here\n        pass\n`,
      JavaScript: `var threeSum = function(nums) {\n    // Your solution here\n};\n`,
      TypeScript: `function threeSum(nums: number[]): number[][] {\n    // Your solution here\n    return [];\n};\n`,
      Java: `class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n}\n`,
    }
  },

  "search-2d-matrix": {
    description: `You are given an \`m × n\` integer matrix \`matrix\` with the following two properties:\n\n- Each row is sorted in non-decreasing order.\n- The first integer of each row is greater than the last integer of the previous row.\n\nGiven an integer \`target\`, return \`true\` if \`target\` is in the matrix or \`false\` otherwise.\n\nYou must write a solution in **O(log(m × n))** time complexity.`,
    examples: [
      { input: "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3",  output: "true",  explanation: "3 is at position matrix[0][1]." },
      { input: "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13", output: "false", explanation: "13 is not in the matrix." },
      { input: "matrix = [[1]], target = 1",                                     output: "true",  explanation: "1×1 matrix containing target." },
    ],
    constraints: ["m == matrix.length", "n == matrix[0].length", "1 ≤ m, n ≤ 100", "-10⁴ ≤ matrix[i][j], target ≤ 10⁴"],
    hints: ["Treat the matrix as a 1D sorted array of length m×n.", "For index mid in 1D, the 2D position is: row = mid // n, col = mid % n.", "Apply standard binary search on this virtual 1D array."],
    testCases: [
      { input: "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n3",  expectedOutput: "true" },
      { input: "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n13", expectedOutput: "false" },
      { input: "[[1]]\n1",                                     expectedOutput: "true" },
    ],
    starterCode: {
      Python: `class Solution:\n    def searchMatrix(self, matrix: list[list[int]], target: int) -> bool:\n        # Your solution here\n        pass\n`,
      JavaScript: `var searchMatrix = function(matrix, target) {\n    // Your solution here\n};\n`,
      TypeScript: `function searchMatrix(matrix: number[][], target: number): boolean {\n    // Your solution here\n    return false;\n};\n`,
      Java: `class Solution {\n    public boolean searchMatrix(int[][] matrix, int target) {\n        // Your solution here\n        return false;\n    }\n}\n`,
    }
  },
}

// Generic starter code for challenges not in CHALLENGE_DETAILS
const genericStarter = (title, lang) => {
  const fn = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "")
  const starters = {
    Python:     `def ${fn}(*args):\n    # TODO: implement ${title}\n    pass\n`,
    JavaScript: `var ${fn} = function(...args) {\n    // TODO: implement ${title}\n};\n`,
    TypeScript: `function ${fn}(...args: any[]): any {\n    // TODO: implement ${title}\n};\n`,
    Java:       `class Solution {\n    public Object ${fn}(Object... args) {\n        // TODO: implement ${title}\n        return null;\n    }\n}\n`,
  }
  return starters[lang] || starters.Python
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Spinner({ size = 16, color = T.indigo }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${color}30`, borderTopColor: color, animation: "cc-spin .7s linear infinite", flexShrink: 0 }} />
}
function DiffBadge({ diff }) {
  const s = DIFF_STYLE[diff] || DIFF_STYLE.Medium
  return <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:99, fontSize:11, fontWeight:700, color:s.color, background:s.bg }}>{diff}</span>
}

// ─── Code editor (lightweight textarea-based with line numbers) ───────────────
function CodeEditor({ value, onChange, language }) {
  const taRef = useRef()
  const lines = (value || "").split("\n").length

  const handleTab = (e) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const ta = taRef.current
      const s = ta.selectionStart, end = ta.selectionEnd
      const newVal = value.substring(0, s) + "  " + value.substring(end)
      onChange(newVal)
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 2 }, 0)
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.editor, borderRadius: 0, overflow: "hidden", fontFamily: "'DM Mono','Fira Code','Courier New',monospace", fontSize: 13, minHeight: 0 }}>
      {/* Language tag */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 14px", borderBottom:"1px solid #E8E3DA", background:"#FAF7F2", flexShrink:0 }}>
        <span style={{ fontSize:11, color:"#9CDCFE", fontWeight:600 }}>{language}</span>
        <span style={{ fontSize:10, color:"#A8A29E" }}>auto-save ✓</span>
      </div>
      {/* Editor area */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0, position:"relative" }}>
        {/* Line numbers */}
        <div style={{ padding:"12px 0", minWidth:42, textAlign:"right", paddingRight:12, color:"rgba(0,0,0,0.12)", fontSize:12, lineHeight:"1.6em", userSelect:"none", background:"rgba(0,0,0,0.15)", flexShrink:0, overflowY:"hidden" }}>
          {Array.from({ length: Math.max(lines, 10) }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={taRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleTab}
          spellCheck={false}
          style={{ flex:1, padding:"12px", background:"transparent", border:"none", outline:"none", color:"#D4D4D4", fontSize:13, lineHeight:"1.6em", resize:"none", fontFamily:"inherit", whiteSpace:"pre", overflowWrap:"normal", overflowX:"auto" }}
        />
      </div>
    </div>
  )
}

// ─── Test Results panel ───────────────────────────────────────────────────────
function TestResults({ results, loading, error }) {
  if (loading) return (
    <div style={{ padding:16, display:"flex", alignItems:"center", gap:10, color:T.ink3, fontSize:12 }}>
      <Spinner size={14} color={T.indigo} />
      <span>Running test cases…</span>
    </div>
  )
  if (error) return (
    <div style={{ padding:16, background:T.red2, borderTop:`1px solid ${T.border}` }}>
      <div style={{ fontSize:12, color:T.red, fontWeight:600, marginBottom:4 }}>⚠ Runtime Error</div>
      <pre style={{ fontSize:11, color:T.red, margin:0, whiteSpace:"pre-wrap", fontFamily:"monospace" }}>{error}</pre>
    </div>
  )
  if (!results || !results.length) return null
  const passed = results.filter(r => r.passed).length
  const allPass = passed === results.length
  return (
    <div style={{ borderTop:`1px solid ${T.border}`, background:"#FFFFFF", flexShrink:0, maxHeight:260, overflowY:"auto" }}>
      <div style={{ padding:"8px 14px", background: allPass ? T.green2 : T.red2, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:12, fontWeight:700, color: allPass ? T.green : T.red }}>
          {allPass ? "✓ All tests passed" : `${passed}/${results.length} tests passed`}
        </span>
        <span style={{ fontSize:11, color:T.ink3 }}>{results[0]?.runtime || ""}</span>
      </div>
      {results.map((r, i) => (
        <div key={i} style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}`, background: r.passed ? "#FAFFFE" : "#FFFAFA" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <span style={{ fontSize:12, fontWeight:700, color: r.passed ? T.green : T.red }}>
              {r.passed ? "✓" : "✗"} Case {i+1}
            </span>
            {r.runtime && <span style={{ fontSize:10, color:T.ink4, background:T.bg, padding:"1px 6px", borderRadius:4 }}>{r.runtime}</span>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:11 }}>
            <div>
              <div style={{ color:T.ink4, fontWeight:600, marginBottom:2 }}>INPUT</div>
              <pre style={{ margin:0, background:T.bg, padding:"4px 8px", borderRadius:4, fontFamily:"monospace", color:T.ink2, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>{r.input}</pre>
            </div>
            <div>
              <div style={{ color:T.ink4, fontWeight:600, marginBottom:2 }}>EXPECTED</div>
              <pre style={{ margin:0, background:T.bg, padding:"4px 8px", borderRadius:4, fontFamily:"monospace", color:T.ink2, whiteSpace:"pre-wrap" }}>{r.expected}</pre>
            </div>
            {!r.passed && (
              <div style={{ gridColumn:"1/-1" }}>
                <div style={{ color:T.red, fontWeight:600, marginBottom:2 }}>YOUR OUTPUT</div>
                <pre style={{ margin:0, background:T.red2, padding:"4px 8px", borderRadius:4, fontFamily:"monospace", color:T.red, whiteSpace:"pre-wrap" }}>{r.actual}</pre>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Result overlay shown after submission ────────────────────────────────────
function SubmitResultOverlay({ result, onClose, onRetry }) {
  if (!result) return null
  const { score, eloGain, newElo, grade, summary, rubric, attemptNumber, timedOut, feedback, tip } = result
  const gradeColor = grade === "A+" || grade === "A" ? T.green : grade === "B+" || grade === "B" ? T.indigo : grade === "C" ? T.amber : T.red

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)", padding:16 }}>
      <div style={{ width:"100%", maxWidth:500, background:T.surface, borderRadius:20, overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.25)", border:`1px solid ${T.border}` }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 16px", background: score >= 80 ? T.green2 : score >= 60 ? T.indigo3 : T.amber2, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:T.surface, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", fontSize:18, fontWeight:900, color:gradeColor, boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>{grade}</div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:T.ink }}>{timedOut ? "Time's Up — Partial Review" : score >= 80 ? "Accepted ✓" : score >= 60 ? "Good Attempt" : "Needs Improvement"}</div>
              <div style={{ fontSize:12, color:T.ink3, marginTop:2 }}>{timedOut ? "Partial score awarded based on what was written." : summary}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:12 }}>
            {[
              { label:"SCORE",      value:`${score}/100`,  color: score >= 80 ? T.green : score >= 60 ? T.indigo : T.amber },
              { label:"ELO GAINED", value:`+${eloGain}`,   color: T.indigo },
              { label:"ATTEMPT",    value:`#${attemptNumber}`, color: attemptNumber > 1 ? T.amber : T.green },
            ].map(s => (
              <div key={s.label} style={{ flex:1, background:T.surface, borderRadius:10, padding:"10px 12px", textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize:18, fontWeight:900, color:s.color, fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:9, color:T.ink4, fontWeight:700, letterSpacing:1, marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rubric */}
        <div style={{ padding:"16px 24px" }}>
          {attemptNumber > 1 && (
            <div style={{ padding:"8px 12px", background:T.amber2, border:`1px solid ${T.amber}22`, borderRadius:8, fontSize:12, color:T.amber, fontWeight:600, marginBottom:12 }}>
              ⚡ Attempt #{attemptNumber} — ELO gain reduced by {attemptNumber === 2 ? "25%" : "50%"}. First attempt always earns full ELO.
            </div>
          )}
          <div style={{ fontSize:10, fontWeight:700, color:T.ink4, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>Rubric Breakdown</div>
          {(rubric || []).map((r, i) => (
            <div key={i} style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:12, color:T.ink2 }}>{r.criterion}</span>
                <span style={{ fontSize:12, fontWeight:700, color: r.score >= 80 ? T.green : r.score >= 60 ? T.indigo : T.amber }}>{r.score}/100</span>
              </div>
              <div style={{ height:5, background:T.bg, borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${r.score}%`, background: r.score >= 80 ? T.green : r.score >= 60 ? T.indigo : T.amber, borderRadius:99, transition:"width 0.8s ease" }} />
              </div>
            </div>
          ))}
          {(feedback || tip) && (
            <div style={{ marginTop:12, padding:"10px 12px", background:T.indigo3, borderRadius:8, borderLeft:`3px solid ${T.indigo}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.indigo, letterSpacing:1.2, marginBottom:4 }}>💡 AI FEEDBACK</div>
              <div style={{ fontSize:12, color:T.ink2, lineHeight:1.6 }}>{feedback || tip}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding:"12px 24px 20px", display:"flex", gap:10, borderTop:`1px solid ${T.border}` }}>
          <button onClick={onRetry} style={{ flex:1, padding:"11px", background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:10, fontSize:13, fontWeight:700, color:T.ink3, cursor:"pointer" }}>Try Again</button>
          <button onClick={onClose} style={{ flex:2, padding:"11px", background:T.indigo, border:"none", borderRadius:10, fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer" }}>View in History →</button>
        </div>
      </div>
    </div>
  )
}

// ─── History tab ──────────────────────────────────────────────────────────────
function CommonHistory({ uid }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    setLoading(true)
    const unsub = arenaDb.subscribeHistory(uid, docs => {
      // Show all history — no domain filter so submissions always appear regardless of how
      // the domain field was saved.
      setRecords([...docs].sort((a, b) => new Date(b.completedAt || b.completed_at) - new Date(a.completedAt || a.completed_at)))
      setLoading(false)
    })
    return () => unsub()
  }, [uid])

  if (loading) return <div style={{ padding:32, display:"flex", justifyContent:"center" }}><Spinner /></div>

  if (!records.length) return (
    <div style={{ padding:"64px 24px", textAlign:"center" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
      <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:6 }}>No submissions yet</div>
      <div style={{ fontSize:13, color:T.ink3 }}>Complete a challenge to see your history here.</div>
    </div>
  )

  const totalElo = records.reduce((s, r) => s + (r.elo_delta || r.eloDelta || 0), 0)
  const avgScore = records.length ? Math.round(records.reduce((s, r) => s + (r.score || r.review?.score || 0), 0) / records.length) : 0

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Stats */}
      <div style={{ padding:"12px 20px", background:"#FFFFFF", borderBottom:`1px solid ${T.border}`, display:"flex", gap:24, flexShrink:0 }}>
        {[
          { label:"Solved", value:records.length },
          { label:"Avg Score", value:`${avgScore}/100` },
          { label:"Total ELO Gained", value:`+${totalElo}` },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize:16, fontWeight:800, color:T.ink, fontFamily:"'DM Mono',monospace" }}>{s.value}</div>
            <div style={{ fontSize:10, color:T.ink4, fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Records — expandable */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px 12px", display:"flex", flexDirection:"column", gap:8 }}>
        {records.map((r, i) => <HistoryRecord key={i} r={r} />)}
      </div>
    </div>
  )
}

function HistoryRecord({ r }) {
  const [open, setOpen] = useState(false)
  const score    = r.score ?? r.review?.score ?? 0
  const elo      = r.elo_delta ?? r.eloDelta ?? r.review?.eloDelta ?? 0
  const ts       = new Date(r.completedAt || r.completed_at)
  const diff     = r.difficulty || "Medium"
  const dc       = DIFF_STYLE[diff] || {}
  const sc       = score >= 80 ? T.green : score >= 60 ? T.indigo : T.amber
  const scBg     = score >= 80 ? T.green2 : score >= 60 ? T.indigo3 : T.amber2
  const gradeFor = s => s>=90?"A+":s>=80?"A":s>=70?"B+":s>=60?"B":s>=50?"C":"D"
  const feedback = r.feedback || r.review?.summary || ""
  const scenario = r.scenario || ""
  const answer   = r.user_answer || r.submittedAnswer || ""
  const expOut   = r.expected_output || r.expectedOutput || ""
  return (
    <div style={{ border:`1px solid ${open ? T.indigo+"40" : T.border}`, borderRadius:12, overflow:"hidden", background:"#FFFFFF", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              {/* Header */}
              <div onClick={() => setOpen(o => !o)}
                style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
                {/* Score circle */}
                <div style={{ width:44, height:44, borderRadius:12, background:scBg,
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  fontWeight:800, fontSize:15, color:sc, flexShrink:0 }}>
                  {score}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:3,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {r.title || "Challenge"}
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:dc.color||T.amber,
                      background:(dc.bg||T.amber2), padding:"2px 8px", borderRadius:99 }}>{diff}</span>
                    <span style={{ fontSize:11, color:T.ink4 }}>
                      {ts.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
                      {" · "}{ts.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                    </span>
                    {r.domain && <span style={{ fontSize:10, color:T.indigo, fontWeight:600,
                      background:T.indigo3, padding:"1px 6px", borderRadius:99 }}>{r.domain.toUpperCase()}</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:16, fontWeight:900, color:sc, fontFamily:"'DM Mono',monospace" }}>
                    {gradeFor(score)}
                  </div>
                  <div style={{ fontSize:12, fontWeight:800, color:T.indigo, fontFamily:"'DM Mono',monospace" }}>
                    +{elo} ELO
                  </div>
                  <div style={{ fontSize:11, color:T.ink4 }}>{open ? "▲ Hide" : "▼ Detail"}</div>
                </div>
              </div>

              {/* Expanded detail */}
              {open && (
                <div style={{ borderTop:`1px solid ${T.border}`, padding:"14px 16px", background:"#1A1714",
                  display:"flex", flexDirection:"column", gap:12 }}>

                  {/* Scenario */}
                  {scenario && (
                    <div>
                      <div style={{ fontSize:10, fontWeight:800, color:T.ink3, textTransform:"uppercase",
                        letterSpacing:1, marginBottom:5 }}>📋 Scenario / Problem</div>
                      <div style={{ fontSize:12, color:T.ink2, lineHeight:1.7, background:"#FFFFFF",
                        padding:"10px 12px", borderRadius:10, border:`1px solid ${T.border}` }}>
                        {scenario}
                      </div>
                    </div>
                  )}

                  {/* Expected output + Submitted answer side by side */}
                  {(expOut || answer) && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      {expOut && (
                        <div>
                          <div style={{ fontSize:10, fontWeight:800, color:T.green, textTransform:"uppercase",
                            letterSpacing:1, marginBottom:5 }}>✓ Expected Output</div>
                          <pre style={{ margin:0, fontSize:11, color:T.ink2, background:T.green2,
                            padding:"8px 12px", borderRadius:10, border:`1px solid rgba(22,163,74,0.15)`,
                            whiteSpace:"pre-wrap", wordBreak:"break-word",
                            fontFamily:"'DM Mono',monospace", lineHeight:1.6,
                            maxHeight:100, overflowY:"auto" }}>
                            {expOut}
                          </pre>
                        </div>
                      )}
                      {answer && (
                        <div>
                          <div style={{ fontSize:10, fontWeight:800, color:T.indigo, textTransform:"uppercase",
                            letterSpacing:1, marginBottom:5 }}>💻 Your Solution</div>
                          <pre style={{ margin:0, fontSize:11, color:T.ink2, background:T.indigo3,
                            padding:"8px 12px", borderRadius:10, border:`1px solid rgba(61,78,172,0.12)`,
                            whiteSpace:"pre-wrap", wordBreak:"break-word",
                            fontFamily:"'DM Mono',monospace", lineHeight:1.6,
                            maxHeight:140, overflowY:"auto" }}>
                            {answer.slice(0,500)}{answer.length > 500 ? "\n…" : ""}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Feedback */}
                  {feedback && (
                    <div>
                      <div style={{ fontSize:10, fontWeight:800, color:"#7C3AED", textTransform:"uppercase",
                        letterSpacing:1, marginBottom:5 }}>🤖 AI Feedback</div>
                      <div style={{ fontSize:12, color:T.ink2, lineHeight:1.7, background:"#EDE9FE",
                        padding:"10px 12px", borderRadius:10,
                        border:"1px solid rgba(124,58,237,0.12)", borderLeft:"3px solid #7C3AED" }}>
                        {feedback}
                      </div>
                    </div>
                  )}

                  {/* Stats chips */}
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {[
                      { l:"Score",   v:`${score}/100`, c:sc },
                      { l:"Grade",   v:gradeFor(score), c:sc },
                      { l:"ELO Earned", v:`+${elo}`, c:T.indigo },
                    ].map((s,j) => (
                      <div key={j} style={{ padding:"6px 12px", background:"#FFFFFF", borderRadius:8,
                        border:`1px solid ${T.border}`, textAlign:"center" }}>
                        <div style={{ fontSize:13, fontWeight:800, color:s.c, fontFamily:"monospace" }}>{s.v}</div>
                        <div style={{ fontSize:9, color:T.ink4, fontWeight:700, textTransform:"uppercase",
                          letterSpacing:0.8, marginTop:1 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
}

// ─── Leaderboard tab ──────────────────────────────────────────────────────────
function CommonLeaderboard({ uid, userElo }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const unsub = arenaDb.subscribeLeaderboard("dsa", data => {
      setEntries(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  if (loading) return <div style={{ padding:32, display:"flex", justifyContent:"center" }}><Spinner /></div>

  return (
    <div style={{ height:"100%", overflowY:"auto", background:"#FFFFFF" }}>
      <div style={{ padding:"14px 20px", borderBottom:`1px solid ${T.border}`, fontWeight:800, fontSize:15, color:T.ink }}>🏆 Global Leaderboard — Common Challenges</div>
      {entries.map((e, i) => {
        const isMe = e.user_id === uid
        return (
          <div key={i} style={{ padding:"12px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:12, background: isMe ? T.indigo3 : "#fff" }}>
            <div style={{ width:28, height:28, borderRadius:8, background: i < 3 ? ["#FFD700","#C0C0C0","#CD7F32"][i]+"22" : T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color: i < 3 ? ["#B8860B","#708090","#8B4513"][i] : T.ink3, flexShrink:0 }}>
              {i + 1}
            </div>
            <div style={{ flex:1, fontSize:13, fontWeight: isMe ? 800 : 600, color: isMe ? T.indigo : T.ink }}>
              {e.display_name || "Anonymous"} {isMe && "(You)"}
            </div>
            <div style={{ fontSize:13, fontWeight:800, color:T.indigo, fontFamily:"'DM Mono',monospace" }}>{e.elo}</div>
            <div style={{ fontSize:11, color:T.ink4 }}>{e.tasks_done} solved</div>
          </div>
        )
      })}
      {!entries.length && (
        <div style={{ padding:"48px 24px", textAlign:"center", color:T.ink3, fontSize:13 }}>No data yet. Complete challenges to appear here.</div>
      )}
    </div>
  )
}

// ─── ELO reward per difficulty ────────────────────────────────────────────────
// Common challenges award less ELO than domain missions to keep them distinct.
const ELO_BY_DIFFICULTY = { Easy: 5, Medium: 10, Hard: 15, Expert: 20 }
const eloForDiff = (diff) => ELO_BY_DIFFICULTY[diff] ?? 10

// ─── Build rich detail from a problems-table row ──────────────────────────────
// Replaces the old CHALLENGE_DETAILS[slug] hardcoded lookup.
// Works for all 298 problems, not just the original 20.
function buildDetail(challenge) {
  if (!challenge) return {}
  const constraintsArray = challenge.constraints
    ? challenge.constraints.split("|").map(c => c.trim()).filter(Boolean)
    : []
  // Derive 1-2 hints from the editorial (shown only after user asks)
  const hints = challenge.editorial
    ? [challenge.editorial]
    : ["Try a brute force approach first, then look for a more efficient pattern.", "Think about which data structure gives O(1) lookup or reduces time complexity."]
  return {
    description:  challenge.statement || challenge.description || "",
    examples:     challenge.examples  || [],   // already [{input, output, explanation}]
    constraints:  constraintsArray,
    hints,
    // Normalize DB snake_case → camelCase so backend handles either format
    testCases:    (challenge.test_cases || []).map(tc => ({
      input:          tc.input ?? "",
      expectedOutput: tc.expected_output ?? tc.expectedOutput ?? "",
      is_hidden:      tc.is_hidden ?? false,
    })),
    starterCode:  {},  // use genericStarter per language
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKSTATION TYPE RESOLVER
// Determines which right-panel interface to render for a given problem.
//   "code"            → Python / JS / TS / Java code editor (default)
//   "calculator"      → Formula-based numeric answer input (aptitude, engineering formula)
//   "multiple_choice" → A/B/C/D selection workstation (Common Challenge Engine)
//   "sequence"        → Drag-and-drop ordering workstation (coming soon)
//   "sql"             → SQL editor
// ─────────────────────────────────────────────────────────────────────────────
function resolveWorkstationType(problem) {
  if (!problem) return "code"
  // Prefer explicit interaction_type column (new Universal Challenge Engine schema)
  const it = problem.interaction_type
  if (it === "multiple_choice") return "multiple_choice"
  if (it === "calculator")      return "calculator"
  if (it === "sequence")        return "sequence"
  if (it === "diagram_click")   return "diagram_click"
  // Legacy fallback: derive from languages array
  const langs = (problem.languages || []).map(l => l.toLowerCase())
  if (langs.includes("calculator")) return "calculator"
  if (langs.includes("sql"))        return "sql"
  return "code"
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULATOR WORKSTATION
// Shown for aptitude / engineering formula problems (languages: ["calculator"]).
// Students enter a numeric answer; tolerance is checked client-side from test_cases.
// ─────────────────────────────────────────────────────────────────────────────
function CalculatorWorkstation({ challenge, isSolved, onSubmitAnswer, submitting, submitResult, testResults }) {
  const [answer, setAnswer] = useState("")
  const [localResult, setLocalResult] = useState(null) // {pass: bool, expected, got}

  const tc = challenge?.test_cases?.[0]
  // DB stores as expected_output (snake_case); also handle legacy camelCase variants
  const expected    = tc?.expected ?? tc?.expected_output ?? tc?.expectedOutput ?? null
  const tolerance   = tc?.tolerance ?? tc?.tolerance_pct ?? 0.01

  const handleCheck = () => {
    const val = parseFloat(answer)
    if (isNaN(val)) { setLocalResult({ pass: false, msg: "Enter a valid number." }); return }
    if (expected === null) { setLocalResult({ pass: false, msg: "No reference answer available." }); return }
    const diff = Math.abs(val - parseFloat(expected))
    const pass = diff <= tolerance
    setLocalResult({ pass, expected: parseFloat(expected), got: val, diff: diff.toFixed(6) })
  }

  const handleSubmit = () => {
    const val = parseFloat(answer)
    if (isNaN(val)) return
    onSubmitAnswer(answer)
  }

  const eloReward = challenge?.eloReward ?? 5

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#FAF7F2", overflow: "hidden" }}>
      {/* Formula hint banner */}
      {challenge?.editorial && (
        <div style={{ padding: "10px 20px", background: "#FFFBEB", borderBottom: "1px solid #FDE68A", fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>
          <span style={{ fontWeight: 700, marginRight: 6 }}>💡 Formula Hint:</span>
          {challenge.editorial.split("```")[0]?.replace(/^##\s*Editorial\s*/i, "").trim().slice(0, 200)}
        </div>
      )}

      {/* Answer area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", gap: 24 }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2, marginBottom: 10 }}>
            Your Answer
          </div>
          <input
            type="number"
            step="any"
            value={answer}
            onChange={e => { setAnswer(e.target.value); setLocalResult(null) }}
            placeholder="Enter numeric answer (e.g. 12.5)"
            disabled={isSolved}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "14px 18px", fontSize: 22, fontFamily: "'DM Mono', monospace",
              fontWeight: 700, border: `2px solid ${localResult ? (localResult.pass ? T.green : T.red) : T.border}`,
              borderRadius: 10, outline: "none", background: isSolved ? "#F5F5F0" : "#fff",
              color: T.ink, transition: "border-color 0.15s",
            }}
          />
          {/* Tolerance note */}
          <div style={{ fontSize: 11, color: T.ink4, marginTop: 6 }}>
            Accepted within ±{tolerance} of the correct answer
          </div>
        </div>

        {/* Result feedback */}
        {localResult && (
          <div style={{
            width: "100%", maxWidth: 480, padding: "14px 18px", borderRadius: 10,
            background: localResult.pass ? T.green2 : T.red2,
            border: `1px solid ${localResult.pass ? "#86EFAC" : "#FCA5A5"}`,
            fontSize: 13, lineHeight: 1.6,
          }}>
            {localResult.msg ? (
              <span style={{ color: T.red, fontWeight: 600 }}>{localResult.msg}</span>
            ) : localResult.pass ? (
              <>
                <div style={{ color: T.green, fontWeight: 700, marginBottom: 4 }}>✓ Correct!</div>
                <div style={{ color: "#166534" }}>Your answer <strong>{localResult.got}</strong> matches expected <strong>{localResult.expected}</strong></div>
              </>
            ) : (
              <>
                <div style={{ color: T.red, fontWeight: 700, marginBottom: 4 }}>✗ Not quite</div>
                <div style={{ color: "#991B1B" }}>Expected ≈ <strong>{localResult.expected}</strong> | Your answer: <strong>{localResult.got}</strong> | Difference: {localResult.diff}</div>
              </>
            )}
          </div>
        )}

        {/* Submit result */}
        {submitResult && (
          <div style={{ width: "100%", maxWidth: 480, padding: "14px 18px", borderRadius: 10, background: submitResult.correct ? T.green2 : T.red2, border: `1px solid ${submitResult.correct ? "#86EFAC" : "#FCA5A5"}`, fontSize: 13 }}>
            {submitResult.correct
              ? <span style={{ color: T.green, fontWeight: 700 }}>🎉 Submitted & accepted! +{eloReward} ELO awarded</span>
              : <span style={{ color: T.red, fontWeight: 700 }}>Submission rejected. Check your calculation and try again.</span>}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: T.ink3, display: "flex", alignItems: "center", gap: 10 }}>
          {challenge.difficulty} · Numeric Answer
          {!isSolved && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9CDCFE", background: "rgba(156,220,254,0.1)", padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(156,220,254,0.2)" }}>
              +{eloReward} ELO ⚡
            </span>
          )}
          {isSolved && (
            <span style={{ fontSize: 11, fontWeight: 700, color: T.green, background: T.green2, padding: "2px 8px", borderRadius: 99 }}>🔒 Solved</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCheck} disabled={!answer || isSolved}
            style={{ padding: "9px 18px", background: "#F3F4F6", border: `1px solid ${T.border}`, borderRadius: 8, color: T.ink2, fontSize: 13, fontWeight: 600, cursor: !answer || isSolved ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            ▷ Check Answer
          </button>
          {isSolved ? (
            <button disabled style={{ padding: "9px 22px", background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.3)", borderRadius: 8, color: T.green, fontSize: 13, fontWeight: 700, cursor: "not-allowed", fontFamily: "inherit" }}>
              🔒 Already Solved
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting || !answer}
              style={{ padding: "9px 22px", background: submitting ? "rgba(61,78,172,0.5)" : T.indigo, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: submitting || !answer ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
              {submitting ? "Submitting…" : "✓ Submit Answer"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SQL RESULTS PANEL
// Renders the AI-evaluated SQL output as a styled data table + auto bar chart.
// Shows columns/rows returned by the AI evaluator alongside pass/fail status.
// ─────────────────────────────────────────────────────────────────────────────
function SQLResultsPanel({ results, loading, error }) {
  if (loading) return (
    <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, color: T.ink3, fontSize: 12, borderTop: `1px solid ${T.border}`, background: "#fff", flexShrink: 0 }}>
      <Spinner size={14} color={T.indigo} />
      <span>Evaluating SQL query with AI…</span>
    </div>
  )
  if (error) return (
    <div style={{ padding: 14, background: T.red2, borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
      <div style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>{error}</div>
    </div>
  )
  if (!results?.length) return null

  const allPassed    = results.every(r => r.passed)
  const passedCount  = results.filter(r => r.passed).length
  const first        = results[0]
  const columns      = first?.columns      || []
  const sampleRows   = first?.sample_rows  || first?.sampleRows || []
  const hasSampleData = columns.length > 0 && sampleRows.length > 0

  // Detect a numeric column for the bar chart
  const numericCol = columns.slice(1).find(col =>
    sampleRows.length > 0 && sampleRows.every(r => !isNaN(parseFloat(r[col])) && r[col] !== "")
  ) || (columns.length > 1 && sampleRows.every(r => !isNaN(parseFloat(r[columns[1]]))) ? columns[1] : null)
  const labelCol   = numericCol ? columns.find(c => c !== numericCol) : null
  const chartData  = numericCol && labelCol
    ? sampleRows.map(r => ({ label: String(r[labelCol] ?? "").slice(0, 12), value: parseFloat(r[numericCol]) || 0 }))
    : []
  const maxVal = chartData.length ? Math.max(...chartData.map(d => d.value), 0.001) : 1

  return (
    <div style={{ borderTop: `1px solid ${T.border}`, background: "#fff", flexShrink: 0, maxHeight: 420, overflowY: "auto" }}>

      {/* Status bar */}
      <div style={{ padding: "9px 14px", background: allPassed ? T.green2 : T.red2, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: allPassed ? T.green : T.red }}>
          {allPassed ? "✓ All tests passed" : `${passedCount}/${results.length} tests passed`}
        </span>
        {hasSampleData && (
          <span style={{ fontSize: 11, color: T.ink3, fontFamily: "monospace" }}>
            {sampleRows.length} rows · {columns.length} cols
          </span>
        )}
      </div>

      {hasSampleData && (
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Section label */}
          <div style={{ fontSize: 10, fontWeight: 800, color: T.indigo, letterSpacing: 1.4, textTransform: "uppercase" }}>
            📊 Query Output
          </div>

          {/* Data table */}
          <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${T.border}`, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {columns.map((col, ci) => (
                    <th key={ci} style={{
                      padding: "9px 14px", textAlign: "left", fontWeight: 700, fontSize: 11,
                      letterSpacing: 0.6, whiteSpace: "nowrap",
                      background: T.indigo, color: "#fff",
                      borderRight: ci < columns.length - 1 ? "1px solid rgba(255,255,255,0.15)" : "none",
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "#fff" : "#F8F8F6", borderBottom: `1px solid ${T.border}` }}>
                    {columns.map((col, ci) => (
                      <td key={ci} style={{
                        padding: "8px 14px", color: T.ink2,
                        fontFamily: "'DM Mono','Fira Code',monospace", fontSize: 12,
                        borderRight: ci < columns.length - 1 ? `1px solid ${T.border}` : "none",
                      }}>
                        {row[col] === null || row[col] === undefined ? <span style={{ color: T.ink4, fontStyle: "italic" }}>NULL</span> : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bar chart — auto-rendered when there's a numeric column */}
          {chartData.length >= 2 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.ink4, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
                📈 {numericCol} by {labelCol}
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100, padding: "0 2px" }}>
                {chartData.map((d, i) => {
                  const barH = Math.max(4, Math.round((d.value / maxVal) * 72))
                  const hue  = 220 + (i * 25) % 120
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: T.ink3, fontFamily: "monospace", whiteSpace: "nowrap" }}>{d.value}</div>
                      <div style={{
                        width: "100%", height: barH,
                        background: `hsl(${hue},65%,52%)`,
                        borderRadius: "4px 4px 0 0",
                        transition: "height 0.6s cubic-bezier(.34,1.56,.64,1)",
                        boxShadow: "0 -2px 6px rgba(0,0,0,0.1)",
                      }} />
                      <div style={{ fontSize: 9, color: T.ink3, textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                        {d.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Failure detail — only shown for failed cases */}
      {results.map((r, i) => !r.passed && (
        <div key={i} style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, background: "#FFFAFA", fontSize: 12, color: T.red, lineHeight: 1.5 }}>
          <strong>Case {i + 1}:</strong> {r.error || r.actual}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SQL WORKSTATION
// Shown for SQL challenges (languages: ["sql"] or interaction_type: "sql").
// Uses a styled SQL textarea editor with Run Tests + Submit flow identical
// to the code workstation, but pre-seeded with a SELECT template.
// ─────────────────────────────────────────────────────────────────────────────
function SQLWorkstation({ challenge, code, onChange, isSolved, onRunTests, onSubmit, submitting, testResults, testLoading, testError, sqlResults }) {
  const taRef    = useRef()
  const lines    = (code || "").split("\n").length
  const eloReward = challenge?.eloReward ?? eloForDiff(challenge?.difficulty)

  const handleTab = (e) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const ta  = taRef.current
      const s   = ta.selectionStart
      const end = ta.selectionEnd
      const nv  = code.substring(0, s) + "  " + code.substring(end)
      onChange(nv)
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 2 }, 0)
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#1E1E1E", overflow: "hidden" }}>
      {/* SQL banner */}
      <div style={{ padding: "6px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#252526", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "#9CDCFE", fontWeight: 700 }}>SQL</span>
        <span style={{ fontSize: 10, color: "#A8A29E" }}>auto-save ✓</span>
      </div>

      {/* Editor area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Line numbers */}
        <div style={{ padding: "12px 0", minWidth: 42, textAlign: "right", paddingRight: 12, color: "rgba(255,255,255,0.18)", fontSize: 12, lineHeight: "1.6em", userSelect: "none", background: "rgba(0,0,0,0.2)", flexShrink: 0, overflowY: "hidden" }}>
          {Array.from({ length: Math.max(lines, 12) }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={taRef}
          value={code}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleTab}
          spellCheck={false}
          placeholder="-- Write your SQL query here"
          style={{ flex: 1, padding: "12px", background: "transparent", border: "none", outline: "none", color: "#D4D4D4", fontSize: 13, lineHeight: "1.6em", resize: "none", fontFamily: "'DM Mono','Fira Code','Courier New',monospace", whiteSpace: "pre", overflowWrap: "normal", overflowX: "auto" }}
        />
      </div>

      {/* SQL Results — table + bar chart */}
      <SQLResultsPanel results={sqlResults} loading={testLoading} error={testError} />

      {/* Action bar */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid #E8E3DA", background: "#FAF7F2", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: "#6B6560", display: "flex", alignItems: "center", gap: 10 }}>
          {challenge?.difficulty} · SQL Query
          {!isSolved && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9CDCFE", background: "rgba(156,220,254,0.1)", padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(156,220,254,0.2)" }}>
              +{eloReward} ELO ⚡
            </span>
          )}
          {isSolved && (
            <span style={{ fontSize: 11, fontWeight: 700, color: T.green, background: T.green2, padding: "2px 8px", borderRadius: 99 }}>🔒 Solved</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onRunTests} disabled={testLoading || !code?.trim()}
            style={{ padding: "9px 18px", background: "#F3F4F6", border: "1px solid #E8E3DA", borderRadius: 8, color: "#3D3935", fontSize: 13, fontWeight: 600, cursor: testLoading || !code?.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
            {testLoading ? <Spinner size={13} color="#9CDCFE" /> : "▷"} Run Tests
          </button>
          {isSolved ? (
            <button disabled style={{ padding: "9px 22px", background: "rgba(78,201,148,0.15)", border: "1px solid rgba(78,201,148,0.3)", borderRadius: 8, color: T.green, fontSize: 13, fontWeight: 700, cursor: "not-allowed", fontFamily: "inherit" }}>
              🔒 Already Solved
            </button>
          ) : (
            <button onClick={onSubmit} disabled={submitting || !code?.trim()}
              style={{ padding: "9px 22px", background: submitting ? "rgba(61,78,172,0.5)" : T.indigo, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: submitting || !code?.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
              {submitting ? <><Spinner size={13} color="#fff" /> Evaluating…</> : "✓ Submit Solution"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTIPLE CHOICE WORKSTATION
// Shown for select / predict / diagnose / compare / inspect / troubleshoot
// challenges (interaction_type = 'multiple_choice').
// All answer logic is client-side: correct index lives in options.correct.
// On "Check Answer" → reveal correct/wrong highlighting + explanation.
// On "Submit Answer" → parent persists ELO + arena_history.
// ─────────────────────────────────────────────────────────────────────────────
const MECHANIC_META = {
  calculate:    { label: "🔢 Calculate",    desc: "Work out the numeric value" },
  predict:      { label: "🔮 Predict",      desc: "Forecast the outcome" },
  diagnose:     { label: "🩺 Diagnose",     desc: "Identify the fault or cause" },
  interpret:    { label: "📊 Interpret",    desc: "Read and explain the data" },
  select:       { label: "☑ Select",       desc: "Choose the best answer" },
  complete:     { label: "✏ Complete",     desc: "Fill in the missing part" },
  sequence:     { label: "🔢 Sequence",     desc: "Order the steps correctly" },
  compare:      { label: "⚖ Compare",      desc: "Identify the key difference" },
  optimise:     { label: "⚡ Optimise",     desc: "Find the most efficient approach" },
  inspect:      { label: "🔍 Inspect",      desc: "Spot what is wrong or different" },
  design_lite:  { label: "🎨 Design",       desc: "Choose the right design decision" },
  troubleshoot: { label: "🔧 Troubleshoot", desc: "Fix the problem" },
}

const CHOICE_LABELS = ["A", "B", "C", "D"]

function MultipleChoiceWorkstation({ challenge, isSolved, onSubmitMC, submitting, submitResult }) {
  const [selected, setSelected]     = useState(null)    // 0–3
  const [localResult, setLocalResult] = useState(null)  // {correct, correctIdx}

  // Reset when challenge changes
  useEffect(() => {
    setSelected(null)
    setLocalResult(null)
  }, [challenge?.id])

  const opts         = challenge?.options
  const choices      = opts?.choices || []
  const correctIdx   = opts?.correct ?? -1
  const explanation  = challenge?.editorial || opts?.explanation || ""
  const mechanic     = challenge?.mechanic  || "select"
  const eloReward    = challenge?.eloReward ?? 5
  const mechanicMeta = MECHANIC_META[mechanic] || MECHANIC_META.select
  const alreadyChecked = localResult !== null

  const choiceStyle = (idx) => {
    const isSelected = selected === idx
    const isCorrect  = alreadyChecked && idx === correctIdx
    const isWrong    = alreadyChecked && isSelected && idx !== correctIdx
    if (isCorrect)  return { bg: T.green2,  border: `2px solid ${T.green}`,  labelBg: T.green,  labelColor: "#fff", textColor: "#166534" }
    if (isWrong)    return { bg: T.red2,    border: `2px solid ${T.red}`,    labelBg: T.red,    labelColor: "#fff", textColor: T.red    }
    if (isSelected) return { bg: T.indigo3, border: `2px solid ${T.indigo}`, labelBg: T.indigo, labelColor: "#fff", textColor: T.ink    }
    return           { bg: "#fff",          border: `1.5px solid ${T.border}`,labelBg: T.bg,    labelColor: T.ink3, textColor: T.ink    }
  }

  const handleSelect  = (idx) => { if (isSolved || alreadyChecked) return; setSelected(idx) }
  const handleCheck   = () => {
    if (selected === null) return
    setLocalResult({ correct: selected === correctIdx, correctIdx })
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#FAF7F2", overflow: "hidden" }}>
      {/* Mechanic banner */}
      <div style={{ padding: "10px 20px", background: "#EEF0FB", borderBottom: `1px solid ${T.indigo}22`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.indigo }}>{mechanicMeta.label}</span>
        <span style={{ fontSize: 11, color: T.ink3 }}>{mechanicMeta.desc}</span>
        {challenge?.track && (
          <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: T.indigo, background: T.indigo3, padding: "2px 8px", borderRadius: 99, border: `1px solid ${T.indigo}22` }}>{challenge.track}</span>
        )}
      </div>

      {/* Choices */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 10 }}>
        {choices.map((choice, idx) => {
          const s = choiceStyle(idx)
          const isCorrect = alreadyChecked && idx === correctIdx
          const isWrong   = alreadyChecked && selected === idx && idx !== correctIdx
          return (
            <div key={idx} onClick={() => handleSelect(idx)}
              style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", borderRadius: 12, background: s.bg, border: s.border, cursor: (isSolved || alreadyChecked) ? "default" : "pointer", transition: "all 0.15s", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", userSelect: "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: s.labelBg, color: s.labelColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0, fontFamily: "'DM Mono',monospace" }}>
                {CHOICE_LABELS[idx]}
              </div>
              <div style={{ flex: 1, fontSize: 13, lineHeight: 1.7, paddingTop: 3, color: s.textColor }}>{choice}</div>
              {isCorrect && <div style={{ fontSize: 18, flexShrink: 0, color: T.green }}>✓</div>}
              {isWrong   && <div style={{ fontSize: 18, flexShrink: 0, color: T.red   }}>✗</div>}
            </div>
          )
        })}

        {choices.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", color: T.ink3, fontSize: 13 }}>
            No answer choices loaded — check the problem definition.
          </div>
        )}

        {/* Explanation reveal (after Check) */}
        {localResult && explanation && (
          <div style={{ marginTop: 8, padding: "16px 18px", borderRadius: 12, background: localResult.correct ? T.green2 : T.amber2, border: `1px solid ${localResult.correct ? "#86EFAC" : "#FDE68A"}`, fontSize: 13, lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: localResult.correct ? T.green : T.amber, marginBottom: 6 }}>
              {localResult.correct ? "✓ Correct!" : `✗ The correct answer is ${CHOICE_LABELS[correctIdx]}.`}
            </div>
            <div style={{ color: T.ink2 }}>{explanation}</div>
          </div>
        )}

        {/* Post-submit confirmation */}
        {submitResult && (
          <div style={{ padding: "14px 18px", borderRadius: 12, background: submitResult.correct ? T.green2 : T.red2, border: `1px solid ${submitResult.correct ? "#86EFAC" : "#FCA5A5"}`, fontSize: 13 }}>
            {submitResult.correct
              ? <span style={{ color: T.green, fontWeight: 700 }}>🎉 Submitted & accepted! +{eloReward} ELO awarded.</span>
              : <span style={{ color: T.red,   fontWeight: 700 }}>Recorded — study the explanation and revisit later.</span>}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: T.ink3, display: "flex", alignItems: "center", gap: 10 }}>
          {challenge.difficulty} · Multiple Choice
          {!isSolved && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9CDCFE", background: "rgba(156,220,254,0.1)", padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(156,220,254,0.2)" }}>
              +{eloReward} ELO ⚡
            </span>
          )}
          {isSolved && (
            <span style={{ fontSize: 11, fontWeight: 700, color: T.green, background: T.green2, padding: "2px 8px", borderRadius: 99 }}>🔒 Solved</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {/* Step 1: Check Answer (client-side) */}
          {!alreadyChecked && (
            <button onClick={handleCheck} disabled={selected === null || isSolved}
              style={{ padding: "9px 18px", background: "#F3F4F6", border: `1px solid ${T.border}`, borderRadius: 8, color: T.ink2, fontSize: 13, fontWeight: 600, cursor: (selected === null || isSolved) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              ▷ Check Answer
            </button>
          )}
          {/* Step 2: Submit (lock in + persist ELO) */}
          {isSolved ? (
            <button disabled style={{ padding: "9px 22px", background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.3)", borderRadius: 8, color: T.green, fontSize: 13, fontWeight: 700, cursor: "not-allowed", fontFamily: "inherit" }}>
              🔒 Already Solved
            </button>
          ) : alreadyChecked && !submitResult ? (
            <button onClick={() => onSubmitMC(selected, localResult.correct)} disabled={submitting}
              style={{ padding: "9px 22px", background: submitting ? "rgba(61,78,172,0.5)" : T.indigo, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
              {submitting ? "Submitting…" : "✓ Submit Answer"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function ArenaCommonChallenges({ user, userData, onBack, streamCategories }) {
  const uid = user?.id || user?.uid

  // ── View state ──────────────────────────────────────────────────────────────
  const [tab, setTab]                         = useState("challenges") // challenges | history | leaderboard
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [challenges, setChallenges]           = useState(SEED_CHALLENGES)
  const [completedIds, setCompletedIds]       = useState(new Set())
  const [attemptCounts, setAttemptCounts]     = useState({}) // { challengeId: count }
  const [loadingChallenges, setLoadingChallenges] = useState(true)

  // ── Solve state ─────────────────────────────────────────────────────────────
  const [language, setLanguage]               = useState("Python")
  const [code, setCode]                       = useState("")
  const [testResults, setTestResults]         = useState(null)
  const [sqlResults, setSqlResults]           = useState(null)  // SQL-specific: has columns + sample_rows
  const [testLoading, setTestLoading]         = useState(false)
  const [testError, setTestError]             = useState(null)
  const [submitting, setSubmitting]           = useState(false)
  const [submitResult, setSubmitResult]       = useState(null)
  const [activeDescTab, setActiveDescTab]     = useState("description") // description | submissions

  // ── ELO ─────────────────────────────────────────────────────────────────────
  const [elo, setElo] = useState(userData?.eloRating || userData?.elo_rating || 400)

  // Filter / sort state
  const [diffFilter, setDiffFilter]           = useState("All")
  const [statusFilter, setStatusFilter]       = useState("All")  // All | Todo | Solved
  const [search, setSearch]                   = useState("")
  const [sortField, setSortField]             = useState("id")
  const [sortDir, setSortDir]                 = useState("asc")

  // Categories that should NEVER appear in Common Challenges for IT / CSE / MCA / DevOps students.
  // Covers: engineering streams + aptitude/placement test categories (eLitmus, AMCAT, etc.)
  const NON_IT_STREAM_CATS = new Set([
    // Core engineering streams
    "ECE", "EEE", "Mechanical", "Civil", "Pharmacy", "MBA", "IoT", "AI_DS", "AI_ML",
    // Aptitude / quantitative / placement categories (not IT-specific DSA/CS content)
    "Aptitude", "aptitude", "APTITUDE",
    "Quantitative", "quantitative", "Quant", "quant", "QUANTITATIVE",
    "Verbal", "verbal", "VERBAL",
    "Reasoning", "reasoning", "REASONING",
    "LogicalReasoning", "logical_reasoning", "Logical",
    "Placement", "placement", "PLACEMENT",
    "eLitmus", "elitmus", "ELITMUS",
    "AMCAT", "amcat", "Amcat",
    "GRE", "gre", "GMAT", "gmat",
    "HCF_LCM", "hcf_lcm", "Number_Theory", "number_theory",
  ])

  // ── Load challenges from problemsDb ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        let q = problemsDb
          .from("problems")
          .select("id,slug,title,difficulty,category,source,tags,statement,constraints,examples,test_cases,editorial,languages,acceptance_rate,interaction_type,options,assets,mechanic,track,created_at")
          // ── CRITICAL: only load arena-sourced problems (not domain workstation problems) ──
          .eq("source", "arena")

        if (streamCategories && streamCategories.length > 0) {
          // Non-IT student (ECE/EEE/etc.): server-side filter — only their stream categories
          q = q.in("category", streamCategories)
        }
        // For IT / CSE / MCA / DevOps: fetch ALL arena problems, filter client-side below.
        // Doing this client-side avoids PostgREST NOT IN string-escaping bugs.

        q = q.order("created_at", { ascending: true })
        const { data } = await q
        if (data?.length) {
          // ── Client-side exclusion for IT/CSE/DevOps path ─────────────────────
          // Only applies when streamCategories is null (no server-side filter was used).
          const filtered = (streamCategories && streamCategories.length > 0)
            ? data
            : data.filter(c => !NON_IT_STREAM_CATS.has(c.category))

          const mapped = filtered.map((c) => ({
            ...c,
            type:        (c.category || "dsa").toLowerCase(),
            skills:      c.tags || [],
            topic_group: c.track || c.category || "DSA",  // track is the finer-grained group
            description: c.statement,
            eloReward:   eloForDiff(c.difficulty),
            acceptance:  c.acceptance_rate != null
              ? Math.round(c.acceptance_rate * 100)
              : Math.floor(35 + Math.random() * 40),
          }))
          setChallenges(mapped)
        }
      } catch {}
      setLoadingChallenges(false)
    }
    load()
  }, [streamCategories])

  // ── Load user's completions from arena_history (with real-time updates) ──────
  useEffect(() => {
    if (!uid) return

    // Initial fetch — no domain filter so all submissions appear regardless of
    // how domain was saved (dsa / algorithm / swe / common_challenge)
    const fetchCompleted = () =>
      supabase
        .from("arena_history")
        .select("task_id")
        .eq("user_id", uid)
        .not("task_id", "is", null)
        .then(({ data, error }) => {
          if (error) {
            console.warn("arena_history fetch error:", error.message,
              "— run supabase-arena-history-migration.sql in your main Supabase project")
            return
          }
          if (data?.length) {
            setCompletedIds(new Set(data.map(r => String(r.task_id))))
          }
        })

    fetchCompleted()

    // Real-time: mark as solved instantly when INSERT fires
    const channel = supabase
      .channel(`completed-${uid}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "arena_history", filter: `user_id=eq.${uid}` },
        (payload) => {
          const taskId = payload.new?.task_id
          if (taskId) setCompletedIds(prev => new Set([...prev, String(taskId)]))
        })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [uid])

  // ── When challenge selected, set starter code ────────────────────────────
  useEffect(() => {
    if (!selectedChallenge) return
    const detail = buildDetail(selectedChallenge)
    const starter = detail?.starterCode?.[language] || genericStarter(selectedChallenge.title, language)
    setCode(starter)
    setTestResults(null)
    setTestError(null)
    setSubmitResult(null)
  }, [selectedChallenge?.id, language])

  // ── Run Tests ────────────────────────────────────────────────────────────
  const handleRunTests = useCallback(async () => {
    if (!code.trim() || !selectedChallenge) return
    setTestLoading(true)
    setTestError(null)
    setTestResults(null)

    const detail = buildDetail(selectedChallenge)
    const cases  = detail?.testCases || []

    try {
      const res = await fetch(`${SERVER}/api/arena/run-tests`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge: selectedChallenge,
          code,
          language,
          testCases: cases,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const results = data.results || []
        setTestResults(results)
        // For SQL: store separately so SQLResultsPanel can render table + chart
        if (language === "SQL") setSqlResults(results)
      } else {
        // Server error — never fake-pass tests, show honest error
        setTestError("Test runner error. Check your server is running and try again.")
      }
    } catch {
      setTestError("Could not connect to test runner. Ensure the backend server is running at " + SERVER)
    }
    setTestLoading(false)
  }, [code, selectedChallenge, language])

  // ── Submit Solution ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!code.trim() || !selectedChallenge || submitting) return
    // Hard lock — solved challenges cannot earn ELO again
    if (completedIds.has(String(selectedChallenge.id))) return
    setSubmitting(true)

    const meaningful = code.split("\n").filter(l => l.trim() && !l.trim().startsWith("#") && !l.trim().startsWith("//") && !l.toLowerCase().includes("todo")).length
    if (meaningful < 3) {
      alert("⚠ Write your solution first — empty or comment-only submissions are not accepted.")
      setSubmitting(false)
      return
    }

    // Attempt count for this challenge
    const prevAttempts = attemptCounts[selectedChallenge.id] || 0
    const attemptNumber = prevAttempts + 1
    setAttemptCounts(prev => ({ ...prev, [selectedChallenge.id]: attemptNumber }))

    // ELO multiplier based on attempt number
    const attemptMultiplier = attemptNumber === 1 ? 1.0 : attemptNumber === 2 ? 0.75 : 0.50

    // ── Step 1: Run actual tests against the code ────────────────────────────
    const detail    = buildDetail(selectedChallenge)
    const testCases = detail?.testCases || []
    let runResults  = []

    if (testCases.length > 0) {
      try {
        const runRes = await fetch(`${SERVER}/api/arena/run-tests`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language, challenge: selectedChallenge, testCases }),
        })
        if (runRes.ok) {
          const runData = await runRes.json()
          runResults = runData.results || []
          setTestResults(runResults)   // show test panel immediately
        }
      } catch {}
    }

    // ── Step 2: Correctness score from actual test results ───────────────────
    // This is the ground truth — if tests fail, solution is wrong regardless of AI score.
    const totalTests  = runResults.length
    const passedTests = runResults.filter(r => r.passed).length
    const allPassed   = totalTests > 0 && passedTests === totalTests
    const testScore   = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : null

    // ── Step 3: AI review for detailed feedback & code quality ──────────────
    let aiReview = null
    try {
      const challengeType = language === "SQL" ? "sql" : "dsa"
      const keyword       = language === "SQL" ? "SQL & Databases" : "Data Structures & Algorithms"
      const res = await fetch(`${SERVER}/api/arena/review`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge:     selectedChallenge,
          answer:        code,
          keyword,
          eloRating:     elo,
          challengeType,
          language,
          attemptNumber,
          testResults:   runResults,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        if (d && typeof d.score === "number") aiReview = d
      }
    } catch {}

    // ── Step 4: Final score — test results WIN over AI opinion ───────────────
    // If actual tests failed, cap the score at 40 regardless of how "nice" the code looks.
    // If no test cases available, fall back to AI score only.
    const aiScore    = aiReview?.score ?? Math.min(85, meaningful * 6)
    const finalScore = testScore !== null
      ? (allPassed
          ? Math.max(testScore, aiScore)          // tests pass → take best of both
          : Math.min(40, aiScore * (passedTests / Math.max(totalTests, 1))))  // tests fail → cap at 40
      : aiScore

    const DSA_RUBRIC = ["Correctness","Time Complexity","Space Complexity","Code Quality","Edge Cases"]
    const offsets    = [0, -4, -4, +5, -3]
    const aiRubric   = aiReview?.rubric || null
    const rubric     = DSA_RUBRIC.map((criterion, i) => {
      if (aiRubric && typeof aiRubric === "object") {
        const key = criterion.toLowerCase().replace(/\s+/g, "_")
        const v = aiRubric[criterion] ?? aiRubric[key] ?? aiRubric[i]
        if (typeof v === "number") return { criterion, score: Math.min(100, Math.max(0, v)) }
      }
      return { criterion, score: Math.min(100, Math.max(0, finalScore + (offsets[i] ?? 0))) }
    })

    // ── Step 5: ELO gain based on difficulty (not a flat 25) ───────────────
    // Easy=5, Medium=10, Hard=15, Expert=20.
    // Solved challenges are LOCKED — no ELO gain on re-attempt (prevents farming).
    const maxElo     = selectedChallenge.eloReward ?? eloForDiff(selectedChallenge.difficulty)
    const alreadySolved = completedIds.has(String(selectedChallenge.id))

    const baseEloGain = alreadySolved
      ? 0   // locked — already earned ELO for this challenge
      : allPassed
        ? maxElo                                                           // full reward
        : passedTests > 0
          ? Math.round((passedTests / Math.max(totalTests, 1)) * maxElo)  // partial
          : 0   // all tests failed → 0 ELO

    const eloGain = Math.round(baseEloGain * attemptMultiplier)
    const newElo  = elo + eloGain
    const gradeFor = s => s >= 90 ? "A+" : s >= 80 ? "A" : s >= 70 ? "B+" : s >= 60 ? "B" : s >= 50 ? "C" : "D"

    const testSummary = totalTests > 0
      ? (allPassed ? `All ${totalTests} test cases passed.` : `${passedTests}/${totalTests} test cases passed — check your logic.`)
      : ""

    const result = {
      score:         Math.round(finalScore),
      eloGain,
      newElo,
      passed:        allPassed,
      testsPassed:   passedTests,
      testsTotal:    totalTests,
      grade:         aiReview?.grade || gradeFor(finalScore),
      summary:       testSummary || aiReview?.summary || (finalScore >= 80
        ? "Excellent — clean logic and strong edge case handling."
        : finalScore >= 60 ? "Good attempt. Consider optimizing your approach."
        : "Incorrect solution — review the algorithm and try again."),
      rubric,
      attemptNumber,
      timedOut:      false,
      feedback:      aiReview?.feedback || aiReview?.summary || "",
      tip:           aiReview?.tip || (allPassed
        ? "Great work! Now optimise for time complexity."
        : "Trace through each test case manually to find where the logic breaks."),
    }

    // ── Persist to Supabase ──────────────────────────────────────────────────
    if (uid) {
      try {
        const nowIso = new Date().toISOString()

        // ── Update skill graph in profile ────────────────────────────────────
        // Merge this challenge's skills into the user's skillGraph so Aura's
        // skill radar fills in over time.
        const challengeSkills = selectedChallenge.skills || []
        const existingGraph = userData?.skillGraph || userData?.skill_graph || []
        const updatedGraph = [...existingGraph]
        challengeSkills.forEach(skill => {
          const idx = updatedGraph.findIndex(s =>
            (s.label || s.skill || "").toLowerCase() === skill.toLowerCase()
          )
          if (idx >= 0) {
            // Boost existing skill — weighted towards new score
            const prev = updatedGraph[idx].value || updatedGraph[idx].score || 0
            updatedGraph[idx] = {
              ...updatedGraph[idx],
              value: Math.round(prev * 0.6 + finalScore * 0.4),
              score: Math.round(prev * 0.6 + finalScore * 0.4),
            }
          } else {
            updatedGraph.push({ label: skill, skill, value: finalScore, score: finalScore })
          }
        })
        // Also update DSA as a top-level skill
        const dsaIdx = updatedGraph.findIndex(s => (s.label || s.skill || "").toLowerCase() === "dsa")
        if (dsaIdx >= 0) {
          const prev = updatedGraph[dsaIdx].value || 0
          updatedGraph[dsaIdx] = { ...updatedGraph[dsaIdx], value: Math.round(prev * 0.6 + finalScore * 0.4), score: Math.round(prev * 0.6 + finalScore * 0.4) }
        } else {
          updatedGraph.push({ label: "DSA", skill: "DSA", value: finalScore, score: finalScore })
        }

        // userDoc.update auto-normalises camelCase → snake_case via toSnake() in db.js
        await userDoc.update(uid, {
          eloRating:       newElo,          // toSnake → elo_rating
          arenaCompleted:  (userData?.arena_completed || userData?.arenaCompleted || 0) + 1,
          arenaLastActive: nowIso,          // toSnake → arena_last_active
          skillGraph:      updatedGraph,    // toSnake → skill_graph
        })

        // Write elo_events so Aura dashboard history chart updates
        if (eloGain !== 0) {
          supabase.from("elo_events").insert({
            user_id:    uid,
            source:     "common_challenge",
            domain:     "dsa",
            delta:      eloGain,
            elo_before: elo,
            elo_after:  newElo,
            note:       `${selectedChallenge.title} — Score ${Math.round(finalScore)}/100`,
          }).then(() => {})  // fire-and-forget
        }

        const _cType = language === "SQL" ? "sql" : "dsa"
        await arenaDb.addSubmission(uid, {
          task_id:          selectedChallenge.id || selectedChallenge.slug,
          title:            selectedChallenge.title,
          difficulty:       selectedChallenge.difficulty || "Medium",
          domain:           _cType,
          challenge_type:   _cType,
          score:            finalScore,
          elo_delta:        eloGain,
          summary:          result.summary,
          scenario:         selectedChallenge.description || "",
          submitted_answer: String(code).slice(0, 3000),
          feedback:         result.feedback || result.tip || "",
        })

        // Mark as solved
        setCompletedIds(prev => new Set([...prev, String(selectedChallenge.id)]))
        setElo(newElo)
      } catch (e) {
        console.error("Persist error:", e)
      }
    }

    setSubmitResult(result)
    setSubmitting(false)
  }, [code, selectedChallenge, language, submitting, elo, uid, userData, attemptCounts])

  // ── Challenge selection (defined below as openChallenge; aliased in JSX) ──

  // ── Filtered / sorted list ────────────────────────────────────────────────
  const filteredChallenges = challenges
    .filter(c => {
      if (diffFilter !== "All" && c.difficulty !== diffFilter) return false
      if (statusFilter === "Solved"  &&  !completedIds.has(String(c.id))) return false
      if (statusFilter === "Todo"    && completedIds.has(String(c.id)))   return false
      if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      let av = a[sortField], bv = b[sortField]
      if (sortField === "difficulty") {
        const order = { Easy: 1, Medium: 2, Hard: 3, Expert: 4 }
        av = order[av] || 2; bv = order[bv] || 2
      }
      if (typeof av === "string") av = av.toLowerCase()
      if (typeof bv === "string") bv = bv.toLowerCase()
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
  }
  const sortIcon = (field) => sortField !== field ? " ↕" : sortDir === "asc" ? " ↑" : " ↓"

  // ── Challenge selection handler (also resets code starter) ──────────────────
  const openChallenge = useCallback((ch) => {
    setSelectedChallenge(ch)
    setTestResults(null)
    setSqlResults(null)
    setTestError(null)
    setSubmitResult(null)
    setActiveDescTab("description")
    const wsT = resolveWorkstationType(ch)
    if (wsT === "sql") {
      setLanguage("SQL")
      // SQL starter: derive table name hints from the problem tags/track
      const track = ch.track || ch.topic_group || ""
      setCode(`-- ${ch.title}\n-- Write your SQL solution below\n\nSELECT\n    \nFROM\n    \nWHERE\n    ;\n`)
    } else if (wsT === "code") {
      setLanguage("Python")
      const fnName = (ch.slug || "solution").replace(/-/g, "_")
      setCode(`# ${ch.title}\n\ndef ${fnName}(*args):\n    # TODO: implement\n    pass\n`)
    }
    // calculator / multiple_choice: no code state needed
  }, [])

  // ── Calculator submit ─────────────────────────────────────────────────────
  const handleSubmitAnswer = useCallback(async (answerStr) => {
    if (!selectedChallenge || submitting) return
    setSubmitting(true)
    const val    = parseFloat(answerStr)
    const tc     = selectedChallenge.test_cases?.[0]
    // DB stores expected as expected_output (snake_case); also handle legacy camelCase
    const exp    = parseFloat(tc?.expected ?? tc?.expected_output ?? tc?.expectedOutput ?? NaN)
    const tol    = tc?.tolerance ?? tc?.tolerance_pct ?? 0.01
    const passed = !isNaN(exp) && Math.abs(val - exp) <= tol

    const result = { correct: passed, message: passed ? "Correct!" : "Incorrect" }

    if (passed && uid) {
      try {
        const prev     = attemptCounts[selectedChallenge.id] || 0
        const isRetry  = completedIds.has(String(selectedChallenge.id))
        const eloGain  = isRetry ? 0 : Math.max(1, (selectedChallenge.eloReward || 5) - prev * 2)
        const newElo   = elo + eloGain
        await userDoc.update(uid, { eloRating: newElo })
        await arenaDb.addHistory(uid, {
          challengeId: selectedChallenge.id,
          challengeTitle: selectedChallenge.title,
          domain: "common_challenge",
          status: "accepted",
          answer: answerStr,
          eloChange: eloGain,
        })
        setAttemptCounts(prev => ({ ...prev, [selectedChallenge.id]: (prev[selectedChallenge.id] || 0) + 1 }))
        setCompletedIds(prev => new Set([...prev, String(selectedChallenge.id)]))
        setElo(newElo)
      } catch (e) {
        console.error("Persist error:", e)
      }
    }
    setSubmitResult(result)
    setSubmitting(false)
  }, [selectedChallenge, submitting, uid, elo, attemptCounts, completedIds, userData])

  // ── Multiple Choice submit ────────────────────────────────────────────────
  const handleSubmitMC = useCallback(async (selectedIdx, isCorrect) => {
    if (!selectedChallenge || submitting) return
    setSubmitting(true)
    const alreadySolved = completedIds.has(String(selectedChallenge.id))
    const eloGain = (isCorrect && !alreadySolved)
      ? (selectedChallenge.eloReward ?? eloForDiff(selectedChallenge.difficulty))
      : 0
    const newEloVal = elo + eloGain

    if (uid) {
      try {
        await userDoc.update(uid, {
          eloRating:       newEloVal,
          arenaCompleted:  (userData?.arena_completed || userData?.arenaCompleted || 0) + 1,
          arenaLastActive: new Date().toISOString(),
        })
        if (eloGain > 0) {
          supabase.from("elo_events").insert({
            user_id:    uid,
            source:     "common_challenge",
            domain:     selectedChallenge.category || "arena",
            delta:      eloGain,
            elo_before: elo,
            elo_after:  newEloVal,
            note:       `${selectedChallenge.title} — Multiple Choice`,
          }).then(() => {})
        }
        await arenaDb.addSubmission(uid, {
          task_id:          selectedChallenge.id || selectedChallenge.slug,
          title:            selectedChallenge.title,
          difficulty:       selectedChallenge.difficulty || "Medium",
          domain:           selectedChallenge.category || "arena",
          challenge_type:   "multiple_choice",
          score:            isCorrect ? 100 : 0,
          elo_delta:        eloGain,
          summary:          isCorrect ? "Correct answer selected." : "Incorrect answer selected.",
          scenario:         selectedChallenge.statement || "",
          submitted_answer: CHOICE_LABELS[selectedIdx] || String(selectedIdx),
          feedback:         selectedChallenge.editorial || selectedChallenge.options?.explanation || "",
        })
        setCompletedIds(prev => new Set([...prev, String(selectedChallenge.id)]))
        setElo(newEloVal)
      } catch (e) { console.error("Persist error:", e) }
    }
    setSubmitResult({ correct: isCorrect })
    setSubmitting(false)
  }, [selectedChallenge, submitting, uid, elo, completedIds, userData])

  const detail     = buildDetail(selectedChallenge)
  const languages  = ["Python","JavaScript","TypeScript","Java"]
  const isSolved   = selectedChallenge && completedIds.has(String(selectedChallenge.id))
  const attempts   = selectedChallenge ? (attemptCounts[selectedChallenge.id] || 0) : 0
  // Determine which workstation to render for the selected challenge
  const wsType     = resolveWorkstationType(selectedChallenge)

  // ══ RENDER ════════════════════════════════════════════════════════════════
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:T.bg, fontFamily:"'DM Sans',sans-serif", overflow:"hidden" }}>
      <style>{`
        @keyframes cc-spin { to { transform: rotate(360deg) } }
        .cc-row:hover { background: #F5F5F0 !important; cursor: pointer; }
        .cc-tab-btn:hover { color: #1A1A18 !important; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"0 20px", height:52, display:"flex", alignItems:"center", gap:0, flexShrink:0, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:T.ink3, fontSize:13, cursor:"pointer", padding:"0 12px 0 0", display:"flex", alignItems:"center", gap:6, fontFamily:"inherit", fontWeight:600, marginRight:8, borderRight:`1px solid ${T.border}` }}>
          ← Back
        </button>
        <span style={{ fontSize:15, fontWeight:800, color:T.ink, marginRight:20 }}>🧩 Common Challenges</span>
        {/* Tabs */}
        {[
          { id:"challenges",  label:"Challenges"   },
          { id:"history",     label:"History"      },
          { id:"leaderboard", label:"Leaderboard"  },
        ].map(t => (
          <button key={t.id} className="cc-tab-btn"
            onClick={() => { setTab(t.id); if (t.id !== "challenges") setSelectedChallenge(null) }}
            style={{ padding:"0 16px", height:52, border:"none", background:"none", fontFamily:"inherit", fontSize:13, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? T.indigo : T.ink3, borderBottom: tab === t.id ? `2.5px solid ${T.indigo}` : "2.5px solid transparent", cursor:"pointer", transition:"color 0.12s" }}>
            {t.label}
          </button>
        ))}
        {/* ELO chip */}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ padding:"4px 12px", background:T.indigo3, borderRadius:99, fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:800, color:T.indigo }}>
            ELO {elo}
          </div>
          <div style={{ fontSize:11, color:T.ink3 }}>{completedIds.size} solved</div>
        </div>
      </div>

      {/* ── Content area ── */}
      {tab === "history"     && <CommonHistory uid={uid} />}
      {tab === "leaderboard" && <CommonLeaderboard uid={uid} userElo={elo} />}

      {tab === "challenges" && (
        selectedChallenge ? (
          /* ─────────── SOLVE VIEW (LeetCode split layout) ─────────── */
          <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

            {/* LEFT — Description */}
            <div style={{ width:"42%", minWidth:340, maxWidth:560, display:"flex", flexDirection:"column", borderRight:`1px solid ${T.border}`, overflow:"hidden", background:T.surface }}>
              {/* Challenge header */}
              <div style={{ padding:"14px 20px 10px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
                <button onClick={() => setSelectedChallenge(null)}
                  style={{ background:"none", border:"none", color:T.ink4, fontSize:12, cursor:"pointer", padding:0, marginBottom:8, fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
                  ← Problem List
                </button>
                <div style={{ fontSize:17, fontWeight:800, color:T.ink, marginBottom:8 }}>{selectedChallenge.title}</div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <DiffBadge diff={selectedChallenge.difficulty} />
                  {isSolved && <span style={{ fontSize:11, fontWeight:700, color:T.green, background:T.green2, padding:"2px 8px", borderRadius:99 }}>✓ Solved</span>}
                  {attempts > 0 && <span style={{ fontSize:11, color:T.ink4 }}>{attempts} attempt{attempts > 1 ? "s" : ""}</span>}
                  {(selectedChallenge.skills || []).map(s => (
                    <span key={s} style={{ fontSize:10, color:T.ink3, background:T.bg, padding:"2px 8px", borderRadius:99, border:`1px solid ${T.border}` }}>{s}</span>
                  ))}
                </div>
              </div>

              {/* Description sub-tabs */}
              <div style={{ display:"flex", padding:"0 20px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
                {["description","hints"].map(t => (
                  <button key={t} onClick={() => setActiveDescTab(t)}
                    style={{ padding:"10px 0", marginRight:20, border:"none", background:"none", fontFamily:"inherit", fontSize:12, fontWeight: activeDescTab === t ? 700 : 500, color: activeDescTab === t ? T.indigo : T.ink3, borderBottom: activeDescTab === t ? `2px solid ${T.indigo}` : "2px solid transparent", cursor:"pointer", textTransform:"capitalize" }}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Description content */}
              <div style={{ flex:1, overflowY:"auto", padding:"18px 20px" }}>
                {activeDescTab === "description" && (
                  <>
                    {/* SVG asset (waveform / circuit / diagram from DB) */}
                    {selectedChallenge.assets?.svg && (
                      <div style={{ marginBottom: 16, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}`, background: "#1a1a1a" }}
                        dangerouslySetInnerHTML={{ __html: selectedChallenge.assets.svg }}
                      />
                    )}
                    {selectedChallenge.assets?.caption && (
                      <div style={{ fontSize: 11, color: T.ink4, textAlign: "center", marginBottom: 16, fontStyle: "italic" }}>
                        {selectedChallenge.assets.caption}
                      </div>
                    )}
                    <div style={{ fontSize:13, color:T.ink2, lineHeight:1.8, marginBottom:20, whiteSpace:"pre-wrap" }}>
                      {detail.description || selectedChallenge.description || "Solve the problem as described."}
                    </div>
                    {(detail.examples || []).map((ex, i) => (
                      <div key={i} style={{ marginBottom:14 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.ink, marginBottom:6 }}>Example {i + 1}:</div>
                        <div style={{ background:T.bg, borderRadius:8, padding:"10px 14px", fontSize:12, fontFamily:"monospace", border:`1px solid ${T.border}` }}>
                          <div><span style={{ color:T.ink3 }}>Input:  </span>{ex.input}</div>
                          <div><span style={{ color:T.ink3 }}>Output: </span>{ex.output}</div>
                          {ex.explanation && <div style={{ color:T.ink3, marginTop:4 }}><span style={{ fontWeight:600 }}>Explanation: </span>{ex.explanation}</div>}
                        </div>
                      </div>
                    ))}
                    {(detail.constraints || []).length > 0 && (
                      <div style={{ marginTop:16 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.ink, marginBottom:8 }}>Constraints:</div>
                        <ul style={{ margin:0, paddingLeft:18 }}>
                          {detail.constraints.map((c, i) => (
                            <li key={i} style={{ fontSize:12, color:T.ink2, marginBottom:4, fontFamily:"monospace" }}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedChallenge.acceptance && (
                      <div style={{ marginTop:16, padding:"10px 14px", background:T.bg, borderRadius:8, fontSize:12, color:T.ink3, display:"flex", gap:16, border:`1px solid ${T.border}` }}>
                        <span>Acceptance rate: <strong style={{ color:T.ink2 }}>{selectedChallenge.acceptance}%</strong></span>
                        {selectedChallenge.estimated_mins && <span>Estimated: <strong style={{ color:T.ink2 }}>{selectedChallenge.estimated_mins} min</strong></span>}
                      </div>
                    )}
                  </>
                )}
                {activeDescTab === "hints" && (
                  <div>
                    {(detail.hints || ["Try a brute force approach first, then optimize.","Think about which data structure gives you O(1) lookups."]).map((h, i) => (
                      <div key={i} style={{ marginBottom:12, padding:"10px 14px", background:T.amber2, borderRadius:8, border:`1px solid ${T.amber}22`, fontSize:13, color:T.ink2, lineHeight:1.6 }}>
                        <span style={{ fontWeight:700, color:T.amber }}>Hint {i+1}: </span>{h}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Workstation (code editor OR calculator based on problem type) */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

              {/* ── Multiple Choice workstation (Common Challenge Engine — 70% of new challenges) ── */}
              {wsType === "multiple_choice" && (
                <MultipleChoiceWorkstation
                  challenge={selectedChallenge}
                  isSolved={isSolved}
                  onSubmitMC={handleSubmitMC}
                  submitting={submitting}
                  submitResult={submitResult}
                />
              )}

              {/* ── SQL workstation ── */}
              {wsType === "sql" && (
                <SQLWorkstation
                  challenge={selectedChallenge}
                  code={code}
                  onChange={setCode}
                  isSolved={isSolved}
                  onRunTests={handleRunTests}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                  testResults={testResults}
                  sqlResults={sqlResults}
                  testLoading={testLoading}
                  testError={testError}
                />
              )}

              {/* ── Calculator workstation (aptitude / formula problems) ── */}
              {wsType === "calculator" && (
                <CalculatorWorkstation
                  challenge={selectedChallenge}
                  isSolved={isSolved}
                  onSubmitAnswer={handleSubmitAnswer}
                  submitting={submitting}
                  submitResult={submitResult}
                  testResults={testResults}
                />
              )}

              {/* ── Code editor workstation (Python / JS / TS / Java problems) ── */}
              {wsType === "code" && (<>
                {/* Editor toolbar */}
                <div style={{ padding:"8px 14px", borderBottom:`1px solid rgba(0,0,0,0.05)`, background:"#1E1E1E", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    style={{ background:"rgba(0,0,0,0.05)", border:"1px solid rgba(0,0,0,0.07)", borderRadius:6, color:"#D4D4D4", fontSize:12, padding:"4px 10px", cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>
                    {languages.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <div style={{ flex:1 }} />
                  {isSolved && (
                    <span style={{ fontSize:11, color:"#4EC994", fontWeight:600, padding:"3px 10px", background:"rgba(78,201,148,0.12)", borderRadius:99 }}>✓ Solved</span>
                  )}
                </div>

                {/* Code editor */}
                <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0 }}>
                  <CodeEditor value={code} onChange={setCode} language={language} />
                  <TestResults results={testResults} loading={testLoading} error={testError} />
                </div>

                {/* Bottom action bar */}
                <div style={{ padding:"10px 14px", borderTop:"1px solid #E8E3DA", background:"#FAF7F2", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
                  <div style={{ fontSize:11, color:"#6B6560", display:"flex", alignItems:"center", gap:10 }}>
                    {selectedChallenge.difficulty} · {selectedChallenge.estimated_mins || 30} min
                    {!isSolved && (
                      <span style={{ fontSize:11, fontWeight:700, color:"#9CDCFE", background:"rgba(156,220,254,0.1)", padding:"2px 8px", borderRadius:99, border:"1px solid rgba(156,220,254,0.2)" }}>
                        +{selectedChallenge.eloReward ?? eloForDiff(selectedChallenge.difficulty)} ELO ⚡
                      </span>
                    )}
                    {isSolved && (
                      <span style={{ fontSize:11, fontWeight:700, color:"#4EC994", background:"rgba(78,201,148,0.1)", padding:"2px 8px", borderRadius:99 }}>
                        🔒 Solved — no more ELO
                      </span>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={handleRunTests} disabled={testLoading}
                      style={{ padding:"9px 18px", background:"#F3F4F6", border:"1px solid #E8E3DA", borderRadius:8, color:"#3D3935", fontSize:13, fontWeight:600, cursor: testLoading ? "not-allowed" : "pointer", display:"flex", alignItems:"center", gap:7, fontFamily:"inherit" }}>
                      {testLoading ? <Spinner size={13} color="#9CDCFE" /> : "▷"} Run Tests
                    </button>
                    {isSolved ? (
                      <button disabled style={{ padding:"9px 22px", background:"rgba(78,201,148,0.15)", border:"1px solid rgba(78,201,148,0.3)", borderRadius:8, color:"#4EC994", fontSize:13, fontWeight:700, cursor:"not-allowed", fontFamily:"inherit" }}>
                        🔒 Already Solved
                      </button>
                    ) : (
                      <button onClick={handleSubmit} disabled={submitting}
                        style={{ padding:"9px 22px", background: submitting ? "rgba(61,78,172,0.5)" : T.indigo, border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:700, cursor: submitting ? "not-allowed" : "pointer", display:"flex", alignItems:"center", gap:7, fontFamily:"inherit" }}>
                        {submitting ? <><Spinner size={13} color="#fff" /> Evaluating…</> : "✓ Submit Solution"}
                      </button>
                    )}
                  </div>
                </div>
              </>)}

            </div>
          </div>
        ) : (
          /* ─────────── LIST VIEW (LeetCode problem set) ─────────── */
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:T.surface }}>
            {/* Filter bar */}
            <div style={{ padding:"12px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", gap:10, alignItems:"center", flexShrink:0, flexWrap:"wrap" }}>
              {["All","Easy","Medium","Hard"].map(d => (
                <button key={d} onClick={() => setDiffFilter(d)}
                  style={{ padding:"5px 14px", borderRadius:99, border: diffFilter === d ? "none" : `1px solid ${T.border}`, background: diffFilter === d ? (d === "All" ? T.indigo : DIFF_STYLE[d]?.bg || T.indigo3) : T.bg, color: diffFilter === d ? (d === "All" ? "#fff" : DIFF_STYLE[d]?.color || T.indigo) : T.ink3, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  {d}
                </button>
              ))}
              <div style={{ width:1, height:20, background:T.border }} />
              {["All","Todo","Solved"].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ padding:"5px 14px", borderRadius:99, border: statusFilter === s ? `1.5px solid ${T.indigo}` : `1px solid ${T.border}`, background: statusFilter === s ? T.indigo3 : T.bg, color: statusFilter === s ? T.indigo : T.ink3, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  {s}
                </button>
              ))}
              <div style={{ flex:1 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search challenges…"
                style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${T.border}`, background:T.bg, fontSize:12, color:T.ink, outline:"none", width:200, fontFamily:"inherit" }}
              />
            </div>

            {/* Table */}
            <div style={{ flex:1, overflowY:"auto" }}>
              {loadingChallenges ? (
                <div style={{ padding:40, display:"flex", justifyContent:"center" }}><Spinner size={24} /></div>
              ) : (
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:T.bg, borderBottom:`1px solid ${T.border}` }}>
                      {[
                        { label:"Status",     field:null,          w:"60px"  },
                        { label:"#",          field:"id",          w:"50px"  },
                        { label:"Title",      field:"title",       w:"auto"  },
                        { label:"Difficulty", field:"difficulty",  w:"110px" },
                        { label:"ELO ⚡",     field:"eloReward",   w:"80px"  },
                        { label:"Acceptance", field:"acceptance",  w:"110px" },
                        { label:"Topic",      field:"topic_group", w:"140px" },
                      ].map(col => (
                        <th key={col.label}
                          onClick={col.field ? () => toggleSort(col.field) : undefined}
                          style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color: col.label.startsWith("ELO") ? T.indigo : T.ink3, letterSpacing:0.8, textTransform:"uppercase", width:col.w, cursor:col.field ? "pointer" : "default", whiteSpace:"nowrap", userSelect:"none" }}>
                          {col.label}{col.field && sortIcon(col.field)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChallenges.map((ch, i) => {
                      const solved  = completedIds.has(String(ch.id))
                      const eloReward = ch.eloReward ?? eloForDiff(ch.difficulty)
                      return (
                        <tr key={ch.id} className="cc-row"
                          onClick={() => openChallenge(ch)}
                          style={{ borderBottom:`1px solid ${T.border}`, background: solved ? "#F8FFF8" : i % 2 === 0 ? "#fff" : "#FAFAF8", transition:"background 0.1s", opacity: solved ? 0.85 : 1 }}>
                          {/* Status — 🔒 locked once solved */}
                          <td style={{ padding:"12px 16px", textAlign:"center" }}>
                            {solved
                              ? <span title="Solved — locked for ELO farming prevention" style={{ fontSize:15 }}>🔒</span>
                              : <span style={{ color:T.ink4, fontSize:12 }}>—</span>}
                          </td>
                          <td style={{ padding:"12px 16px", color:T.ink4, fontFamily:"monospace", fontSize:12 }}>{i + 1}</td>
                          <td style={{ padding:"12px 16px" }}>
                            <span style={{ fontWeight:600, color: solved ? T.ink3 : T.ink, textDecoration: solved ? "line-through" : "none" }}>{ch.title}</span>
                            {ch.skills && ch.skills.slice(0, 2).map(s => (
                              <span key={s} style={{ marginLeft:8, fontSize:10, color:T.ink4, background:T.bg, padding:"1px 6px", borderRadius:4, border:`1px solid ${T.border}` }}>{s}</span>
                            ))}
                          </td>
                          <td style={{ padding:"12px 16px" }}><DiffBadge diff={ch.difficulty} /></td>
                          {/* ELO reward column */}
                          <td style={{ padding:"12px 16px" }}>
                            {solved
                              ? <span style={{ fontSize:11, color:T.green, fontWeight:700 }}>✓ Done</span>
                              : <span style={{ fontSize:12, fontWeight:800, color:T.indigo, fontFamily:"'DM Mono',monospace" }}>+{eloReward}</span>}
                          </td>
                          <td style={{ padding:"12px 16px", color:T.ink3, fontFamily:"monospace", fontSize:12 }}>
                            {ch.acceptance != null ? `${ch.acceptance}%` : "—"}
                          </td>
                          <td style={{ padding:"12px 16px", color:T.ink3, fontSize:12 }}>{ch.topic_group || "—"}</td>
                        </tr>
                      )
                    })}
                    {!filteredChallenges.length && (
                      <tr><td colSpan={7} style={{ padding:"40px 20px", textAlign:"center", color:T.ink3, fontSize:13 }}>No challenges match the current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer stats */}
            <div style={{ padding:"8px 20px", borderTop:`1px solid ${T.border}`, display:"flex", gap:16, fontSize:11, color:T.ink4, background:T.bg, flexShrink:0 }}>
              <span>Showing {filteredChallenges.length} of {challenges.length} challenges</span>
              <span>·</span>
              <span style={{ color:T.green, fontWeight:600 }}>{completedIds.size} solved</span>
            </div>
          </div>
        )
      )}

      {/* ── Submit result overlay (code workstation only — MC/calculator show inline feedback) ── */}
      {submitResult && typeof submitResult.score === "number" && (
        <SubmitResultOverlay
          result={submitResult}
          onClose={() => { setSubmitResult(null); setTab("history"); setSelectedChallenge(null) }}
          onRetry={() => { setSubmitResult(null) }}
        />
      )}
    </div>
  )
}
