/**
 * domainChallenges.js — Capabilio Arena Domain Challenge Bank
 *
 * Every domain gets real-world, role-specific challenges.
 * These are the challenges shown when user clicks a domain challenge card.
 * Only the user's own domain challenges are ever shown.
 *
 * Structure per challenge:
 *   id, title, category, icon, difficulty, timeLimit, eloGain,
 *   tools[], scenario, objective, steps[], workstation, starterCode,
 *   skillTags[], hints[], expectedOutput (optional)
 */

// ─────────────────────────────────────────────────────────────────────────────
// DATA ANALYST
// ─────────────────────────────────────────────────────────────────────────────
export const DATA_ANALYST_CHALLENGES = [
  // ── STAGE 1: SQL BASICS + DATA CLEANING ──────────────────────────────────

  {
    id: "da-001",
    title: "Find Missing and Inconsistent Rows",
    category: "Data Cleaning",
    icon: "🔍",
    difficulty: "Easy",
    timeLimit: "20 min",
    eloGain: 12,
    tools: ["SQL"],
    scenario:
      "You just received a customer database export. Before the analytics team can use it, you need to identify data quality problems: missing values, duplicate entries, and inconsistent formats. A single bad row can break a dashboard or give the CEO wrong numbers.",
    objective:
      "Write SQL queries to find all nulls, spot duplicate customer IDs, and identify phone numbers that don't match the standard format.",
    steps: [
      "Count total rows in the customers table",
      "Find how many rows have NULL in each key column (name, email, phone)",
      "Identify duplicate customer_id values",
      "Find phone numbers that don't follow the 10-digit format",
      "Show a summary of all data quality issues found",
    ],
    workstation: "sql",
    starterCode: `-- Find Missing and Inconsistent Rows
-- Table: customers (customer_id, name, email, phone, city, signup_date)
--
-- Sample rows:
--   1001 | Priya Sharma  | priya@email.com | 9876543210 | Mumbai  | 2024-01-15
--   1002 | NULL          | raj@email.com   | 98765      | Delhi   | 2024-01-16
--   1001 | Priya Sharma  | priya@email.com | 9876543210 | Mumbai  | 2024-01-15  ← duplicate!
--   1003 | Amit Kumar    | NULL            | 7654321098 | Chennai | 2024-01-17

-- STEP 1: How many total rows are in this table?
-- TODO: Write a SELECT COUNT(*) query here

-- STEP 2: Count nulls in each important column
-- TODO: Use COUNT(*) - COUNT(column_name) to find nulls
-- Check columns: name, email, phone, city
-- Hint: COUNT(*) counts all rows; COUNT(col) skips NULLs

-- STEP 3: Find duplicate customer_ids
-- TODO: GROUP BY customer_id
-- TODO: Use HAVING COUNT(*) > 1 to keep only duplicates

-- STEP 4: Find invalid phone numbers (not exactly 10 digits)
-- TODO: Filter WHERE LENGTH(phone) != 10
-- Hint: Some phones may have spaces — try LENGTH(REPLACE(phone, ' ', ''))

-- STEP 5: Summarize all issues in one query
-- TODO: Write a SELECT that shows issue_type and count
-- Example output:
--   issue_type     | count
--   null_names     |    45
--   null_emails    |    12
--   duplicate_ids  |     8
--   invalid_phones |    23`,
    skillTags: ["SQL", "Data Quality", "NULL Handling", "Data Cleaning", "SELECT"],
    hints: [
      "COUNT(*) counts all rows; COUNT(column) skips NULLs — subtract them to get null count",
      "GROUP BY + HAVING COUNT(*) > 1 is the standard way to find duplicates",
      "Use LENGTH() to check if phone numbers have the right number of digits",
    ],
  },

  {
    id: "da-002",
    title: "Basic JOINs and GROUP BY",
    category: "SQL Analysis",
    icon: "🔗",
    difficulty: "Easy",
    timeLimit: "25 min",
    eloGain: 15,
    tools: ["SQL"],
    scenario:
      "The sales manager wants to know how each product category is performing. The data is split across two tables: orders (what was bought) and products (what category it belongs to). You need to JOIN them together and calculate totals by category.",
    objective:
      "Write SQL to join orders with products, calculate total sales per category, and find the top 3 categories by revenue.",
    steps: [
      "Write an INNER JOIN between orders and products tables",
      "Calculate total revenue (SUM) and order count per product category",
      "Sort by total revenue to find top categories",
      "Filter to only show categories with more than 50 orders",
      "Add a column showing each category's % share of total revenue",
    ],
    workstation: "sql",
    starterCode: `-- Basic JOINs and GROUP BY
-- Tables:
--   orders   (order_id, product_id, customer_id, quantity, amount, order_date)
--   products (product_id, product_name, category, price)
--
-- Sample orders rows:
--   ORD-001 | P-101 | C-201 | 2 | 599  | 2024-01-10
--   ORD-002 | P-203 | C-205 | 1 | 1299 | 2024-01-10
--
-- Sample products rows:
--   P-101 | Cotton T-Shirt    | Clothing     | 299
--   P-203 | Bluetooth Earbuds | Electronics  | 1299

-- STEP 1: JOIN the two tables together
-- TODO: SELECT some columns FROM orders
-- TODO: JOIN products ON orders.product_id = products.product_id
-- Run this first and look at the combined rows

-- STEP 2: Add GROUP BY category with SUM and COUNT
-- TODO: SELECT products.category,
--              COUNT(orders.order_id) AS order_count,
--              SUM(orders.amount) AS total_revenue
-- TODO: Add GROUP BY products.category

-- STEP 3: Sort by revenue and show top 3
-- TODO: Add ORDER BY total_revenue DESC
-- TODO: Add LIMIT 3

-- STEP 4: Filter out categories with fewer than 50 orders
-- TODO: Add HAVING COUNT(orders.order_id) > 50
-- Note: HAVING filters AFTER grouping (like WHERE, but for groups)

-- STEP 5 (Bonus): Calculate each category's % share of total revenue
-- TODO: Add a column: ROUND(SUM(amount) * 100.0 / SUM(SUM(amount)) OVER(), 1) AS pct
-- Hint: SUM() OVER() without partition gives grand total`,
    skillTags: ["SQL", "JOIN", "GROUP BY", "Aggregation", "SUM", "HAVING"],
    hints: [
      "INNER JOIN returns only rows that exist in both tables — run it alone first to see the result",
      "HAVING filters after GROUP BY (like WHERE, but for groups)",
      "Write JOIN + GROUP BY in one query, test it, then add HAVING and ORDER BY",
    ],
  },

  {
    id: "da-003",
    title: "Clean a Messy Sales Export",
    category: "Data Cleaning",
    icon: "🧹",
    difficulty: "Easy",
    timeLimit: "30 min",
    eloGain: 15,
    tools: ["SQL"],
    scenario:
      "You received a raw export from the sales system. Product names have typos and mixed case ('electonics', 'ELECTRONICS', 'Electronics' are all the same category). Some rows have no amount. Dates are stored inconsistently. Fix it before it goes into the dashboard.",
    objective:
      "Clean product category names, handle missing amounts, and standardize date formats so the data is ready for reporting.",
    steps: [
      "Check what unique category values exist (run SELECT DISTINCT first)",
      "Standardize category names: trim whitespace, fix case, fix typos",
      "Find rows where amount is NULL or zero",
      "Fill NULL amounts with the average for that category",
      "Standardize all dates to YYYY-MM-DD format",
    ],
    workstation: "sql",
    starterCode: `-- Clean a Messy Sales Export
-- Table: sales_raw (sale_id, product_name, category, amount, sale_date, store_id)
--
-- Known problems:
--   category values: 'electonics', 'ELECTRONICS', 'Electronics ', 'Cloths', 'clothing'
--   amount: some rows are NULL or 0
--   sale_date: mix of 'DD/MM/YYYY' and 'YYYY-MM-DD' formats

-- STEP 1: See all the unique category values (always inspect first!)
-- TODO: SELECT DISTINCT category FROM sales_raw ORDER BY category

-- STEP 2: Standardize category names
-- TODO: Apply LOWER(TRIM(category)) to normalize case and spaces
-- TODO: Use REPLACE() to fix typos:
--         'electonics' → 'electronics'
--         'cloths' → 'clothing'
-- TODO: Wrap in INITCAP() to get proper Title Case at the end

-- STEP 3: Find rows with NULL or zero amounts
-- TODO: SELECT sale_id, category, amount
--       FROM sales_raw
--       WHERE amount IS NULL OR amount = 0

-- STEP 4: Calculate average amount per category (to use as fill value)
-- TODO: SELECT category, AVG(amount) AS avg_amount
--       FROM sales_raw
--       WHERE amount IS NOT NULL AND amount > 0
--       GROUP BY category

-- STEP 5: Standardize dates (convert any non-YYYY-MM-DD to that format)
-- TODO: Use a CASE WHEN to detect which format a date is in
--       If the date contains '/' it is likely DD/MM/YYYY → use TO_DATE(sale_date, 'DD/MM/YYYY')
--       Otherwise treat as YYYY-MM-DD already

-- STEP 6: Build the cleaned table with all fixes applied
-- TODO: CREATE TABLE sales_clean AS SELECT ...
--       Apply all transformations from steps 2, 4, and 5 in one query`,
    skillTags: ["SQL", "Data Cleaning", "TRIM", "REPLACE", "Date Formatting", "NULL Handling"],
    hints: [
      "Always run STEP 1 first — see the raw mess before trying to fix it",
      "Apply LOWER(TRIM()) before REPLACE so you only handle one case of each word",
      "Fix one column at a time and verify each fix before combining them",
    ],
  },

  // ── STAGE 2: CHARTS + DASHBOARDS ─────────────────────────────────────────

  {
    id: "da-004",
    title: "Plot Monthly Revenue Trend",
    category: "Dashboard Building",
    icon: "📈",
    difficulty: "Easy",
    timeLimit: "30 min",
    eloGain: 18,
    tools: ["Python", "Pandas", "Matplotlib"],
    scenario:
      "Your manager asked for a simple bar chart showing monthly revenue for Q1 2024. The data is already in a table. You need to calculate monthly totals and create a clean, labeled chart that can be shared in a presentation.",
    objective:
      "Use Pandas to calculate monthly revenue totals and create a bar chart with proper labels, a title, and value annotations.",
    steps: [
      "Convert the order_date column to datetime type with pd.to_datetime()",
      "Extract month from order_date and group by it",
      "Sum revenue per month",
      "Create a bar chart with plt.bar()",
      "Add value labels on top of each bar",
    ],
    workstation: "notebook",
    starterCode: `# Plot Monthly Revenue Trend — Q1 2024
import pandas as pd
import matplotlib.pyplot as plt

# ─── Sample data (simulates a CSV or SQL query result) ───────────────────────
data = {
    'order_date': ['2024-01-05', '2024-01-12', '2024-01-28',
                   '2024-02-03', '2024-02-14', '2024-02-22',
                   '2024-03-01', '2024-03-15', '2024-03-29'],
    'revenue':    [45000, 32000, 67000,
                   51000, 44000, 58000,
                   72000, 39000, 81000],
}
df = pd.DataFrame(data)

# STEP 1: Convert order_date to datetime
# TODO: df['order_date'] = pd.to_datetime(???)
# Then print df.dtypes to verify it changed to datetime64

# STEP 2: Extract month label from order_date
# TODO: df['month'] = df['order_date'].dt.strftime('%b %Y')
# Or use: df['order_date'].dt.to_period('M')

# STEP 3: Calculate total revenue per month
# TODO: monthly = df.groupby('month')['revenue'].???().reset_index()
# Print monthly to check it looks right before plotting

# STEP 4: Create a bar chart
# TODO: bars = plt.bar(monthly['month'], monthly['revenue'], color='#3D4EAC')
# TODO: plt.title('Q1 2024 Monthly Revenue')
# TODO: plt.xlabel('Month')
# TODO: plt.ylabel('Revenue (₹)')

# STEP 5: Add value labels on top of each bar
# TODO: for bar in bars:
#     height = bar.get_height()
#     plt.text(bar.get_x() + bar.get_width()/2, height + 500,
#              f'₹{height:,.0f}', ha='center', va='bottom', fontsize=9)

plt.tight_layout()
plt.show()`,
    skillTags: ["Python", "Pandas", "Matplotlib", "Bar Chart", "groupby", "Data Visualization"],
    hints: [
      "pd.to_datetime(df['order_date']) converts string dates to proper datetime objects",
      "groupby() + sum() is the Pandas equivalent of SQL GROUP BY + SUM",
      "bar.get_height() gives the bar's value — use it to position the label just above the bar",
    ],
  },

  {
    id: "da-005",
    title: "Build a 4-KPI Dashboard",
    category: "Dashboard Building",
    icon: "📊",
    difficulty: "Medium",
    timeLimit: "40 min",
    eloGain: 22,
    tools: ["Python", "Pandas", "Matplotlib"],
    scenario:
      "Every Monday morning, the team views a dashboard with 4 key metrics: Total Revenue, Total Orders, Average Order Value, and Month-over-Month Growth. Build this 4-card layout so leadership sees the numbers at a glance.",
    objective:
      "Create a 2×2 matplotlib dashboard with KPI cards — each showing a metric value, label, and a green/red trend indicator.",
    steps: [
      "Calculate all 4 KPIs from the two months of data",
      "Calculate month-over-month % change for each metric",
      "Create a 2×2 figure with plt.subplots(2, 2)",
      "Style each subplot as a card: background color, large value, label, trend arrow",
      "Use green for positive change, red for negative",
    ],
    workstation: "notebook",
    starterCode: `# 4-KPI Dashboard
import pandas as pd
import matplotlib.pyplot as plt

# ─── This month vs last month ─────────────────────────────────────────────────
current = {'revenue': 4850000, 'orders': 1320, 'new_customers': 287}
last    = {'revenue': 4200000, 'orders': 1140, 'new_customers': 312}

# STEP 1: Calculate the 4 KPIs and their MoM change %
# TODO: total_revenue = current['revenue']
# TODO: total_orders  = current['orders']
# TODO: avg_order_val = total_revenue / total_orders
# TODO: revenue_growth = (current['revenue'] - last['revenue']) / last['revenue'] * 100
# TODO: Do the same MoM % change calculation for orders and avg_order_val

# STEP 2: Build a list of dicts for easy rendering
# TODO: kpis = [
#   { 'label': 'Total Revenue',    'value': f'₹{total_revenue/1e5:.1f}L', 'change': revenue_growth },
#   { 'label': 'Total Orders',     'value': str(total_orders),             'change': ??? },
#   { 'label': 'Avg Order Value',  'value': f'₹{avg_order_val:,.0f}',     'change': ??? },
#   { 'label': 'New Customers',    'value': str(current['new_customers']), 'change': ??? },
# ]

# STEP 3: Create the 2×2 figure
# TODO: fig, axes = plt.subplots(2, 2, figsize=(10, 6))
# TODO: axes = axes.flatten()  — makes it easy to loop

# STEP 4: Draw each KPI card
# TODO: for ax, kpi in zip(axes, kpis):
#     ax.set_facecolor('#EEF2FF')   # light blue background
#     ax.set_xticks([])
#     ax.set_yticks([])
#     # Large value in center
#     ax.text(0.5, 0.55, kpi['value'], transform=ax.transAxes,
#             ha='center', va='center', fontsize=24, fontweight='bold', color='#111827')
#     # Label below
#     ax.text(0.5, 0.25, kpi['label'], transform=ax.transAxes,
#             ha='center', va='center', fontsize=11, color='#6B7280')
#     # Trend arrow — green if positive, red if negative
#     arrow = '▲' if kpi['change'] >= 0 else '▼'
#     color = '#16A34A' if kpi['change'] >= 0 else '#EF4444'
#     ax.text(0.5, 0.82, f'{arrow} {abs(kpi["change"]):.1f}% MoM', transform=ax.transAxes,
#             ha='center', fontsize=10, color=color)

plt.suptitle('Weekly Performance Dashboard', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.show()`,
    skillTags: ["Python", "Pandas", "Matplotlib", "KPI", "Dashboard", "Data Visualization"],
    hints: [
      "ax.transAxes means coordinates 0–1 relative to the axes, not data values — good for text",
      "axes.flatten() converts a 2D array of axes to a 1D list so you can loop over them",
      "Set ax.set_facecolor() on each subplot to give it a card-like background color",
    ],
  },

  {
    id: "da-006",
    title: "Grouped Bar Chart: This Year vs Last Year",
    category: "Dashboard Building",
    icon: "📉",
    difficulty: "Easy",
    timeLimit: "25 min",
    eloGain: 16,
    tools: ["Python", "Matplotlib", "NumPy"],
    scenario:
      "The regional manager wants to compare this year vs last year for each product category. Build a grouped bar chart that makes the comparison immediately obvious — one cluster of bars per category, two bars per cluster.",
    objective:
      "Create a grouped bar chart comparing 2024 vs 2023 sales for 5 product categories, with a legend and YoY % change labels.",
    steps: [
      "Set up bar positions using np.arange()",
      "Plot two sets of bars side by side with different colors",
      "Set x-axis labels to category names",
      "Add a legend and axis labels",
      "Add a YoY % change annotation above each pair of bars",
    ],
    workstation: "notebook",
    starterCode: `# Grouped Bar Chart: 2024 vs 2023 Sales by Category
import numpy as np
import matplotlib.pyplot as plt

# ─── Data ─────────────────────────────────────────────────────────────────────
categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Books', 'Sports']
sales_2024 = [1250000, 980000, 750000, 420000, 680000]
sales_2023 = [980000,  1100000, 690000, 380000, 590000]

# STEP 1: Set up bar positions
# TODO: x = np.arange(len(categories))   → gives [0, 1, 2, 3, 4]
# TODO: width = 0.35                      → width of each bar

# STEP 2: Plot the two bar groups
# TODO: bars_2024 = plt.bar(x - width/2, sales_2024, width, label='2024', color='#3D4EAC')
# TODO: bars_2023 = plt.bar(x + width/2, sales_2023, width, label='2023', color='#94A3B8')
# Note: -width/2 and +width/2 shifts the bars so they sit side by side

# STEP 3: Set x-axis tick labels to category names
# TODO: plt.xticks(x, categories, rotation=15, ha='right')
# TODO: plt.xlabel('Category')
# TODO: plt.ylabel('Revenue (₹)')
# TODO: plt.title('Category Sales: 2024 vs 2023')

# STEP 4: Add legend
# TODO: plt.legend()

# STEP 5 (Bonus): YoY % change label above each bar cluster
# TODO: for i in range(len(categories)):
#     change = (sales_2024[i] - sales_2023[i]) / sales_2023[i] * 100
#     color  = 'green' if change > 0 else 'red'
#     plt.text(x[i], max(sales_2024[i], sales_2023[i]) + 15000,
#              f'{change:+.0f}%', ha='center', color=color, fontsize=9, fontweight='bold')

plt.tight_layout()
plt.show()`,
    skillTags: ["Python", "Matplotlib", "NumPy", "Bar Chart", "Data Visualization", "Comparison"],
    hints: [
      "np.arange(len(categories)) gives positions [0, 1, 2, ...] for your bar clusters",
      "Shift bars: x - width/2 for bar1, x + width/2 for bar2 so they sit side by side",
      "max(sales_2024[i], sales_2023[i]) + 15000 places the label just above the taller bar",
    ],
  },

  // ── STAGE 3: EDA + INSIGHTS ───────────────────────────────────────────────

  {
    id: "da-007",
    title: "Explore an E-Commerce Dataset",
    category: "EDA",
    icon: "🔬",
    difficulty: "Medium",
    timeLimit: "40 min",
    eloGain: 24,
    tools: ["Python", "Pandas", "Matplotlib"],
    scenario:
      "Before building any dashboard, you need to understand the data. You have an e-commerce orders table. Your job is to answer 5 business questions purely by exploring the data — no pre-determined answers.",
    objective:
      "Use Pandas EDA to answer: Who are the top customers? Which region has the lowest average order? Are there any order volume spikes? What's the order amount distribution?",
    steps: [
      "Check shape, dtypes, and null counts with df.info() and df.describe()",
      "Find the top 10 customers by total spend",
      "Calculate average order value per region and visualize it",
      "Extract month from order_date and plot monthly order volume",
      "Plot a histogram of order amounts to see the distribution shape",
    ],
    workstation: "notebook",
    starterCode: `# Exploratory Data Analysis — E-Commerce Orders
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# ─── Sample dataset ───────────────────────────────────────────────────────────
np.random.seed(42)
n = 300
df = pd.DataFrame({
    'order_id':    [f'ORD-{i:04d}' for i in range(n)],
    'customer_id': np.random.choice([f'C-{i:03d}' for i in range(40)], n),
    'region':      np.random.choice(['North', 'South', 'East', 'West'], n,
                                    p=[0.3, 0.25, 0.25, 0.2]),
    'order_date':  pd.date_range('2024-01-01', periods=n, freq='1D'),
    'amount':      (np.random.exponential(scale=2500, size=n) + 200).astype(int),
})

# STEP 1: Basic inspection — always do this first
# TODO: print(df.shape)          # rows and columns
# TODO: print(df.dtypes)         # column data types
# TODO: print(df.isnull().sum()) # null counts per column
# TODO: print(df.describe())     # stats: count, mean, std, min, percentiles, max

# STEP 2: Top 10 customers by total spend
# TODO: top_customers = df.groupby('customer_id')['amount'].sum()
# TODO:                   .nlargest(10).reset_index()
# TODO: print(top_customers)

# STEP 3: Average order value by region
# TODO: region_avg = df.groupby('region')['amount'].mean().sort_values()
# TODO: region_avg.plot(kind='barh', color='#3D4EAC')
# TODO: plt.title('Avg Order Value by Region')
# TODO: plt.xlabel('Average Amount (₹)')
# TODO: plt.show()

# STEP 4: Monthly order volume — any spikes or drops?
# TODO: df['month'] = df['order_date'].dt.to_period('M')
# TODO: monthly = df.groupby('month').size()
# TODO: monthly.plot(kind='line', marker='o', color='#6366F1')
# TODO: plt.title('Monthly Order Volume')
# TODO: plt.ylabel('Number of Orders')
# TODO: plt.show()

# STEP 5: Distribution of order amounts (histogram)
# TODO: plt.hist(df['amount'], bins=30, color='#3D4EAC', edgecolor='white')
# TODO: plt.axvline(df['amount'].mean(),   color='red',    linestyle='--', label='Mean')
# TODO: plt.axvline(df['amount'].median(), color='orange', linestyle='--', label='Median')
# TODO: plt.legend()
# TODO: plt.title('Order Amount Distribution')
# TODO: plt.show()

print("✅ EDA complete — what surprised you?")`,
    skillTags: ["Python", "Pandas", "EDA", "Data Exploration", "describe()", "groupby", "Histogram"],
    hints: [
      "df.describe() shows count, mean, std, min, 25%, 50%, 75%, max all at once — read it carefully",
      "groupby('customer_id')['amount'].sum().nlargest(10) gives top 10 customers in two steps",
      "When mean >> median in a histogram, the data has a long right tail (a few very large orders)",
    ],
  },

  {
    id: "da-008",
    title: "Month-over-Month Revenue Analysis",
    category: "SQL Analysis",
    icon: "📅",
    difficulty: "Medium",
    timeLimit: "30 min",
    eloGain: 20,
    tools: ["SQL"],
    scenario:
      "Finance wants a monthly revenue report for the full year, with month-over-month change. If any month dropped more than 10%, they want a warning flag. You need to write a clean SQL query they can run every month.",
    objective:
      "Write SQL using LAG() window function to compute monthly revenue, MoM % change, and flag months with >10% decline.",
    steps: [
      "Aggregate total revenue and order count by month using DATE_TRUNC",
      "Wrap in a CTE and add LAG() to get the previous month's revenue",
      "Calculate MoM % change: (this - prev) / prev * 100",
      "Add an alert_flag column with CASE WHEN for >10% drop",
      "Order the final result by month",
    ],
    workstation: "sql",
    starterCode: `-- Month-over-Month Revenue Analysis
-- Table: orders (order_id, customer_id, order_date, amount, region)

-- STEP 1: Aggregate revenue by month
-- TODO: SELECT DATE_TRUNC('month', order_date) AS month,
--              COUNT(*) AS order_count,
--              SUM(amount) AS total_revenue
--       FROM orders
--       GROUP BY DATE_TRUNC('month', order_date)
--       ORDER BY month
-- Run this first and verify the numbers look reasonable

-- STEP 2: Add previous month's revenue using LAG()
-- TODO: Wrap STEP 1 in a CTE named monthly_totals
-- Then write:
--   SELECT *,
--          LAG(total_revenue) OVER (ORDER BY month) AS prev_revenue
--   FROM monthly_totals
-- LAG() gives you the value from the row above (previous month)
-- The first month will have NULL for prev_revenue — that is expected

-- STEP 3: Calculate MoM % change
-- TODO: Wrap STEP 2 in a CTE named with_lag
-- Calculate:
--   ROUND((total_revenue - prev_revenue) * 100.0 / NULLIF(prev_revenue, 0), 1) AS mom_pct
-- NULLIF(prev_revenue, 0) prevents divide-by-zero errors

-- STEP 4: Add a warning flag
-- TODO: Add a CASE WHEN column:
--   WHEN mom_pct < -10 THEN 'DECLINE > 10%'
--   ELSE 'OK'
-- Name it alert_flag

-- STEP 5: Final SELECT
-- TODO: Return all columns ordered by month
-- Expected output: month | order_count | total_revenue | prev_revenue | mom_pct | alert_flag`,
    skillTags: ["SQL", "LAG", "Window Functions", "MoM Analysis", "CTEs", "DATE_TRUNC"],
    hints: [
      "LAG(column) OVER (ORDER BY month) gives the value from the previous row",
      "NULLIF(x, 0) returns NULL instead of 0 — use it to prevent divide-by-zero",
      "Build step by step: get the GROUP BY right first, then add LAG in a CTE",
    ],
  },

  {
    id: "da-009",
    title: "Spot Outliers and Anomalies",
    category: "EDA",
    icon: "🚨",
    difficulty: "Medium",
    timeLimit: "35 min",
    eloGain: 22,
    tools: ["SQL"],
    scenario:
      "Finance flagged that some orders look suspicious: unusually high amounts, orders placed at 3 AM, and customers who bought the same item many times in one day. You need to write SQL queries to surface these anomalies for investigation.",
    objective:
      "Write SQL to find statistical outliers by amount, flag unusual order times, and spot same-day repeat purchases.",
    steps: [
      "Calculate the mean and standard deviation of order amounts",
      "Find orders more than 3 standard deviations above the mean",
      "Flag orders placed between 1 AM and 5 AM",
      "Find customer+product combinations with more than 5 orders in one day",
      "Combine all anomaly types into a single result with a label column",
    ],
    workstation: "sql",
    starterCode: `-- Spot Outliers and Anomalies in Order Data
-- Table: orders (order_id, customer_id, product_id, amount, order_timestamp)
--
-- order_timestamp is a full timestamp: '2024-03-15 02:47:33'

-- STEP 1: Calculate the statistical baseline for amount
-- TODO: SELECT AVG(amount) AS mean_amount,
--              STDDEV(amount) AS stddev_amount
--       FROM orders
-- Write down these values — you will need them in STEP 2

-- STEP 2: Find high-value outliers (amount > mean + 3 × stddev)
-- TODO: Use a subquery or CTE to get mean_amount and stddev_amount
-- Then: SELECT order_id, customer_id, amount
--       FROM orders
--       WHERE amount > (subquery for mean + 3 * stddev)
-- Hint: WITH stats AS (SELECT AVG(amount) AS mean, STDDEV(amount) AS sd FROM orders)
--       SELECT ... FROM orders, stats WHERE amount > mean + 3 * sd

-- STEP 3: Flag orders placed at unusual hours (1 AM – 5 AM)
-- TODO: Use EXTRACT(HOUR FROM order_timestamp) to get the hour as an integer
-- WHERE EXTRACT(HOUR FROM order_timestamp) BETWEEN 1 AND 5

-- STEP 4: Repeat purchases — same customer, same product, same day
-- TODO: SELECT customer_id, product_id, DATE(order_timestamp) AS order_day, COUNT(*) AS purchase_count
--       FROM orders
--       GROUP BY customer_id, product_id, DATE(order_timestamp)
--       HAVING COUNT(*) > 5

-- STEP 5: Combine all anomaly types with a label
-- TODO: Use UNION ALL to stack results from steps 2, 3, and 4
-- Add 'anomaly_type' as a text column to each SELECT so you know the reason
-- e.g. SELECT order_id, 'high_value' AS anomaly_type FROM ...
--      UNION ALL
--      SELECT order_id, 'unusual_hour' AS anomaly_type FROM ...`,
    skillTags: ["SQL", "Outlier Detection", "STDDEV", "EXTRACT", "UNION ALL", "Anomaly Detection"],
    hints: [
      "STDDEV(amount) calculates standard deviation — values beyond mean ± 3×stddev are rare",
      "EXTRACT(HOUR FROM timestamp) returns an integer 0–23 representing the hour",
      "UNION ALL keeps all rows including duplicates — useful when combining anomaly types",
    ],
  },

  // ── STAGE 4: BUSINESS COMMUNICATION ──────────────────────────────────────

  {
    id: "da-010",
    title: "Explain This Chart in Plain English",
    category: "Analysis Report",
    icon: "💬",
    difficulty: "Easy",
    timeLimit: "25 min",
    eloGain: 14,
    tools: ["Markdown"],
    scenario:
      "Your manager says: 'I'm presenting to the board in 30 minutes. Give me 3 bullet points explaining what this data shows. No jargon.' This is one of the most important real-world DA skills — translating numbers into business language.",
    objective:
      "Write a plain-English interpretation of the given data: state what changed, why it matters, and what should happen next.",
    steps: [
      "Identify the main trend (growing, declining, spike, drop, stable)",
      "State the most important number in one sentence without jargon",
      "Explain what this means for the business — not just what happened",
      "Call out one finding that is surprising or needs attention",
      "Recommend one specific next action based on the data",
    ],
    workstation: "markdown",
    starterCode: `# Chart Interpretation Exercise

## The Data You're Explaining

Monthly Active Users (MAU) — Last 6 Months

| Month    | MAU    | MoM Change |
|----------|--------|------------|
| Jan 2024 | 24,500 | —          |
| Feb 2024 | 26,100 | +6.5%      |
| Mar 2024 | 28,900 | +10.7%     |
| Apr 2024 | 27,300 | −5.5%      |
| May 2024 | 25,800 | −5.5%      |
| Jun 2024 | 31,200 | +20.9%     |

Context clues:
- New feature "Quick Share" launched in June
- School exam season: April and May
- Competitor app had a major outage in June

---

## Your Interpretation

### What is the main trend? (1 sentence)
<!-- TODO: Describe the overall 6-month pattern in one simple sentence.
     Example: "Users grew strongly in Q1, dipped during exam season, then surged in June." -->
> ...

### What is the single most important number?
<!-- TODO: Pick ONE number that tells the most important story. State it simply.
     Not: "The MAU metric showed a 20.9% increase"
     Yes: "June had the highest ever MAU at 31,200 — a 27% jump from January" -->
> ...

### What does this mean for the business?
<!-- TODO: Don't just repeat the numbers. Explain the implication.
     Example: "The April-May dip is seasonal and expected — not a product problem." -->
> ...

### What is surprising or needs attention?
<!-- TODO: What stands out as unusual? What might be hiding here?
     Hint: The June spike coincided with two things — which one caused it? -->
> ...

### Recommended next action
<!-- TODO: Given this data, what should the team DO? Use a verb: Investigate, Launch, Monitor.
     Be specific: who should do what by when. -->
> **Action:** ...
> **Why:** ...`,
    skillTags: ["Business Communication", "Data Storytelling", "Plain English", "Interpretation", "Insights"],
    hints: [
      "Start with what happened, not how you calculated it — 'Users dropped 5% in April' not 'The MAU metric declined'",
      "The April-May dip lines up with exam season — is that explanation enough, or is there a product issue?",
      "A good recommendation has a verb: 'Investigate', 'Launch', 'Monitor', 'Stop'",
    ],
  },

  {
    id: "da-011",
    title: "Turn Raw Numbers into a Business Report",
    category: "Analysis Report",
    icon: "📝",
    difficulty: "Medium",
    timeLimit: "35 min",
    eloGain: 20,
    tools: ["Markdown"],
    scenario:
      "You ran a SQL query and got back a table of metrics. Now you need to turn those numbers into a 1-page summary report for the sales director. She doesn't want to see raw data — she wants to understand what happened and what to do about it.",
    objective:
      "Write a structured business report: 2-sentence executive summary, 3 data-backed findings, and 2 actionable recommendations.",
    steps: [
      "Write a 2-sentence executive summary: what happened + the main reason",
      "Write Finding 1 about the biggest negative trend with supporting numbers",
      "Write Finding 2 about a secondary issue or contributing factor",
      "Write Finding 3 that highlights something positive or stable",
      "Write 2 specific recommendations with expected outcome and owner",
    ],
    workstation: "markdown",
    starterCode: `# Monthly Sales Performance Report — May 2024

**Analyst:** [Your Name]  
**Date:** [Date]  
**For:** Sales Director

---

## Executive Summary
<!-- TODO: 2 sentences only.
     Sentence 1: What happened? (Include the key number)
     Sentence 2: The main reason why.
     Example: "May 2024 revenue fell 8% to ₹38.2L, missing target by ₹3.3L.
               The primary driver was a 31% drop in new customer acquisition." -->

...

---

## Key Metrics (given)

| Metric              | May 2024 | Apr 2024 | Change |
|---------------------|----------|----------|--------|
| Total Revenue       | ₹38.2L   | ₹41.5L   | −8%    |
| Total Orders        | 2,840    | 3,120    | −9%    |
| Avg Order Value     | ₹1,345   | ₹1,330   | +1.1%  |
| New Customers       | 612      | 890      | −31%   |
| Returning Customers | 2,228    | 2,230    | −0.1%  |
| Top Region          | South    | South    | —      |
| Worst Region        | North    | West     | —      |

---

## Finding 1: [Write a statement, not a label — e.g., "New Customer Acquisition Collapsed"]
<!-- TODO: 2–3 sentences. Observation + the number that proves it + business impact.
     Every finding must include at least one number from the table. -->

...

## Finding 2: [Title — another issue or contributing factor]
<!-- TODO: Same pattern — observation, number, business meaning -->

...

## Finding 3: [Something stable or positive — not everything is bad]
<!-- TODO: Highlight what held up. Balanced reports build more trust. -->

...

---

## Recommendations

| # | Action                | Expected Outcome          | Owner          |
|---|-----------------------|--------------------------|----------------|
| 1 |                       |                          |                |
| 2 |                       |                          |                |

### Recommendation 1: [Title]
**What to do:** ...  
**Why this will help:** ...  
**How to measure success:** ...`,
    skillTags: ["Business Communication", "Analysis Report", "Data Storytelling", "Executive Summary", "Recommendations"],
    hints: [
      "Executive summary: answer 'What happened?' then 'Why?' — in that order, in 2 sentences",
      "Every finding needs a number. 'Sales declined' is not a finding. '−31% new customers while returning customers held flat' is.",
      "Finding 3 should be something positive — AVG order value held up. Balanced reporting builds credibility.",
    ],
  },

  {
    id: "da-012",
    title: "Validate a Metric Before Presenting It",
    category: "Data Cleaning",
    icon: "✅",
    difficulty: "Medium",
    timeLimit: "30 min",
    eloGain: 18,
    tools: ["SQL"],
    scenario:
      "You're about to present 'Total Revenue: ₹1.2 Crore' to the CEO. But before you say that number out loud, run sanity checks. Data analysts who present wrong numbers lose credibility. Verify this metric before it goes on the slide.",
    objective:
      "Write SQL sanity checks to validate a revenue metric: verify date range, check for duplicates, confirm cancelled orders are excluded, and cross-check the total.",
    steps: [
      "Check that order_date is fully within May 2024 (no future or out-of-range dates)",
      "Find duplicate order_ids — any duplicates would inflate the revenue total",
      "Check what 'cancelled' order statuses look like and confirm they're excluded",
      "Recalculate the revenue from scratch with correct filters",
      "Document what you found and whether the number is trustworthy",
    ],
    workstation: "sql",
    starterCode: `-- Validate the Revenue Metric Before Presenting
-- Table: orders (order_id, customer_id, amount, order_date, status)
-- Claim to validate: Total May 2024 Revenue = ₹1,20,00,000

-- SANITY CHECK 1: Are all dates in May 2024? No future/past dates?
-- TODO: SELECT MIN(order_date) AS earliest_date,
--              MAX(order_date) AS latest_date
--       FROM orders
-- Expected: earliest >= 2024-05-01 AND latest <= 2024-05-31

-- SANITY CHECK 2: Are there duplicate order_ids? (they double-count revenue)
-- TODO: SELECT COUNT(*) AS total_rows,
--              COUNT(DISTINCT order_id) AS unique_orders
--       FROM orders
-- If total_rows != unique_orders, you have duplicates — investigate!

-- SANITY CHECK 3: What does 'cancelled' look like in this data?
-- TODO: SELECT DISTINCT status, COUNT(*) AS row_count
--       FROM orders
--       GROUP BY status
--       ORDER BY row_count DESC
-- Note any cancelled/refunded variations: 'Cancelled', 'CANCELLED', 'canceled', 'Refunded'

-- SANITY CHECK 4: Recalculate revenue from scratch with correct filters
-- TODO: SELECT COUNT(*) AS valid_order_count,
--              ROUND(AVG(amount), 0) AS avg_order_amount,
--              SUM(amount) AS total_revenue
--       FROM orders
--       WHERE order_date BETWEEN '2024-05-01' AND '2024-05-31'
--         AND status NOT IN (...)    ← fill in cancelled status values from CHECK 3

-- SANITY CHECK 5: Rough cross-check
-- valid_order_count × avg_order_amount should roughly equal total_revenue
-- A big gap means something is wrong

-- FINAL: Write your conclusion as a comment
-- Is ₹1.2 Crore correct? What did you find?
/* FINDINGS:
   - Date range: ...
   - Duplicates: ...
   - Cancelled orders: ...
   - Validated total: ₹ ...
   - VERDICT: ... */`,
    skillTags: ["SQL", "Data Validation", "Sanity Check", "Data Quality", "Metrics", "Business Trust"],
    hints: [
      "COUNT(*) vs COUNT(DISTINCT order_id) — if they differ, you have duplicate rows",
      "SELECT DISTINCT status shows all cancellation label variations in your data",
      "It's fine if the number changes after your checks — that's the whole point of validating",
    ],
  },

  // ── STAGE 5: OPTIONAL ADVANCED ────────────────────────────────────────────

  {
    id: "da-013",
    title: "Segment Customers by Spending Tier",
    category: "SQL Analysis",
    icon: "🎯",
    difficulty: "Medium",
    timeLimit: "35 min",
    eloGain: 25,
    tools: ["SQL"],
    scenario:
      "Marketing wants to send different campaigns to different customer groups. High spenders (>₹10K last 3 months) get a loyalty reward. Mid-tier (₹3K–₹10K) get a 10% discount. Low-tier (<₹3K) get a re-engagement email. Generate these lists from the orders table.",
    objective:
      "Write SQL to calculate 3-month spend per customer, assign them to tiers, and produce campaign-ready lists with contact details.",
    steps: [
      "Filter orders to the last 3 months and GROUP BY customer_id to get total spend",
      "Assign spending tiers using CASE WHEN on total_spend",
      "Show a tier summary: customer count and total revenue per tier",
      "JOIN to the customers table to get name and email",
      "Generate the High tier list for the loyalty reward campaign",
    ],
    workstation: "sql",
    starterCode: `-- Customer Spending Tier Segmentation
-- Tables:
--   orders    (order_id, customer_id, amount, order_date)
--   customers (customer_id, name, email, phone)
--
-- Tier rules:
--   High:  total_spend > 10000  → Loyalty Reward email
--   Mid:   total_spend 3000–10000 → 10% Discount email
--   Low:   total_spend < 3000   → Re-engagement email

-- STEP 1: Calculate total spend per customer in the last 3 months
-- TODO: SELECT customer_id,
--              SUM(amount) AS total_spend,
--              COUNT(order_id) AS order_count,
--              MAX(order_date) AS last_order_date
--       FROM orders
--       WHERE order_date >= CURRENT_DATE - INTERVAL '3 months'
--       GROUP BY customer_id
-- Save this as a CTE named: customer_spend

-- STEP 2: Add spending tier using CASE WHEN
-- TODO: In the same CTE or a new one, add:
--   CASE
--     WHEN total_spend > 10000 THEN 'High'
--     WHEN total_spend >= 3000 THEN 'Mid'
--     ELSE 'Low'
--   END AS spend_tier

-- STEP 3: Tier summary — how many customers and total revenue per tier?
-- TODO: SELECT spend_tier, COUNT(*) AS customers, SUM(total_spend) AS revenue
--       GROUP BY spend_tier
--       ORDER BY revenue DESC

-- STEP 4: Generate the High tier campaign list
-- TODO: JOIN customer_spend (with tier) ON customers.customer_id
-- TODO: SELECT customer_id, name, email, total_spend, last_order_date
--       WHERE spend_tier = 'High'
--       ORDER BY total_spend DESC

-- STEP 5 (Bonus): How many customers in each tier have not ordered in 30+ days?
-- TODO: Add a filter: last_order_date < CURRENT_DATE - INTERVAL '30 days'
--       These are dormant customers in each tier — a more targeted list`,
    skillTags: ["SQL", "Customer Segmentation", "CASE WHEN", "GROUP BY", "CTEs", "Marketing Analytics"],
    hints: [
      "Build and test the CTE first with SELECT * to make sure spend looks right before adding tiers",
      "CASE WHEN is evaluated top to bottom — put the most restrictive condition (> 10000) first",
      "The tier summary (STEP 3) helps you check if the tier boundaries make business sense",
    ],
  },

  {
    id: "da-014",
    title: "Cohort Retention Analysis",
    category: "Advanced Analytics",
    icon: "🔄",
    difficulty: "Hard",
    timeLimit: "50 min",
    eloGain: 35,
    tools: ["SQL", "Python", "Pandas"],
    scenario:
      "Your product launched 6 months ago. The CEO wants to know how well you're retaining users. Of the people who signed up in January, how many came back in February? In March? This is called cohort retention — one of the most important product metrics.",
    objective:
      "Write SQL to build a cohort retention table showing % of each monthly signup cohort still active in subsequent months.",
    steps: [
      "Assign each user their cohort_month from their signup_date",
      "Find all months each user was active from user_activity",
      "Calculate month_number = months elapsed since cohort_month (0 = signup month)",
      "Build retention rates: active_users / cohort_size × 100",
      "Format as a readable month × month_number matrix in Python",
    ],
    workstation: "sql",
    starterCode: `-- Cohort Retention Analysis
-- Tables:
--   users         (user_id, signup_date)
--   user_activity (user_id, activity_date)
--
-- Goal: A table that looks like this:
--   cohort_month | M0   | M1  | M2  | M3  | M4  | M5
--   Jan 2024     | 100% | 62% | 48% | 41% | 38% | 35%
--   Feb 2024     | 100% | 58% | 45% | 38% | 34% | —
--   ...

-- STEP 1: Find each user's cohort month (the month they signed up)
-- TODO: SELECT user_id,
--              DATE_TRUNC('month', signup_date)::date AS cohort_month
--       FROM users
-- Name this CTE: user_cohorts

-- STEP 2: Find all months each user was active
-- TODO: SELECT user_id,
--              DATE_TRUNC('month', activity_date)::date AS active_month
--       FROM user_activity
--       GROUP BY user_id, DATE_TRUNC('month', activity_date)::date
-- GROUP BY here deduplicates — we want one row per user per month
-- Name this CTE: monthly_activity

-- STEP 3: For each user, calculate how many months after signup they were active
-- TODO: JOIN user_cohorts with monthly_activity ON user_id
-- TODO: month_number = months elapsed between cohort_month and active_month
-- Hint: (EXTRACT(YEAR FROM AGE(active_month, cohort_month)) * 12
--        + EXTRACT(MONTH FROM AGE(active_month, cohort_month)))::int
-- Filter: WHERE active_month >= cohort_month  (no negative month numbers)
-- Name this CTE: cohort_activity

-- STEP 4: Count active users per cohort per month_number
-- TODO: SELECT cohort_month, month_number, COUNT(DISTINCT user_id) AS active_users
--       FROM cohort_activity
--       GROUP BY cohort_month, month_number

-- STEP 5: Join cohort sizes and calculate retention %
-- TODO: cohort_size = COUNT per cohort from user_cohorts
-- TODO: retention_pct = ROUND(active_users * 100.0 / cohort_size, 1)
-- TODO: ORDER BY cohort_month, month_number

-- ─── BONUS: Pivot to matrix in Python ─────────────────────────────────────────
-- # df = result of the above SQL query
-- TODO: Use df.pivot(index='cohort_month', columns='month_number', values='retention_pct')
-- TODO: print the matrix — Month 0 should always be 100% (sanity check)`,
    skillTags: ["SQL", "Cohort Analysis", "Retention", "CTEs", "Window Functions", "Pandas", "Product Analytics"],
    hints: [
      "Run STEP 1 and STEP 2 individually first to make sure the data looks right",
      "Month 0 (signup month) should always be 100% — if it isn't, something is wrong with your JOIN",
      "AGE(later_date, earlier_date) returns an interval — then EXTRACT YEAR and MONTH from it",
    ],
  },

  {
    id: "da-015",
    title: "Weekly KPI Report for the Team",
    category: "Basic KPI",
    icon: "📋",
    difficulty: "Easy",
    timeLimit: "30 min",
    eloGain: 16,
    tools: ["SQL"],
    scenario:
      "Every Friday, the business team expects a KPI summary answering 5 questions: How much did we sell? How many new customers? What's the average order? Which region is top? Are we up or down vs last week? Write the SQL that generates these numbers.",
    objective:
      "Write SQL to calculate 5 weekly KPIs including week-over-week comparison, and format the output as a Slack-ready summary.",
    steps: [
      "Calculate total revenue for the current week",
      "Count new customers (their first ever order is this week)",
      "Calculate average order value for this week",
      "Find the top-performing region by revenue",
      "Calculate week-over-week % change vs last week",
    ],
    workstation: "sql",
    starterCode: `-- Weekly KPI Report
-- Table: orders (order_id, customer_id, amount, order_date, region)
--
-- Run every Friday to generate the weekly snapshot

-- KPI 1: Total revenue this week
-- TODO: SUM(amount) WHERE order_date is in the current week
-- Hint: DATE_TRUNC('week', CURRENT_DATE) gives Monday of the current week
-- So: order_date >= DATE_TRUNC('week', CURRENT_DATE)
--     AND order_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'

-- KPI 2: New customers this week
-- A "new customer" = customer_id whose FIRST EVER order was this week
-- TODO: SELECT COUNT(DISTINCT customer_id)
--       FROM orders
--       GROUP BY customer_id
--       HAVING MIN(order_date) >= DATE_TRUNC('week', CURRENT_DATE)
-- Hint: Wrap this in a subquery or CTE to count the result

-- KPI 3: Average order value this week
-- TODO: AVG(amount) with the same date filter as KPI 1

-- KPI 4: Top region by revenue this week
-- TODO: SELECT region, SUM(amount) AS revenue
--       ... WHERE this week's date filter
--       GROUP BY region
--       ORDER BY revenue DESC
--       LIMIT 1

-- KPI 5: Week-over-week % change
-- TODO: Calculate last week's revenue using the date range 7 days earlier
-- last_week_start = DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days'
-- last_week_end   = DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 day'
-- Then: (this_week - last_week) / last_week * 100 AS wow_change_pct

-- ─── OUTPUT: Paste your final numbers into this Slack template ────────────────
-- /*
-- 📊 *Weekly KPI Summary — [Date]*
-- 💰 Revenue:       ₹[X]  ([+/-X]% vs last week)
-- 👥 New Customers:  [X]
-- 🛒 Avg Order:     ₹[X]
-- 🏆 Top Region:    [Region] (₹[X])
-- */`,
    skillTags: ["SQL", "KPI", "Reporting", "Week-over-Week", "DATE_TRUNC", "Business Metrics"],
    hints: [
      "DATE_TRUNC('week', CURRENT_DATE) returns the Monday of the current week",
      "For new customers: find MIN(order_date) per customer, then filter where that min is this week",
      "Run each KPI as a separate query first — combine them only after each one looks right",
    ],
  },
]


// ─────────────────────────────────────────────────────────────────────────────
// FRONTEND DEVELOPER
// ─────────────────────────────────────────────────────────────────────────────
export const FRONTEND_CHALLENGES = [
  {
    id: "fe-001",
    title: "Responsive Product Card Component",
    category: "Component Build",
    icon: "🧩",
    difficulty: "Easy",
    timeLimit: "25 min",
    eloGain: 15,
    tools: ["React", "CSS", "JSX"],
    scenario:
      "A shopping platform needs a product card component. It must show image, title, price, rating stars, and an Add to Cart button. It must be responsive (mobile + desktop), handle long titles with ellipsis, and show a skeleton loader when data is loading.",
    objective:
      "Build a ProductCard component that accepts props, renders correctly, and handles loading/empty states.",
    steps: [
      "Create ProductCard({ image, title, price, rating, inStock, onAddToCart })",
      "Display rating as filled/empty star icons (⭐)",
      "Add truncate for title > 40 chars",
      "Show 'Out of Stock' instead of button when inStock=false",
      "Add a SkeletonCard component shown when image/title is null",
    ],
    workstation: "react",
    starterCode: `// Responsive Product Card Component
import { useState } from 'react'

// ─── Skeleton Loader ────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ width: 240, borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', padding: 0, background: '#fff' }}>
      <div style={{ width: '100%', height: 180, background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ padding: 14 }}>
        <div style={{ height: 14, background: '#f3f4f6', borderRadius: 4, marginBottom: 8, width: '80%' }} />
        <div style={{ height: 12, background: '#f3f4f6', borderRadius: 4, marginBottom: 12, width: '50%' }} />
        <div style={{ height: 36, background: '#f3f4f6', borderRadius: 8 }} />
      </div>
    </div>
  )
}

// ─── Star Rating ────────────────────────────────────────────────────────────
function StarRating({ rating }) {
  // TODO: Render 5 stars, filled up to Math.round(rating)
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 14, color: i <= Math.round(rating) ? '#F59E0B' : '#D1D5DB' }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </div>
  )
}

// ─── Product Card ────────────────────────────────────────────────────────────
function ProductCard({ image, title, price, rating = 0, inStock = true, onAddToCart }) {
  const [added, setAdded] = useState(false)

  if (!image || !title) return <SkeletonCard />

  const truncated = title.length > 40 ? title.slice(0, 40) + '…' : title

  const handleAdd = () => {
    if (!inStock) return
    setAdded(true)
    onAddToCart?.({ title, price })
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div style={{ width: 240, borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s', fontFamily: 'sans-serif' }}>
      {/* Product Image */}
      <div style={{ position: 'relative', height: 180, overflow: 'hidden', background: '#F9FAFB' }}>
        <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {!inStock && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Out of Stock</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: '12px 14px 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4, lineHeight: 1.4 }} title={title}>
          {truncated}
        </div>
        <StarRating rating={rating} />
        <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '8px 0 12px', fontVariantNumeric: 'tabular-nums' }}>
          ₹{price.toLocaleString('en-IN')}
        </div>
        <button
          onClick={handleAdd}
          disabled={!inStock}
          style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', background: !inStock ? '#E5E7EB' : added ? '#16A34A' : '#3D4EAC', color: !inStock ? '#9CA3AF' : '#fff', fontSize: 13, fontWeight: 700, cursor: !inStock ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
          {added ? '✓ Added!' : inStock ? 'Add to Cart' : 'Unavailable'}
        </button>
      </div>
    </div>
  )
}

// ─── Demo ────────────────────────────────────────────────────────────────────
export default function App() {
  const [cart, setCart] = useState([])

  return (
    <div style={{ minHeight: '100vh', background: '#F6F6F1', padding: 40, fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: 24 }}>Product Cards — {cart.length} in cart</h2>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <ProductCard
          image="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300"
          title="Premium Leather Watch — Swiss Movement"
          price={8999}
          rating={4.3}
          inStock={true}
          onAddToCart={(item) => setCart(c => [...c, item])}
        />
        <ProductCard
          image="https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=300"
          title="Wireless Noise-Cancelling Headphones"
          price={3499}
          rating={3.8}
          inStock={false}
          onAddToCart={(item) => setCart(c => [...c, item])}
        />
        <ProductCard image={null} title={null} price={0} />
        {/* TODO: Add a ProductCard with a very long title to test truncation */}
      </div>
      <style>{\`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      \`}</style>
    </div>
  )
}`,
    skillTags: ["React", "Component Design", "CSS", "Responsive", "Props", "State"],
    hints: [
      "Use title attribute on the truncated element so users see the full name on hover",
      "CSS transition on background for smooth button state change",
      "SkeletonCard uses animation: shimmer for the loading effect",
    ],
  },

  {
    id: "fe-002",
    title: "Multi-Step Form with Validation",
    category: "Form Engineering",
    icon: "📋",
    difficulty: "Medium",
    timeLimit: "40 min",
    eloGain: 25,
    tools: ["React", "useState", "Validation"],
    scenario:
      "Build a 3-step user registration form: Step 1 collects personal info, Step 2 collects address, Step 3 shows a review and confirm. Each step must validate before proceeding. Show progress indicator and allow navigating back.",
    objective:
      "A fully functional multi-step form with field validation, progress indicator, and a confirmation screen.",
    steps: [
      "Step 1: Name (required, min 2 chars), Email (valid format), Phone (10 digits)",
      "Step 2: Address line 1, City, State dropdown, PIN code (6 digits)",
      "Step 3: Review all entered data with an Edit button per section",
      "Show a step progress bar at the top (Step 1 / 2 / 3)",
      "Disable Next if current step has validation errors",
    ],
    workstation: "react",
    starterCode: `// Multi-Step Registration Form
import { useState } from 'react'

const STEPS = ['Personal Info', 'Address', 'Review']

const INITIAL = {
  name: '', email: '', phone: '',
  address: '', city: '', state: '', pin: '',
}

// ─── Validators ──────────────────────────────────────────────────────────────
function validateStep1(data) {
  const errs = {}
  if (!data.name || data.name.trim().length < 2) errs.name = 'Name must be at least 2 characters'
  if (!data.email || !/^[^@]+@[^@]+\\.[^@]+$/.test(data.email)) errs.email = 'Enter a valid email address'
  if (!data.phone || !/^\\d{10}$/.test(data.phone)) errs.phone = 'Enter a 10-digit phone number'
  return errs
}

function validateStep2(data) {
  const errs = {}
  if (!data.address || data.address.trim().length < 5) errs.address = 'Enter your full address'
  if (!data.city) errs.city = 'City is required'
  if (!data.state) errs.state = 'Select a state'
  if (!data.pin || !/^\\d{6}$/.test(data.pin)) errs.pin = 'Enter a 6-digit PIN code'
  return errs
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
function ProgressBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: i <= current ? '#3D4EAC' : '#E5E7EB', color: i <= current ? '#fff' : '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, transition: 'all 0.2s' }}>
              {i < current ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 12, fontWeight: i === current ? 700 : 400, color: i === current ? '#111827' : '#6B7280' }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? '#3D4EAC' : '#E5E7EB', margin: '0 10px', transition: 'background 0.2s' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, error, type = 'text', placeholder, maxLength }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        style={{ width: '100%', padding: '9px 12px', border: \`1px solid \${error ? '#EF4444' : '#D1D5DB'}\`, borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
        onFocus={e => { if (!error) e.target.style.borderColor = '#3D4EAC' }}
        onBlur={e => { if (!error) e.target.style.borderColor = '#D1D5DB' }}
      />
      {error && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function MultiStepForm() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const update = (field) => (val) => setData(d => ({ ...d, [field]: val }))

  const next = () => {
    const errs = step === 0 ? validateStep1(data) : step === 1 ? validateStep2(data) : {}
    setErrors(errs)
    if (Object.keys(errs).length === 0) setStep(s => s + 1)
  }

  const back = () => { setStep(s => s - 1); setErrors({}) }

  if (submitted) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
      <h2 style={{ color: '#16A34A' }}>Registration Complete!</h2>
      <p style={{ color: '#6B7280' }}>Welcome, {data.name}!</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F6F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '32px 36px', width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 800 }}>Create Account</h2>
        <ProgressBar current={step} />

        {step === 0 && (
          <>
            <Field label="Full Name" value={data.name} onChange={update('name')} error={errors.name} placeholder="Rahul Sharma" />
            <Field label="Email Address" value={data.email} onChange={update('email')} error={errors.email} type="email" placeholder="rahul@example.com" />
            <Field label="Phone Number" value={data.phone} onChange={update('phone')} error={errors.phone} placeholder="9876543210" maxLength={10} />
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Address" value={data.address} onChange={update('address')} error={errors.address} placeholder="123 MG Road, Apt 4B" />
            <Field label="City" value={data.city} onChange={update('city')} error={errors.city} placeholder="Bangalore" />
            {/* TODO: Add State dropdown and PIN code field */}
          </>
        )}

        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>Review Your Details</h3>
            {/* TODO: Show all data.* values in a review table with an Edit button */}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {step > 0 && (
            <button onClick={back} style={{ flex: 1, padding: 10, border: '1px solid #D1D5DB', borderRadius: 8, background: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
          )}
          {step < 2 ? (
            <button onClick={next} style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, background: '#3D4EAC', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Continue →</button>
          ) : (
            <button onClick={() => setSubmitted(true)} style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, background: '#16A34A', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✓ Submit Registration</button>
          )}
        </div>
      </div>
    </div>
  )
}`,
    skillTags: ["React", "Form Validation", "Multi-Step", "useState", "UX"],
    hints: [
      "Store all form data in one state object and pass update functions per field",
      "Validate on Next click, not on every keystroke (better UX)",
      "The review step should show all fields with an Edit button that jumps back to that step",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND DEVELOPER
// ─────────────────────────────────────────────────────────────────────────────
export const BACKEND_CHALLENGES = [
  {
    id: "be-001",
    title: "JWT Authentication Middleware",
    category: "Auth System",
    icon: "🔐",
    difficulty: "Medium",
    timeLimit: "35 min",
    eloGain: 25,
    tools: ["Node.js", "JWT", "Express", "REST API"],
    scenario:
      "Build a secure JWT authentication system for a REST API. Users sign in and receive a short-lived access token (15 min) and a refresh token (7 days). Protected routes reject invalid/expired tokens. Refresh endpoint rotates the refresh token.",
    objective:
      "Implement: POST /auth/login, POST /auth/refresh, GET /me (protected), and the verifyToken middleware.",
    steps: [
      "POST /auth/login: validate credentials, return accessToken + refreshToken",
      "Create verifyToken middleware: extract Bearer token, verify signature, attach req.user",
      "GET /me: protected by verifyToken, returns user profile",
      "POST /auth/refresh: validate refresh token, issue new accessToken",
      "Return 401 for expired/invalid tokens with a descriptive error message",
    ],
    workstation: "code",
    starterCode: `// JWT Authentication System — Express + Node.js
const express = require('express')
const jwt     = require('jsonwebtoken')
const bcrypt  = require('bcrypt')

const app = express()
app.use(express.json())

// ─── Config ──────────────────────────────────────────────────────────────────
const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'access-secret-change-in-prod'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-prod'
const ACCESS_TTL     = '15m'
const REFRESH_TTL    = '7d'

// ─── Mock DB ─────────────────────────────────────────────────────────────────
const users = [
  { id: 1, email: 'demo@example.com', passwordHash: bcrypt.hashSync('password123', 10), name: 'Demo User', role: 'user' },
  { id: 2, email: 'admin@example.com', passwordHash: bcrypt.hashSync('admin123', 10), name: 'Admin', role: 'admin' },
]
const refreshTokenStore = new Set() // In prod: persist to Redis/DB

// ─── Helpers ─────────────────────────────────────────────────────────────────
const signAccess  = (payload) => jwt.sign(payload, ACCESS_SECRET,  { expiresIn: ACCESS_TTL  })
const signRefresh = (payload) => jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL })

// ─── Middleware: verifyToken ──────────────────────────────────────────────────
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    // TODO: Return 401 with specific message for expired vs invalid tokens
    const isExpired = err.name === 'TokenExpiredError'
    return res.status(401).json({ error: isExpired ? 'Token expired' : 'Invalid token' })
  }
}

// ─── POST /auth/login ────────────────────────────────────────────────────────
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = users.find(u => u.email === email)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

  const payload = { sub: user.id, email: user.email, role: user.role }
  const accessToken  = signAccess(payload)
  const refreshToken = signRefresh({ sub: user.id })

  refreshTokenStore.add(refreshToken)

  res.json({
    accessToken,
    refreshToken,
    expiresIn: 900,   // seconds
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
})

// ─── GET /me (protected) ─────────────────────────────────────────────────────
app.get('/me', verifyToken, (req, res) => {
  const user = users.find(u => u.id === req.user.sub)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role })
})

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' })

  // TODO: Verify refresh token is in store AND has valid signature
  if (!refreshTokenStore.has(refreshToken)) {
    return res.status(401).json({ error: 'Refresh token revoked' })
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET)
    const user    = users.find(u => u.id === decoded.sub)
    if (!user) return res.status(401).json({ error: 'User not found' })

    // Rotate: invalidate old, issue new
    refreshTokenStore.delete(refreshToken)
    const payload      = { sub: user.id, email: user.email, role: user.role }
    const newAccess    = signAccess(payload)
    const newRefresh   = signRefresh({ sub: user.id })
    refreshTokenStore.add(newRefresh)

    res.json({ accessToken: newAccess, refreshToken: newRefresh, expiresIn: 900 })
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' })
  }
})

// ─── POST /auth/logout ───────────────────────────────────────────────────────
app.post('/auth/logout', (req, res) => {
  // TODO: Remove refresh token from store
  const { refreshToken } = req.body
  refreshTokenStore.delete(refreshToken)
  res.json({ message: 'Logged out' })
})

app.listen(3000, () => console.log('Auth server on port 3000'))
module.exports = app`,
    skillTags: ["JWT", "Authentication", "Node.js", "Express", "REST API", "Security"],
    hints: [
      "bcrypt.compare() is async — always await it",
      "Short-lived access tokens + rotating refresh tokens is the industry standard pattern",
      "Never store access tokens server-side — only refresh tokens need server-side storage",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// DEVOPS / SRE
// ─────────────────────────────────────────────────────────────────────────────
export const DEVOPS_CHALLENGES = [
  {
    id: "dv-001",
    title: "CI/CD Pipeline for Node.js App",
    category: "CI/CD Pipeline",
    icon: "🚀",
    difficulty: "Medium",
    timeLimit: "40 min",
    eloGain: 25,
    tools: ["GitHub Actions", "Docker", "YAML", "Node.js"],
    scenario:
      "Set up a production-grade CI/CD pipeline for a Node.js API. The pipeline must: run tests on every PR, build a Docker image on merge to main, push to GHCR, and deploy to the staging environment via SSH.",
    objective:
      "Write a complete GitHub Actions workflow YAML with 3 jobs: test, build-and-push, deploy-to-staging.",
    steps: [
      "Job 1 (test): checkout, setup Node 20, npm ci, run tests",
      "Job 2 (build-push): depends on test, docker login to GHCR, build & tag image, push",
      "Job 3 (deploy): depends on build-push, SSH into staging, docker pull, restart container",
      "Cache node_modules between runs to speed up the pipeline",
      "Use GitHub Secrets for credentials (never hardcode)",
    ],
    workstation: "terminal",
    starterCode: `# GitHub Actions — CI/CD Pipeline
# File: .github/workflows/ci-cd.yml

name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  IMAGE_NAME: ghcr.io/\${{ github.repository }}/api
  NODE_VERSION: '20'

jobs:

  # ─── JOB 1: Test ───────────────────────────────────────────────────────────
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js \${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'                         # Cache npm dependencies

      - name: Install dependencies
        run: npm ci                             # Faster than npm install in CI

      - name: Run linter
        run: npm run lint

      - name: Run tests with coverage
        run: npm test -- --coverage
        env:
          NODE_ENV: test
          DATABASE_URL: \${{ secrets.TEST_DATABASE_URL }}

      # TODO: Upload coverage report to Codecov or similar

  # ─── JOB 2: Build & Push Docker Image ─────────────────────────────────────
  build-push:
    name: Build & Push Image
    runs-on: ubuntu-latest
    needs: test                                # Only runs if test passes
    if: github.ref == 'refs/heads/main'        # Only on main branch

    permissions:
      contents: read
      packages: write                          # Required for GHCR push

    steps:
      - uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─── JOB 3: Deploy to Staging ─────────────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-push
    environment: staging                       # Requires environment approval if configured

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: \${{ secrets.STAGING_HOST }}
          username: \${{ secrets.STAGING_USER }}
          key: \${{ secrets.STAGING_SSH_KEY }}
          script: |
            # TODO: Pull new image and restart container
            docker pull \${{ env.IMAGE_NAME }}:latest
            docker stop api-staging || true
            docker rm   api-staging || true
            docker run -d \\
              --name api-staging \\
              --restart unless-stopped \\
              -p 3000:3000 \\
              -e NODE_ENV=staging \\
              -e DATABASE_URL="\$STAGING_DB_URL" \\
              \${{ env.IMAGE_NAME }}:latest

      - name: Health check
        run: |
          sleep 10
          curl -f http://\${{ secrets.STAGING_HOST }}:3000/health || exit 1`,
    skillTags: ["GitHub Actions", "CI/CD", "Docker", "DevOps", "YAML", "GHCR"],
    hints: [
      "needs: [test] makes a job wait for another to succeed",
      "cache: 'npm' in setup-node uses GitHub's cache automatically",
      "Never log secrets — GitHub masks them but avoid printing env vars",
    ],
  },

  {
    id: "dv-002",
    title: "Kubernetes Deployment & Health Checks",
    category: "Container Orchestration",
    icon: "☸️",
    difficulty: "Hard",
    timeLimit: "50 min",
    eloGain: 35,
    tools: ["Kubernetes", "kubectl", "YAML", "Docker"],
    scenario:
      "Deploy a production Node.js API to Kubernetes with proper health checks, resource limits, rolling updates, and a Horizontal Pod Autoscaler. The app must handle 0 downtime deploys and auto-scale at 70% CPU.",
    objective:
      "Write complete Kubernetes manifests: Deployment, Service, ConfigMap, HPA, and a Readiness/Liveness probe setup.",
    steps: [
      "Write a Deployment manifest with 3 replicas, resource limits (100m CPU / 128Mi RAM)",
      "Add liveness probe (HTTP GET /health every 10s) and readiness probe (/ready)",
      "Add a RollingUpdate strategy with maxSurge=1, maxUnavailable=0",
      "Write a ClusterIP Service and a LoadBalancer Service",
      "Add an HPA that scales 3–10 pods when CPU > 70%",
    ],
    workstation: "terminal",
    starterCode: `# Kubernetes Production Deployment
# All manifests in one file, separated by ---

# ─── 1. ConfigMap — environment variables ────────────────────────────────────
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
  namespace: production
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"

---

# ─── 2. Deployment ───────────────────────────────────────────────────────────
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
  namespace: production
  labels:
    app: api
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1           # Allow 1 extra pod during deploy
      maxUnavailable: 0     # Never take a pod down before new one is ready

  template:
    metadata:
      labels:
        app: api
        version: v1
    spec:
      containers:
        - name: api
          image: ghcr.io/your-org/api:latest
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: api-config
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: DATABASE_URL

          # Resource requests and limits
          resources:
            requests:
              cpu: "100m"       # 0.1 CPU core guaranteed
              memory: "128Mi"   # 128 MB RAM guaranteed
            limits:
              cpu: "500m"       # Max 0.5 CPU core
              memory: "256Mi"   # Max 256 MB RAM

          # Liveness probe — restart container if it fails
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 3

          # Readiness probe — remove from load balancer if not ready
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 2

      # TODO: Add graceful shutdown with terminationGracePeriodSeconds

---

# ─── 3. Service — internal ClusterIP ─────────────────────────────────────────
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
spec:
  selector:
    app: api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP

---

# ─── 4. Horizontal Pod Autoscaler ────────────────────────────────────────────
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-deployment
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70    # Scale up at 70% CPU

# TODO: Add Ingress with TLS termination
# TODO: Add PodDisruptionBudget to ensure at least 2 pods are always available`,
    skillTags: ["Kubernetes", "DevOps", "HPA", "Rolling Deployments", "Health Checks", "YAML"],
    hints: [
      "maxUnavailable: 0 + maxSurge: 1 = zero-downtime rolling update",
      "Readiness probe controls traffic routing; liveness probe controls restart",
      "HPA requires metrics-server to be installed in the cluster",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// SOFTWARE ENGINEER (SWE) — Algorithm + System Design
// ─────────────────────────────────────────────────────────────────────────────
export const SWE_CHALLENGES = [
  {
    id: "swe-001",
    title: "Design a URL Shortener",
    category: "System Design",
    icon: "🏗️",
    difficulty: "Hard",
    timeLimit: "45 min",
    eloGain: 35,
    tools: ["System Design", "Markdown", "Architecture"],
    scenario:
      "Design a URL shortener service (like Bit.ly) that can handle 100M URLs, 10B redirects/day, and p99 redirect latency < 10ms. The system must be highly available with 99.99% uptime.",
    objective:
      "Produce a complete system design: capacity estimates, data model, component diagram, API spec, and key trade-offs.",
    steps: [
      "Estimate: QPS, storage per year, bandwidth requirements",
      "Define the data model: URL table schema, short code generation strategy",
      "Draw the component diagram: LB → API → Cache (Redis) → DB",
      "Spec the two endpoints: POST /shorten and GET /{code}",
      "Discuss: how to handle 301 vs 302, expiry, analytics, and hash collisions",
    ],
    workstation: "system_design",
    starterCode: `# URL Shortener — System Design

---

## 1. Requirements

### Functional
- Shorten a long URL → return a short URL (e.g., cap.io/xK3p9)
- Redirect short URL → original URL (< 10ms p99)
- Optional: expiry date, custom alias, analytics (click count)

### Non-Functional
- **Scale:** 100M URLs stored, 10B redirects/day (~115K redirects/sec)
- **Availability:** 99.99% uptime
- **Latency:** p99 redirect < 10ms

---

## 2. Capacity Estimates

| Metric | Calculation | Result |
|--------|------------|--------|
| Redirects/sec | 10B / 86,400s | ~115K RPS |
| Write QPS | Assume 1M new URLs/day | ~12 WPS |
| Storage per URL | ~500 bytes avg | |
| Storage per year | 100M × 500 bytes | **50 GB/year** |
| Cache size (20% hot) | 20M URLs × 500 bytes | **10 GB** |

---

## 3. Data Model

\`\`\`sql
CREATE TABLE urls (
    short_code  CHAR(7) PRIMARY KEY,    -- Base62 encoded ID
    long_url    TEXT NOT NULL,
    user_id     UUID,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    expires_at  TIMESTAMPTZ,
    click_count BIGINT DEFAULT 0
);

CREATE INDEX idx_urls_created ON urls(created_at);
\`\`\`

**Short code generation strategy:**
<!-- TODO: Explain how you generate unique 7-char codes (hash, auto-increment, etc.) -->

---

## 4. Component Diagram

\`\`\`
Client → [Load Balancer] → [API Servers (stateless)]
                                      ↓           ↓
                               [Redis Cache]  [PostgreSQL]
                               (hot URLs)      (source of truth)

                               [Analytics Service]
                               (async, Kafka)
\`\`\`

---

## 5. API Design

### POST /api/shorten
\`\`\`json
Request:  { "url": "https://example.com/very/long/url", "expires_in_days": 30 }
Response: { "short_url": "https://cap.io/xK3p9", "short_code": "xK3p9", "expires_at": "..." }
\`\`\`

### GET /{code}
\`\`\`
Response: HTTP 301 Redirect → Location: <original_url>
\`\`\`

---

## 6. Redirect Flow (Critical Path)

\`\`\`
1. Client hits cap.io/xK3p9
2. Load Balancer → API Server
3. API checks Redis cache (hit? return URL immediately)
4. Cache miss → query PostgreSQL → populate Redis
5. Return 301 redirect
6. Async: increment click_count (Kafka → Analytics service)
\`\`\`

---

## 7. Key Trade-offs

| Decision | Option A | Option B | Choice |
|----------|----------|----------|--------|
| Redirect type | 301 Permanent | 302 Temporary | |
| Short code gen | Hash (MD5) | Base62(auto-id) | |
| Cache TTL | 24 hours | 1 hour | |
| DB | PostgreSQL | Cassandra | |

<!-- TODO: Fill in choices and justify each one -->`,
    skillTags: ["System Design", "Architecture", "Redis", "PostgreSQL", "Scalability", "Caching"],
    hints: [
      "Use 301 redirect for caching benefit (client caches it) — but breaks analytics",
      "Base62(auto-increment ID) avoids hash collision; hash is simpler but needs collision handling",
      "Cache the top 20% of hot URLs — they account for 80% of traffic (Pareto principle)",
    ],
  },

  {
    id: "swe-002",
    title: "Menu Item Filter Function",
    category: "Algorithms",
    icon: "🧩",
    difficulty: "Easy",
    timeLimit: "25 min",
    eloGain: 15,
    tools: ["JavaScript", "TypeScript", "Python"],
    scenario:
      "You're building a food-delivery feature at Swiggy. Given a list of menu items with properties (name, price, category, isVeg), write a function that filters items based on a dynamic filter object. The filter can specify any combination of: vegetarian only, max price, and category.",
    objective:
      "Write a `filterMenu(items, filters)` function that returns only items matching ALL provided filter criteria. Handle missing/undefined filter keys gracefully.",
    steps: [
      "Accept items[] and filters{} as parameters",
      "Filter by isVeg if filters.isVeg = true",
      "Filter by maxPrice if filters.maxPrice is provided",
      "Filter by category if filters.category is provided",
      "Return filtered array; empty array if nothing matches",
      "Write 3 test cases covering edge cases (empty filters, no match, partial match)",
    ],
    workstation: "code",
    starterCode: `// Menu Item Filter — Swiggy Feature
// items: Array<{ name: string, price: number, category: string, isVeg: boolean }>
// filters: { isVeg?: boolean, maxPrice?: number, category?: string }

function filterMenu(items, filters) {
  // TODO: implement — handle all filter keys gracefully
  return items.filter(item => {
    // isVeg filter
    if (filters.isVeg !== undefined && filters.isVeg !== item.isVeg) return false
    // maxPrice filter
    if (filters.maxPrice !== undefined && item.price > filters.maxPrice) return false
    // category filter
    if (filters.category !== undefined && item.category !== filters.category) return false
    return true
  })
}

// ── Test Cases ────────────────────────────────────────────────────────────────
const MENU = [
  { name: "Paneer Butter Masala", price: 280, category: "Main Course", isVeg: true  },
  { name: "Chicken Biryani",      price: 320, category: "Main Course", isVeg: false },
  { name: "Veg Spring Roll",      price: 150, category: "Starter",     isVeg: true  },
  { name: "Prawn Curry",          price: 420, category: "Main Course", isVeg: false },
  { name: "Masala Dosa",          price: 120, category: "Breakfast",   isVeg: true  },
]

console.log("Test 1 — Veg only:", filterMenu(MENU, { isVeg: true }))
console.log("Test 2 — Under ₹200:", filterMenu(MENU, { maxPrice: 200 }))
console.log("Test 3 — Veg starters under ₹200:", filterMenu(MENU, { isVeg: true, maxPrice: 200, category: "Starter" }))
console.log("Test 4 — Empty filters (all):", filterMenu(MENU, {}))
console.log("Test 5 — No match:", filterMenu(MENU, { category: "Dessert" }))`,
    skillTags: ["JavaScript", "Array Methods", "Filtering", "Edge Cases", "Functions"],
    hints: [
      "Use `filters.isVeg !== undefined` to distinguish 'not set' from 'false'",
      "Chain conditions with &&: if any single condition fails, return false",
      "Test with {} (empty filters) — should return all items",
    ],
  },

  {
    id: "swe-003",
    title: "LRU Cache Implementation",
    category: "Data Structures",
    icon: "🗃️",
    difficulty: "Medium",
    timeLimit: "35 min",
    eloGain: 25,
    tools: ["JavaScript", "TypeScript", "Python"],
    scenario:
      "A backend service at Razorpay caches merchant profiles to avoid repeated database reads. Implement an LRU (Least Recently Used) cache with O(1) get and put operations. When the cache is full, evict the least recently used entry.",
    objective:
      "Implement `LRUCache(capacity)` with `get(key)` returning the value or -1, and `put(key, value)` evicting the LRU item when at capacity.",
    steps: [
      "Use a Map (insertion-ordered) for O(1) get, put, and delete",
      "get(key): if found, move it to the end (most recently used), return value",
      "put(key, value): if key exists, update and move to end; if at capacity, delete the first entry (LRU)",
      "All operations must be O(1)",
      "Test with: capacity=2, put(1,1), put(2,2), get(1)=1, put(3,3) evicts key 2, get(2)=-1",
    ],
    workstation: "code",
    starterCode: `// LRU Cache — Razorpay Merchant Cache
// All operations must be O(1)

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity
    this.cache = new Map()  // JS Map preserves insertion order — perfect for LRU
  }

  get(key) {
    if (!this.cache.has(key)) return -1
    // Move to end (most recently used)
    const val = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, val)
    return val
  }

  put(key, value) {
    if (this.cache.has(key)) {
      // Update existing: delete then re-insert to move to end
      this.cache.delete(key)
    } else if (this.cache.size >= this.capacity) {
      // Evict LRU: first key in Map (oldest insertion)
      const lruKey = this.cache.keys().next().value
      this.cache.delete(lruKey)
    }
    this.cache.set(key, value)
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
const cache = new LRUCache(2)
cache.put(1, 'merchant_A')
cache.put(2, 'merchant_B')
console.log(cache.get(1))     // 'merchant_A' — now 1 is MRU
cache.put(3, 'merchant_C')    // evicts key 2 (LRU)
console.log(cache.get(2))     // -1 (evicted)
console.log(cache.get(3))     // 'merchant_C'
cache.put(4, 'merchant_D')    // evicts key 1 (LRU)
console.log(cache.get(1))     // -1 (evicted)
console.log(cache.get(3))     // 'merchant_C'
console.log(cache.get(4))     // 'merchant_D'`,
    skillTags: ["LRU Cache", "Data Structures", "HashMap", "Linked List", "O(1) Operations"],
    hints: [
      "JavaScript's Map preserves insertion order — first key = LRU",
      "Delete then re-insert to move an item to 'most recently used' position",
      "this.cache.keys().next().value gives you the oldest (LRU) key in O(1)",
    ],
  },

  {
    id: "swe-004",
    title: "Rate Limiter Design",
    category: "System Design",
    icon: "🏗️",
    difficulty: "Hard",
    timeLimit: "40 min",
    eloGain: 30,
    tools: ["System Design", "Redis", "Node.js"],
    scenario:
      "Design a rate limiter for Swiggy's API gateway that allows each user a maximum of 100 requests per minute. At 10M concurrent users during peak, the system must enforce limits with minimal latency overhead (<5ms per check) and survive Redis failures gracefully.",
    objective:
      "Produce a complete rate limiter design: algorithm choice with trade-off analysis, Redis data structure, pseudocode for the check function, and a failure mode strategy.",
    steps: [
      "Choose between Token Bucket, Sliding Window Log, or Fixed Window — justify your choice",
      "Design the Redis key structure and TTL strategy",
      "Write pseudocode for isAllowed(userId) checking and incrementing the counter",
      "Calculate Redis memory requirement at 10M users",
      "Design the fallback when Redis is unavailable (fail-open vs fail-closed)",
    ],
    workstation: "system_design",
    starterCode: `# Rate Limiter System Design

---

## 1. Algorithm Choice

**Options:**
- Fixed Window Counter — simple but allows 2× burst at window boundary
- Sliding Window Log — accurate but memory O(requests) per user
- Token Bucket — handles burst well, complex to implement distributed
- **Sliding Window Counter** — best balance: fixed window + previous window weight

**Chosen: Sliding Window Counter**
Formula: count = prev_window_count × (1 - elapsed_fraction) + current_window_count

---

## 2. Redis Data Structure

\`\`\`
Key:   rate_limit:{user_id}:{window_timestamp_minute}
Type:  String (integer counter)
TTL:   120 seconds (2 minutes — covers current + previous window)
\`\`\`

Example: rate_limit:user_12345:2024031514   (2:14 PM window)

---

## 3. isAllowed() Pseudocode

\`\`\`python
def is_allowed(user_id, limit=100):
    now = current_unix_timestamp()
    current_window = floor(now / 60)   # minute-level window
    prev_window    = current_window - 1
    elapsed_secs   = now % 60          # seconds into current window

    # Get both window counts (pipeline = 1 round-trip to Redis)
    curr_key = f"rate_limit:{user_id}:{current_window}"
    prev_key = f"rate_limit:{user_id}:{prev_window}"

    curr_count, prev_count = redis.mget(curr_key, prev_key)
    curr_count = int(curr_count or 0)
    prev_count = int(prev_count or 0)

    # Sliding window estimate
    elapsed_fraction = elapsed_secs / 60
    estimated_count  = prev_count * (1 - elapsed_fraction) + curr_count

    if estimated_count >= limit:
        return False   # rate limited

    # Increment current window
    redis.pipeline()
      .incr(curr_key)
      .expire(curr_key, 120)
      .execute()

    return True
\`\`\`

---

## 4. Capacity Estimates

| Metric | Calculation | Result |
|--------|------------|--------|
| Keys   | 10M users × 2 windows | 20M keys |
| Memory/key | 64 bytes avg | ~1.3 GB |
| Peak RPS | 10M users × avg 1 req/min | ~167K RPS |
| Latency | 1 Redis round-trip | < 2ms |

---

## 5. Redis Failure Strategy

**Decision: Fail-Open with Circuit Breaker**

- Primary: Redis cluster with read replicas
- If Redis is unreachable: fail-open (allow requests, log for audit)
- Circuit breaker: after 5 consecutive Redis errors, bypass for 30s
- Alternative: in-memory local counter per pod as fallback (approximate)

**Trade-off:**
- Fail-open → users can burst during outage, minimal customer impact
- Fail-closed → DDoS protection holds but legitimate users are blocked

---

## 6. Trade-offs

| Decision | Chosen | Reason |
|----------|--------|--------|
| Algorithm | Sliding Window Counter | O(1) memory, accurate, handles burst |
| Storage | Redis String + INCR | Atomic, fast, low memory |
| Failure mode | Fail-open | UX > security for API use case |
| Granularity | Per-minute | Matches "100 req/min" SLA exactly |`,
    skillTags: ["Rate Limiting", "System Design", "Redis", "Distributed Systems", "Algorithms"],
    hints: [
      "Sliding Window Counter uses prev_count × (1 - elapsed/window) to smooth the boundary burst",
      "Redis INCR is atomic — no race condition between check and increment",
      "Pipeline mget + incr + expire in one round-trip to stay under 5ms",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// DBA — Database Administrator
// ─────────────────────────────────────────────────────────────────────────────
export const DBA_CHALLENGES = [
  {
    id: "dba-001",
    title: "Query Performance Optimization",
    category: "Query Optimization",
    icon: "⚡",
    difficulty: "Hard",
    timeLimit: "40 min",
    eloGain: 32,
    tools: ["PostgreSQL", "EXPLAIN ANALYZE", "Indexes"],
    scenario:
      "A slow query is causing 5-second page loads on the orders page. EXPLAIN ANALYZE shows a Sequential Scan on a 10M-row table. Your job: analyze the query plan, identify bottlenecks, add the right indexes, and verify the improvement.",
    objective:
      "Reduce query execution time from 5000ms to under 50ms by adding appropriate indexes and rewriting the query.",
    steps: [
      "Run EXPLAIN ANALYZE on the original slow query",
      "Identify the Sequential Scan and its cost",
      "Add a composite index on the filtered + sorted columns",
      "Verify the query now uses Index Scan with EXPLAIN ANALYZE",
      "Write EXPLAIN output comparison before/after",
    ],
    workstation: "sql",
    starterCode: `-- Query Performance Optimization
-- Table: orders (id, customer_id, status, created_at, total, product_id)
-- 10M rows, no indexes except PK

-- ─── THE SLOW QUERY ─────────────────────────────────────────────────────────
EXPLAIN ANALYZE
SELECT
    o.id,
    o.customer_id,
    o.total,
    o.created_at
FROM orders o
WHERE o.status = 'pending'
  AND o.created_at >= NOW() - INTERVAL '30 days'
ORDER BY o.created_at DESC
LIMIT 50;

-- Expected output:
-- Seq Scan on orders  (cost=0.00..285000.00 rows=50 width=36)
--                     (actual time=4850.123..4998.456 rows=50 loops=1)
-- Planning Time: 2.1 ms
-- Execution Time: 4998.5 ms   ← 5 seconds! Too slow.

-- ─── STEP 1: Add the right index ────────────────────────────────────────────
-- Rule: Index on (equality columns first, then range/sort columns)
-- Query filters: status = 'pending' (equality) AND created_at >= (range) ORDER BY created_at DESC

-- TODO: Create a composite index that will be used by this query
CREATE INDEX CONCURRENTLY idx_orders_status_date
    ON orders (status, created_at DESC);

-- ─── STEP 2: Re-run EXPLAIN ANALYZE ─────────────────────────────────────────
EXPLAIN ANALYZE
SELECT
    o.id, o.customer_id, o.total, o.created_at
FROM orders o
WHERE o.status = 'pending'
  AND o.created_at >= NOW() - INTERVAL '30 days'
ORDER BY o.created_at DESC
LIMIT 50;

-- Expected after index:
-- Index Scan Backward using idx_orders_status_date on orders
-- Index Cond: (status = 'pending') AND (created_at >= ...)
-- Rows Removed by Filter: ~100
-- Execution Time: 0.8 ms   ← 6000x faster!

-- ─── STEP 3: Covering index (avoid table heap access) ───────────────────────
-- The query only needs: id, customer_id, total, created_at
-- A covering index includes all needed columns → eliminates table lookup

-- TODO: Drop old index and create a covering index using INCLUDE
DROP INDEX CONCURRENTLY idx_orders_status_date;

CREATE INDEX CONCURRENTLY idx_orders_status_date_covering
    ON orders (status, created_at DESC)
    INCLUDE (id, customer_id, total);

-- ─── STEP 4: Check index usage stats ────────────────────────────────────────
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan     AS times_used,
    idx_tup_read AS rows_read,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'orders'
ORDER BY idx_scan DESC;`,
    skillTags: ["PostgreSQL", "Query Optimization", "EXPLAIN ANALYZE", "Indexes", "DBA", "Performance"],
    hints: [
      "Equality columns first, range/sort columns last in composite index",
      "INCLUDE adds columns to the index leaf without affecting the sort order",
      "CONCURRENTLY allows building an index without locking the table for writes",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CYBERSECURITY
// ─────────────────────────────────────────────────────────────────────────────
export const CYBER_CHALLENGES = [
  {
    id: "cy-001",
    title: "Secure a Vulnerable Express API",
    category: "Application Security",
    icon: "🔒",
    difficulty: "Hard",
    timeLimit: "45 min",
    eloGain: 35,
    tools: ["Node.js", "Security", "OWASP"],
    scenario:
      "A Node.js Express API has multiple OWASP Top 10 vulnerabilities. Identify and fix: SQL Injection, Missing Rate Limiting, Broken Auth (no JWT verification), Sensitive Data Exposure in error messages, and Missing Security Headers.",
    objective:
      "Find and fix 5 security vulnerabilities in the provided Express API code.",
    steps: [
      "Fix SQL Injection: use parameterized queries instead of string concatenation",
      "Add rate limiting (express-rate-limit: 100 req/15min per IP)",
      "Add verifyToken middleware to the /admin route",
      "Sanitize error messages — never expose stack traces or DB errors to clients",
      "Add Helmet.js to set secure HTTP headers",
    ],
    workstation: "code",
    starterCode: `// VULNERABLE Express API — Find and fix the security issues
// This code has at least 5 vulnerabilities. Your job: identify and fix all of them.
const express = require('express')
const mysql   = require('mysql2')
// const helmet  = require('helmet')       // TODO: Uncomment and use
// const rateLimit = require('express-rate-limit')  // TODO: Uncomment and use
const jwt     = require('jsonwebtoken')

const app = express()
app.use(express.json())

// ─── VULNERABILITY 1: Missing security headers ─────────────────────────────
// app.use(helmet())   ← should be uncommented and configured

// ─── VULNERABILITY 2: No rate limiting ────────────────────────────────────
// Any IP can make unlimited requests → DDoS, brute-force attacks
// TODO: Add rate limiter here (100 requests per 15 minutes per IP)

const db = mysql.createConnection({
  host: 'localhost', user: 'root', password: 'password', database: 'app'
})

// ─── VULNERABILITY 3: SQL Injection ───────────────────────────────────────
// The user_id is inserted directly into the SQL string without sanitization.
// Attack: GET /user/1 OR 1=1--  → dumps all users
app.get('/user/:id', (req, res) => {
  const query = \`SELECT id, name, email FROM users WHERE id = \${req.params.id}\`
  //                                                         ↑ NEVER do this!
  db.query(query, (err, results) => {
    if (err) {
      // ─── VULNERABILITY 4: Sensitive data exposure ────────────────────────
      // Never send raw error or stack trace to client — leaks DB schema, server info
      return res.status(500).json({ error: err.message, stack: err.stack })
    }
    res.json(results)
  })
})

// ─── VULNERABILITY 5: Broken Auth — no token verification ─────────────────
// The /admin route is completely unprotected
app.get('/admin/users', (req, res) => {
  // TODO: Add verifyToken middleware — anyone can call this right now!
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message }) // Also exposes DB errors!
    res.json(results)
  })
})

// ─── YOUR FIXES GO BELOW ──────────────────────────────────────────────────

// Fix 1: Parameterized query (no SQL injection)
app.get('/user-fixed/:id', (req, res) => {
  // TODO: Rewrite using parameterized query: db.query('SELECT ... WHERE id = ?', [id])
})

// Fix 2: Auth middleware
function verifyToken(req, res, next) {
  // TODO: Implement JWT verification
}

// Fix 3: Secure admin route
app.get('/admin-fixed/users', verifyToken, (req, res) => {
  // TODO: Implement with parameterized query and sanitized error
})

app.listen(3000, () => console.log('Server running'))`,
    skillTags: ["Cybersecurity", "OWASP", "SQL Injection", "Security Headers", "Rate Limiting", "Node.js"],
    hints: [
      "SQL Injection fix: db.query('SELECT ... WHERE id = ?', [req.params.id])",
      "helmet() sets X-Frame-Options, CSP, HSTS, and many more headers automatically",
      "Never include err.stack or err.message in API responses — log them server-side only",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// ECE / EMBEDDED SYSTEMS CHALLENGES
// ─────────────────────────────────────────────────────────────────────────────
export const ECE_CHALLENGES = [
  {
    id: "ece-001",
    title: "GPIO LED Blink — Bare-Metal ARM",
    category: "Embedded C",
    icon: "🤖",
    difficulty: "Easy",
    timeLimit: "25 min",
    eloGain: 15,
    tools: ["C", "ARM Cortex-M"],
    missionType: "embedded_lab",
    scenario:
      "You're bring-up engineer for a new STM32F103 board. The hardware team says the LED on PA5 isn't blinking during factory test. Your job: write the bare-metal C code that configures the GPIO pin and toggles the LED at 1 Hz without any HAL library.",
    objective:
      "Write bare-metal C code to enable GPIOA clock, configure PA5 as push-pull output, and toggle it in a delay loop to produce a 1 Hz blink.",
    steps: [
      "Enable GPIOA clock via RCC_APB2ENR (bit 2)",
      "Configure PA5 as output push-pull, max 2 MHz speed in CRL register",
      "Write a software delay loop calibrated for ~500 ms at 8 MHz HSI",
      "Toggle PA5 using BSRR (set) and BRR (reset) registers",
      "Verify the output toggles correctly in your simulation",
    ],
    test_cases: [{ options: ["0b0010 (2 MHz output push-pull)", "0b0011 (50 MHz output push-pull)", "0b0111 (input floating)", "0b1000 (analog input)"], correct: 0, explanation: "CRL bits [23:20] control PA5. MODE=10 (2 MHz) + CNF=00 (push-pull) = 0b0010. HAL sets this via GPIO_SPEED_FREQ_LOW." }],
    workstation: "embedded_lab",
    starterCode: `// GPIO LED Blink — STM32F103 (no HAL)
// Clock: 8 MHz HSI, LED on PA5

#include <stdint.h>

// Register base addresses
#define RCC_BASE    0x40021000
#define GPIOA_BASE  0x40010800

#define RCC_APB2ENR  (*(volatile uint32_t *)(RCC_BASE   + 0x18))
#define GPIOA_CRL    (*(volatile uint32_t *)(GPIOA_BASE + 0x00))
#define GPIOA_BSRR   (*(volatile uint32_t *)(GPIOA_BASE + 0x10))
#define GPIOA_BRR    (*(volatile uint32_t *)(GPIOA_BASE + 0x14))

void delay_ms(uint32_t ms) {
  // TODO: implement software delay (~8000 cycles per ms at 8 MHz)
}

int main(void) {
  // TODO: 1. Enable GPIOA clock

  // TODO: 2. Configure PA5 as output push-pull, 2 MHz

  // TODO: 3. Toggle PA5 every 500 ms
  while (1) {

  }
}`,
    skillTags: ["GPIO", "RCC", "Bare-Metal", "ARM Cortex-M", "BSRR/BRR"],
    hints: [
      "RCC_APB2ENR bit 2 enables GPIOA clock",
      "CRL controls pins 0-7: bits [23:20] control PA5 — set to 0b0010 for 2 MHz output",
      "BSRR bit 5 sets PA5 HIGH; BRR bit 5 sets PA5 LOW",
    ],
  },
  {
    id: "ece-002",
    title: "UART Transmit — Polling Mode",
    category: "Communication Protocols",
    icon: "🔌",
    difficulty: "Easy",
    timeLimit: "30 min",
    eloGain: 18,
    tools: ["C", "UART", "STM32"],
    scenario:
      "Your embedded system needs to send debug strings over UART1 to a host PC. The bootloader runs at 115200 baud, 8N1. There's no DMA or interrupt budget — it must be a simple polling implementation.",
    objective:
      "Configure USART1 on STM32 at 115200 baud and implement a blocking uart_send_string() function using the TXE flag.",
    steps: [
      "Enable USART1 and GPIOA clocks via RCC",
      "Configure PA9 (TX) as alternate function push-pull",
      "Calculate and set BRR for 115200 baud at 36 MHz APB2",
      "Enable USART1 with TE (transmit enable) bit",
      "Implement uart_send_char() that waits for TXE then writes to DR",
      "Build uart_send_string() on top and send 'Hello ECE!' over UART",
    ],
    missionType: "embedded_lab",
    test_cases: [{ options: ["312 (0x138)", "156 (0x9C)", "624 (0x270)", "9600"], correct: 0, explanation: "BRR = f_PCLK / baud = 36,000,000 / 115,200 ≈ 312. Writing 0x138 to USART1_BRR gives 115200 baud at 36 MHz APB2." }],
    workstation: "embedded_lab",
    starterCode: `// UART1 Polling — STM32F103 @ 36 MHz APB2
#include <stdint.h>

#define RCC_BASE    0x40021000
#define GPIOA_BASE  0x40010800
#define USART1_BASE 0x40013800

#define RCC_APB2ENR  (*(volatile uint32_t *)(RCC_BASE   + 0x18))
#define GPIOA_CRH    (*(volatile uint32_t *)(GPIOA_BASE + 0x04))
#define USART1_SR    (*(volatile uint32_t *)(USART1_BASE + 0x00))
#define USART1_DR    (*(volatile uint32_t *)(USART1_BASE + 0x04))
#define USART1_BRR   (*(volatile uint32_t *)(USART1_BASE + 0x08))
#define USART1_CR1   (*(volatile uint32_t *)(USART1_BASE + 0x0C))

// TXE bit in SR
#define USART_SR_TXE  (1 << 7)
#define USART_CR1_TE  (1 << 3)
#define USART_CR1_UE  (1 << 13)

void uart_send_char(char c) {
  // TODO: wait for TXE, then write c to DR
}

void uart_send_string(const char *s) {
  // TODO: iterate and call uart_send_char
}

int main(void) {
  // TODO: 1. Enable GPIOA + USART1 clocks
  // TODO: 2. Configure PA9 as AF push-pull
  // TODO: 3. Set BRR for 115200 baud (hint: 36000000/115200 ≈ 313)
  // TODO: 4. Enable USART1 with TE + UE

  uart_send_string("Hello ECE!\\r\\n");
  while (1) {}
}`,
    skillTags: ["UART", "Polling", "Baud Rate", "STM32", "Serial Communication"],
    hints: [
      "BRR = f_PCLK / baud_rate. At 36 MHz: 36000000 / 115200 ≈ 312 (0x138)",
      "PA9 is USART1_TX — CRH bits [7:4] → 0b1011 for AF push-pull 50 MHz",
      "Check SR_TXE before writing to DR. Don't write while the shift register is busy.",
    ],
  },
  {
    id: "ece-003",
    title: "RC Filter — Cutoff Frequency Calculation",
    category: "Circuit Design",
    icon: "⚡",
    difficulty: "Easy",
    timeLimit: "20 min",
    eloGain: 12,
    tools: ["Python", "NumPy"],
    scenario:
      "A sensor output has significant 50 Hz mains noise. You need a first-order RC low-pass filter with a cutoff frequency of 10 Hz so only the slow DC drift signal passes to the ADC. Calculate the required R and C values and verify the transfer function.",
    objective:
      "Calculate R and C for a 10 Hz low-pass filter, then write Python code to plot the Bode magnitude response and confirm the -3 dB point.",
    steps: [
      "Use the formula fc = 1 / (2π × R × C)",
      "Choose R = 10 kΩ and compute the required C",
      "Generate frequency array from 1 Hz to 10 kHz (log scale)",
      "Compute |H(jω)| = 1 / √(1 + (f/fc)²) for each frequency",
      "Plot magnitude in dB vs frequency (Bode plot)",
      "Verify the magnitude is -3 dB (≈ 0.707) at exactly 10 Hz",
    ],
    missionType: "engineering_lab",
    test_cases: [{ options: ["1.59 µF", "15.9 µF", "0.159 µF", "159 nF"], correct: 0, explanation: "C = 1 / (2π × R × fc) = 1 / (2π × 10,000 × 10) ≈ 1.59 µF. Verify: at 10 Hz, |H| = 1/√2 ≈ 0.707 → −3.01 dB." }],
    workstation: "engineering_lab",
    starterCode: `import numpy as np
import math

# Target cutoff frequency
fc = 10  # Hz

# Step 1: Choose R = 10 kΩ, calculate C
R = 10_000  # ohms
C = None  # TODO: C = 1 / (2 * pi * R * fc)

print(f"R = {R/1000:.1f} kΩ")
print(f"C = {C*1e6:.2f} µF" if C else "C not calculated yet")

# Step 2: Frequency sweep (1 Hz to 10 kHz)
freqs = np.logspace(0, 4, 500)  # 10^0 to 10^4

# Step 3: Transfer function magnitude |H(f)| = 1 / sqrt(1 + (f/fc)^2)
H_mag = None  # TODO

# Step 4: Convert to dB
H_dB = None   # TODO: 20 * log10(H_mag)

# Step 5: Find -3 dB point
# TODO: find index where H_dB is closest to -3 and print that frequency

print(f"\\nExpected -3dB frequency: {fc} Hz")
# print(f"Actual -3dB frequency: {freqs[idx]:.2f} Hz")
`,
    skillTags: ["RC Circuit", "Low-Pass Filter", "Transfer Function", "Bode Plot", "Signal Processing"],
    hints: [
      "C = 1 / (2 × π × R × fc). At R=10kΩ and fc=10Hz: C ≈ 1.59 µF",
      "H_dB = 20 × log10(H_mag). At fc, |H| = 1/√2 ≈ 0.707 → -3.01 dB",
      "np.argmin(np.abs(H_dB - (-3))) finds the index closest to -3 dB",
    ],
  },
  {
    id: "ece-004",
    title: "I2C Sensor Read — Write Your Own Driver",
    category: "Communication Protocols",
    icon: "🔌",
    difficulty: "Medium",
    timeLimit: "40 min",
    eloGain: 25,
    tools: ["C", "I2C", "Embedded"],
    scenario:
      "You're integrating an MPU-6050 IMU with an STM32 over I2C1. The HAL library is forbidden (memory constraints). Implement a minimal blocking I2C driver that reads the WHO_AM_I register (0x75) and returns its value (expected: 0x68).",
    objective:
      "Write bare-metal I2C master functions (start, address, write byte, read byte, stop) and use them to read register 0x75 from the MPU-6050 at I2C address 0x68.",
    steps: [
      "Enable I2C1 and GPIOB clocks; configure PB6 (SCL) and PB7 (SDA) as open-drain AF",
      "Configure I2C1: 100 kHz standard mode, PCLK1 = 36 MHz, set CR2, CCR, TRISE",
      "Implement i2c_start() — set START bit, wait for SB flag",
      "Implement i2c_write_addr(addr, rw) — write address byte, wait for ADDR, clear by reading SR1+SR2",
      "Implement i2c_write_byte(data) and i2c_read_byte(ack)",
      "Combine into i2c_read_reg(dev_addr, reg_addr) — write reg pointer then restart + read",
      "Call it to read WHO_AM_I and assert the result equals 0x68",
    ],
    missionType: "embedded_lab",
    test_cases: [{ options: ["180 (0xB4)", "360 (0x168)", "90 (0x5A)", "72 (0x48)"], correct: 0, explanation: "CCR = f_PCLK1 / (2 × f_I2C) = 36,000,000 / (2 × 100,000) = 180. TRISE = f_PCLK1_MHz + 1 = 37 for standard mode." }],
    workstation: "embedded_lab",
    starterCode: `// I2C1 Bare-Metal Driver — STM32F103 PCLK1=36MHz
#include <stdint.h>

#define I2C1_BASE  0x40005400
#define I2C_CR1    (*(volatile uint32_t *)(I2C1_BASE + 0x00))
#define I2C_CR2    (*(volatile uint32_t *)(I2C1_BASE + 0x04))
#define I2C_CCR    (*(volatile uint32_t *)(I2C1_BASE + 0x1C))
#define I2C_TRISE  (*(volatile uint32_t *)(I2C1_BASE + 0x20))
#define I2C_SR1    (*(volatile uint32_t *)(I2C1_BASE + 0x14))
#define I2C_SR2    (*(volatile uint32_t *)(I2C1_BASE + 0x18))
#define I2C_DR     (*(volatile uint32_t *)(I2C1_BASE + 0x10))

#define MPU6050_ADDR  0x68
#define WHO_AM_I_REG  0x75

void i2c_init(void) {
  // TODO: configure PCLK1=36, CCR for 100kHz, TRISE, enable I2C1
}

void i2c_start(void) {
  // TODO: set START bit, wait SB flag in SR1
}

void i2c_write_addr(uint8_t addr, uint8_t rw) {
  // TODO: write (addr<<1)|rw to DR, wait ADDR, clear by reading SR1+SR2
}

uint8_t i2c_read_byte(int ack) {
  // TODO: set/clear ACK bit, wait RXNE, return DR
  return 0;
}

void i2c_write_byte(uint8_t data) {
  // TODO: write to DR, wait BTF
}

void i2c_stop(void) {
  I2C_CR1 |= (1 << 9);  // STOP bit
}

uint8_t i2c_read_reg(uint8_t dev, uint8_t reg) {
  // TODO: start → write addr (W) → write reg → restart → read addr (R) → read byte → stop
  return 0;
}

int main(void) {
  i2c_init();
  uint8_t who = i2c_read_reg(MPU6050_ADDR, WHO_AM_I_REG);
  // Expected: who == 0x68
  return (who == 0x68) ? 0 : 1;
}`,
    skillTags: ["I2C", "Master Mode", "MPU-6050", "Bare-Metal", "Register Map"],
    hints: [
      "CCR = PCLK1 / (2 × f_I2C). At 36 MHz and 100 kHz: CCR = 180 (0xB4)",
      "TRISE = (PCLK1_MHz + 1) = 37 for standard mode",
      "Clear ADDR by reading SR1 then SR2 in sequence — don't just read SR1",
    ],
  },
  {
    id: "ece-005",
    title: "Digital Logic — 4-bit Ripple Carry Adder",
    category: "Digital Electronics",
    icon: "💾",
    difficulty: "Easy",
    timeLimit: "25 min",
    eloGain: 14,
    tools: ["Verilog"],
    scenario:
      "Your VLSI team needs a structural Verilog model of a 4-bit ripple carry adder (RCA) to use as a sub-module in an ALU. The model must be fully structural — wire full adder modules together, no behavioral addition operator allowed.",
    objective:
      "Write structural Verilog for a full adder and instantiate four of them to build a 4-bit ripple carry adder. Verify with a testbench that 0b0110 + 0b0101 = 0b1011 with Cout = 0.",
    steps: [
      "Define a full_adder module with inputs a, b, cin and outputs sum, cout",
      "Implement full adder using only AND, OR, XOR gate primitives",
      "Define rca_4bit module with inputs a[3:0], b[3:0], cin and outputs sum[3:0], cout",
      "Instantiate four full_adder modules, chaining cout → cin",
      "Write a testbench: apply a=6, b=5, cin=0 and check sum=11, cout=0",
    ],
    missionType: "embedded_lab",
    test_cases: [{ options: ["Sum = 1011₂, Cout = 0", "Sum = 1011₂, Cout = 1", "Sum = 1111₂, Cout = 0", "Sum = 0011₂, Cout = 1"], correct: 0, explanation: "0110 (6) + 0101 (5) = 1011 (11). No carry out since 11 < 16. Each full adder chains carry to the next stage." }],
    workstation: "embedded_lab",
    starterCode: `// 4-bit Ripple Carry Adder — Structural Verilog
// DO NOT use + operator — structural gate-level only

module full_adder (
  input  a, b, cin,
  output sum, cout
);
  // TODO: implement using XOR, AND, OR gates
  // sum  = a ^ b ^ cin
  // cout = (a & b) | (b & cin) | (a & cin)
endmodule

module rca_4bit (
  input  [3:0] a, b,
  input        cin,
  output [3:0] sum,
  output       cout
);
  wire c1, c2, c3;
  // TODO: instantiate four full_adder modules
  // fa0: a[0], b[0], cin  → sum[0], c1
  // fa1: a[1], b[1], c1   → sum[1], c2
  // ...
endmodule

// Testbench
module tb;
  reg  [3:0] a, b;
  reg        cin;
  wire [3:0] sum;
  wire       cout;

  rca_4bit uut (.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));

  initial begin
    a = 4'b0110; b = 4'b0101; cin = 0;
    #10;
    $display("a=%b b=%b cin=%b → sum=%b cout=%b", a, b, cin, sum, cout);
    // Expected: sum = 4'b1011, cout = 0
    if (sum === 4'b1011 && cout === 0)
      $display("PASS");
    else
      $display("FAIL");
    $finish;
  end
endmodule`,
    skillTags: ["Verilog", "Full Adder", "Ripple Carry", "Structural Design", "Gate Primitives"],
    hints: [
      "full_adder: sum = a ^ b ^ cin; cout = (a&b)|(b&cin)|(a&cin)",
      "Use named port connections: full_adder fa0 (.a(a[0]), .b(b[0]), .cin(cin), .sum(sum[0]), .cout(c1))",
      "In Verilog, gate primitives are: and(out,a,b), or(out,a,b), xor(out,a,b)",
    ],
  },
  {
    id: "ece-006",
    title: "SPI ADC Read — Bit-Bang Implementation",
    category: "Communication Protocols",
    icon: "🔌",
    difficulty: "Medium",
    timeLimit: "35 min",
    eloGain: 22,
    tools: ["C", "SPI", "Embedded"],
    scenario:
      "Your hardware uses an MCP3201 (12-bit SPI ADC) but the SPI peripheral is occupied by another device. Implement a software (bit-bang) SPI master to read a single 12-bit sample from the MCP3201 using GPIO pins for SCK, MOSI, MISO, and CS.",
    objective:
      "Implement bit-bang SPI (mode 0,0) that clocks 16 bits from MCP3201 and extracts the 12-bit ADC result from the response frame.",
    steps: [
      "Define GPIO macros for CS (PA4), SCK (PA5), MOSI (PA7), MISO (PA6)",
      "Implement spi_transfer_byte(tx) — 8-bit half-duplex, MSB first, mode 0",
      "Assert CS low, transfer 0x00 twice to clock out 16 bits, deassert CS",
      "Extract 12-bit result: MCP3201 sends null+B11..B0 across 16 clocks",
      "Print the raw ADC value and the corresponding voltage (Vref = 3.3 V)",
    ],
    missionType: "embedded_lab",
    test_cases: [{ options: ["Bits [14:3] — shift right by 3 and mask 12 bits", "Bits [11:0] — no shift needed", "Bits [15:4] — shift right by 4", "Bits [13:2] — shift right by 2"], correct: 0, explanation: "MCP3201 sends: null bit at position 15, then B11..B0 at bits [14:3]. Extract: (raw >> 3) & 0x0FFF or equivalently raw & 0x7FF8 >> 3." }],
    workstation: "embedded_lab",
    starterCode: `// Bit-Bang SPI — MCP3201 12-bit ADC on STM32
#include <stdint.h>

// GPIO bit-bang pins (assume configured as output/input already)
#define CS_LOW()   // TODO: PA4 = 0
#define CS_HIGH()  // TODO: PA4 = 1
#define SCK_LOW()  // TODO: PA5 = 0
#define SCK_HIGH() // TODO: PA5 = 1
#define MOSI(v)    // TODO: PA7 = v
#define MISO_READ() 0 // TODO: return PA6 state

void spi_delay(void) {
  for (volatile int i = 0; i < 10; i++);  // ~100 ns @ 72 MHz
}

uint8_t spi_transfer_byte(uint8_t tx) {
  uint8_t rx = 0;
  // TODO: 8 clock cycles, MSB first, sample MISO on rising edge
  return rx;
}

uint16_t mcp3201_read(void) {
  CS_LOW();
  // TODO: clock out 16 bits (two 0x00 bytes), reconstruct 12-bit result
  // MCP3201 frame: 1 null bit + B11..B0 across 13 remaining clocks
  uint16_t raw = 0;
  CS_HIGH();
  return raw & 0x0FFF;
}

int main(void) {
  // gpio_init();  // assume already done
  uint16_t adc = mcp3201_read();
  float voltage = (adc / 4095.0f) * 3.3f;
  // Expected: adc in [0, 4095], voltage in [0.0, 3.3]
  return 0;
}`,
    skillTags: ["SPI", "Bit-Bang", "ADC", "MCP3201", "Bit Manipulation"],
    hints: [
      "SPI mode 0: clock idle low, data sampled on rising edge",
      "On rising SCK edge: MISO_READ() → shift into rx (MSB first)",
      "MCP3201 sends a leading null bit — discard bit 15, bits 14..3 are B11..B0",
    ],
  },
  {
    id: "ece-007",
    title: "D Flip-Flop — Timing Diagram Analysis",
    category: "Digital Electronics",
    icon: "💾",
    difficulty: "Easy",
    timeLimit: "20 min",
    eloGain: 12,
    tools: ["Verilog"],
    scenario:
      "A junior engineer's D flip-flop design is failing timing closure. Your job: write a synthesizable Verilog model of a positive-edge-triggered D FF with synchronous reset, and then identify the setup-time violation in a given timing scenario.",
    objective:
      "Write a D flip-flop module with synchronous active-high reset. Then analyse whether a given input change meets the setup time requirement of 2 ns before the clock edge.",
    steps: [
      "Write module dff_sync_rst with inputs clk, rst, d and output q",
      "Use always @(posedge clk): if rst → q <= 0, else q <= d",
      "Write a testbench: apply rst for 2 cycles, then set d=1 and toggle clk",
      "Check q captures d correctly at each rising edge",
      "Identify: if d changes 1.5 ns before clk edge with t_setup = 2 ns — does it violate?",
    ],
    missionType: "embedded_lab",
    test_cases: [{ options: ["Setup time violation — FF may capture metastable value", "No violation — 1.5 ns is within the timing budget", "Hold time violation, not setup time", "The FF will reset automatically due to metastability"], correct: 0, explanation: "t_setup = 2 ns means d must be stable at least 2 ns before the clock edge. Here d changes only 1.5 ns before the edge (1.5 < 2), so this IS a setup time violation. The output q may be metastable." }],
    workstation: "embedded_lab",
    starterCode: `// D Flip-Flop with Synchronous Reset — Verilog
module dff_sync_rst (
  input  clk, rst, d,
  output reg q
);
  // TODO: synchronous reset, positive edge triggered
endmodule

module tb;
  reg clk, rst, d;
  wire q;

  dff_sync_rst uut (.clk(clk), .rst(rst), .d(d), .q(q));

  // 10 ns clock period
  initial clk = 0;
  always #5 clk = ~clk;

  initial begin
    rst = 1; d = 0;
    #20 rst = 0;
    #10 d = 1;  // d goes high 10ns before next edge
    #10;        // posedge clk — should capture d=1
    $display("q = %b (expected 1)", q);
    // Timing question: t_setup = 2ns, d changes 1.5ns before clk rising edge
    // Answer: VIOLATION — d must be stable at least 2ns before the edge
    #10 $finish;
  end
endmodule`,
    skillTags: ["D Flip-Flop", "Synchronous Reset", "Setup Time", "Timing Analysis", "Verilog"],
    hints: [
      "Synchronous reset: both rst and d are only sampled at posedge clk",
      "Setup time violation: if data changes within the setup window before the clock edge, the output is metastable",
      "1.5 ns < 2 ns setup time → this IS a violation. The FF may latch wrong value.",
    ],
  },
  {
    id: "ece-008",
    title: "PWM Motor Speed Control",
    category: "Embedded C",
    icon: "🤖",
    difficulty: "Medium",
    timeLimit: "35 min",
    eloGain: 20,
    tools: ["C", "ARM Cortex-M", "Timer"],
    scenario:
      "A DC motor driver accepts a 20 kHz PWM signal where 0% duty = stopped and 100% duty = full speed. You need to configure TIM2 on STM32F103 to output PWM on PA1 (TIM2_CH2) and implement a function that sets motor speed from 0 to 100%.",
    objective:
      "Configure TIM2 in PWM mode 1 on channel 2 (PA1) at 20 kHz with 72 MHz system clock. Implement set_motor_speed(percent) that updates the duty cycle without restarting the timer.",
    steps: [
      "Enable TIM2 and GPIOA clocks",
      "Configure PA1 as alternate function push-pull output",
      "Set TIM2 PSC = 0, ARR = 3599 for 20 kHz (72 MHz / 3600 = 20 kHz)",
      "Configure CCR2 in PWM mode 1 (OC2M = 110)",
      "Enable CCR2 preload and TIM2 auto-reload preload",
      "Enable OC2 output and start the timer (CEN bit)",
      "set_motor_speed(50) should set CCR2 = 1799 for 50% duty",
    ],
    missionType: "embedded_lab",
    test_cases: [{ options: ["1800 — using CCR2 = (percent × (ARR+1)) / 100", "1799 — using CCR2 = (percent × ARR) / 100", "3600 — full ARR value at 100%", "899 — quarter of ARR"], correct: 0, explanation: "At 50%: CCR2 = (50 × (3599+1)) / 100 = (50 × 3600) / 100 = 1800. PWM is HIGH for CCR2 counts out of ARR+1 total, so duty = 1800/3600 = 50.0% exactly." }],
    workstation: "embedded_lab",
    starterCode: `// PWM Motor Speed — TIM2_CH2 (PA1), 20 kHz, 72 MHz system clock
#include <stdint.h>

#define RCC_BASE  0x40021000
#define GPIOA_BASE 0x40010800
#define TIM2_BASE 0x40000000

#define RCC_APB2ENR (*(volatile uint32_t *)(RCC_BASE + 0x18))
#define RCC_APB1ENR (*(volatile uint32_t *)(RCC_BASE + 0x1C))
#define GPIOA_CRL   (*(volatile uint32_t *)(GPIOA_BASE))
#define TIM2_CR1    (*(volatile uint32_t *)(TIM2_BASE + 0x00))
#define TIM2_CCMR1  (*(volatile uint32_t *)(TIM2_BASE + 0x18))
#define TIM2_CCER   (*(volatile uint32_t *)(TIM2_BASE + 0x20))
#define TIM2_PSC    (*(volatile uint32_t *)(TIM2_BASE + 0x28))
#define TIM2_ARR    (*(volatile uint32_t *)(TIM2_BASE + 0x2C))
#define TIM2_CCR2   (*(volatile uint32_t *)(TIM2_BASE + 0x38))

void pwm_init(void) {
  // TODO: clocks, GPIO AF, timer config
}

void set_motor_speed(uint8_t percent) {
  if (percent > 100) percent = 100;
  // TODO: CCR2 = (percent * ARR) / 100
}

int main(void) {
  pwm_init();
  set_motor_speed(50);   // 50% duty → half speed
  while (1) {}
}`,
    skillTags: ["PWM", "TIM2", "Motor Control", "Duty Cycle", "ARR/CCR"],
    hints: [
      "ARR = (f_clk / (PSC+1) / f_pwm) - 1 = (72MHz / 1 / 20kHz) - 1 = 3599",
      "PWM mode 1: OC2M bits [6:4] in CCMR1 = 0b110 (bits 14:12 for CH2)",
      "duty CCR2 = (percent × (ARR+1)) / 100. At 50%: CCR2 = 1800",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// ECE SUB-ROLE: VLSI / ASIC DESIGN ENGINEER
// Challenges: Verilog RTL design, synthesis, timing closure, DFT, formal verification
// ─────────────────────────────────────────────────────────────────────────────
export const ECE_VLSI_CHALLENGES = [
  {
    id: "vlsi-001",
    title: "Moore FSM — Sequence Detector 1011",
    category: "Digital Design",
    icon: "💾",
    difficulty: "Medium",
    timeLimit: "30 min",
    eloGain: 20,
    tools: ["Verilog", "RTL Design"],
    missionType: "embedded_lab",
    scenario:
      "You're designing a sequence detector for a custom protocol. The FSM must detect the binary pattern 1011 in a serial input stream (Moore machine, non-overlapping). The design will be synthesized on a 28 nm CMOS process — so the state encoding matters for power.",
    objective:
      "Design a 4-state Moore FSM in Verilog that asserts output 'detect' for one clock cycle after receiving the sequence 1011. Use one-hot encoding for synthesis efficiency.",
    steps: [
      "Identify the 4 states: IDLE (S0), GOT1 (S1), GOT10 (S2), GOT101 (S3)",
      "Define state transitions for each input combination (0/1) from each state",
      "Implement as a 3-always-block FSM: state register, next-state logic, output logic",
      "Use one-hot encoding: S0=4'b0001, S1=4'b0010, S2=4'b0100, S3=4'b1000",
      "Write testbench: feed 0011011011 and verify detect fires after each 1011",
    ],
    test_cases: [{ options: ["4 states (IDLE → GOT1 → GOT10 → GOT101 → detect → IDLE)", "3 states (miss the '1' partial match recovery)", "2 states (too few to track the pattern)", "5 states (overspecified, redundant state)"], correct: 0, explanation: "A non-overlapping Moore FSM for 1011 needs exactly 4 states. After detecting the full pattern (S3 on last '1'), output fires and FSM returns to IDLE. One-hot encoding is preferred for synthesis." }],
    starterCode: `// Moore FSM — Sequence Detector (1011)
// One-hot encoding, synchronous reset
module seq_detect_1011 (
  input  clk, rst_n, in,
  output detect
);
  // State encoding (one-hot)
  localparam S0 = 4'b0001;  // IDLE
  localparam S1 = 4'b0010;  // GOT_1
  localparam S2 = 4'b0100;  // GOT_10
  localparam S3 = 4'b1000;  // GOT_101

  reg [3:0] state, next;

  // State register
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) state <= S0;
    else        state <= next;
  end

  // Next-state logic
  always @(*) begin
    case (state)
      S0: next = in ? S1 : S0;
      S1: next = in ? S1 : S2;   // GOT_1: on 0 → GOT_10
      S2: next = in ? S3 : S0;   // GOT_10: on 1 → GOT_101
      S3: next = in ? S1 : S0;   // GOT_101: on 1 → DETECT, reset to S0 (non-overlap)
      default: next = S0;
    endcase
  end

  // Output (Moore — depends only on state)
  // TODO: detect fires when we're in S3 AND next input completes 1011
  assign detect = /* TODO */ 1'b0;

endmodule`,
    skillTags: ["FSM", "Moore Machine", "Sequence Detector", "One-Hot Encoding", "RTL"],
    hints: [
      "Moore output depends only on state. In the standard 4-state model, detect fires on the TRANSITION OUT of S3 on '1' — so it's actually a Mealy output. For true Moore, add a 5th DETECT state.",
      "Non-overlapping: after detecting 1011, return to S0 regardless. Overlapping would return to S1 (since the last '1' could start the next sequence).",
      "Test vector: serial stream 0-0-1-1-0-1-1 → detect fires at positions 4 and 7",
    ],
  },
  {
    id: "vlsi-002",
    title: "Critical Path Analysis — 8-bit Carry-Lookahead Adder",
    category: "Timing Analysis",
    icon: "⚡",
    difficulty: "Medium",
    timeLimit: "25 min",
    eloGain: 18,
    tools: ["Timing Analysis", "Digital Design"],
    missionType: "embedded_lab",
    scenario:
      "STA (Static Timing Analysis) on your 8-bit CLA adder post-synthesis shows a setup violation at 500 MHz. The timing report shows: Gate delay per stage = 0.1 ns, Propagate (P) gate = 0.2 ns, Generate (G) gate = 0.2 ns, AND-OR sum = 0.3 ns. The clock period is 2 ns.",
    objective:
      "Identify the critical path delay of the 8-bit CLA adder given the gate delays above and determine whether it meets 500 MHz timing (2 ns clock period, with 0.1 ns setup time).",
    steps: [
      "Recall: CLA generates P and G signals in one level (0.2 ns each)",
      "CLA carry: C4 = G + P·C0 — one AND-OR stage (0.3 ns)",
      "Final sum: Si = Pi XOR Ci — one XOR gate (0.2 ns)",
      "Total critical path = PG generation + carry + sum = 0.2 + 0.3 + 0.2 ns",
      "Compare with setup slack: clock_period - t_path - t_setup = 2 - 0.7 - 0.1 = 1.2 ns",
    ],
    test_cases: [{ options: ["0.7 ns — meets 500 MHz with 1.2 ns positive slack", "1.4 ns — violates 500 MHz (negative slack -0.5 ns)", "0.5 ns — meets with 1.4 ns slack", "2.1 ns — violates timing (exceeds full clock period)"], correct: 0, explanation: "CLA critical path = PG gen (0.2) + carry logic (0.3) + XOR sum (0.2) = 0.7 ns. Setup slack = 2.0 − 0.7 − 0.1 = 1.2 ns (positive) → timing MET at 500 MHz." }],
    starterCode: `// CLA Critical Path Timing Analysis
// Gate delays:
//   P/G generation (AND/OR)  : 0.2 ns each
//   Carry: G + P.Cin (AND-OR): 0.3 ns
//   Sum: Pi XOR Ci           : 0.2 ns
//
// For an 8-bit CLA with two 4-bit groups:
//
//  ┌──────────┐    ┌──────────┐    ┌─────┐
//  │  P,G gen │───▶│  Carry   │───▶│ Sum │
//  │  (0.2ns) │    │  (0.3ns) │    │(0.2)│
//  └──────────┘    └──────────┘    └─────┘
//
// Critical path = 0.2 + 0.3 + 0.2 = 0.7 ns
//
// Setup slack = T_clk - T_crit - T_setup
//             = 2.0   - 0.7   - 0.1
//             = 1.2 ns  ← positive = TIMING MET
//
// Q: Does the design meet 500 MHz (2 ns period)?`,
    skillTags: ["STA", "Critical Path", "CLA Adder", "Setup Slack", "Timing Closure"],
    hints: [
      "CLA advantage: carry is computed in O(1) gate levels rather than O(n) for ripple-carry",
      "Setup slack = T_clk − T_data_path − T_setup. Positive slack = timing met.",
      "A 4-bit CLA with 2 group levels (block CLA) still has the same gate structure",
    ],
  },
  {
    id: "vlsi-003",
    title: "Dynamic Power Estimation — CMOS Inverter Chain",
    category: "Power Analysis",
    icon: "🔋",
    difficulty: "Easy",
    timeLimit: "20 min",
    eloGain: 14,
    tools: ["Power Analysis", "CMOS Design"],
    missionType: "engineering_lab",
    scenario:
      "A 16-stage CMOS inverter chain drives a 50 fF load capacitance at the output of each stage. The chain runs at 1 GHz with VDD = 1.2 V. Activity factor α = 0.25 (signal switches on average 25% of clock cycles).",
    objective:
      "Calculate the total dynamic power dissipation of the 16-stage inverter chain using P = α × C × V² × f.",
    steps: [
      "Apply: P_dynamic = α × C_L × V_DD² × f for ONE stage",
      "P_stage = 0.25 × 50×10⁻¹⁵ × 1.2² × 1×10⁹",
      "P_stage = 0.25 × 50e-15 × 1.44 × 1e9 = 18 µW per stage",
      "Total for 16 stages: P_total = 16 × 18 µW = 288 µW",
    ],
    test_cases: [{ options: ["288 µW (16 stages × 18 µW/stage)", "18 µW (single stage only)", "4.6 mW (wrong — forgot activity factor)", "72 µW (multiplied by only 4 stages)"], correct: 0, explanation: "P = α·C·V²·f = 0.25 × 50e-15 × 1.44 × 1e9 = 18 µW per stage. With 16 stages: 16 × 18 = 288 µW total dynamic power." }],
    starterCode: `// Dynamic Power Calculation — CMOS Inverter Chain
//
// Formula: P_dynamic = α × C_L × V_DD² × f
//
// Given:
//   α    = 0.25         (activity factor)
//   C_L  = 50 fF = 50e-15 F  (load capacitance per stage)
//   V_DD = 1.2 V
//   f    = 1 GHz = 1e9 Hz
//   N    = 16 stages
//
// Step 1: Single stage dynamic power
// P_stage = 0.25 × 50e-15 × (1.2)² × 1e9
//         = 0.25 × 50e-15 × 1.44 × 1e9
//         = ?
//
// Step 2: Total chain power
// P_total = N × P_stage = 16 × ?`,
    skillTags: ["Dynamic Power", "CMOS", "Activity Factor", "Power Estimation", "Low Power Design"],
    hints: [
      "α = 0 means the signal never switches; α = 0.5 is the maximum for a random data signal",
      "Static (leakage) power is separate: P_static = I_leak × V_DD",
      "At 7 nm node, static and dynamic power are roughly equal — at 28 nm dynamic dominates",
    ],
  },
  {
    id: "vlsi-004",
    title: "Scan Chain DFT — Stuck-at Fault Coverage",
    category: "Design for Test",
    icon: "🧪",
    difficulty: "Medium",
    timeLimit: "25 min",
    eloGain: 22,
    tools: ["DFT", "ATPG", "Scan Chain"],
    missionType: "embedded_lab",
    scenario:
      "Your ATPG tool reports 95.2% stuck-at fault coverage after inserting a scan chain into a 1000-gate design. The DFT spec requires 98% coverage. You have 12 unobservable faults and 4 untestable faults flagged in the fault report.",
    objective:
      "Determine how many currently detected faults there are, and identify whether the untestable faults should be excluded from the coverage calculation per IEEE 1149.1 standards.",
    steps: [
      "Total faults in a combinational circuit ≈ 2 × (number of nets/signals) — assume 1000 total faults",
      "Detected = 95.2% × 1000 = 952 faults",
      "Untestable faults (redundant logic) are excluded from the denominator per ATPG standards",
      "Adjusted coverage = 952 / (1000 − 4) = 952 / 996 = 95.6% — still below 98%",
      "To reach 98%: need (0.98 × 996) = 976 detected faults → 24 more faults must be covered",
    ],
    test_cases: [{ options: ["Add test points (observation/control points) to improve observability of the 12 unobservable faults", "Increase the number of scan chains — more chains reduce shift time but don't improve coverage", "Change the synthesis tool — the tool doesn't affect ATPG fault coverage", "Increase VDD — higher voltage improves timing but not stuck-at fault coverage"], correct: 0, explanation: "Unobservable faults can be addressed by inserting test observation points (TOs) or control points (TCs) in the netlist — physically adding muxes or AND/OR gates that let the scan chain observe otherwise-buried nodes." }],
    starterCode: `// Scan Chain DFT Analysis
//
// Design stats:
//   Total gates      : 1000
//   Total faults     : 1000 (stuck-at-0 + stuck-at-1 per net)
//   Detected faults  : 952  (95.2% raw coverage)
//   Untestable faults:   4  (redundant logic — excluded from denominator)
//   Unobservable     :  12  (nodes not visible via scan)
//
// Adjusted fault count = 1000 - 4 (untestable) = 996
// Adjusted coverage    = 952 / 996 = 95.6%
//
// Target: 98% → need detected ≥ 0.98 × 996 = 976
// Gap:  976 - 952 = 24 more faults to cover
//
// Options to close the gap:
//   A) Add test observation points for the 12 unobservable faults
//   B) Rewrite logic to eliminate redundancy (reduces untestable count)
//   C) Run ATPG with higher effort (can improve by 1-2%)`,
    skillTags: ["DFT", "ATPG", "Scan Chain", "Fault Coverage", "Stuck-at Fault"],
    hints: [
      "Untestable (redundant) faults are excluded from the coverage denominator — they can never be detected by definition",
      "Unobservable faults ARE testable but hidden from the scan path — test points improve coverage",
      "IEEE 1149.1 (JTAG) defines the boundary scan standard; full-scan DFT is separate but complementary",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// ECE SUB-ROLE: RF / ANTENNA ENGINEER
// Challenges: impedance matching, link budget, noise figure, S-parameters
// ─────────────────────────────────────────────────────────────────────────────
export const ECE_RF_CHALLENGES = [
  {
    id: "rf-001",
    title: "L-Network Impedance Matching — 50 Ω to 200 Ω at 2.4 GHz",
    category: "RF Design",
    icon: "📡",
    difficulty: "Medium",
    timeLimit: "30 min",
    eloGain: 22,
    tools: ["RF Design", "Impedance Matching"],
    missionType: "engineering_lab",
    scenario:
      "A power amplifier output impedance is 200 Ω but the antenna feed is 50 Ω. You need a lossless L-network matching circuit at 2.4 GHz to maximise power transfer. The Q factor of the match network should be minimised.",
    objective:
      "Calculate the L and C values for a low-pass L-network that transforms 200 Ω (source) to 50 Ω (load) at 2.4 GHz.",
    steps: [
      "Q = √((R_high / R_low) − 1) = √((200/50) − 1) = √3 ≈ 1.732",
      "Shunt element (across 200 Ω): X_shunt = R_high / Q = 200 / 1.732 ≈ 115.5 Ω",
      "For shunt capacitor: C = 1 / (2π × f × X_shunt) = 1 / (2π × 2.4e9 × 115.5) ≈ 0.57 pF",
      "Series element: X_series = Q × R_low = 1.732 × 50 ≈ 86.6 Ω",
      "For series inductor: L = X_series / (2π × f) = 86.6 / (2π × 2.4e9) ≈ 5.75 nH",
    ],
    test_cases: [{ options: ["C ≈ 0.57 pF (shunt), L ≈ 5.75 nH (series) — low-pass L-network", "C ≈ 1.14 pF (shunt), L ≈ 11.5 nH (series) — doubled values (wrong Q)", "L ≈ 0.57 nH (shunt), C ≈ 5.75 pF (series) — high-pass topology (reversed)", "C ≈ 0.33 pF, L ≈ 3.3 nH — calculated at 4.8 GHz (frequency error)"], correct: 0, explanation: "L-network Q = √(R_high/R_low − 1) = √3. Shunt cap: C = 1/(2π×f×R_high/Q) ≈ 0.57 pF. Series ind: L = Q×R_low/(2π×f) ≈ 5.75 nH. Low-pass topology since shunt element is closer to high impedance side." }],
    starterCode: `// L-Network Impedance Matching Calculation
// Frequency: f = 2.4 GHz
// Source:    R_S = 200 Ω (PA output)
// Load:      R_L = 50  Ω (antenna)
//
// Step 1: Q factor
//   Q = √(R_S/R_L - 1) = √(200/50 - 1) = √3 ≈ 1.732
//
// Step 2: Shunt capacitor (placed at 200 Ω node)
//   X_shunt = R_S / Q = 200 / 1.732 ≈ 115.5 Ω
//   C = 1 / (2π × f × X_shunt)
//     = 1 / (2π × 2.4e9 × 115.5)
//     ≈ 0.574 pF
//
// Step 3: Series inductor
//   X_series = Q × R_L = 1.732 × 50 ≈ 86.6 Ω
//   L = X_series / (2π × f)
//     = 86.6 / (2π × 2.4e9)
//     ≈ 5.75 nH
//
// Verification: At matching, Γ = (Z_in - Z_S*) / (Z_in + Z_S) = 0
// → maximum power transfer`,
    skillTags: ["L-Network", "Impedance Matching", "Q Factor", "RF Design", "Reactance"],
    hints: [
      "Always match the higher impedance side with a shunt element and the lower with a series element in a low-pass L-network",
      "Q determines bandwidth: higher Q → narrower bandwidth. Minimising Q gives wideband match",
      "Verify with Smith Chart: start at R_S = 200 Ω, rotate along constant-G circle to R_L = 50 Ω",
    ],
  },
  {
    id: "rf-002",
    title: "Friis Link Budget — 2.4 GHz Received Power",
    category: "RF Design",
    icon: "📡",
    difficulty: "Easy",
    timeLimit: "20 min",
    eloGain: 15,
    tools: ["Link Budget", "Friis Equation"],
    missionType: "engineering_lab",
    scenario:
      "A 2.4 GHz Wi-Fi transmitter outputs 20 dBm EIRP. The receiver is 100 m away in free space (no obstacles). Both antennas are isotropic (0 dBi gain). Calculate the received power in dBm.",
    objective:
      "Apply the Friis transmission equation in dB form: P_r = P_t + G_t + G_r − FSPL, where FSPL (dB) = 20·log₁₀(4πd/λ).",
    steps: [
      "Wavelength: λ = c/f = 3×10⁸ / 2.4×10⁹ ≈ 0.125 m",
      "Free Space Path Loss: FSPL = 20·log₁₀(4π×100 / 0.125) = 20·log₁₀(10053) ≈ 80.0 dB",
      "Received power: P_r = 20 + 0 + 0 − 80 = −60 dBm",
      "Typical Wi-Fi receiver sensitivity is −70 to −90 dBm, so −60 dBm is a strong signal",
    ],
    test_cases: [{ options: ["−60 dBm — strong signal, well above typical −70 dBm sensitivity", "−80 dBm — near sensitivity limit (incorrect FSPL used)", "−40 dBm — incorrect, overestimates received power", "+20 dBm — this is the transmit power, not received"], correct: 0, explanation: "FSPL = 20·log₁₀(4π×d×f/c) = 20·log₁₀(4π×100×2.4e9/3e8) ≈ 80 dB. P_r = 20 + 0 + 0 − 80 = −60 dBm. A good Wi-Fi link at 100 m line-of-sight." }],
    starterCode: `// Friis Link Budget — 2.4 GHz Wi-Fi
//
// Given:
//   P_t = 20 dBm  (transmit power including antenna gain — EIRP)
//   G_t =  0 dBi  (isotropic transmit antenna)
//   G_r =  0 dBi  (isotropic receive antenna)
//   f   =  2.4 GHz
//   d   =  100 m
//   c   =  3×10⁸ m/s
//
// Step 1: Wavelength
//   λ = c/f = 3e8 / 2.4e9 = 0.125 m
//
// Step 2: Free Space Path Loss (FSPL)
//   FSPL_dB = 20·log₁₀(4π·d/λ)
//           = 20·log₁₀(4π × 100 / 0.125)
//           = 20·log₁₀(10,053)
//           ≈ 80.0 dB
//
// Step 3: Received power
//   P_r = P_t + G_t + G_r - FSPL
//       = 20 + 0 + 0 - 80
//       = -60 dBm`,
    skillTags: ["Friis Equation", "Link Budget", "Free Space Path Loss", "EIRP", "RF System Design"],
    hints: [
      "FSPL in dB = 20·log₁₀(4πd/λ) = 20·log₁₀(d) + 20·log₁₀(f) + 20·log₁₀(4π/c)",
      "At 2.4 GHz, FSPL at 1 m ≈ 40 dB, and increases 20 dB per decade (×10 distance)",
      "Real-world path loss is higher due to multipath, obstacles, and cable losses",
    ],
  },
  {
    id: "rf-003",
    title: "Cascaded Noise Figure — LNA + Mixer Chain",
    category: "RF Design",
    icon: "📡",
    difficulty: "Medium",
    timeLimit: "25 min",
    eloGain: 20,
    tools: ["Noise Figure", "Friis Formula for Noise"],
    missionType: "engineering_lab",
    scenario:
      "Your receiver front-end has an LNA (gain = 20 dB, NF = 1.5 dB) followed by a mixer (gain = −7 dB / conversion loss, NF = 8 dB). Calculate the cascaded noise figure of the two-stage receiver chain.",
    objective:
      "Apply the Friis formula for cascaded noise figure: NF_total = NF₁ + (NF₂ − 1) / G₁ where NF and G are in linear (not dB) form.",
    steps: [
      "Convert to linear: NF₁ = 10^(1.5/10) ≈ 1.413, G₁ = 10^(20/10) = 100, NF₂ = 10^(8/10) ≈ 6.31",
      "Apply Friis: NF_total = 1.413 + (6.31 − 1) / 100 = 1.413 + 0.0531 = 1.466",
      "Convert back to dB: NF_total_dB = 10·log₁₀(1.466) ≈ 1.66 dB",
      "Conclusion: The high-gain LNA dominates the cascaded NF — mixer NF is almost negligible",
    ],
    test_cases: [{ options: ["1.66 dB — LNA dominates, mixer contribution is 0.16 dB", "4.75 dB — simple average (incorrect — doesn't weight by gain)", "8.0 dB — mixer NF only (ignores LNA)", "9.5 dB — sum of NFs (completely wrong)"], correct: 0, explanation: "Friis (linear): NF = NF₁ + (NF₂−1)/G₁ = 1.413 + (6.31−1)/100 = 1.466 → 1.66 dB. The LNA's 20 dB gain suppresses the mixer noise by factor 100, so the mixer adds only 0.16 dB to the chain NF." }],
    starterCode: `// Cascaded Noise Figure — Friis Formula
//
// Stage 1: LNA
//   NF₁  = 1.5 dB → linear = 10^(1.5/10) ≈ 1.413
//   G₁   = 20 dB  → linear = 10^(20/10)  = 100
//
// Stage 2: Mixer
//   NF₂  = 8.0 dB → linear = 10^(8/10)   ≈ 6.310
//
// Friis Formula:
//   NF_total = NF₁ + (NF₂ − 1) / G₁
//            = 1.413 + (6.310 − 1) / 100
//            = 1.413 + 0.0531
//            = 1.466  (linear)
//
// Convert to dB:
//   NF_total_dB = 10 × log₁₀(1.466)
//               ≈ 1.66 dB
//
// Key insight: high-gain LNA reduces mixer NF contribution by 100×
// → always put the lowest-NF, highest-gain stage FIRST in the chain`,
    skillTags: ["Noise Figure", "Friis Formula", "LNA", "Cascaded NF", "Receiver Design"],
    hints: [
      "Always convert NF and G to linear before applying Friis — then convert result back to dB",
      "The first stage dominates: good LNA design (low NF, high gain) is critical for receiver sensitivity",
      "If LNA gain were only 10 dB (G=10), mixer would add 0.531 dB instead of 0.053 dB",
    ],
  },
  {
    id: "rf-004",
    title: "S-Parameter Reflection Coefficient — Antenna Input Match",
    category: "RF Design",
    icon: "📡",
    difficulty: "Easy",
    timeLimit: "15 min",
    eloGain: 12,
    tools: ["S-Parameters", "Smith Chart"],
    missionType: "engineering_lab",
    scenario:
      "A VNA measurement of your patch antenna at 2.4 GHz shows S₁₁ = −12 dB. Your design spec requires a return loss better than −10 dB. A team member claims the antenna is 'too well matched' and wants to change it. Should they?",
    objective:
      "Calculate the reflection coefficient magnitude |Γ| from S₁₁ = −12 dB, determine the percentage of power reflected, and decide whether the spec is met.",
    steps: [
      "|Γ| = 10^(S₁₁_dB / 20) = 10^(−12/20) = 10^(−0.6) ≈ 0.251",
      "Power reflected = |Γ|² = 0.251² ≈ 0.063 = 6.3% of input power",
      "Power delivered to antenna = 1 − 0.063 = 93.7%",
      "Spec requires S₁₁ < −10 dB: −12 dB < −10 dB → spec is MET (more negative = better match)",
      "The team member is wrong: −12 dB is BETTER than −10 dB (lower return loss = better match)",
    ],
    test_cases: [{ options: ["No — S₁₁ = −12 dB is better than −10 dB. More negative = better match. Do not change it.", "Yes — −12 dB exceeds the spec of −10 dB and indicates oscillation risk.", "Yes — the antenna is over-matched and will radiate too much power.", "No — but only because the S₁₁ is exactly at the limit."], correct: 0, explanation: "Return loss is measured as a negative dB value — more negative means less reflected power. S₁₁ = −12 dB means |Γ|² = 6.3% reflected. Since −12 < −10, the −10 dB spec is met with 2 dB margin. The team member has the comparison backwards." }],
    starterCode: `// S-Parameter Return Loss Analysis
//
// Measured:  S₁₁ = -12 dB at 2.4 GHz
// Spec:      S₁₁ < -10 dB (return loss must be more negative than -10 dB)
//
// Step 1: Reflection coefficient magnitude
//   |Γ| = 10^(S₁₁_dB / 20)
//        = 10^(-12 / 20)
//        = 10^(-0.6)
//        ≈ 0.251
//
// Step 2: Power reflected
//   P_reflected = |Γ|² = 0.251² ≈ 0.063 (6.3%)
//   P_delivered = 1 - 0.063 = 0.937 (93.7%)
//
// Step 3: Spec comparison
//   Spec: S₁₁ < -10 dB
//   Measured: -12 dB
//   -12 < -10 → TRUE → spec MET with 2 dB margin
//
// Note: In return loss convention, MORE negative = BETTER match
// (less power reflected back to source)`,
    skillTags: ["S-Parameters", "Return Loss", "Reflection Coefficient", "Antenna Match", "VNA"],
    hints: [
      "S₁₁ in dB = 20·log₁₀(|Γ|). More negative S₁₁ → smaller |Γ| → less reflection → better match",
      "Perfect match: S₁₁ = −∞ dB (Γ = 0). Open/short: S₁₁ = 0 dB (Γ = ±1)",
      "VSWR = (1 + |Γ|) / (1 − |Γ|). At −12 dB: VSWR = (1+0.251)/(1−0.251) ≈ 1.67",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// ECE SUB-ROLE: IoT ENGINEER
// Challenges: MQTT protocol, BLE power budgeting, LoRaWAN, edge inference
// ─────────────────────────────────────────────────────────────────────────────
export const ECE_IOT_CHALLENGES = [
  {
    id: "iot-001",
    title: "MQTT QoS Selection — Smart Factory Alert System",
    category: "IoT Protocols",
    icon: "🌐",
    difficulty: "Easy",
    timeLimit: "20 min",
    eloGain: 12,
    tools: ["MQTT", "IoT Protocols"],
    missionType: "embedded_lab",
    scenario:
      "A smart factory uses MQTT to transmit machine health alerts. Three message types are published: (A) temperature telemetry every 10 s, (B) critical over-temperature alarm that must trigger a shutdown, (C) maintenance log entries that should not be duplicated. Choose the correct MQTT QoS for each.",
    objective:
      "Match each message type to the correct MQTT QoS level (0, 1, or 2) based on reliability and duplication requirements.",
    steps: [
      "QoS 0: At most once — fire-and-forget, no acknowledgement, possible message loss",
      "QoS 1: At least once — acknowledged, message may be duplicated if ACK lost",
      "QoS 2: Exactly once — 4-way handshake, guaranteed delivery, no duplicates (highest overhead)",
      "Temperature telemetry (10 s period, loss acceptable) → QoS 0",
      "Critical alarm (must arrive, duplication tolerable) → QoS 1",
      "Maintenance log (must arrive exactly once, no duplicates) → QoS 2",
    ],
    test_cases: [{ options: ["QoS 0 (telemetry), QoS 1 (alarm), QoS 2 (log) — correct match", "QoS 2 for all messages — technically works but wastes bandwidth and adds latency to telemetry", "QoS 1 for all — alarms may duplicate (acceptable) but logs will duplicate (unacceptable)", "QoS 0 for alarm — critical messages may be lost if broker or network drops them"], correct: 0, explanation: "QoS 0 suits frequent low-criticality telemetry (loss acceptable, low overhead). QoS 1 for alarms (loss unacceptable, duplicate tolerable — shutdown happens either way). QoS 2 for logs (both loss and duplication unacceptable — each entry must appear exactly once)." }],
    starterCode: `// MQTT QoS Level Reference
//
// QoS 0 — At most once (fire and forget)
//   - No ACK, no retransmit
//   - Fastest, lowest overhead
//   - Risk: message loss on bad network
//   - Use: telemetry, sensor readings with high update rate
//
// QoS 1 — At least once (acknowledged delivery)
//   - Sender retransmits until PUBACK received
//   - Risk: duplicate messages if ACK lost in transit
//   - Use: alerts, commands where loss is worse than duplicates
//
// QoS 2 — Exactly once (four-step handshake)
//   - PUBLISH → PUBREC → PUBREL → PUBCOMP
//   - Guarantees delivery AND no duplicates
//   - Use: financial transactions, audit logs, billing events
//
// Message type assignment:
//   A) Temperature telemetry @ 10s → QoS 0 (high frequency, loss ok)
//   B) Critical over-temp alarm   → QoS 1 (must arrive, duplicate tolerable)
//   C) Maintenance log entries    → QoS 2 (must arrive exactly once)`,
    skillTags: ["MQTT", "QoS", "IoT Protocols", "Reliability", "Message Broker"],
    hints: [
      "QoS 2 uses 4 packets per message vs QoS 0's 1 — use it only when duplication truly matters",
      "Most IoT alarms use QoS 1: the system handles duplicates (idempotent consumers)",
      "MQTT retain flag is separate from QoS — it keeps the last message for new subscribers",
    ],
  },
  {
    id: "iot-002",
    title: "BLE Sensor Battery Life Estimation",
    category: "Power Budgeting",
    icon: "🔋",
    difficulty: "Medium",
    timeLimit: "25 min",
    eloGain: 18,
    tools: ["Power Budget", "BLE", "Battery Life"],
    missionType: "engineering_lab",
    scenario:
      "A coin-cell (CR2032, 220 mAh) powered BLE temperature sensor wakes every 30 seconds to take a reading and transmit an advertisement packet. Active BLE TX current = 15 mA for 5 ms. Sleep current (deep sleep) = 2 µA continuously.",
    objective:
      "Calculate the average current consumption and estimate how many months the CR2032 will last.",
    steps: [
      "Active charge per event = I_active × t_active = 15 mA × 0.005 s = 0.075 mC = 75 µC",
      "Events per hour = 3600 s / 30 s = 120 events/hour",
      "Active charge per hour = 120 × 75 µC = 9000 µC = 9 mAh/h... wait, convert: 9 mC = 9000 µC",
      "Average active current = 9000 µC / 3600 s = 2.5 µA",
      "Total average current = I_active_avg + I_sleep = 2.5 µA + 2 µA = 4.5 µA",
      "Battery life = 220 mAh / 0.0045 mA = 48,889 hours ≈ 2,037 days ≈ 67 months",
    ],
    test_cases: [{ options: ["~67 months (~5.5 years) — average current 4.5 µA", "~14 months — calculated with wrong sleep duty cycle", "~2 months — used active current 15 mA continuously (wrong)", "~100 months — forgot to include active current contribution"], correct: 0, explanation: "Average active current = 15 mA × (5 ms / 30,000 ms) = 2.5 µA. Total = 2.5 + 2 = 4.5 µA. Battery life = 220 mAh / 0.0045 mA ≈ 48,889 hours ≈ 5.6 years. This is typical for low-duty-cycle BLE sensor designs." }],
    starterCode: `// BLE Sensor Battery Life Calculation
//
// Hardware:
//   Battery: CR2032 = 220 mAh @ 3.0V
//   BLE TX:  I_active = 15 mA, t_active = 5 ms per advertisement
//   Sleep:   I_sleep  = 2 µA (deep sleep)
//   Period:  T = 30 s (one wake-up per 30 seconds)
//
// Step 1: Average active current
//   Duty cycle = t_active / T = 5e-3 / 30 = 1.667e-4
//   I_active_avg = I_active × duty = 15 mA × 1.667e-4 = 2.5 µA
//
// Step 2: Total average current
//   I_avg = I_active_avg + I_sleep = 2.5 µA + 2 µA = 4.5 µA
//
// Step 3: Battery life
//   t_life = C_battery / I_avg
//          = 220 mAh / 0.0045 mA
//          = 48,889 hours
//          = 2,037 days
//          ≈ 67 months`,
    skillTags: ["BLE", "Power Budget", "Battery Life", "CR2032", "IoT Design"],
    hints: [
      "Always compute average current, not peak current — duty cycle is the key multiplier",
      "Self-discharge of CR2032 is ~1% per year, negligible for 5-year calculations",
      "Real-world: add 20-30% margin for temperature effects, battery aging, and protocol retries",
    ],
  },
  {
    id: "iot-003",
    title: "LoRaWAN Spreading Factor — Range vs Data Rate Tradeoff",
    category: "IoT Protocols",
    icon: "📶",
    difficulty: "Medium",
    timeLimit: "20 min",
    eloGain: 16,
    tools: ["LoRaWAN", "Spreading Factor", "Link Budget"],
    missionType: "embedded_lab",
    scenario:
      "You're deploying 500 soil moisture sensors across a 20 km² agricultural field. The gateway is at the center. A test transmission at SF7 (shortest range, fastest) fails for 30% of sensors at the field boundary. You need to choose the correct spreading factor.",
    objective:
      "Select the correct LoRaWAN SF for this deployment given that each SF increment adds approximately 3 dB of link budget and doubles the time-on-air.",
    steps: [
      "SF7 → SF12: 5 increments × 3 dB = 15 dB additional link budget",
      "SF7 fails at boundary (say it covers 7 km radius at 20 dBm TX power)",
      "3 dB gain per SF doubles the range? No — free space path loss: 3 dB = √2 range factor",
      "SF9 gives SF7 + 2 × 3 dB = +6 dB → range factor = 2 → covers ~14 km radius",
      "Field is 20 km², radius ≈ 2.5 km for circle → SF9 should be sufficient",
      "Choose SF9: adequate range, time-on-air penalty is acceptable (4× vs SF7)",
    ],
    test_cases: [{ options: ["SF9 — adds 6 dB over SF7, doubles range, acceptable 4× time-on-air penalty", "SF12 — maximum range but 32× time-on-air, quickly exhausts duty cycle limit (1%)", "SF7 — already failing, no improvement possible without changing TX power or antenna", "SF8 — only +3 dB, marginal improvement, boundary sensors may still fail"], correct: 0, explanation: "Each SF step adds 3 dB link budget and doubles time-on-air. SF9 = SF7 + 6 dB ≈ doubles the communication range. For a 2.5 km radius field with SF7 boundary failures, SF9 provides comfortable margin. SF12 would work but the 32× time-on-air violates LoRaWAN 1% duty cycle regulations at high message rates." }],
    starterCode: `// LoRaWAN Spreading Factor Comparison
//
// SF   BW(kHz)  DR    ToA(ms)   Sensitivity   Range (relative)
// SF7   125    5.5 kbps   56 ms   -123 dBm      1×
// SF8   125    3.1 kbps  102 ms   -126 dBm      √2 ×
// SF9   125    1.8 kbps  205 ms   -129 dBm      2×
// SF10  125    0.98kbps  370 ms   -132 dBm      2.8×
// SF11  125    0.54kbps  741 ms   -134.5 dBm    3.5×
// SF12  125    0.29kbps 1319 ms   -137 dBm      4×
//
// Each SF step:
//   + 3 dB sensitivity improvement
//   × 2 time-on-air penalty
//   ≈ √2 range increase (in free space)
//
// Problem: SF7 fails at field boundary (~2.5 km from gateway)
// Need: reliable coverage across full 20 km² ≈ 2.5 km radius
//
// SF9 adds 6 dB (= +3 dB × 2 steps):
//   Range factor ≈ 2× → ~5 km radius from SF7 baseline
//   Time-on-air: 205 ms (4× SF7, within 1% duty cycle at 1 msg/20s)`,
    skillTags: ["LoRaWAN", "Spreading Factor", "Time-on-Air", "Link Budget", "IoT Deployment"],
    hints: [
      "LoRaWAN duty cycle is limited to 1% in most ISM bands — higher SF eats into this budget fast",
      "3 dB improvement = √2 range increase in free space (FSPL ∝ d²)",
      "Real deployments use ADR (Adaptive Data Rate) — the gateway auto-adjusts SF based on RSSI",
    ],
  },
  {
    id: "iot-004",
    title: "Edge Inference Latency — On-Device vs Cloud",
    category: "Edge Computing",
    icon: "🤖",
    difficulty: "Easy",
    timeLimit: "15 min",
    eloGain: 12,
    tools: ["Edge Computing", "TinyML", "Latency Analysis"],
    missionType: "embedded_lab",
    scenario:
      "A factory conveyor belt uses a camera to detect defective products. The ML model must classify each item within 200 ms (belt speed requirement). Cloud inference latency = 150 ms (network round-trip) + 30 ms (inference) = 180 ms. Edge device (ARM Cortex-A53) inference = 120 ms. Network congestion adds up to 100 ms jitter to cloud path.",
    objective:
      "Decide whether to deploy cloud inference or edge inference, justifying the choice with latency and reliability arguments.",
    steps: [
      "Cloud worst-case latency = 150 ms network + 100 ms jitter + 30 ms inference = 280 ms",
      "Edge latency = 120 ms (deterministic, no network dependency)",
      "Requirement: < 200 ms classification",
      "Cloud best case (180 ms) meets requirement, but worst case (280 ms) exceeds it",
      "Edge (120 ms) always meets the 200 ms requirement with 80 ms margin",
      "Edge also provides air-gap security and works during internet outage",
    ],
    test_cases: [{ options: ["Edge inference — deterministic 120 ms, always within 200 ms limit; cloud worst-case 280 ms exceeds limit", "Cloud inference — 180 ms average is below limit; edge device may not scale to multiple cameras", "Either works — both are within spec on average (not true: cloud worst-case violates it)", "Neither — 200 ms is too tight for any current approach (not true: edge meets it)"], correct: 0, explanation: "Cloud inference worst-case (150+100+30=280 ms) exceeds the 200 ms SLA due to network jitter. Edge inference at 120 ms is deterministic and always within spec. For real-time manufacturing applications, determinism is non-negotiable — edge is the correct choice." }],
    starterCode: `// Edge vs Cloud Inference Latency Analysis
//
// Use case: Conveyor belt defect detection
// SLA:      Classify each item within 200 ms
//
// Cloud path:
//   Network RTT: 150 ms (nominal)
//   Jitter:      up to +100 ms (congestion)
//   Inference:    30 ms (GPU server)
//   ─────────────────────────────────────
//   Best case:  150 + 0   + 30 = 180 ms ✓ (meets SLA)
//   Worst case: 150 + 100 + 30 = 280 ms ✗ (violates SLA!)
//
// Edge path (ARM Cortex-A53 with TFLite):
//   On-device inference: 120 ms (deterministic)
//   Network:               0 ms (local processing)
//   ─────────────────────────────────────
//   Always: 120 ms ✓ (80 ms margin, deterministic)
//
// Additional edge benefits:
//   • Works offline (internet outage resilience)
//   • Data stays on-premises (privacy / compliance)
//   • Lower operational cost (no cloud GPU billing per inference)`,
    skillTags: ["Edge Computing", "TinyML", "Latency", "Determinism", "Industrial IoT"],
    hints: [
      "Determinism matters more than average latency for hard real-time systems",
      "TinyML frameworks (TensorFlow Lite, ONNX Runtime) can run lightweight models on Cortex-A55 in 50-200 ms",
      "Consider model size vs accuracy tradeoff — MobileNetV2 is 14 MB and runs well on edge",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// ECE SUB-ROLE: TELECOM / WIRELESS ENGINEER
// Challenges: Shannon capacity, BER, sampling theorem, OFDM, modulation
// ─────────────────────────────────────────────────────────────────────────────
export const ECE_TELECOM_CHALLENGES = [
  {
    id: "tel-001",
    title: "Shannon Channel Capacity — 5G NR Downlink",
    category: "Communications Theory",
    icon: "📶",
    difficulty: "Easy",
    timeLimit: "15 min",
    eloGain: 12,
    tools: ["Shannon Theorem", "Channel Capacity"],
    missionType: "engineering_lab",
    scenario:
      "A 5G NR cell in a dense urban area has an allocated bandwidth of 100 MHz. The measured SNR at a test UE is 20 dB. Calculate the theoretical maximum data rate for this channel and compare to the real-world 5G peak throughput spec (~4 Gbps).",
    objective:
      "Apply Shannon's channel capacity theorem: C = B × log₂(1 + SNR) where B is bandwidth in Hz and SNR is linear.",
    steps: [
      "Convert SNR: 20 dB → linear = 10^(20/10) = 100",
      "C = 100 × 10⁶ × log₂(1 + 100) = 100 × 10⁶ × log₂(101)",
      "log₂(101) = ln(101)/ln(2) ≈ 4.615 / 0.693 ≈ 6.66 bits/s/Hz",
      "C = 100 MHz × 6.66 ≈ 666 Mbps per 100 MHz channel",
      "Real 5G aggregates multiple bands: 5 × 100 MHz = 500 MHz → 3.33 Gbps Shannon limit",
      "The 4 Gbps spec slightly exceeds this — it uses additional MIMO spatial streams (×4 MIMO adds 4×)",
    ],
    test_cases: [{ options: ["~666 Mbps for a single 100 MHz channel at SNR=20 dB", "~200 Mbps — incorrect, this is for 20 dB ≡ SNR=10 (wrong conversion)", "~1 Gbps — this requires SNR=29 dB, not 20 dB", "~4 Gbps — this requires MIMO and carrier aggregation, not a single channel"], correct: 0, explanation: "C = 100e6 × log₂(1+100) = 100e6 × 6.66 ≈ 666 Mbps. Shannon gives the theoretical maximum for a single antenna channel. Real 5G peak throughput of 4 Gbps uses 8×8 MIMO (8 spatial streams) and carrier aggregation across multiple bands." }],
    starterCode: `// Shannon Channel Capacity — 5G NR
//
// Formula: C = B × log₂(1 + SNR)
//
// Given:
//   B   = 100 MHz = 100 × 10⁶ Hz
//   SNR = 20 dB  = 10^(20/10) = 100 (linear)
//
// Step 1: Convert SNR to linear
//   SNR_linear = 10^(SNR_dB / 10) = 10^(20/10) = 100
//
// Step 2: Apply Shannon theorem
//   C = B × log₂(1 + SNR_linear)
//     = 100e6 × log₂(101)
//     = 100e6 × 6.658
//     ≈ 665.8 Mbps  per 100 MHz channel
//
// Real-world 5G: uses multiple 100 MHz carriers + MIMO
//   Carrier aggregation: 5 × 100 MHz = 500 MHz
//   500e6 × 6.66 ≈ 3.33 Gbps (Shannon limit)
//   With 8×8 MIMO: 8 × 3.33 ≈ 26.6 Gbps theoretical peak`,
    skillTags: ["Shannon Theorem", "Channel Capacity", "5G NR", "SNR", "Bandwidth"],
    hints: [
      "log₂(x) = log₁₀(x) / log₁₀(2) = log₁₀(x) / 0.301 = ln(x) / 0.693",
      "Shannon capacity is an upper bound — real systems (LDPC codes, 256-QAM) approach ~70-80% of it",
      "MIMO multiplies capacity by the number of spatial streams (limited by min(TX antennas, RX antennas, scattering)",
    ],
  },
  {
    id: "tel-002",
    title: "BER vs Eb/N0 — BPSK in AWGN",
    category: "Digital Communications",
    icon: "📊",
    difficulty: "Medium",
    timeLimit: "25 min",
    eloGain: 20,
    tools: ["BER Analysis", "BPSK", "AWGN"],
    missionType: "engineering_lab",
    scenario:
      "Your satellite uplink uses BPSK modulation with a data rate of 1 Mbps. The measured Eb/N0 is 10 dB. The communication spec requires BER < 10⁻⁵. Q-function table: Q(4.47) ≈ 4 × 10⁻⁶. Determine if the spec is met.",
    objective:
      "Calculate the BER for BPSK at Eb/N0 = 10 dB using BER = Q(√(2·Eb/N0)) and compare to the 10⁻⁵ spec.",
    steps: [
      "Convert Eb/N0: 10 dB → linear = 10^(10/10) = 10",
      "BPSK BER formula: BER = Q(√(2 × Eb/N0)) = Q(√20) = Q(4.472)",
      "Q(4.47) ≈ 4 × 10⁻⁶ from standard Q-function table",
      "Compare to spec: 4 × 10⁻⁶ < 10⁻⁵ → spec MET",
      "Margin: one decade of BER margin (spec is 10× worse than achieved)",
    ],
    test_cases: [{ options: ["BER ≈ 4×10⁻⁶ — spec MET with ~8.5 dB coding gain margin", "BER ≈ 10⁻³ — spec violated (wrong, this is Eb/N0 ≈ 6.8 dB)", "BER ≈ 10⁻⁵ exactly — right on the limit (wrong Q function argument)", "Cannot determine — Q-function is not available (incorrect: given in the problem)"], correct: 0, explanation: "Eb/N0 = 10 dB → linear = 10. BER = Q(√(2×10)) = Q(√20) = Q(4.47) ≈ 4×10⁻⁶. Since 4×10⁻⁶ < 10⁻⁵, the spec is met. The link has approximately 2.5 dB of SNR margin (Eb/N0 needed for BER=10⁻⁵ is about 9.6 dB for BPSK)." }],
    starterCode: `// BPSK BER Calculation — AWGN Channel
//
// Formula: BER_BPSK = Q(√(2 × Eb/N0))
//   where Q(x) = (1/2) × erfc(x/√2)
//
// Given:
//   Eb/N0 = 10 dB → linear = 10^(10/10) = 10
//   BER spec: < 10⁻⁵
//
// Step 1: Compute BER
//   BER = Q(√(2 × 10)) = Q(√20) = Q(4.472)
//
// Step 2: Look up Q(4.47) in table
//   Q(4.47) ≈ 4.0 × 10⁻⁶
//
// Step 3: Compare to spec
//   4.0 × 10⁻⁶ < 1.0 × 10⁻⁵ → SPEC MET ✓
//
// Useful BER table for BPSK:
//   Eb/N0   BER (BPSK)
//   4 dB    1.2 × 10⁻²
//   6 dB    2.4 × 10⁻³
//   8 dB    1.9 × 10⁻⁴
//   10 dB   4.0 × 10⁻⁶  ← our point
//   12 dB   1.5 × 10⁻⁸`,
    skillTags: ["BER", "BPSK", "AWGN", "Q-Function", "Digital Communications"],
    hints: [
      "BPSK is the most power-efficient binary modulation — it requires the lowest Eb/N0 for a given BER",
      "QPSK achieves the same BER as BPSK at the same Eb/N0 but doubles the spectral efficiency",
      "Error floor: real systems have hardware impairments that create a minimum BER regardless of SNR",
    ],
  },
  {
    id: "tel-003",
    title: "Nyquist Sampling Theorem — Voice Codec Design",
    category: "Signal Processing",
    icon: "🎵",
    difficulty: "Easy",
    timeLimit: "15 min",
    eloGain: 12,
    tools: ["Sampling Theory", "ADC Design"],
    missionType: "engineering_lab",
    scenario:
      "You're designing the ADC front-end for a VoIP codec. The human voice frequency range is 300 Hz to 3400 Hz (PSTN bandwidth). You need to choose the minimum sampling rate and the number of bits per sample for 8-bit PCM (G.711 standard). Verify the resulting bit rate matches the G.711 standard of 64 kbps.",
    objective:
      "Apply the Nyquist theorem to find minimum sampling rate, then calculate the bit rate for 8-bit PCM encoding.",
    steps: [
      "Maximum voice frequency: f_max = 3400 Hz",
      "Nyquist minimum sampling rate: f_s ≥ 2 × f_max = 2 × 3400 = 6800 Hz",
      "G.711 uses f_s = 8000 Hz (chosen for margin above Nyquist minimum)",
      "Bit rate = f_s × bits_per_sample = 8000 × 8 = 64,000 bps = 64 kbps",
      "This matches the G.711 standard exactly",
    ],
    test_cases: [{ options: ["8000 Hz sampling rate, 64 kbps bit rate — matches G.711 standard", "6800 Hz sampling rate, 54.4 kbps — meets Nyquist minimum but G.711 adds 18% margin", "3400 Hz sampling rate, 27.2 kbps — incorrect (this is f_max, not 2×f_max)", "44100 Hz sampling rate — this is CD audio quality, overkill for voice"], correct: 0, explanation: "Nyquist: f_s ≥ 2 × f_max = 6800 Hz. G.711 uses 8000 Hz for a comfortable margin above the minimum. Bit rate = 8000 samples/s × 8 bits/sample = 64,000 bps = 64 kbps. This is the foundation of all PSTN and most VoIP systems." }],
    starterCode: `// Nyquist Sampling Theorem — G.711 Voice Codec
//
// Nyquist theorem: f_s ≥ 2 × f_max  (minimum sampling rate)
//
// Voice signal:
//   Bandwidth: 300 Hz – 3400 Hz (PSTN standard)
//   f_max = 3400 Hz
//
// Step 1: Minimum sampling rate
//   f_s_min = 2 × 3400 = 6800 Hz
//
// Step 2: G.711 chosen rate (with margin)
//   f_s = 8000 Hz (8 kHz)
//   Margin: 8000 / 6800 ≈ 1.18 → 18% above Nyquist minimum
//   (This provides anti-aliasing filter design margin)
//
// Step 3: PCM bit rate
//   bits/sample = 8 (G.711 µ-law / A-law encoding)
//   Bit rate = f_s × bits = 8000 × 8 = 64,000 bps = 64 kbps
//
// G.711 standard output: 64 kbps per voice channel
// T1/E1 carrier: 24/32 channels × 64 kbps = 1.544/2.048 Mbps`,
    skillTags: ["Nyquist Theorem", "Sampling Rate", "G.711", "PCM", "Voice Codec"],
    hints: [
      "Sampling below 2×f_max causes aliasing — high frequencies fold back and corrupt the signal",
      "In practice, sample at 10-20% above Nyquist to give the anti-aliasing filter a transition band",
      "G.711 uses non-uniform quantisation (µ-law in US/Japan, A-law in Europe) for better SNR at low amplitudes",
    ],
  },
  {
    id: "tel-004",
    title: "OFDM Resource Grid — LTE 10 MHz Subcarrier Count",
    category: "OFDM / LTE",
    icon: "📶",
    difficulty: "Medium",
    timeLimit: "20 min",
    eloGain: 18,
    tools: ["OFDM", "LTE", "Resource Grid"],
    missionType: "engineering_lab",
    scenario:
      "An LTE eNodeB transmits on a 10 MHz channel. The OFDM subcarrier spacing is 15 kHz. LTE uses a guard band of approximately 10% on each side (so effective bandwidth = 90%). Not all subcarriers are used — the DC subcarrier is null, and the resource blocks (RBs) use 180 kHz (12 × 15 kHz) each. How many resource blocks fit in 10 MHz LTE?",
    objective:
      "Calculate the number of LTE resource blocks (RBs) in a 10 MHz channel and the total number of OFDM subcarriers used for data.",
    steps: [
      "Usable bandwidth = 10 MHz × 0.9 = 9 MHz (after guard bands)",
      "Each RB = 12 subcarriers × 15 kHz = 180 kHz",
      "Number of RBs = 9 MHz / 180 kHz = 50 RBs (this is the LTE spec)",
      "Total data subcarriers = 50 × 12 = 600 subcarriers",
      "Add DC null and guard subcarriers: total OFDM symbols in FFT ≈ 1024 (10 MHz FFT size)",
      "Active subcarriers = 601 (600 data + 1 DC null), rest are guard tones",
    ],
    test_cases: [{ options: ["50 RBs = 600 active subcarriers (standard LTE 10 MHz configuration)", "100 RBs — this is for 20 MHz LTE (doubled bandwidth)", "25 RBs — this is for 5 MHz LTE (half bandwidth)", "667 RBs — calculated without guard band (wrong: used full 10 MHz)"], correct: 0, explanation: "LTE 10 MHz: usable BW = 9 MHz, each RB = 180 kHz, 9000/180 = 50 RBs. Total data subcarriers = 50 × 12 = 600. This matches the 3GPP TS 36.104 specification exactly. The FFT size is 1024 with 601 active tones (DC null + 600 data)." }],
    starterCode: `// LTE OFDM Resource Grid — 10 MHz Channel
//
// LTE parameters (3GPP TS 36.104):
//   Channel bandwidth: 10 MHz
//   Subcarrier spacing: Δf = 15 kHz
//   Guard band (each side): ~5% of BW
//   Usable bandwidth: 10 MHz × 0.9 = 9 MHz
//
// Resource Block (RB) = 12 consecutive subcarriers
//   RB bandwidth = 12 × 15 kHz = 180 kHz
//
// Step 1: Number of RBs
//   N_RB = 9 MHz / 0.18 MHz = 50 RBs
//
// Step 2: Data subcarriers
//   N_SC = 50 × 12 = 600 subcarriers
//   (+ 1 DC null subcarrier = 601 active tones)
//
// Step 3: FFT size
//   Minimum FFT for 10 MHz: 1024 points
//   Guard subcarriers: 1024 - 601 = 423 (guard band + unused)
//
// LTE bandwidth-to-RB mapping:
//   1.4 MHz →  6 RBs  (  72 subcarriers)
//   3   MHz → 15 RBs  ( 180 subcarriers)
//   5   MHz → 25 RBs  ( 300 subcarriers)
//   10  MHz → 50 RBs  ( 600 subcarriers)  ← this challenge
//   15  MHz → 75 RBs  ( 900 subcarriers)
//   20  MHz →100 RBs  (1200 subcarriers)`,
    skillTags: ["OFDM", "LTE", "Resource Block", "Subcarrier", "3GPP"],
    hints: [
      "LTE always uses 15 kHz subcarrier spacing in normal mode (NR can use 30, 60, 120 kHz)",
      "Resource Element (RE) = 1 subcarrier × 1 OFDM symbol. 1 RB = 12 subcarriers × 14 symbols = 168 REs per subframe",
      "5G NR 100 MHz with 30 kHz SCS: 66 RBs × 12 = 792 subcarriers",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// ECE CIRCUIT LAB CHALLENGES  (missionType: "circuit_lab")
// Interactive DC micro-simulations with live nodal analysis.
// Layout: nodes use { x, y, extra:[{x,y}...] } + circuit.layout.wires for bus lines.
// ─────────────────────────────────────────────────────────────────────────────
export const ECE_CIRCUIT_CHALLENGES = [
  {
    id: "circuit-001",
    title: "Voltage Divider Design",
    description:
      "Design a resistive voltage divider that outputs 3.3V from a 5V supply. " +
      "Adjust R1 (upper) and R2 (lower) with the sliders until the probe at node B reads 3.3V. " +
      "Then answer the conceptual question.",
    question: "Which resistor values achieve V(B) ≈ 3.3V from a 5V supply using a voltage divider?",
    missionType: "circuit_lab",
    workstation: "circuit_lab",
    category: "Circuit Analysis",
    difficulty: "beginner",
    track: "circuits",
    simulation: {
      type: "dc_circuit",
      circuit: {
        nodes: ["A", "B", "GND"],
        components: [
          { id: "V1",  type: "voltage_source", value: 5,     unit: "V", node_plus: "A", node_minus: "GND", editable: false },
          { id: "R1",  type: "resistor",        value: 17000, unit: "Ω", node_a: "A",   node_b: "B",        editable: true, min: 1000, max: 100000, step: 1000, description: "Upper resistor" },
          { id: "R2",  type: "resistor",        value: 33000, unit: "Ω", node_a: "B",   node_b: "GND",      editable: true, min: 1000, max: 100000, step: 1000, description: "Lower resistor" },
        ],
        // Layout: rectangle — V1 left-vertical, R1 top-horizontal, R2 right-vertical, bus at bottom
        layout: {
          "A":   { x: 60,  y: 70  },
          "B":   { x: 320, y: 70  },
          "GND": { x: 60,  y: 230, extra: [{ x: 320, y: 230 }] },
          wires: [
            { x1: 60,  y1: 230, x2: 320, y2: 230 },  // bottom bus
            { x1: 320, y1: 70,  x2: 320, y2: 230 },  // right wire (R2 exit to bus)
          ],
        },
        probe: "B",
      },
      target: { type: "voltage_at_probe", node: "B", value: 3.3, tolerance: 0.05, unit: "V" },
    },
    test_cases: [
      {
        options: [
          "R1 = 17kΩ, R2 = 33kΩ → V(B) = 5 × 33/(17+33) = 3.30V",
          "R1 = 10kΩ, R2 = 10kΩ → V(B) = 5 × 10/(10+10) = 2.50V",
          "R1 = 33kΩ, R2 = 17kΩ → V(B) = 5 × 17/(33+17) = 1.70V",
          "R1 = 1kΩ,  R2 = 100kΩ → V(B) = 5 × 100/(1+100) ≈ 4.95V",
        ],
        correct: 0,
        explanation: "Vout = Vin × R2/(R1+R2). For Vout=3.3V, R2/(R1+R2) = 0.66. Standard E24 values: R1=17kΩ, R2=33kΩ gives 33/50 = 0.66 → 3.30V.",
      },
    ],
  },

  {
    id: "circuit-002",
    title: "Parallel Resistor Network Analysis",
    description:
      "A 12V supply drives R1 (3kΩ) in series with two parallel resistors R2 and R3 (both 6kΩ). " +
      "Observe the probe reading at node B (the junction between R1 and the parallel pair). " +
      "No sliders — analyse the circuit using the live readings and answer the question below.",
    question: "What is V(B) in this series-parallel resistor network?",
    missionType: "circuit_lab",
    workstation: "circuit_lab",
    category: "Circuit Analysis",
    difficulty: "intermediate",
    track: "circuits",
    simulation: {
      type: "dc_circuit",
      circuit: {
        nodes: ["A", "B", "GND"],
        components: [
          { id: "V1", type: "voltage_source", value: 12, unit: "V", node_plus: "A", node_minus: "GND", editable: false },
          { id: "R1", type: "resistor",        value: 3000, unit: "Ω", node_a: "A", node_b: "B",   editable: false },
          { id: "R2", type: "resistor",        value: 6000, unit: "Ω", node_a: "B", node_b: "GND", editable: false },
          { id: "R3", type: "resistor",        value: 6000, unit: "Ω", node_a: "B", node_b: "GND", editable: false },
        ],
        layout: {
          "A":   { x: 60,  y: 70  },
          "B":   { x: 250, y: 70  },
          "GND": { x: 60,  y: 230, extra: [{ x: 250, y: 230 }] },
          wires: [
            { x1: 60,  y1: 230, x2: 250, y2: 230 },
            // R2 and R3 drawn side-by-side below B — component renderer handles B→GND twice
          ],
        },
        probe: "B",
      },
      target: null,  // read-only analysis — MCQ is the validation
    },
    test_cases: [
      {
        options: [
          "V(B) = 6V  — R2 ∥ R3 = 3kΩ, divider gives 12 × 3k/(3k+3k)",
          "V(B) = 8V  — R2 ∥ R3 = 6kΩ, divider gives 12 × 6k/(3k+6k)",
          "V(B) = 4V  — Incorrect parallel combination",
          "V(B) = 9V  — Incorrect: R1 and R2 treated as parallel",
        ],
        correct: 0,
        explanation: "R2 ∥ R3 = (6k×6k)/(6k+6k) = 3kΩ. Voltage divider: V(B) = 12 × 3k/(3k+3k) = 12 × 0.5 = 6V. Verify with the probe above.",
      },
    ],
  },

  {
    id: "circuit-003",
    title: "LED Current Limiting Resistor",
    description:
      "An LED (modelled as a 2V source VLED) must be driven at 20mA from a 5V supply. " +
      "Adjust the current-limiting resistor R_lim until I(R_lim) reaches the target of 20mA. " +
      "Use the branch current display and the Check Circuit button to validate.",
    question: "What resistance limits LED current to exactly 20mA (Vsupply=5V, VLED=2V)?",
    missionType: "circuit_lab",
    workstation: "circuit_lab",
    category: "Circuit Analysis",
    difficulty: "beginner",
    track: "circuits",
    simulation: {
      type: "dc_circuit",
      circuit: {
        nodes: ["A", "B", "GND"],
        components: [
          { id: "Vsup", type: "voltage_source", value: 5,   unit: "V", node_plus: "A", node_minus: "GND", editable: false },
          { id: "Rlim", type: "resistor",        value: 150, unit: "Ω", node_a: "A",   node_b: "B",        editable: true, min: 10, max: 1000, step: 10, description: "Current limiter" },
          { id: "VLED", type: "voltage_source",  value: 2,   unit: "V", node_plus: "B", node_minus: "GND", editable: false },
        ],
        layout: {
          "A":   { x: 60,  y: 70  },
          "B":   { x: 320, y: 70  },
          "GND": { x: 60,  y: 230, extra: [{ x: 320, y: 230 }] },
          wires: [
            { x1: 60,  y1: 230, x2: 320, y2: 230 },
            { x1: 320, y1: 70,  x2: 320, y2: 230 },
          ],
        },
        probe: "B",
      },
      target: { type: "current", component: "Rlim", value: 0.02, tolerance: 0.1, unit: "A" },
    },
    test_cases: [
      {
        options: [
          "R = 150Ω → I = (5−2)/150 = 20.0mA ✓",
          "R = 250Ω → I = (5−2)/250 = 12.0mA (too dim)",
          "R = 100Ω → I = (5−2)/100 = 30.0mA (exceeds LED max rating)",
          "R = 330Ω → I = (5−2)/330 ≈ 9.1mA (insufficient brightness)",
        ],
        correct: 0,
        explanation: "R = (Vsupply − VLED) / I_target = (5 − 2) / 0.020 = 3 / 0.020 = 150Ω. Confirm with the simulation: I(Rlim) = 20mA when Rlim = 150Ω.",
      },
    ],
  },
]



// ─────────────────────────────────────────────────────────────────────────────
// EEE ENGINEERING CHALLENGE POOLS
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// EEE CHALLENGE POOLS  (missionType: "engineering_lab", MCQ via test_cases)
// Generic EEE fallback + 5 sub-role pools
// ─────────────────────────────────────────────────────────────────────────────

export const EEE_CHALLENGES = [
  {
    id: "eee-001",
    title: "Transformer Turns Ratio",
    description: "A single-phase transformer has a primary voltage of 240V and secondary voltage of 12V. The primary winding has 480 turns. Calculate the number of secondary turns.",
    question: "How many secondary turns does this transformer have?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Electrical Machines", difficulty: "beginner", track: "transformers",
    test_cases: [{ options: ["24 turns", "48 turns", "12 turns", "240 turns"], correct: 0,
      explanation: "N2/N1 = V2/V1  →  N2 = N1 × V2/V1 = 480 × 12/240 = 24 turns." }],
  },
  {
    id: "eee-002",
    title: "Three-Phase Active Power",
    description: "A balanced three-phase load is connected to a 415V (line-to-line) supply. Each phase carries 10A at a power factor of 0.85 lagging. Calculate the total active power.",
    question: "What is the total active power drawn by this three-phase load?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Power Systems", difficulty: "beginner", track: "three_phase",
    test_cases: [{ options: ["6.11 kW", "3.53 kW", "4.15 kW", "10.5 kW"], correct: 0,
      explanation: "P = √3 × VL × IL × cos φ = 1.732 × 415 × 10 × 0.85 = 6107 W ≈ 6.11 kW." }],
  },
  {
    id: "eee-003",
    title: "DC Motor Back EMF",
    description: "A DC shunt motor operates with terminal voltage Vt = 220V, armature resistance Ra = 0.5Ω, and armature current Ia = 20A. Calculate the back EMF.",
    question: "What is the back EMF (Eb) of this DC motor?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Electrical Machines", difficulty: "beginner", track: "dc_machines",
    test_cases: [{ options: ["210 V", "220 V", "200 V", "230 V"], correct: 0,
      explanation: "Eb = Vt − Ia × Ra = 220 − 20 × 0.5 = 220 − 10 = 210 V." }],
  },
  {
    id: "eee-004",
    title: "Power Factor Correction — Capacitor Size",
    description: "A load draws 10kW at PF = 0.7 lagging. It must be corrected to PF = 0.95 lagging using a shunt capacitor bank. Calculate the reactive power supplied by the capacitor bank.",
    question: "What reactive power (kVAR) must the capacitor bank supply?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Power Systems", difficulty: "intermediate", track: "power_factor",
    test_cases: [{ options: ["6.92 kVAR", "10.20 kVAR", "3.29 kVAR", "13.49 kVAR"], correct: 0,
      explanation: "Q_load = P tan(cos⁻¹0.7) = 10 × 1.020 = 10.20 kVAR. Q_target = P tan(cos⁻¹0.95) = 10 × 0.329 = 3.29 kVAR. Q_cap = 10.20 − 3.29 = 6.91 kVAR ≈ 6.92 kVAR." }],
  },
]

export const EEE_POWER_CHALLENGES = [
  {
    id: "power-001",
    title: "Symmetrical Three-Phase Fault Current",
    description: "A synchronous generator rated 10 MVA, 11 kV has a sub-transient reactance X'd = 0.2 pu. A symmetrical three-phase fault occurs at its terminals. Calculate the fault current.",
    question: "What is the initial symmetrical fault current (kA)?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Power Systems", difficulty: "intermediate", track: "fault_analysis",
    test_cases: [{ options: ["2.62 kA", "5.25 kA", "1.31 kA", "4.37 kA"], correct: 0,
      explanation: "I_base = 10×10⁶ / (√3 × 11000) = 524.9 A. I_fault = I_base / X'd = 524.9 / 0.2 = 2625 A ≈ 2.62 kA." }],
  },
  {
    id: "power-002",
    title: "Per-Unit Impedance Conversion",
    description: "System base: 100 MVA, 132 kV. A transmission line has actual impedance Z = 20 + j60 Ω. Find the magnitude of the per-unit impedance.",
    question: "What is |Z_pu| for this transmission line?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Power Systems", difficulty: "intermediate", track: "per_unit",
    test_cases: [{ options: ["0.363 pu", "0.183 pu", "0.726 pu", "0.456 pu"], correct: 0,
      explanation: "Z_base = (132 kV)² / 100 MVA = 174.24 Ω. |Z| = √(20² + 60²) = 63.25 Ω. |Z_pu| = 63.25 / 174.24 = 0.363 pu." }],
  },
  {
    id: "power-003",
    title: "Bus Current Injection (Load Flow)",
    description: "A P-Q bus injects 50 MW + j20 MVAR into the network. Bus voltage magnitude is 1.02 pu. System base: 100 MVA. Find the magnitude of the bus injection current in pu.",
    question: "What is |I_bus| in per-unit?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Power Systems", difficulty: "advanced", track: "load_flow",
    test_cases: [{ options: ["0.528 pu", "0.539 pu", "0.694 pu", "0.412 pu"], correct: 0,
      explanation: "S_pu = (0.5 + j0.2). I = S* / V* = (0.5 − j0.2) / 1.02 = 0.4902 − j0.1961. |I| = √(0.4902² + 0.1961²) = 0.528 pu." }],
  },
  {
    id: "power-004",
    title: "Transmission Line Voltage Regulation",
    description: "A 132 kV line delivers P = 30 MW, Q = 15 MVAR at the receiving end (VR = 128 kV). Line parameters: R = 5 Ω, X = 20 Ω. Using the approximate formula, find the sending-end voltage VS.",
    question: "What is the approximate sending-end voltage VS?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Power Systems", difficulty: "intermediate", track: "transmission",
    test_cases: [{ options: ["131.5 kV", "135.0 kV", "128.0 kV", "133.5 kV"], correct: 0,
      explanation: "|ΔV| ≈ (PR + QX) / VR = (30M×5 + 15M×20) / 128000 = 450×10⁶ / 128000 = 3.516 kV. VS ≈ 128 + 3.516 = 131.5 kV." }],
  },
]

export const EEE_MACHINES_CHALLENGES = [
  {
    id: "machines-001",
    title: "Induction Motor Slip",
    description: "A 4-pole induction motor is connected to a 50 Hz supply. The rotor runs at 1440 rpm. Calculate the slip.",
    question: "What is the percentage slip of this induction motor?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Electrical Machines", difficulty: "beginner", track: "induction_motors",
    test_cases: [{ options: ["4 %", "3 %", "5 %", "6 %"], correct: 0,
      explanation: "Ns = 120f / P = 120×50 / 4 = 1500 rpm. s = (Ns − Nr) / Ns = (1500 − 1440) / 1500 = 0.04 = 4 %." }],
  },
  {
    id: "machines-002",
    title: "Transformer No-Load Test — Core Loss Current",
    description: "No-load test on a 230V transformer: input power W0 = 200 W, no-load current I0 = 2 A. Find the magnetising current Im and core-loss current Ic.",
    question: "What are Ic and Im for this transformer?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Electrical Machines", difficulty: "intermediate", track: "transformers",
    test_cases: [{ options: ["Ic = 0.87 A, Im = 1.80 A", "Ic = 0.50 A, Im = 1.94 A", "Ic = 1.20 A, Im = 1.60 A", "Ic = 1.00 A, Im = 1.73 A"], correct: 0,
      explanation: "cos φ0 = W0/(V0 I0) = 200/(230×2) = 0.435. Ic = I0 cos φ0 = 2×0.435 = 0.87 A. Im = I0 sin φ0 = 2×0.900 = 1.80 A." }],
  },
  {
    id: "machines-003",
    title: "DC Motor Torque — Lap Winding",
    description: "A 4-pole DC motor has a lap winding with Z = 400 conductors. Flux per pole φ = 0.05 Wb and armature current Ia = 50 A. Calculate the electromagnetic torque.",
    question: "What is the electromagnetic torque developed?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Electrical Machines", difficulty: "intermediate", track: "dc_machines",
    test_cases: [{ options: ["159.2 N·m", "318.3 N·m", "79.6 N·m", "200.0 N·m"], correct: 0,
      explanation: "For lap winding A = P = 4. T = ZφIa / (2π) = 400×0.05×50 / (2π) = 1000 / 6.283 = 159.2 N·m." }],
  },
  {
    id: "machines-004",
    title: "Synchronous Generator Voltage Regulation",
    description: "A 1 MVA, 11 kV, 3-phase star-connected alternator has Ra = 0.5 Ω and synchronous reactance Xs = 10 Ω per phase. Find the voltage regulation at full load, PF = 0.8 lagging.",
    question: "What is the percentage voltage regulation?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Electrical Machines", difficulty: "advanced", track: "synchronous_machines",
    test_cases: [{ options: ["5.48 %", "2.74 %", "8.22 %", "10.96 %"], correct: 0,
      explanation: "Vt = 11000/√3 = 6351 V. Ia = 52.49 A∠−36.87°. Ef = Vt + Ia(Ra+jXs) = 6687+j404 V. |Ef| = 6699 V. VR = (6699−6351)/6351 × 100 = 5.48 %." }],
  },
]

export const EEE_CONTROL_CHALLENGES = [
  {
    id: "control-001",
    title: "Closed-Loop Stability — Pole Locations",
    description: "A second-order system has transfer function G(s) = 10 / (s² + 5s + 6). Determine the poles and stability.",
    question: "Where are the poles and is the system stable?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Control Systems", difficulty: "beginner", track: "stability",
    test_cases: [{ options: ["s = −2, −3 (stable)", "s = +2, +3 (unstable)", "s = ±j√6 (marginally stable)", "s = −5 ± j (stable)"], correct: 0,
      explanation: "s² + 5s + 6 = (s+2)(s+3) = 0 → s = −2, −3. Both poles lie in the left-half plane → BIBO stable." }],
  },
  {
    id: "control-002",
    title: "Ziegler–Nichols PID Tuning",
    description: "A process has ultimate gain Ku = 8 and ultimate period Pu = 4 s. Using the Ziegler–Nichols closed-loop method, find Kp, Ti, and Td for a PID controller.",
    question: "What are the Z–N PID tuning parameters?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Control Systems", difficulty: "intermediate", track: "pid_tuning",
    test_cases: [{ options: ["Kp=4.8, Ti=2.0s, Td=0.5s", "Kp=3.2, Ti=4.0s, Td=1.0s", "Kp=6.0, Ti=1.0s, Td=0.25s", "Kp=4.0, Ti=2.0s, Td=0.5s"], correct: 0,
      explanation: "Z–N PID: Kp = 0.6Ku = 4.8, Ti = 0.5Pu = 2.0 s, Td = 0.125Pu = 0.5 s." }],
  },
  {
    id: "control-003",
    title: "First-Order Step Response",
    description: "A process transfer function is G(s) = 5 / (2s + 1). A step input of magnitude 3 is applied. Find the output value at t = 2 s.",
    question: "What is the output y(t) at t = 2 s?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Control Systems", difficulty: "intermediate", track: "time_response",
    test_cases: [{ options: ["9.48", "7.65", "12.32", "15.0"], correct: 0,
      explanation: "DC gain = 5, step = 3, so final value = 15. τ = 2 s. y(t) = 15(1 − e^−t/2). y(2) = 15(1 − e⁻¹) = 15 × 0.632 = 9.48." }],
  },
  {
    id: "control-004",
    title: "Root Locus Breakaway — Gain at Breakaway",
    description: "Open-loop TF: G(s)H(s) = K / ((s+1)(s+3)). Find the real-axis breakaway point and the value of K there.",
    question: "What is the breakaway point and corresponding gain K?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Control Systems", difficulty: "intermediate", track: "root_locus",
    test_cases: [{ options: ["s = −2, K = 1", "s = −1, K = 3", "s = 0, K = 0", "s = −4, K = 4"], correct: 0,
      explanation: "K = −(s+1)(s+3). dK/ds = −(2s+4) = 0 → s = −2. K = −(−1)(1) = 1." }],
  },
]

export const EEE_PE_CHALLENGES = [
  {
    id: "pe-001",
    title: "Buck Converter Duty Cycle",
    description: "A buck (step-down) converter operates in continuous conduction mode with Vin = 24 V and Vout = 12 V. Calculate the required duty cycle D.",
    question: "What duty cycle is needed to produce 12 V from 24 V?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Power Electronics", difficulty: "beginner", track: "dc_dc_converters",
    test_cases: [{ options: ["50 %", "25 %", "66.7 %", "40 %"], correct: 0,
      explanation: "For ideal buck CCM: Vout = D × Vin → D = Vout/Vin = 12/24 = 0.5 = 50 %." }],
  },
  {
    id: "pe-002",
    title: "Boost Converter Output Voltage",
    description: "A boost converter has Vin = 5 V and duty cycle D = 0.6. Assuming ideal (lossless) operation, find the output voltage Vout.",
    question: "What is Vout for this boost converter?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Power Electronics", difficulty: "beginner", track: "dc_dc_converters",
    test_cases: [{ options: ["12.5 V", "8.0 V", "20.0 V", "10.0 V"], correct: 0,
      explanation: "Ideal boost: Vout = Vin / (1 − D) = 5 / (1 − 0.6) = 5 / 0.4 = 12.5 V." }],
  },
  {
    id: "pe-003",
    title: "Single-Phase Bridge Rectifier — Average Output",
    description: "A single-phase full-wave bridge rectifier is supplied from 230 V rms AC (50 Hz). The peak voltage Vm = 325 V. Find the average (DC) output voltage assuming ideal diodes.",
    question: "What is the average DC output voltage of this rectifier?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Power Electronics", difficulty: "beginner", track: "rectifiers",
    test_cases: [{ options: ["206.9 V", "325.0 V", "103.5 V", "147.7 V"], correct: 0,
      explanation: "Vdc = 2Vm / π = 2 × 325 / π = 650 / 3.1416 = 206.9 V." }],
  },
  {
    id: "pe-004",
    title: "MOSFET Switching Loss",
    description: "A MOSFET switches at fs = 100 kHz with Vds = 200 V, Id = 10 A, turn-on time ton = 100 ns, turn-off time toff = 150 ns. Calculate average switching power loss.",
    question: "What is the average switching power loss?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Power Electronics", difficulty: "intermediate", track: "switching_devices",
    test_cases: [{ options: ["25 W", "50 W", "12.5 W", "37.5 W"], correct: 0,
      explanation: "Psw = ½ × Vds × Id × (ton + toff) × fs = 0.5 × 200 × 10 × 250×10⁻⁹ × 100×10³ = 25 W." }],
  },
]

export const EEE_INST_CHALLENGES = [
  {
    id: "inst-001",
    title: "Wheatstone Bridge Balance",
    description: "A Wheatstone bridge has R1 = 100 Ω, R2 = 200 Ω, R3 = 150 Ω. Find R4 for a null (balanced) bridge.",
    question: "What value of R4 balances this bridge?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Instrumentation", difficulty: "beginner", track: "bridge_circuits",
    test_cases: [{ options: ["300 Ω", "75 Ω", "150 Ω", "400 Ω"], correct: 0,
      explanation: "Balance condition: R1/R2 = R3/R4 → R4 = R2 × R3 / R1 = 200 × 150 / 100 = 300 Ω." }],
  },
  {
    id: "inst-002",
    title: "ADC Resolution — 12-bit",
    description: "A 12-bit ADC has a reference voltage Vref = 5 V. Find the voltage resolution per LSB and the total number of quantisation steps.",
    question: "What is the voltage resolution (LSB value) of this ADC?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Instrumentation", difficulty: "beginner", track: "data_converters",
    test_cases: [{ options: ["1.221 mV", "2.441 mV", "0.610 mV", "4.883 mV"], correct: 0,
      explanation: "Steps = 2¹² = 4096. Resolution = Vref / 2ⁿ = 5 / 4096 = 0.001221 V = 1.221 mV." }],
  },
  {
    id: "inst-003",
    title: "PT100 RTD Temperature Measurement",
    description: "A PT100 sensor follows R = R0(1 + αT) with α = 0.00385 /°C and R0 = 100 Ω. A bridge circuit reads R = 133.58 Ω. Find the temperature.",
    question: "What temperature does this PT100 reading correspond to?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Instrumentation", difficulty: "intermediate", track: "sensors",
    test_cases: [{ options: ["87.2 °C", "74.6 °C", "95.0 °C", "100.0 °C"], correct: 0,
      explanation: "133.58 = 100(1 + 0.00385T) → 0.3358 = 0.00385T → T = 0.3358 / 0.00385 = 87.2 °C." }],
  },
  {
    id: "inst-004",
    title: "Signal-to-Noise Ratio",
    description: "A sensor system outputs signal power Ps = 40 mW and has noise power Pn = 0.1 mW. Calculate the SNR in decibels.",
    question: "What is the SNR of this measurement system?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Instrumentation", difficulty: "beginner", track: "signal_quality",
    test_cases: [{ options: ["26.0 dB", "13.0 dB", "32.0 dB", "20.0 dB"], correct: 0,
      explanation: "SNR = 10 log₁₀(Ps / Pn) = 10 log₁₀(40 / 0.1) = 10 log₁₀(400) = 10 × 2.602 = 26.0 dB." }],
  },
]


// ─────────────────────────────────────────────────────────────────────────────
// CIVIL ENGINEERING CHALLENGE POOLS
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CIVIL ENGINEERING CHALLENGE POOLS
// ─────────────────────────────────────────────────────────────────────────────

export const CIVIL_CHALLENGES = [
  {
    id: "civil-001",
    title: "Simply Supported Beam — Maximum Bending Moment",
    description: "A simply supported beam has a span of 6 m and carries a uniformly distributed load (UDL) of 10 kN/m. Find the maximum bending moment.",
    question: "What is the maximum bending moment in this beam?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Structural Engineering", difficulty: "beginner", track: "beams",
    test_cases: [{ options: ["45 kN·m", "90 kN·m", "22.5 kN·m", "60 kN·m"], correct: 0,
      explanation: "M_max = wL² / 8 = 10 × 6² / 8 = 360 / 8 = 45 kN·m (occurs at mid-span)." }],
  },
  {
    id: "civil-002",
    title: "Water-Cement Ratio — Concrete Mix",
    description: "A concrete mix design uses w/c = 0.45 and cement content = 380 kg/m³. Find the water content per cubic metre of concrete.",
    question: "What is the water content required?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Concrete Technology", difficulty: "beginner", track: "mix_design",
    test_cases: [{ options: ["171 kg/m³", "190 kg/m³", "155 kg/m³", "200 kg/m³"], correct: 0,
      explanation: "Water = (w/c) × cement = 0.45 × 380 = 171 kg/m³." }],
  },
  {
    id: "civil-003",
    title: "Head Loss — Darcy–Weisbach",
    description: "A 200mm diameter pipe of 500m length carries Q = 0.05 m³/s. Darcy friction factor f = 0.02. Find the head loss hf.",
    question: "What is the head loss due to friction?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Hydraulics", difficulty: "intermediate", track: "pipe_flow",
    test_cases: [{ options: ["6.45 m", "3.22 m", "12.9 m", "4.83 m"], correct: 0,
      explanation: "V = Q/A = 0.05/(π×0.1²) = 1.592 m/s. hf = fLV²/(D×2g) = 0.02×500×2.534/(0.2×19.62) = 6.45 m." }],
  },
  {
    id: "civil-004",
    title: "Terzaghi's Bearing Capacity — Square Footing",
    description: "A 1.5m × 1.5m square footing is placed at 1.0m depth in sand (c = 0, φ = 30°, γ = 18 kN/m³). Terzaghi factors: Nq = 18.4, Nγ = 15.67. Find the ultimate bearing capacity.",
    question: "What is the ultimate bearing capacity of this footing?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Geotechnical Engineering", difficulty: "intermediate", track: "bearing_capacity",
    test_cases: [{ options: ["500 kPa", "250 kPa", "750 kPa", "331 kPa"], correct: 0,
      explanation: "qu = qNq + 0.4γBNγ = (18×1)×18.4 + 0.4×18×1.5×15.67 = 331.2 + 169.2 = 500.4 kPa ≈ 500 kPa." }],
  },
]

export const CIVIL_STRUCTURAL_CHALLENGES = [
  {
    id: "struct-001",
    title: "Euler Column Buckling Load",
    description: "A steel column (E = 200 GPa, I = 8.33×10⁻⁶ m⁴) has an effective length Le = 4 m (both ends pinned). Find the critical Euler buckling load Pcr.",
    question: "What is the Euler critical buckling load for this column?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Structural Engineering", difficulty: "intermediate", track: "columns",
    test_cases: [{ options: ["1028 kN", "515 kN", "2060 kN", "4120 kN"], correct: 0,
      explanation: "Pcr = π²EI / Le² = 9.870 × 200×10⁹ × 8.33×10⁻⁶ / 16 = 1,028 kN." }],
  },
  {
    id: "struct-002",
    title: "Beam Mid-Span Deflection — UDL",
    description: "A simply supported beam (E = 200 GPa, I = 10⁻⁴ m⁴, L = 5 m) carries a UDL of w = 20 kN/m. Find the maximum deflection at mid-span.",
    question: "What is the maximum mid-span deflection?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Structural Engineering", difficulty: "intermediate", track: "deflections",
    test_cases: [{ options: ["8.14 mm", "4.07 mm", "16.3 mm", "2.03 mm"], correct: 0,
      explanation: "δ_max = 5wL⁴ / (384EI) = 5×20000×625 / (384×200×10⁹×10⁻⁴) = 62.5×10⁶ / 7.68×10⁹ = 8.14 mm." }],
  },
  {
    id: "struct-003",
    title: "Steel Section Moment Capacity",
    description: "A UB 305×165×54 section has I_xx = 11710 cm⁴ and depth d = 310.9 mm. Steel grade: fy = 275 MPa. Find the elastic moment capacity Mc.",
    question: "What is the elastic moment capacity of this steel section?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Structural Engineering", difficulty: "intermediate", track: "steel_design",
    test_cases: [{ options: ["207 kN·m", "414 kN·m", "104 kN·m", "275 kN·m"], correct: 0,
      explanation: "Z_xx = I / (d/2) = 11710 / 15.545 = 753.3 cm³. Mc = Z × fy = 753.3×10⁻⁶ × 275×10⁶ = 207 kN·m." }],
  },
  {
    id: "struct-004",
    title: "Simply Supported Beam — Support Reactions",
    description: "A simply supported beam of span 8 m carries a point load P = 40 kN at 3 m from the left support. Find the left reaction RA and right reaction RB.",
    question: "What are the support reactions RA and RB?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Structural Engineering", difficulty: "beginner", track: "statics",
    test_cases: [{ options: ["RA = 25 kN, RB = 15 kN", "RA = 20 kN, RB = 20 kN", "RA = 15 kN, RB = 25 kN", "RA = 30 kN, RB = 10 kN"], correct: 0,
      explanation: "ΣMB = 0: RA×8 = 40×5 → RA = 25 kN. RB = 40 − 25 = 15 kN." }],
  },
]

export const CIVIL_GEO_CHALLENGES = [
  {
    id: "geo-001",
    title: "Effective Stress Below Water Table",
    description: "A 4m deep saturated soil layer has γsat = 20 kN/m³. The water table is at the surface. Find the effective vertical stress at 4m depth.",
    question: "What is the effective stress σ' at 4m depth?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Geotechnical Engineering", difficulty: "beginner", track: "stress",
    test_cases: [{ options: ["40.8 kPa", "80.0 kPa", "39.2 kPa", "20.0 kPa"], correct: 0,
      explanation: "σ = γsat × z = 20 × 4 = 80 kPa. u = γw × z = 9.81 × 4 = 39.2 kPa. σ' = σ − u = 80 − 39.2 = 40.8 kPa." }],
  },
  {
    id: "geo-002",
    title: "Primary Consolidation Settlement",
    description: "A 3m clay layer: Cc = 0.35, e0 = 0.8, initial effective stress σ'0 = 80 kPa, stress increment Δσ = 40 kPa. Find the primary consolidation settlement S.",
    question: "What is the primary consolidation settlement?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Geotechnical Engineering", difficulty: "intermediate", track: "consolidation",
    test_cases: [{ options: ["102.7 mm", "75.0 mm", "150.0 mm", "51.3 mm"], correct: 0,
      explanation: "S = Cc/(1+e0) × H × log((σ'0+Δσ)/σ'0) = 0.35/1.8 × 3 × log(120/80) = 0.5833 × 0.176 = 0.1027 m = 102.7 mm." }],
  },
  {
    id: "geo-003",
    title: "Mohr–Coulomb Shear Strength",
    description: "A soil has cohesion c = 25 kPa and friction angle φ = 30°. A failure plane has normal stress σn = 100 kPa. Find the shear strength τ.",
    question: "What is the shear strength on this failure plane?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Geotechnical Engineering", difficulty: "beginner", track: "shear_strength",
    test_cases: [{ options: ["82.7 kPa", "57.7 kPa", "25.0 kPa", "125.0 kPa"], correct: 0,
      explanation: "τ = c + σ tan φ = 25 + 100 × tan(30°) = 25 + 100 × 0.5774 = 82.7 kPa." }],
  },
  {
    id: "geo-004",
    title: "Darcy's Law — Hydraulic Conductivity",
    description: "A soil sample: L = 0.3m, cross-section A = 0.005 m², head difference h = 0.6m, measured flow Q = 2×10⁻⁵ m³/s. Find the hydraulic conductivity k.",
    question: "What is the hydraulic conductivity of this soil?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Geotechnical Engineering", difficulty: "intermediate", track: "seepage",
    test_cases: [{ options: ["2×10⁻³ m/s", "1×10⁻³ m/s", "4×10⁻³ m/s", "6×10⁻⁴ m/s"], correct: 0,
      explanation: "i = h/L = 0.6/0.3 = 2.0. v = Q/A = 2×10⁻⁵/0.005 = 4×10⁻³ m/s. k = v/i = 4×10⁻³/2 = 2×10⁻³ m/s." }],
  },
]

export const CIVIL_TRANS_CHALLENGES = [
  {
    id: "trans-001",
    title: "Stopping Sight Distance",
    description: "Design speed = 80 km/h, driver reaction time t = 2.5 s, deceleration a = 3.5 m/s². Find the Stopping Sight Distance (SSD) on a level road.",
    question: "What is the minimum SSD for this design speed?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Transportation Engineering", difficulty: "intermediate", track: "geometric_design",
    test_cases: [{ options: ["126 m", "180 m", "63 m", "250 m"], correct: 0,
      explanation: "v = 80/3.6 = 22.22 m/s. SSD = vt + v²/(2a) = 22.22×2.5 + 22.22²/(2×3.5) = 55.6 + 70.5 = 126 m." }],
  },
  {
    id: "trans-002",
    title: "Greenshields Traffic Flow Model — Capacity",
    description: "Using the Greenshields linear speed-density model: free-flow speed vf = 80 km/h, jam density kj = 120 veh/km. Find the maximum flow rate (capacity).",
    question: "What is the road capacity under the Greenshields model?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Transportation Engineering", difficulty: "intermediate", track: "traffic_flow",
    test_cases: [{ options: ["2400 veh/h", "4800 veh/h", "1200 veh/h", "3200 veh/h"], correct: 0,
      explanation: "Speed at capacity vc = vf/2 = 40 km/h. Density kc = kj/2 = 60 veh/km. q_max = vc × kc = 40 × 60 = 2400 veh/h." }],
  },
  {
    id: "trans-003",
    title: "Tyre Contact Radius",
    description: "A design wheel load P = 40 kN is applied through a tyre at contact pressure p = 550 kPa. Assume a circular contact area. Find the contact radius a.",
    question: "What is the equivalent circular tyre contact radius?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Transportation Engineering", difficulty: "intermediate", track: "pavement_design",
    test_cases: [{ options: ["152 mm", "215 mm", "108 mm", "96 mm"], correct: 0,
      explanation: "A = P/p = 40000/550000 = 0.07273 m². a = √(A/π) = √(0.07273/π) = √0.02315 = 0.1522 m = 152 mm." }],
  },
  {
    id: "trans-004",
    title: "Signalised Intersection — Degree of Saturation",
    description: "Intersection: cycle C = 90 s, green g = 45 s, arrival flow q = 800 veh/h, saturation flow s = 1800 veh/h. Find the degree of saturation X.",
    question: "What is the degree of saturation at this signal approach?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Transportation Engineering", difficulty: "intermediate", track: "traffic_signals",
    test_cases: [{ options: ["0.889", "0.444", "1.778", "0.500"], correct: 0,
      explanation: "Capacity = s × g/C = 1800 × 45/90 = 900 veh/h. X = q / capacity = 800 / 900 = 0.889." }],
  },
]

export const CIVIL_WATER_CHALLENGES = [
  {
    id: "water-001",
    title: "Manning's Equation — Pipe Full Flow",
    description: "A circular concrete pipe (D = 0.6 m, Manning's n = 0.013) flows full on a slope S = 0.002. Find the discharge Q.",
    question: "What is the flow rate Q at full-pipe flow?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Water Resources", difficulty: "intermediate", track: "open_channel",
    test_cases: [{ options: ["0.274 m³/s", "0.137 m³/s", "0.548 m³/s", "0.183 m³/s"], correct: 0,
      explanation: "A=0.2827 m², P=1.885 m, R=0.150 m. V=(1/0.013)×0.150^(2/3)×0.002^0.5 = 76.9×0.281×0.0447 = 0.968 m/s. Q = 0.968×0.2827 = 0.274 m³/s." }],
  },
  {
    id: "water-002",
    title: "Orifice Discharge",
    description: "A circular orifice (D = 50 mm, Cd = 0.61) operates under a head H = 3 m. Find the discharge Q.",
    question: "What is the discharge through this orifice?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Water Resources", difficulty: "intermediate", track: "hydraulics",
    test_cases: [{ options: ["9.19 L/s", "15.1 L/s", "5.95 L/s", "4.59 L/s"], correct: 0,
      explanation: "A = π×0.025² = 1.963×10⁻³ m². Q = Cd×A×√(2gH) = 0.61×1.963×10⁻³×√(58.86) = 0.61×1.963×10⁻³×7.672 = 9.19×10⁻³ m³/s = 9.19 L/s." }],
  },
  {
    id: "water-003",
    title: "Rational Method — Peak Storm Runoff",
    description: "A catchment has runoff coefficient C = 0.65, design rainfall intensity I = 50 mm/h, and area A = 2.5 ha. Find the peak runoff Q using the Rational method.",
    question: "What is the peak storm runoff from this catchment?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Water Resources", difficulty: "intermediate", track: "hydrology",
    test_cases: [{ options: ["0.226 m³/s", "0.113 m³/s", "0.452 m³/s", "0.180 m³/s"], correct: 0,
      explanation: "Q = CIA/360 (I in mm/h, A in ha) = 0.65×50×2.5/360 = 81.25/360 = 0.226 m³/s." }],
  },
  {
    id: "water-004",
    title: "Venturimeter Discharge",
    description: "A venturimeter: D1 = 200 mm, D2 = 100 mm, Cd = 0.98. The differential pressure Δp = 20 kPa. Find the flow rate Q (water, ρ = 1000 kg/m³).",
    question: "What is the flow rate through this venturimeter?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Water Resources", difficulty: "advanced", track: "flow_measurement",
    test_cases: [{ options: ["50.3 L/s", "25.2 L/s", "100.6 L/s", "38.5 L/s"], correct: 0,
      explanation: "h = Δp/(ρg) = 20000/9810 = 2.039 m. A1=0.03142 m², A2=0.007854 m². Q = Cd×A1A2/√(A1²−A2²)×√(2gh) = 0.98×0.008116/0.03042×6.325 = 50.3 L/s." }],
  },
]

export const CIVIL_CONST_CHALLENGES = [
  {
    id: "const-001",
    title: "CPM — Critical Path Duration",
    description: "Network activities: A(3d)→C(2d)→E(4d); A(3d)→D(5d)→E(4d); B(2d)→D(5d)→E(4d). Identify the critical path and project duration.",
    question: "What is the critical path and total project duration?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Construction Management", difficulty: "intermediate", track: "project_planning",
    test_cases: [{ options: ["A→D→E = 12 days", "A→C→E = 9 days", "B→D→E = 11 days", "B→C→E = 14 days"], correct: 0,
      explanation: "Path durations: A→C→E = 3+2+4 = 9d; A→D→E = 3+5+4 = 12d (longest → critical); B→D→E = 2+5+4 = 11d." }],
  },
  {
    id: "const-002",
    title: "Concrete Volume Estimation",
    description: "Three identical beams, each 300mm wide × 500mm deep × 6m long, are to be cast in concrete. Find the total concrete volume.",
    question: "What is the total concrete volume required?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Construction Management", difficulty: "beginner", track: "quantity_surveying",
    test_cases: [{ options: ["2.70 m³", "5.40 m³", "1.35 m³", "3.60 m³"], correct: 0,
      explanation: "V_one = 0.3 × 0.5 × 6 = 0.9 m³. V_total = 3 × 0.9 = 2.7 m³." }],
  },
  {
    id: "const-003",
    title: "Earthwork Volume — Prismoidal Formula",
    description: "A road cutting: cross-section area at chainage 0 is A1 = 12 m², at chainage 40m is A2 = 18 m². Find the earthwork volume using the prismoidal formula.",
    question: "What is the earthwork volume between these two chainages?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Construction Management", difficulty: "intermediate", track: "earthworks",
    test_cases: [{ options: ["600 m³", "300 m³", "720 m³", "500 m³"], correct: 0,
      explanation: "Am = (A1+A2)/2 = 15 m². V = L/6 × (A1 + 4Am + A2) = 40/6 × (12+60+18) = 40/6 × 90 = 600 m³." }],
  },
  {
    id: "const-004",
    title: "Brick Masonry — Number of Bricks",
    description: "A wall is 5m long, 3m high, and 230mm thick. Standard brick size (with mortar joints): 240mm × 125mm × 86mm. Find the number of bricks required.",
    question: "How many bricks are needed for this wall?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Construction Management", difficulty: "beginner", track: "quantity_surveying",
    test_cases: [{ options: ["1337", "1500", "1000", "1672"], correct: 0,
      explanation: "Wall volume = 5×3×0.23 = 3.45 m³. Brick volume (with mortar) = 0.24×0.125×0.086 = 0.002580 m³. N = 3.45/0.002580 = 1337 bricks." }],
  },
]


// ─────────────────────────────────────────────────────────────────────────────
// MECHANICAL ENGINEERING CHALLENGE POOLS
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MECHANICAL ENGINEERING CHALLENGE POOLS
// ─────────────────────────────────────────────────────────────────────────────

export const MECH_CHALLENGES = [
  {
    id: "mech-001",
    title: "Tensile Stress and Elongation",
    description: "A steel rod (E = 200 GPa, cross-section A = 500 mm², length L = 2 m) carries an axial load P = 100 kN. Find the axial stress σ and elongation δ.",
    question: "What are the axial stress and elongation?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Mechanics of Materials", difficulty: "beginner", track: "stress_strain",
    test_cases: [{ options: ["σ = 200 MPa, δ = 2.0 mm", "σ = 100 MPa, δ = 1.0 mm", "σ = 200 MPa, δ = 1.0 mm", "σ = 400 MPa, δ = 4.0 mm"], correct: 0,
      explanation: "σ = P/A = 100 000 / 500×10⁻⁶ = 200 MPa. δ = PL/(AE) = 100 000×2 / (500×10⁻⁶×200×10⁹) = 2.0 mm." }],
  },
  {
    id: "mech-002",
    title: "Carnot Cycle — Thermal Efficiency",
    description: "A Carnot engine operates between TH = 600 K and TC = 300 K. Heat input QH = 800 kJ. Find efficiency η and net work W.",
    question: "What is the Carnot efficiency and work output?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Thermodynamics", difficulty: "beginner", track: "heat_engines",
    test_cases: [{ options: ["η = 50%, W = 400 kJ", "η = 33%, W = 264 kJ", "η = 67%, W = 536 kJ", "η = 25%, W = 200 kJ"], correct: 0,
      explanation: "η = 1 − TC/TH = 1 − 300/600 = 50%. W = η×QH = 0.50×800 = 400 kJ." }],
  },
  {
    id: "mech-003",
    title: "Gear Train — Output Speed",
    description: "A gear train: driver gear T1 = 20 teeth at N1 = 1500 rpm, driven gear T2 = 60 teeth. Find the gear ratio and driven speed N2.",
    question: "What are the gear ratio and driven gear speed?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Machine Design", difficulty: "beginner", track: "gear_trains",
    test_cases: [{ options: ["GR = 3:1, N2 = 500 rpm", "GR = 1:3, N2 = 4500 rpm", "GR = 3:1, N2 = 1500 rpm", "GR = 2:1, N2 = 750 rpm"], correct: 0,
      explanation: "GR = T2/T1 = 60/20 = 3. N2 = N1 / GR = 1500/3 = 500 rpm." }],
  },
  {
    id: "mech-004",
    title: "Hydrostatic Gauge Pressure at Depth",
    description: "A closed tank has gauge pressure P_top = 50 kPa at the surface. Water fills to depth h = 5 m (ρ = 1000 kg/m³, g = 9.81 m/s²). Find the gauge pressure at h = 5 m.",
    question: "What is the gauge pressure at 5 m depth in the tank?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Fluid Mechanics", difficulty: "beginner", track: "hydrostatics",
    test_cases: [{ options: ["99.05 kPa", "50.0 kPa", "149.0 kPa", "49.05 kPa"], correct: 0,
      explanation: "P(h) = P_top + ρgh = 50 000 + 1000×9.81×5 = 50 000 + 49 050 = 99 050 Pa = 99.05 kPa." }],
  },
]

export const MECH_THERMAL_CHALLENGES = [
  {
    id: "thermal-001",
    title: "Fourier's Law — Steady-State Wall Conduction",
    description: "Concrete wall: L = 0.3 m, A = 10 m², k = 0.8 W/(m·K), T1 = 25°C, T2 = 5°C. Find the heat transfer rate Q.",
    question: "What is the heat transfer rate through this wall?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Heat Transfer", difficulty: "intermediate", track: "conduction",
    test_cases: [{ options: ["533 W", "1600 W", "267 W", "800 W"], correct: 0,
      explanation: "q = k(T1−T2)/L = 0.8×20/0.3 = 53.33 W/m². Q = q×A = 53.33×10 = 533 W." }],
  },
  {
    id: "thermal-002",
    title: "Newton's Law of Cooling — Convection",
    description: "A flat plate (A = 0.5 m²) at Ts = 80°C in air at T∞ = 25°C with h = 25 W/(m²·K). Find the convective heat transfer rate Q.",
    question: "What is the convective heat loss from this plate?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Heat Transfer", difficulty: "beginner", track: "convection",
    test_cases: [{ options: ["687.5 W", "1375 W", "343.8 W", "1000 W"], correct: 0,
      explanation: "Q = h×A×(Ts−T∞) = 25×0.5×55 = 687.5 W." }],
  },
  {
    id: "thermal-003",
    title: "Rankine Cycle — Net Specific Work",
    description: "Rankine cycle: turbine inlet h1 = 3200 kJ/kg, exit h2 = 2100 kJ/kg, pump work wp = 5 kJ/kg, boiler heat qin = 2500 kJ/kg. Find net work w_net and thermal efficiency η.",
    question: "What are the net work output and thermal efficiency?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Thermodynamics", difficulty: "intermediate", track: "power_cycles",
    test_cases: [{ options: ["w_net = 1095 kJ/kg, η = 43.8%", "w_net = 1100 kJ/kg, η = 44.0%", "w_net = 1095 kJ/kg, η = 52.1%", "w_net = 900 kJ/kg, η = 36.0%"], correct: 0,
      explanation: "w_turbine = h1 − h2 = 1100 kJ/kg. w_net = 1100 − 5 = 1095 kJ/kg. η = 1095/2500 = 43.8%." }],
  },
  {
    id: "thermal-004",
    title: "Composite Wall — Thermal Resistance",
    description: "Three layers in series: L1 = 0.1m (k1 = 1.0), L2 = 0.05m (k2 = 0.04), L3 = 0.01m (k3 = 50 W/m·K). ΔT = 40°C, A = 1 m². Find heat flux q.",
    question: "What is the heat flux through this composite wall?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Heat Transfer", difficulty: "advanced", track: "thermal_resistance",
    test_cases: [{ options: ["29.6 W/m²", "200 W/m²", "58.4 W/m²", "14.6 W/m²"], correct: 0,
      explanation: "R1=0.1, R2=1.25, R3=0.0002 m²K/W. R_total=1.3502. q=ΔT/R_total = 40/1.3502 = 29.6 W/m²." }],
  },
]

export const MECH_FLUID_CHALLENGES = [
  {
    id: "fluid-001",
    title: "Bernoulli — Tank Drain Velocity",
    description: "Water drains from a tank through an outlet 4 m below the surface. Neglect losses. Find the exit velocity v and flow rate Q if pipe area A = 0.01 m².",
    question: "What are the exit velocity and volumetric flow rate?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Fluid Mechanics", difficulty: "intermediate", track: "pipe_flow",
    test_cases: [{ options: ["v = 8.86 m/s, Q = 88.6 L/s", "v = 6.26 m/s, Q = 62.6 L/s", "v = 4.43 m/s, Q = 44.3 L/s", "v = 8.86 m/s, Q = 44.3 L/s"], correct: 0,
      explanation: "v = √(2gh) = √(2×9.81×4) = √78.48 = 8.86 m/s. Q = v×A = 8.86×0.01 = 0.0886 m³/s = 88.6 L/s." }],
  },
  {
    id: "fluid-002",
    title: "Reynolds Number — Flow Regime",
    description: "Water (ρ = 1000 kg/m³, μ = 10⁻³ Pa·s) flows in a pipe D = 50 mm at V = 0.1 m/s. Calculate Re and identify the flow regime.",
    question: "What is the Reynolds number and flow regime?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Fluid Mechanics", difficulty: "beginner", track: "flow_regimes",
    test_cases: [{ options: ["Re = 5000, turbulent", "Re = 500, laminar", "Re = 2000, transitional", "Re = 50 000, turbulent"], correct: 0,
      explanation: "Re = ρVD/μ = 1000×0.1×0.05/0.001 = 5000. Re > 4000 → turbulent flow." }],
  },
  {
    id: "fluid-003",
    title: "Pump Shaft Power",
    description: "A pump delivers Q = 0.08 m³/s of water against head H = 15 m. Pump efficiency η = 75%, ρ = 1000 kg/m³. Find the required shaft power P_shaft.",
    question: "What shaft power is required for this pump?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Fluid Mechanics", difficulty: "intermediate", track: "pumps",
    test_cases: [{ options: ["15.7 kW", "11.8 kW", "78.5 kW", "7.85 kW"], correct: 0,
      explanation: "P_hyd = ρgQH = 1000×9.81×0.08×15 = 11 772 W. P_shaft = P_hyd / η = 11 772 / 0.75 = 15 696 W ≈ 15.7 kW." }],
  },
  {
    id: "fluid-004",
    title: "Pipe Head Loss — Darcy–Weisbach",
    description: "Water (ρ = 1000 kg/m³) flows in a 100 mm diameter pipe at V = 3 m/s. Pipe length L = 200 m, Darcy friction factor f = 0.02. Find head loss hf.",
    question: "What is the friction head loss along this pipe?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Fluid Mechanics", difficulty: "intermediate", track: "pipe_losses",
    test_cases: [{ options: ["18.35 m", "9.17 m", "36.7 m", "4.59 m"], correct: 0,
      explanation: "hf = fLV²/(D×2g) = 0.02×200×9/(0.1×19.62) = 36/1.962 = 18.35 m." }],
  },
]

export const MECH_DESIGN_CHALLENGES = [
  {
    id: "design-001",
    title: "Factor of Safety — Tensile Member",
    description: "A steel bar: Sut = 500 MPa, axial load P = 50 kN, cross-section A = 200 mm². Find the working stress and factor of safety.",
    question: "What is the factor of safety for this tensile member?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Machine Design", difficulty: "beginner", track: "failure_theories",
    test_cases: [{ options: ["FOS = 2.0", "FOS = 1.0", "FOS = 4.0", "FOS = 0.5"], correct: 0,
      explanation: "σ = P/A = 50 000 / (200×10⁻⁶) = 250 MPa. FOS = Sut / σ = 500/250 = 2.0." }],
  },
  {
    id: "design-002",
    title: "Shaft Shear Stress — Torque Transmission",
    description: "A solid shaft D = 40 mm transmits torque T = 500 N·m. Find the maximum shear stress τ_max using τ = 16T/(πD³).",
    question: "What is the maximum shear stress in this shaft?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Machine Design", difficulty: "intermediate", track: "shafts",
    test_cases: [{ options: ["39.8 MPa", "19.9 MPa", "79.6 MPa", "99.4 MPa"], correct: 0,
      explanation: "τ = 16T/(πD³) = 16×500 / (π×(0.04)³) = 8000 / (π×6.4×10⁻⁵) = 8000 / 2.011×10⁻⁴ = 39.8 MPa." }],
  },
  {
    id: "design-003",
    title: "Helical Spring Deflection",
    description: "Helical spring: wire diameter d = 5 mm, coil diameter D = 40 mm, n = 10 active coils, G = 80 GPa. Load W = 200 N. Find deflection δ.",
    question: "What is the deflection of this helical spring?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Machine Design", difficulty: "intermediate", track: "springs",
    test_cases: [{ options: ["51.2 mm", "25.6 mm", "102.4 mm", "12.8 mm"], correct: 0,
      explanation: "k = Gd⁴/(8D³n) = 80×10⁹×(5e-3)⁴/(8×(40e-3)³×10) = 80×10⁹×6.25×10⁻¹⁰ / 5.12×10⁻³ = 50/5.12×10⁻³ = 3906 N/m. δ = W/k = 200/3906 = 51.2 mm." }],
  },
  {
    id: "design-004",
    title: "Bolt Preload",
    description: "A M20 bolt: tensile stress area As = 245 mm², proof strength Sp = 600 MPa. The bolt is tightened to 75% of proof load. Find preload Fi.",
    question: "What is the bolt preload?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Machine Design", difficulty: "intermediate", track: "fasteners",
    test_cases: [{ options: ["110.25 kN", "147 kN", "73.5 kN", "88.2 kN"], correct: 0,
      explanation: "Fp = Sp × As = 600 × 245×10⁻⁶ = 147 kN. Fi = 0.75 × 147 = 110.25 kN." }],
  },
]

export const MECH_MFG_CHALLENGES = [
  {
    id: "mfg-001",
    title: "Turning — Cutting Speed and MRR",
    description: "Turning: workpiece D = 80 mm, N = 400 rpm, depth of cut d = 2 mm, feed f = 0.25 mm/rev. Find cutting speed V and MRR.",
    question: "What are the cutting speed and material removal rate?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Manufacturing Engineering", difficulty: "intermediate", track: "machining",
    test_cases: [{ options: ["V = 100.5 m/min, MRR = 838 mm³/s", "V = 50.3 m/min, MRR = 419 mm³/s", "V = 201 m/min, MRR = 1676 mm³/s", "V = 100.5 m/min, MRR = 1676 mm³/s"], correct: 0,
      explanation: "V = πDN/1000 = π×80×400/1000 = 100.5 m/min. MRR = π×D×d×f×N = π×80×2×0.25×400 = 50 265 mm³/min = 838 mm³/s." }],
  },
  {
    id: "mfg-002",
    title: "Forging — True vs Engineering Strain",
    description: "A billet compressed from h0 = 100 mm to h1 = 60 mm. Find the engineering strain ε_eng and true (logarithmic) strain ε_true.",
    question: "What are the engineering and true strains after compression?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Manufacturing Engineering", difficulty: "beginner", track: "forming",
    test_cases: [{ options: ["ε_eng = 0.40, ε_true = 0.511", "ε_eng = 0.511, ε_true = 0.40", "ε_eng = 0.40, ε_true = 0.667", "ε_eng = 0.60, ε_true = 0.511"], correct: 0,
      explanation: "ε_eng = (h0−h1)/h0 = 40/100 = 0.40. ε_true = ln(h0/h1) = ln(100/60) = ln(1.667) = 0.511." }],
  },
  {
    id: "mfg-003",
    title: "GMAW Welding — Heat Input",
    description: "GMAW: voltage V = 25 V, current I = 200 A, travel speed = 5 mm/s. Find heat input H per unit length (J/mm).",
    question: "What is the heat input per unit length for this weld pass?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Manufacturing Engineering", difficulty: "beginner", track: "welding",
    test_cases: [{ options: ["1000 J/mm", "500 J/mm", "2000 J/mm", "200 J/mm"], correct: 0,
      explanation: "H = (V × I) / speed = (25 × 200) / 5 = 5000 / 5 = 1000 J/mm." }],
  },
  {
    id: "mfg-004",
    title: "Sheet Metal Bending — Bend Allowance",
    description: "Sheet t = 2 mm, inside bend radius R = 4 mm, bend angle α = 90°, K-factor = 0.5. Find the bend allowance BA = (π/180) × α × (R + K×t).",
    question: "What is the bend allowance for this 90° bend?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "Manufacturing Engineering", difficulty: "intermediate", track: "sheet_metal",
    test_cases: [{ options: ["7.85 mm", "6.28 mm", "9.42 mm", "5.50 mm"], correct: 0,
      explanation: "BA = (π/2) × (R + K×t) = (π/2) × (4 + 0.5×2) = (π/2) × 5 = 7.854 mm ≈ 7.85 mm." }],
  },
]

export const MECH_HVAC_CHALLENGES = [
  {
    id: "hvac-001",
    title: "Sensible Cooling Load Summation",
    description: "Office heat gains: solar 2000 W, occupants 500 W, equipment 1500 W, lights 800 W, walls/roof 1200 W. Find the total sensible cooling load.",
    question: "What is the total sensible cooling load?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "HVAC Engineering", difficulty: "beginner", track: "load_calc",
    test_cases: [{ options: ["6000 W", "4500 W", "7200 W", "3000 W"], correct: 0,
      explanation: "Q = 2000 + 500 + 1500 + 800 + 1200 = 6000 W = 6 kW." }],
  },
  {
    id: "hvac-002",
    title: "Psychrometrics — Partial Pressure of Vapour",
    description: "Air at 30°C, φ = 60% RH. Saturation pressure Psat(30°C) = 4.246 kPa. Find the partial vapour pressure Pv and dew point (Psat at T_dp = Pv).",
    question: "What is the partial vapour pressure and approximate dew point?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "HVAC Engineering", difficulty: "intermediate", track: "psychrometrics",
    test_cases: [{ options: ["Pv = 2.548 kPa, T_dp ≈ 21.4°C", "Pv = 4.246 kPa, T_dp = 30°C", "Pv = 1.274 kPa, T_dp ≈ 11°C", "Pv = 3.180 kPa, T_dp ≈ 25°C"], correct: 0,
      explanation: "Pv = φ × Psat = 0.60 × 4.246 = 2.548 kPa. T_dp is the temperature at which Psat = 2.548 kPa ≈ 21.4°C." }],
  },
  {
    id: "hvac-003",
    title: "Vapour Compression — COP and Heat Rejection",
    description: "A refrigerator: compressor work W = 1.5 kW, refrigerating effect QE = 5 kW. Find the COP and condenser heat rejection QC.",
    question: "What are the COP and condenser heat rejection?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "HVAC Engineering", difficulty: "beginner", track: "refrigeration",
    test_cases: [{ options: ["COP = 3.33, QC = 6.5 kW", "COP = 4.33, QC = 5.0 kW", "COP = 2.50, QC = 6.5 kW", "COP = 3.33, QC = 5.0 kW"], correct: 0,
      explanation: "COP = QE / W = 5 / 1.5 = 3.33. QC = QE + W = 5 + 1.5 = 6.5 kW." }],
  },
  {
    id: "hvac-004",
    title: "Duct Sizing — Required Cross-Section",
    description: "A duct carries Q = 1.2 m³/s at design velocity V = 6 m/s. Find the required area A and equivalent square duct side length.",
    question: "What is the required duct area and square duct side?",
    missionType: "engineering_lab", workstation: "engineering_lab",
    category: "HVAC Engineering", difficulty: "beginner", track: "duct_design",
    test_cases: [{ options: ["A = 0.2 m², side = 447 mm", "A = 0.1 m², side = 316 mm", "A = 0.4 m², side = 632 mm", "A = 0.2 m², side = 200 mm"], correct: 0,
      explanation: "A = Q/V = 1.2/6 = 0.2 m². side = √A = √0.2 = 0.4472 m = 447 mm." }],
  },
]


// ─────────────────────────────────────────────────────────────────────────────
// MASTER EXPORT — map domain key → challenges array
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ECE INTERACTIVE CIRCUIT CHALLENGES (Task #29)
// Students wire components on a live canvas; MNA solver validates in real-time.
// missionType: "interactive_circuit"  →  InteractiveCircuitWorkstation
// ─────────────────────────────────────────────────────────────────────────────

export const ECE_INTERACTIVE_CHALLENGES = [
  {
    id: "ece_ic_001",
    title: "Voltage Divider",
    description: "A 9 V source is connected in series with R1 (10 kΩ) and R2 (10 kΩ). Complete the circuit by drawing wires between the open ports. Then verify that the mid-point voltage (between R1 and R2) is 4.5 V.",
    difficulty: "Easy",
    points: 100,
    missionType: "interactive_circuit",
    simulation: {
      circuit: {
        components: [
          { id: "V1", type: "voltage_source", value: 9,     col: 2,  row: 1, editable: false },
          { id: "R1", type: "resistor",       value: 10000, col: 4,  row: 1, editable: false },
          { id: "R2", type: "resistor",       value: 10000, col: 7,  row: 1, editable: false },
          { id: "G1", type: "ground",         col: 2,  row: 3 },
        ],
        // Pre-drawn locked wires: GND rail and V1- connection
        wires: [
          { id: "lw1", locked: true, points: [{ col:2, row:3 }, { col:10, row:3 }] },
          { id: "lw2", locked: true, points: [{ col:2, row:3 }, { col:2,  row:3 }] },
          { id: "lw3", locked: true, points: [{ col:9, row:1 }, { col:9,  row:3 }] },
        ],
        // Student must draw:
        //   V1+ (col2,row1) → R1a (col4,row1)
        //   R1b (col6,row1) → R2a (col7,row1)
        target: {
          type: "voltage_at_port",
          compId: "R2",
          portId: "a",
          value: 4.5,
          tolerance: 0.05,
          unit: "V",
        },
      },
    },
    hints: ["Connect the positive terminal of V1 to the left port of R1", "Connect the right port of R1 to the left port of R2"],
    test_cases: [],
  },
  {
    id: "ece_ic_002",
    title: "Ohm's Law Verification",
    description: "Given a 12 V source and a single 4 kΩ resistor, complete the circuit. Verify that the current through the resistor is 3 mA (measured as voltage across the resistor = 12 V).",
    difficulty: "Easy",
    points: 80,
    missionType: "interactive_circuit",
    simulation: {
      circuit: {
        components: [
          { id: "V1", type: "voltage_source", value: 12,   col: 2, row: 1, editable: false },
          { id: "R1", type: "resistor",       value: 4000, col: 5, row: 1, editable: false },
          { id: "G1", type: "ground",         col: 2, row: 3 },
        ],
        wires: [
          { id: "lw1", locked: true, points: [{ col:2, row:3 }, { col:7, row:3 }] },
          { id: "lw2", locked: true, points: [{ col:7, row:1 }, { col:7, row:3 }] },
        ],
        // Student draws: V1+ (col2,row1) → R1a (col5,row1)
        target: {
          type: "voltage_at_port",
          compId: "R1",
          portId: "a",
          value: 12,
          tolerance: 0.05,
          unit: "V",
        },
      },
    },
    hints: ["Connect the positive terminal of V1 to the left port of R1"],
    test_cases: [],
  },
  {
    id: "ece_ic_003",
    title: "Series Resistors — Total Resistance",
    description: "Three resistors R1 (1 kΩ), R2 (2 kΩ), R3 (3 kΩ) are available. Connect them all in series with the 6 V source. Verify that the voltage at the junction of R2 and R3 is 2 V (i.e. 1/3 of supply — only R3 is below that node).",
    difficulty: "Medium",
    points: 150,
    missionType: "interactive_circuit",
    simulation: {
      circuit: {
        components: [
          { id: "V1", type: "voltage_source", value: 6,    col: 1,  row: 2, editable: false },
          { id: "R1", type: "resistor",       value: 1000, col: 3,  row: 2, editable: false },
          { id: "R2", type: "resistor",       value: 2000, col: 6,  row: 2, editable: false },
          { id: "R3", type: "resistor",       value: 3000, col: 9,  row: 2, editable: false },
          { id: "G1", type: "ground",         col: 1,  row: 4 },
        ],
        wires: [
          // GND rail
          { id: "lw1", locked: true, points: [{ col:1, row:4 }, { col:11, row:4 }] },
          // R3 right → GND
          { id: "lw2", locked: true, points: [{ col:11, row:2 }, { col:11, row:4 }] },
          // V1- → GND
          { id: "lw3", locked: true, points: [{ col:1,  row:4 }, { col:1,  row:4 }] },
        ],
        // Student draws:
        //   V1+(1,2)→R1a(3,2), R1b(5,2)→R2a(6,2), R2b(8,2)→R3a(9,2)
        target: {
          type: "voltage_at_port",
          compId: "R3",
          portId: "a",
          value: 2,
          tolerance: 0.05,
          unit: "V",
        },
      },
    },
    hints: [
      "Total resistance = 1+2+3 = 6 kΩ, so I = 1 mA",
      "V(R3.a) = I × R3 = 1mA × 2kΩ... wait, think about which resistors are below the node",
    ],
    test_cases: [],
  },
]

export const DOMAIN_CHALLENGES = {
  data:      DATA_ANALYST_CHALLENGES,
  bi_analyst:DATA_ANALYST_CHALLENGES,
  frontend:  FRONTEND_CHALLENGES,
  backend:   BACKEND_CHALLENGES,
  fullstack: [...BACKEND_CHALLENGES, ...FRONTEND_CHALLENGES],
  swe:       SWE_CHALLENGES,
  devops:    DEVOPS_CHALLENGES,
  aws:       DEVOPS_CHALLENGES,
  azure:     DEVOPS_CHALLENGES,
  sre:       DEVOPS_CHALLENGES,
  dba:       DBA_CHALLENGES,
  data_engineer: DBA_CHALLENGES,
  cyber:     CYBER_CHALLENGES,
  soc:       CYBER_CHALLENGES,
  // ECE sub-roles — route to role-specific challenge pool
  ece:          [...ECE_INTERACTIVE_CHALLENGES, ...ECE_CIRCUIT_CHALLENGES, ...ECE_CHALLENGES],   // interactive circuit first
  ece_interactive: ECE_INTERACTIVE_CHALLENGES,
  ece_embedded: [...ECE_CHALLENGES, ...ECE_CIRCUIT_CHALLENGES],   // embedded / firmware engineers
  ece_vlsi:     ECE_VLSI_CHALLENGES,     // VLSI / ASIC / digital design engineers
  ece_rf:       ECE_RF_CHALLENGES,       // RF / antenna / microwave engineers
  ece_iot:      ECE_IOT_CHALLENGES,      // IoT / connected-device engineers
  ece_telecom:  ECE_TELECOM_CHALLENGES,  // telecom / wireless / 5G engineers
  // EEE sub-roles
  eee:                 [...EEE_CHALLENGES, ...EEE_POWER_CHALLENGES],
  eee_power:           EEE_POWER_CHALLENGES,
  eee_machines:        EEE_MACHINES_CHALLENGES,
  eee_control:         EEE_CONTROL_CHALLENGES,
  eee_pe:              EEE_PE_CHALLENGES,
  eee_instrumentation: EEE_INST_CHALLENGES,
  // Civil sub-roles
  civil:               [...CIVIL_CHALLENGES, ...CIVIL_STRUCTURAL_CHALLENGES],
  civil_structural:    CIVIL_STRUCTURAL_CHALLENGES,
  civil_geotechnical:  CIVIL_GEO_CHALLENGES,
  civil_transportation:CIVIL_TRANS_CHALLENGES,
  civil_water:         CIVIL_WATER_CHALLENGES,
  civil_construction:  CIVIL_CONST_CHALLENGES,
  // Mechanical sub-roles
  mech:                [...MECH_CHALLENGES, ...MECH_DESIGN_CHALLENGES],
  mech_thermal:        MECH_THERMAL_CHALLENGES,
  mech_fluid:          MECH_FLUID_CHALLENGES,
  mech_design:         MECH_DESIGN_CHALLENGES,
  mech_manufacturing:  MECH_MFG_CHALLENGES,
  mech_hvac:           MECH_HVAC_CHALLENGES,
  // Medical and QA still use generic SWE challenges as placeholders
  medical:   SWE_CHALLENGES,
  qa:        SWE_CHALLENGES,
  ba_product:DATA_ANALYST_CHALLENGES,
}

/**
 * Get challenges for a specific domain.
 * Returns the domain's challenges, or SWE challenges as fallback.
 */
export function getDomainChallenges(domainKey) {
  return DOMAIN_CHALLENGES[domainKey] || SWE_CHALLENGES
}

/**
 * Get unique categories for a domain's challenges.
 */
export function getDomainCategories(domainKey) {
  const challenges = getDomainChallenges(domainKey)
  const seen = new Set()
  return challenges
    .map(c => ({ category: c.category, icon: c.icon }))
    .filter(c => { if (seen.has(c.category)) return false; seen.add(c.category); return true })
}
