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
    workstation: "code",
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
    workstation: "code",
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
    workstation: "code",
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
    workstation: "code",
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
    workstation: "code",
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
    workstation: "code",
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
    workstation: "code",
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
    workstation: "code",
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
// MASTER EXPORT — map domain key → challenges array
// ─────────────────────────────────────────────────────────────────────────────
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
  ece:       ECE_CHALLENGES,
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
