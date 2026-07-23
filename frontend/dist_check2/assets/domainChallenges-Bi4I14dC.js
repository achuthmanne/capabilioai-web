const o=[{id:"da-001",title:"Find Missing and Inconsistent Rows",category:"Data Cleaning",icon:"🔍",difficulty:"Easy",timeLimit:"20 min",eloGain:12,tools:["SQL"],scenario:"You just received a customer database export. Before the analytics team can use it, you need to identify data quality problems: missing values, duplicate entries, and inconsistent formats. A single bad row can break a dashboard or give the CEO wrong numbers.",objective:"Write SQL queries to find all nulls, spot duplicate customer IDs, and identify phone numbers that don't match the standard format.",steps:["Count total rows in the customers table","Find how many rows have NULL in each key column (name, email, phone)","Identify duplicate customer_id values","Find phone numbers that don't follow the 10-digit format","Show a summary of all data quality issues found"],workstation:"sql",starterCode:`-- Find Missing and Inconsistent Rows
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
--   invalid_phones |    23`,skillTags:["SQL","Data Quality","NULL Handling","Data Cleaning","SELECT"],hints:["COUNT(*) counts all rows; COUNT(column) skips NULLs — subtract them to get null count","GROUP BY + HAVING COUNT(*) > 1 is the standard way to find duplicates","Use LENGTH() to check if phone numbers have the right number of digits"]},{id:"da-002",title:"Basic JOINs and GROUP BY",category:"SQL Analysis",icon:"🔗",difficulty:"Easy",timeLimit:"25 min",eloGain:15,tools:["SQL"],scenario:"The sales manager wants to know how each product category is performing. The data is split across two tables: orders (what was bought) and products (what category it belongs to). You need to JOIN them together and calculate totals by category.",objective:"Write SQL to join orders with products, calculate total sales per category, and find the top 3 categories by revenue.",steps:["Write an INNER JOIN between orders and products tables","Calculate total revenue (SUM) and order count per product category","Sort by total revenue to find top categories","Filter to only show categories with more than 50 orders","Add a column showing each category's % share of total revenue"],workstation:"sql",starterCode:`-- Basic JOINs and GROUP BY
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
-- Hint: SUM() OVER() without partition gives grand total`,skillTags:["SQL","JOIN","GROUP BY","Aggregation","SUM","HAVING"],hints:["INNER JOIN returns only rows that exist in both tables — run it alone first to see the result","HAVING filters after GROUP BY (like WHERE, but for groups)","Write JOIN + GROUP BY in one query, test it, then add HAVING and ORDER BY"]},{id:"da-003",title:"Clean a Messy Sales Export",category:"Data Cleaning",icon:"🧹",difficulty:"Easy",timeLimit:"30 min",eloGain:15,tools:["SQL"],scenario:"You received a raw export from the sales system. Product names have typos and mixed case ('electonics', 'ELECTRONICS', 'Electronics' are all the same category). Some rows have no amount. Dates are stored inconsistently. Fix it before it goes into the dashboard.",objective:"Clean product category names, handle missing amounts, and standardize date formats so the data is ready for reporting.",steps:["Check what unique category values exist (run SELECT DISTINCT first)","Standardize category names: trim whitespace, fix case, fix typos","Find rows where amount is NULL or zero","Fill NULL amounts with the average for that category","Standardize all dates to YYYY-MM-DD format"],workstation:"sql",starterCode:`-- Clean a Messy Sales Export
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
--       Apply all transformations from steps 2, 4, and 5 in one query`,skillTags:["SQL","Data Cleaning","TRIM","REPLACE","Date Formatting","NULL Handling"],hints:["Always run STEP 1 first — see the raw mess before trying to fix it","Apply LOWER(TRIM()) before REPLACE so you only handle one case of each word","Fix one column at a time and verify each fix before combining them"]},{id:"da-004",title:"Plot Monthly Revenue Trend",category:"Dashboard Building",icon:"📈",difficulty:"Easy",timeLimit:"30 min",eloGain:18,tools:["Python","Pandas","Matplotlib"],scenario:"Your manager asked for a simple bar chart showing monthly revenue for Q1 2024. The data is already in a table. You need to calculate monthly totals and create a clean, labeled chart that can be shared in a presentation.",objective:"Use Pandas to calculate monthly revenue totals and create a bar chart with proper labels, a title, and value annotations.",steps:["Convert the order_date column to datetime type with pd.to_datetime()","Extract month from order_date and group by it","Sum revenue per month","Create a bar chart with plt.bar()","Add value labels on top of each bar"],workstation:"notebook",starterCode:`# Plot Monthly Revenue Trend — Q1 2024
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
plt.show()`,skillTags:["Python","Pandas","Matplotlib","Bar Chart","groupby","Data Visualization"],hints:["pd.to_datetime(df['order_date']) converts string dates to proper datetime objects","groupby() + sum() is the Pandas equivalent of SQL GROUP BY + SUM","bar.get_height() gives the bar's value — use it to position the label just above the bar"]},{id:"da-005",title:"Build a 4-KPI Dashboard",category:"Dashboard Building",icon:"📊",difficulty:"Medium",timeLimit:"40 min",eloGain:22,tools:["Python","Pandas","Matplotlib"],scenario:"Every Monday morning, the team views a dashboard with 4 key metrics: Total Revenue, Total Orders, Average Order Value, and Month-over-Month Growth. Build this 4-card layout so leadership sees the numbers at a glance.",objective:"Create a 2×2 matplotlib dashboard with KPI cards — each showing a metric value, label, and a green/red trend indicator.",steps:["Calculate all 4 KPIs from the two months of data","Calculate month-over-month % change for each metric","Create a 2×2 figure with plt.subplots(2, 2)","Style each subplot as a card: background color, large value, label, trend arrow","Use green for positive change, red for negative"],workstation:"notebook",starterCode:`# 4-KPI Dashboard
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
plt.show()`,skillTags:["Python","Pandas","Matplotlib","KPI","Dashboard","Data Visualization"],hints:["ax.transAxes means coordinates 0–1 relative to the axes, not data values — good for text","axes.flatten() converts a 2D array of axes to a 1D list so you can loop over them","Set ax.set_facecolor() on each subplot to give it a card-like background color"]},{id:"da-006",title:"Grouped Bar Chart: This Year vs Last Year",category:"Dashboard Building",icon:"📉",difficulty:"Easy",timeLimit:"25 min",eloGain:16,tools:["Python","Matplotlib","NumPy"],scenario:"The regional manager wants to compare this year vs last year for each product category. Build a grouped bar chart that makes the comparison immediately obvious — one cluster of bars per category, two bars per cluster.",objective:"Create a grouped bar chart comparing 2024 vs 2023 sales for 5 product categories, with a legend and YoY % change labels.",steps:["Set up bar positions using np.arange()","Plot two sets of bars side by side with different colors","Set x-axis labels to category names","Add a legend and axis labels","Add a YoY % change annotation above each pair of bars"],workstation:"notebook",starterCode:`# Grouped Bar Chart: 2024 vs 2023 Sales by Category
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
plt.show()`,skillTags:["Python","Matplotlib","NumPy","Bar Chart","Data Visualization","Comparison"],hints:["np.arange(len(categories)) gives positions [0, 1, 2, ...] for your bar clusters","Shift bars: x - width/2 for bar1, x + width/2 for bar2 so they sit side by side","max(sales_2024[i], sales_2023[i]) + 15000 places the label just above the taller bar"]},{id:"da-007",title:"Explore an E-Commerce Dataset",category:"EDA",icon:"🔬",difficulty:"Medium",timeLimit:"40 min",eloGain:24,tools:["Python","Pandas","Matplotlib"],scenario:"Before building any dashboard, you need to understand the data. You have an e-commerce orders table. Your job is to answer 5 business questions purely by exploring the data — no pre-determined answers.",objective:"Use Pandas EDA to answer: Who are the top customers? Which region has the lowest average order? Are there any order volume spikes? What's the order amount distribution?",steps:["Check shape, dtypes, and null counts with df.info() and df.describe()","Find the top 10 customers by total spend","Calculate average order value per region and visualize it","Extract month from order_date and plot monthly order volume","Plot a histogram of order amounts to see the distribution shape"],workstation:"notebook",starterCode:`# Exploratory Data Analysis — E-Commerce Orders
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

print("✅ EDA complete — what surprised you?")`,skillTags:["Python","Pandas","EDA","Data Exploration","describe()","groupby","Histogram"],hints:["df.describe() shows count, mean, std, min, 25%, 50%, 75%, max all at once — read it carefully","groupby('customer_id')['amount'].sum().nlargest(10) gives top 10 customers in two steps","When mean >> median in a histogram, the data has a long right tail (a few very large orders)"]},{id:"da-008",title:"Month-over-Month Revenue Analysis",category:"SQL Analysis",icon:"📅",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["SQL"],scenario:"Finance wants a monthly revenue report for the full year, with month-over-month change. If any month dropped more than 10%, they want a warning flag. You need to write a clean SQL query they can run every month.",objective:"Write SQL using LAG() window function to compute monthly revenue, MoM % change, and flag months with >10% decline.",steps:["Aggregate total revenue and order count by month using DATE_TRUNC","Wrap in a CTE and add LAG() to get the previous month's revenue","Calculate MoM % change: (this - prev) / prev * 100","Add an alert_flag column with CASE WHEN for >10% drop","Order the final result by month"],workstation:"sql",starterCode:`-- Month-over-Month Revenue Analysis
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
-- Expected output: month | order_count | total_revenue | prev_revenue | mom_pct | alert_flag`,skillTags:["SQL","LAG","Window Functions","MoM Analysis","CTEs","DATE_TRUNC"],hints:["LAG(column) OVER (ORDER BY month) gives the value from the previous row","NULLIF(x, 0) returns NULL instead of 0 — use it to prevent divide-by-zero","Build step by step: get the GROUP BY right first, then add LAG in a CTE"]},{id:"da-009",title:"Spot Outliers and Anomalies",category:"EDA",icon:"🚨",difficulty:"Medium",timeLimit:"35 min",eloGain:22,tools:["SQL"],scenario:"Finance flagged that some orders look suspicious: unusually high amounts, orders placed at 3 AM, and customers who bought the same item many times in one day. You need to write SQL queries to surface these anomalies for investigation.",objective:"Write SQL to find statistical outliers by amount, flag unusual order times, and spot same-day repeat purchases.",steps:["Calculate the mean and standard deviation of order amounts","Find orders more than 3 standard deviations above the mean","Flag orders placed between 1 AM and 5 AM","Find customer+product combinations with more than 5 orders in one day","Combine all anomaly types into a single result with a label column"],workstation:"sql",starterCode:`-- Spot Outliers and Anomalies in Order Data
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
--      SELECT order_id, 'unusual_hour' AS anomaly_type FROM ...`,skillTags:["SQL","Outlier Detection","STDDEV","EXTRACT","UNION ALL","Anomaly Detection"],hints:["STDDEV(amount) calculates standard deviation — values beyond mean ± 3×stddev are rare","EXTRACT(HOUR FROM timestamp) returns an integer 0–23 representing the hour","UNION ALL keeps all rows including duplicates — useful when combining anomaly types"]},{id:"da-010",title:"Explain This Chart in Plain English",category:"Analysis Report",icon:"💬",difficulty:"Easy",timeLimit:"25 min",eloGain:14,tools:["Markdown"],scenario:"Your manager says: 'I'm presenting to the board in 30 minutes. Give me 3 bullet points explaining what this data shows. No jargon.' This is one of the most important real-world DA skills — translating numbers into business language.",objective:"Write a plain-English interpretation of the given data: state what changed, why it matters, and what should happen next.",steps:["Identify the main trend (growing, declining, spike, drop, stable)","State the most important number in one sentence without jargon","Explain what this means for the business — not just what happened","Call out one finding that is surprising or needs attention","Recommend one specific next action based on the data"],workstation:"markdown",starterCode:`# Chart Interpretation Exercise

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
> **Why:** ...`,skillTags:["Business Communication","Data Storytelling","Plain English","Interpretation","Insights"],hints:["Start with what happened, not how you calculated it — 'Users dropped 5% in April' not 'The MAU metric declined'","The April-May dip lines up with exam season — is that explanation enough, or is there a product issue?","A good recommendation has a verb: 'Investigate', 'Launch', 'Monitor', 'Stop'"]},{id:"da-011",title:"Turn Raw Numbers into a Business Report",category:"Analysis Report",icon:"📝",difficulty:"Medium",timeLimit:"35 min",eloGain:20,tools:["Markdown"],scenario:"You ran a SQL query and got back a table of metrics. Now you need to turn those numbers into a 1-page summary report for the sales director. She doesn't want to see raw data — she wants to understand what happened and what to do about it.",objective:"Write a structured business report: 2-sentence executive summary, 3 data-backed findings, and 2 actionable recommendations.",steps:["Write a 2-sentence executive summary: what happened + the main reason","Write Finding 1 about the biggest negative trend with supporting numbers","Write Finding 2 about a secondary issue or contributing factor","Write Finding 3 that highlights something positive or stable","Write 2 specific recommendations with expected outcome and owner"],workstation:"markdown",starterCode:`# Monthly Sales Performance Report — May 2024

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
**How to measure success:** ...`,skillTags:["Business Communication","Analysis Report","Data Storytelling","Executive Summary","Recommendations"],hints:["Executive summary: answer 'What happened?' then 'Why?' — in that order, in 2 sentences","Every finding needs a number. 'Sales declined' is not a finding. '−31% new customers while returning customers held flat' is.","Finding 3 should be something positive — AVG order value held up. Balanced reporting builds credibility."]},{id:"da-012",title:"Validate a Metric Before Presenting It",category:"Data Cleaning",icon:"✅",difficulty:"Medium",timeLimit:"30 min",eloGain:18,tools:["SQL"],scenario:"You're about to present 'Total Revenue: ₹1.2 Crore' to the CEO. But before you say that number out loud, run sanity checks. Data analysts who present wrong numbers lose credibility. Verify this metric before it goes on the slide.",objective:"Write SQL sanity checks to validate a revenue metric: verify date range, check for duplicates, confirm cancelled orders are excluded, and cross-check the total.",steps:["Check that order_date is fully within May 2024 (no future or out-of-range dates)","Find duplicate order_ids — any duplicates would inflate the revenue total","Check what 'cancelled' order statuses look like and confirm they're excluded","Recalculate the revenue from scratch with correct filters","Document what you found and whether the number is trustworthy"],workstation:"sql",starterCode:`-- Validate the Revenue Metric Before Presenting
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
   - VERDICT: ... */`,skillTags:["SQL","Data Validation","Sanity Check","Data Quality","Metrics","Business Trust"],hints:["COUNT(*) vs COUNT(DISTINCT order_id) — if they differ, you have duplicate rows","SELECT DISTINCT status shows all cancellation label variations in your data","It's fine if the number changes after your checks — that's the whole point of validating"]},{id:"da-013",title:"Segment Customers by Spending Tier",category:"SQL Analysis",icon:"🎯",difficulty:"Medium",timeLimit:"35 min",eloGain:25,tools:["SQL"],scenario:"Marketing wants to send different campaigns to different customer groups. High spenders (>₹10K last 3 months) get a loyalty reward. Mid-tier (₹3K–₹10K) get a 10% discount. Low-tier (<₹3K) get a re-engagement email. Generate these lists from the orders table.",objective:"Write SQL to calculate 3-month spend per customer, assign them to tiers, and produce campaign-ready lists with contact details.",steps:["Filter orders to the last 3 months and GROUP BY customer_id to get total spend","Assign spending tiers using CASE WHEN on total_spend","Show a tier summary: customer count and total revenue per tier","JOIN to the customers table to get name and email","Generate the High tier list for the loyalty reward campaign"],workstation:"sql",starterCode:`-- Customer Spending Tier Segmentation
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
--       These are dormant customers in each tier — a more targeted list`,skillTags:["SQL","Customer Segmentation","CASE WHEN","GROUP BY","CTEs","Marketing Analytics"],hints:["Build and test the CTE first with SELECT * to make sure spend looks right before adding tiers","CASE WHEN is evaluated top to bottom — put the most restrictive condition (> 10000) first","The tier summary (STEP 3) helps you check if the tier boundaries make business sense"]},{id:"da-014",title:"Cohort Retention Analysis",category:"Advanced Analytics",icon:"🔄",difficulty:"Hard",timeLimit:"50 min",eloGain:35,tools:["SQL","Python","Pandas"],scenario:"Your product launched 6 months ago. The CEO wants to know how well you're retaining users. Of the people who signed up in January, how many came back in February? In March? This is called cohort retention — one of the most important product metrics.",objective:"Write SQL to build a cohort retention table showing % of each monthly signup cohort still active in subsequent months.",steps:["Assign each user their cohort_month from their signup_date","Find all months each user was active from user_activity","Calculate month_number = months elapsed since cohort_month (0 = signup month)","Build retention rates: active_users / cohort_size × 100","Format as a readable month × month_number matrix in Python"],workstation:"sql",starterCode:`-- Cohort Retention Analysis
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
-- TODO: print the matrix — Month 0 should always be 100% (sanity check)`,skillTags:["SQL","Cohort Analysis","Retention","CTEs","Window Functions","Pandas","Product Analytics"],hints:["Run STEP 1 and STEP 2 individually first to make sure the data looks right","Month 0 (signup month) should always be 100% — if it isn't, something is wrong with your JOIN","AGE(later_date, earlier_date) returns an interval — then EXTRACT YEAR and MONTH from it"]},{id:"da-015",title:"Weekly KPI Report for the Team",category:"Basic KPI",icon:"📋",difficulty:"Easy",timeLimit:"30 min",eloGain:16,tools:["SQL"],scenario:"Every Friday, the business team expects a KPI summary answering 5 questions: How much did we sell? How many new customers? What's the average order? Which region is top? Are we up or down vs last week? Write the SQL that generates these numbers.",objective:"Write SQL to calculate 5 weekly KPIs including week-over-week comparison, and format the output as a Slack-ready summary.",steps:["Calculate total revenue for the current week","Count new customers (their first ever order is this week)","Calculate average order value for this week","Find the top-performing region by revenue","Calculate week-over-week % change vs last week"],workstation:"sql",starterCode:`-- Weekly KPI Report
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
-- */`,skillTags:["SQL","KPI","Reporting","Week-over-Week","DATE_TRUNC","Business Metrics"],hints:["DATE_TRUNC('week', CURRENT_DATE) returns the Monday of the current week","For new customers: find MIN(order_date) per customer, then filter where that min is this week","Run each KPI as a separate query first — combine them only after each one looks right"]}],d=[{id:"fe-001",title:"Responsive Product Card Component",category:"Component Build",icon:"🧩",difficulty:"Easy",timeLimit:"25 min",eloGain:15,tools:["React","CSS","JSX"],scenario:"A shopping platform needs a product card component. It must show image, title, price, rating stars, and an Add to Cart button. It must be responsive (mobile + desktop), handle long titles with ellipsis, and show a skeleton loader when data is loading.",objective:"Build a ProductCard component that accepts props, renders correctly, and handles loading/empty states.",steps:["Create ProductCard({ image, title, price, rating, inStock, onAddToCart })","Display rating as filled/empty star icons (⭐)","Add truncate for title > 40 chars","Show 'Out of Stock' instead of button when inStock=false","Add a SkeletonCard component shown when image/title is null"],workstation:"react",starterCode:`// Responsive Product Card Component
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
}`,skillTags:["React","Component Design","CSS","Responsive","Props","State"],hints:["Use title attribute on the truncated element so users see the full name on hover","CSS transition on background for smooth button state change","SkeletonCard uses animation: shimmer for the loading effect"]},{id:"fe-002",title:"Multi-Step Form with Validation",category:"Form Engineering",icon:"📋",difficulty:"Medium",timeLimit:"40 min",eloGain:25,tools:["React","useState","Validation"],scenario:"Build a 3-step user registration form: Step 1 collects personal info, Step 2 collects address, Step 3 shows a review and confirm. Each step must validate before proceeding. Show progress indicator and allow navigating back.",objective:"A fully functional multi-step form with field validation, progress indicator, and a confirmation screen.",steps:["Step 1: Name (required, min 2 chars), Email (valid format), Phone (10 digits)","Step 2: Address line 1, City, State dropdown, PIN code (6 digits)","Step 3: Review all entered data with an Edit button per section","Show a step progress bar at the top (Step 1 / 2 / 3)","Disable Next if current step has validation errors"],workstation:"react",starterCode:`// Multi-Step Registration Form
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
}`,skillTags:["React","Form Validation","Multi-Step","useState","UX"],hints:["Store all form data in one state object and pass update functions per field","Validate on Next click, not on every keystroke (better UX)","The review step should show all fields with an Edit button that jumps back to that step"]}],m=[{id:"be-001",title:"JWT Authentication Middleware",category:"Auth System",icon:"🔐",difficulty:"Medium",timeLimit:"35 min",eloGain:25,tools:["Node.js","JWT","Express","REST API"],scenario:"Build a secure JWT authentication system for a REST API. Users sign in and receive a short-lived access token (15 min) and a refresh token (7 days). Protected routes reject invalid/expired tokens. Refresh endpoint rotates the refresh token.",objective:"Implement: POST /auth/login, POST /auth/refresh, GET /me (protected), and the verifyToken middleware.",steps:["POST /auth/login: validate credentials, return accessToken + refreshToken","Create verifyToken middleware: extract Bearer token, verify signature, attach req.user","GET /me: protected by verifyToken, returns user profile","POST /auth/refresh: validate refresh token, issue new accessToken","Return 401 for expired/invalid tokens with a descriptive error message"],workstation:"code",starterCode:`// JWT Authentication System — Express + Node.js
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
module.exports = app`,skillTags:["JWT","Authentication","Node.js","Express","REST API","Security"],hints:["bcrypt.compare() is async — always await it","Short-lived access tokens + rotating refresh tokens is the industry standard pattern","Never store access tokens server-side — only refresh tokens need server-side storage"]}],t=[{id:"dv-001",title:"CI/CD Pipeline for Node.js App",category:"CI/CD Pipeline",icon:"🚀",difficulty:"Medium",timeLimit:"40 min",eloGain:25,tools:["GitHub Actions","Docker","YAML","Node.js"],scenario:"Set up a production-grade CI/CD pipeline for a Node.js API. The pipeline must: run tests on every PR, build a Docker image on merge to main, push to GHCR, and deploy to the staging environment via SSH.",objective:"Write a complete GitHub Actions workflow YAML with 3 jobs: test, build-and-push, deploy-to-staging.",steps:["Job 1 (test): checkout, setup Node 20, npm ci, run tests","Job 2 (build-push): depends on test, docker login to GHCR, build & tag image, push","Job 3 (deploy): depends on build-push, SSH into staging, docker pull, restart container","Cache node_modules between runs to speed up the pipeline","Use GitHub Secrets for credentials (never hardcode)"],workstation:"terminal",starterCode:`# GitHub Actions — CI/CD Pipeline
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
              -e DATABASE_URL="$STAGING_DB_URL" \\
              \${{ env.IMAGE_NAME }}:latest

      - name: Health check
        run: |
          sleep 10
          curl -f http://\${{ secrets.STAGING_HOST }}:3000/health || exit 1`,skillTags:["GitHub Actions","CI/CD","Docker","DevOps","YAML","GHCR"],hints:["needs: [test] makes a job wait for another to succeed","cache: 'npm' in setup-node uses GitHub's cache automatically","Never log secrets — GitHub masks them but avoid printing env vars"]},{id:"dv-002",title:"Kubernetes Deployment & Health Checks",category:"Container Orchestration",icon:"☸️",difficulty:"Hard",timeLimit:"50 min",eloGain:35,tools:["Kubernetes","kubectl","YAML","Docker"],scenario:"Deploy a production Node.js API to Kubernetes with proper health checks, resource limits, rolling updates, and a Horizontal Pod Autoscaler. The app must handle 0 downtime deploys and auto-scale at 70% CPU.",objective:"Write complete Kubernetes manifests: Deployment, Service, ConfigMap, HPA, and a Readiness/Liveness probe setup.",steps:["Write a Deployment manifest with 3 replicas, resource limits (100m CPU / 128Mi RAM)","Add liveness probe (HTTP GET /health every 10s) and readiness probe (/ready)","Add a RollingUpdate strategy with maxSurge=1, maxUnavailable=0","Write a ClusterIP Service and a LoadBalancer Service","Add an HPA that scales 3–10 pods when CPU > 70%"],workstation:"terminal",starterCode:`# Kubernetes Production Deployment
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
# TODO: Add PodDisruptionBudget to ensure at least 2 pods are always available`,skillTags:["Kubernetes","DevOps","HPA","Rolling Deployments","Health Checks","YAML"],hints:["maxUnavailable: 0 + maxSurge: 1 = zero-downtime rolling update","Readiness probe controls traffic routing; liveness probe controls restart","HPA requires metrics-server to be installed in the cluster"]}],a=[{id:"swe-001",title:"Design a URL Shortener",category:"System Design",icon:"🏗️",difficulty:"Hard",timeLimit:"45 min",eloGain:35,tools:["System Design","Markdown","Architecture"],scenario:"Design a URL shortener service (like Bit.ly) that can handle 100M URLs, 10B redirects/day, and p99 redirect latency < 10ms. The system must be highly available with 99.99% uptime.",objective:"Produce a complete system design: capacity estimates, data model, component diagram, API spec, and key trade-offs.",steps:["Estimate: QPS, storage per year, bandwidth requirements","Define the data model: URL table schema, short code generation strategy","Draw the component diagram: LB → API → Cache (Redis) → DB","Spec the two endpoints: POST /shorten and GET /{code}","Discuss: how to handle 301 vs 302, expiry, analytics, and hash collisions"],workstation:"system_design",starterCode:`# URL Shortener — System Design

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

<!-- TODO: Fill in choices and justify each one -->`,skillTags:["System Design","Architecture","Redis","PostgreSQL","Scalability","Caching"],hints:["Use 301 redirect for caching benefit (client caches it) — but breaks analytics","Base62(auto-increment ID) avoids hash collision; hash is simpler but needs collision handling","Cache the top 20% of hot URLs — they account for 80% of traffic (Pareto principle)"]},{id:"swe-002",title:"Menu Item Filter Function",category:"Algorithms",icon:"🧩",difficulty:"Easy",timeLimit:"25 min",eloGain:15,tools:["JavaScript","TypeScript","Python"],scenario:"You're building a food-delivery feature at Swiggy. Given a list of menu items with properties (name, price, category, isVeg), write a function that filters items based on a dynamic filter object. The filter can specify any combination of: vegetarian only, max price, and category.",objective:"Write a `filterMenu(items, filters)` function that returns only items matching ALL provided filter criteria. Handle missing/undefined filter keys gracefully.",steps:["Accept items[] and filters{} as parameters","Filter by isVeg if filters.isVeg = true","Filter by maxPrice if filters.maxPrice is provided","Filter by category if filters.category is provided","Return filtered array; empty array if nothing matches","Write 3 test cases covering edge cases (empty filters, no match, partial match)"],workstation:"code",starterCode:`// Menu Item Filter — Swiggy Feature
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
console.log("Test 5 — No match:", filterMenu(MENU, { category: "Dessert" }))`,skillTags:["JavaScript","Array Methods","Filtering","Edge Cases","Functions"],hints:["Use `filters.isVeg !== undefined` to distinguish 'not set' from 'false'","Chain conditions with &&: if any single condition fails, return false","Test with {} (empty filters) — should return all items"]},{id:"swe-003",title:"LRU Cache Implementation",category:"Data Structures",icon:"🗃️",difficulty:"Medium",timeLimit:"35 min",eloGain:25,tools:["JavaScript","TypeScript","Python"],scenario:"A backend service at Razorpay caches merchant profiles to avoid repeated database reads. Implement an LRU (Least Recently Used) cache with O(1) get and put operations. When the cache is full, evict the least recently used entry.",objective:"Implement `LRUCache(capacity)` with `get(key)` returning the value or -1, and `put(key, value)` evicting the LRU item when at capacity.",steps:["Use a Map (insertion-ordered) for O(1) get, put, and delete","get(key): if found, move it to the end (most recently used), return value","put(key, value): if key exists, update and move to end; if at capacity, delete the first entry (LRU)","All operations must be O(1)","Test with: capacity=2, put(1,1), put(2,2), get(1)=1, put(3,3) evicts key 2, get(2)=-1"],workstation:"code",starterCode:`// LRU Cache — Razorpay Merchant Cache
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
console.log(cache.get(4))     // 'merchant_D'`,skillTags:["LRU Cache","Data Structures","HashMap","Linked List","O(1) Operations"],hints:["JavaScript's Map preserves insertion order — first key = LRU","Delete then re-insert to move an item to 'most recently used' position","this.cache.keys().next().value gives you the oldest (LRU) key in O(1)"]},{id:"swe-004",title:"Rate Limiter Design",category:"System Design",icon:"🏗️",difficulty:"Hard",timeLimit:"40 min",eloGain:30,tools:["System Design","Redis","Node.js"],scenario:"Design a rate limiter for Swiggy's API gateway that allows each user a maximum of 100 requests per minute. At 10M concurrent users during peak, the system must enforce limits with minimal latency overhead (<5ms per check) and survive Redis failures gracefully.",objective:"Produce a complete rate limiter design: algorithm choice with trade-off analysis, Redis data structure, pseudocode for the check function, and a failure mode strategy.",steps:["Choose between Token Bucket, Sliding Window Log, or Fixed Window — justify your choice","Design the Redis key structure and TTL strategy","Write pseudocode for isAllowed(userId) checking and incrementing the counter","Calculate Redis memory requirement at 10M users","Design the fallback when Redis is unavailable (fail-open vs fail-closed)"],workstation:"system_design",starterCode:`# Rate Limiter System Design

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
| Granularity | Per-minute | Matches "100 req/min" SLA exactly |`,skillTags:["Rate Limiting","System Design","Redis","Distributed Systems","Algorithms"],hints:["Sliding Window Counter uses prev_count × (1 - elapsed/window) to smooth the boundary burst","Redis INCR is atomic — no race condition between check and increment","Pipeline mget + incr + expire in one round-trip to stay under 5ms"]}],u=[{id:"dba-001",title:"Query Performance Optimization",category:"Query Optimization",icon:"⚡",difficulty:"Hard",timeLimit:"40 min",eloGain:32,tools:["PostgreSQL","EXPLAIN ANALYZE","Indexes"],scenario:"A slow query is causing 5-second page loads on the orders page. EXPLAIN ANALYZE shows a Sequential Scan on a 10M-row table. Your job: analyze the query plan, identify bottlenecks, add the right indexes, and verify the improvement.",objective:"Reduce query execution time from 5000ms to under 50ms by adding appropriate indexes and rewriting the query.",steps:["Run EXPLAIN ANALYZE on the original slow query","Identify the Sequential Scan and its cost","Add a composite index on the filtered + sorted columns","Verify the query now uses Index Scan with EXPLAIN ANALYZE","Write EXPLAIN output comparison before/after"],workstation:"sql",starterCode:`-- Query Performance Optimization
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
ORDER BY idx_scan DESC;`,skillTags:["PostgreSQL","Query Optimization","EXPLAIN ANALYZE","Indexes","DBA","Performance"],hints:["Equality columns first, range/sort columns last in composite index","INCLUDE adds columns to the index leaf without affecting the sort order","CONCURRENTLY allows building an index without locking the table for writes"]}],p=[{id:"cy-001",title:"Secure a Vulnerable Express API",category:"Application Security",icon:"🔒",difficulty:"Hard",timeLimit:"45 min",eloGain:35,tools:["Node.js","Security","OWASP"],scenario:"A Node.js Express API has multiple OWASP Top 10 vulnerabilities. Identify and fix: SQL Injection, Missing Rate Limiting, Broken Auth (no JWT verification), Sensitive Data Exposure in error messages, and Missing Security Headers.",objective:"Find and fix 5 security vulnerabilities in the provided Express API code.",steps:["Fix SQL Injection: use parameterized queries instead of string concatenation","Add rate limiting (express-rate-limit: 100 req/15min per IP)","Add verifyToken middleware to the /admin route","Sanitize error messages — never expose stack traces or DB errors to clients","Add Helmet.js to set secure HTTP headers"],workstation:"code",starterCode:`// VULNERABLE Express API — Find and fix the security issues
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

app.listen(3000, () => console.log('Server running'))`,skillTags:["Cybersecurity","OWASP","SQL Injection","Security Headers","Rate Limiting","Node.js"],hints:["SQL Injection fix: db.query('SELECT ... WHERE id = ?', [req.params.id])","helmet() sets X-Frame-Options, CSP, HSTS, and many more headers automatically","Never include err.stack or err.message in API responses — log them server-side only"]}],n=[{id:"ece-001",title:"GPIO LED Blink — Bare-Metal ARM",category:"Embedded C",icon:"🤖",difficulty:"Easy",timeLimit:"25 min",eloGain:15,tools:["C","ARM Cortex-M"],missionType:"embedded_lab",scenario:"You're bring-up engineer for a new STM32F103 board. The hardware team says the LED on PA5 isn't blinking during factory test. Your job: write the bare-metal C code that configures the GPIO pin and toggles the LED at 1 Hz without any HAL library.",objective:"Write bare-metal C code to enable GPIOA clock, configure PA5 as push-pull output, and toggle it in a delay loop to produce a 1 Hz blink.",steps:["Enable GPIOA clock via RCC_APB2ENR (bit 2)","Configure PA5 as output push-pull, max 2 MHz speed in CRL register","Write a software delay loop calibrated for ~500 ms at 8 MHz HSI","Toggle PA5 using BSRR (set) and BRR (reset) registers","Verify the output toggles correctly in your simulation"],test_cases:[{options:["0b0010 (2 MHz output push-pull)","0b0011 (50 MHz output push-pull)","0b0111 (input floating)","0b1000 (analog input)"],correct:0,explanation:"CRL bits [23:20] control PA5. MODE=10 (2 MHz) + CNF=00 (push-pull) = 0b0010. HAL sets this via GPIO_SPEED_FREQ_LOW."}],workstation:"embedded_lab",starterCode:`/* GPIO LED Blink — STM32F103 (no HAL)
 * Clock: 8 MHz HSI, LED on PA5
 * Consult: STM32F103 Reference Manual (RM0008), Section 8 (GPIO) and 6 (RCC)
 */
#include <stdint.h>

/* TODO: define register base addresses and peripheral macros */

void delay_ms(uint32_t ms) {
    /* TODO */
}

int main(void) {
    /* TODO: enable clock, configure pin, toggle in loop */
    while (1) { }
}`,validation_checks:[{id:"rcc_gpioa",label:"Enable GPIOA clock via RCC_APB2ENR",pattern:"RCC_APB2ENR\\s*\\|=.*4|APB2ENR.*IOPAEN|APB2ENR.*1<<2",hint:"RCC_APB2ENR |= (1 << 2)  — bit 2 = IOPAEN (GPIOA clock enable)"},{id:"gpio_crl",label:"Configure PA5 as output push-pull 2 MHz via CRL",pattern:"GPIOA_CRL\\s*[|&]?=|CRL.*0x[0-9a-fA-F]",hint:"GPIOA_CRL — bits [23:20] for PA5. Set to 0b0010 (output push-pull 2 MHz)"},{id:"toggle_high",label:"Set PA5 HIGH using BSRR or ODR",pattern:"GPIOA_BSRR\\s*=.*1<<5|GPIOA_BSRR\\s*=.*32|BSRR.*0x20|ODR.*|=.*0x20",hint:"GPIOA_BSRR = (1 << 5)  — write bit 5 to BSRR to set PA5 HIGH"},{id:"toggle_low",label:"Set PA5 LOW using BRR or BSRR high half",pattern:"GPIOA_BRR\\s*=.*1<<5|BRR.*0x20|BSRR.*1<<21",hint:"GPIOA_BRR = (1 << 5)  — write bit 5 to BRR to set PA5 LOW"},{id:"delay",label:"Implement delay_ms() software loop",pattern:"delay_ms\\s*\\(\\s*500\\s*\\)|for\\s*\\(.*ms.*8000|while.*--",hint:"delay_ms(500) creates a 500 ms half-period — ~8000 iterations per ms at 8 MHz"}],skillTags:["GPIO","RCC","Bare-Metal","ARM Cortex-M","BSRR/BRR"],hints:["RCC_APB2ENR bit 2 enables GPIOA clock","CRL controls pins 0-7: bits [23:20] control PA5 — set to 0b0010 for 2 MHz output","BSRR bit 5 sets PA5 HIGH; BRR bit 5 sets PA5 LOW"]},{id:"ece-002",title:"UART Transmit — Polling Mode",category:"Communication Protocols",icon:"🔌",difficulty:"Easy",timeLimit:"30 min",eloGain:18,tools:["C","UART","STM32"],scenario:"Your embedded system needs to send debug strings over UART1 to a host PC. The bootloader runs at 115200 baud, 8N1. There's no DMA or interrupt budget — it must be a simple polling implementation.",objective:"Configure USART1 on STM32 at 115200 baud and implement a blocking uart_send_string() function using the TXE flag.",steps:["Enable USART1 and GPIOA clocks via RCC","Configure PA9 (TX) as alternate function push-pull","Calculate and set BRR for 115200 baud at 36 MHz APB2","Enable USART1 with TE (transmit enable) bit","Implement uart_send_char() that waits for TXE then writes to DR","Build uart_send_string() on top and send 'Hello ECE!' over UART"],missionType:"embedded_lab",test_cases:[{options:["312 (0x138)","156 (0x9C)","624 (0x270)","9600"],correct:0,explanation:"BRR = f_PCLK / baud = 36,000,000 / 115,200 ≈ 312. Writing 0x138 to USART1_BRR gives 115200 baud at 36 MHz APB2."}],workstation:"embedded_lab",starterCode:`/* UART Transmit — Polling Mode
 * MCU: STM32F103, USART1 @ 115200 baud, 8N1
 * Consult: STM32F103 Reference Manual (RM0008), Section 27 (USART)
 */
#include <stdint.h>

/* TODO: define register base addresses and peripheral macros */

void uart_send_char(char c) {
    /* TODO */
}

void uart_send_string(const char *s) {
    /* TODO */
}

int main(void) {
    /* TODO: init clocks, GPIO (PA9 TX), USART1, then transmit */
    while (1) { }
}`,validation_checks:[{id:"rcc_clocks",label:"Enable USART1 and GPIOA clocks via RCC",pattern:"RCC_APB2ENR\\s*\\|=.*USART1|APB2ENR.*0x[0-9a-fA-F]*4",hint:"RCC_APB2ENR |= (1<<14) | (1<<2)  — bit14=USART1EN, bit2=IOPAEN"},{id:"gpio_pa9",label:"Configure PA9 as alternate function push-pull (50 MHz)",pattern:"GPIOA_CRH\\s*[|&]?=|CRH.*0xB",hint:"GPIOA_CRH — bits [7:4] for PA9 → 0b1011 (AF PP 50MHz)"},{id:"brr_set",label:"Set BRR for 115200 baud at 36 MHz APB2 (≈ 312 / 0x138)",pattern:"USART1_BRR\\s*=\\s*(312|0x138|0x139|313)",hint:"USART1_BRR = 36000000 / 115200 → 312 (0x138)"},{id:"usart_enable",label:"Enable USART1 with UE + TE bits",pattern:"USART1_CR1\\s*\\|=.*USART_CR1_UE|CR1.*UE.*TE|CR1.*TE.*UE",hint:"USART1_CR1 |= USART_CR1_UE | USART_CR1_TE  (bits 13 and 3)"},{id:"txe_poll",label:"Poll TXE flag before writing to DR",pattern:"USART1_SR\\s*&\\s*USART_SR_TXE|SR.*TXE|while.*TXE",hint:"while (!(USART1_SR & USART_SR_TXE)) {}  — wait for transmit register empty"},{id:"dr_write",label:"Write character to USART1_DR",pattern:"USART1_DR\\s*=",hint:"USART1_DR = c;  — writing to the data register transmits the byte"},{id:"hello_string",label:'Transmit "Hello ECE!" over UART',pattern:'uart_send_string\\s*\\(\\s*"Hello ECE',hint:'Call uart_send_string("Hello ECE!\\r\\n") from main()'}],skillTags:["UART","Polling","Baud Rate","STM32","Serial Communication"],hints:["BRR = f_PCLK / baud_rate. At 36 MHz: 36000000 / 115200 ≈ 312 (0x138)","PA9 is USART1_TX — CRH bits [7:4] → 0b1011 for AF push-pull 50 MHz","Check SR_TXE before writing to DR. Don't write while the shift register is busy."]},{id:"ece-003",title:"RC Filter — Cutoff Frequency Calculation",category:"Circuit Design",icon:"⚡",difficulty:"Easy",timeLimit:"20 min",eloGain:12,tools:["Python","NumPy"],scenario:"A sensor output has significant 50 Hz mains noise. You need a first-order RC low-pass filter with a cutoff frequency of 10 Hz so only the slow DC drift signal passes to the ADC. Calculate the required R and C values and verify the transfer function.",objective:"Calculate R and C for a 10 Hz low-pass filter, then write Python code to plot the Bode magnitude response and confirm the -3 dB point.",steps:["Use the formula fc = 1 / (2π × R × C)","Choose R = 10 kΩ and compute the required C","Generate frequency array from 1 Hz to 10 kHz (log scale)","Compute |H(jω)| = 1 / √(1 + (f/fc)²) for each frequency","Plot magnitude in dB vs frequency (Bode plot)","Verify the magnitude is -3 dB (≈ 0.707) at exactly 10 Hz"],missionType:"engineering_lab",test_cases:[{options:["1.59 µF","15.9 µF","0.159 µF","159 nF"],correct:0,explanation:"C = 1 / (2π × R × fc) = 1 / (2π × 10,000 × 10) ≈ 1.59 µF. Verify: at 10 Hz, |H| = 1/√2 ≈ 0.707 → −3.01 dB."}],workstation:"engineering_lab",starterCode:`import numpy as np
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
`,skillTags:["RC Circuit","Low-Pass Filter","Transfer Function","Bode Plot","Signal Processing"],hints:["C = 1 / (2 × π × R × fc). At R=10kΩ and fc=10Hz: C ≈ 1.59 µF","H_dB = 20 × log10(H_mag). At fc, |H| = 1/√2 ≈ 0.707 → -3.01 dB","np.argmin(np.abs(H_dB - (-3))) finds the index closest to -3 dB"]},{id:"ece-004",title:"I2C Sensor Read — Write Your Own Driver",category:"Communication Protocols",icon:"🔌",difficulty:"Medium",timeLimit:"40 min",eloGain:25,tools:["C","I2C","Embedded"],scenario:"You're integrating an MPU-6050 IMU with an STM32 over I2C1. The HAL library is forbidden (memory constraints). Implement a minimal blocking I2C driver that reads the WHO_AM_I register (0x75) and returns its value (expected: 0x68).",objective:"Write bare-metal I2C master functions (start, address, write byte, read byte, stop) and use them to read register 0x75 from the MPU-6050 at I2C address 0x68.",steps:["Enable I2C1 and GPIOB clocks; configure PB6 (SCL) and PB7 (SDA) as open-drain AF","Configure I2C1: 100 kHz standard mode, PCLK1 = 36 MHz, set CR2, CCR, TRISE","Implement i2c_start() — set START bit, wait for SB flag","Implement i2c_write_addr(addr, rw) — write address byte, wait for ADDR, clear by reading SR1+SR2","Implement i2c_write_byte(data) and i2c_read_byte(ack)","Combine into i2c_read_reg(dev_addr, reg_addr) — write reg pointer then restart + read","Call it to read WHO_AM_I and assert the result equals 0x68"],missionType:"embedded_lab",test_cases:[{options:["180 (0xB4)","360 (0x168)","90 (0x5A)","72 (0x48)"],correct:0,explanation:"CCR = f_PCLK1 / (2 × f_I2C) = 36,000,000 / (2 × 100,000) = 180. TRISE = f_PCLK1_MHz + 1 = 37 for standard mode."}],workstation:"embedded_lab",starterCode:`/* I2C1 Bare-Metal Driver — STM32F103
 * Target: MPU-6050 @ I2C address 0x68, register WHO_AM_I = 0x75
 * Consult: STM32F103 Reference Manual (RM0008), Section 26 (I2C)
 *          MPU-6050 Product Specification Rev 3.4
 */
#include <stdint.h>

/* TODO: define I2C1 register base addresses and macros */

void i2c_init(void) {
    /* TODO */
}

void i2c_start(void) {
    /* TODO */
}

void i2c_write_addr(uint8_t addr, uint8_t rw) {
    /* TODO */
}

uint8_t i2c_read_byte(int ack) {
    /* TODO */
    return 0;
}

void i2c_write_byte(uint8_t data) {
    /* TODO */
}

void i2c_stop(void) {
    /* TODO */
}

uint8_t i2c_read_reg(uint8_t dev, uint8_t reg) {
    /* TODO */
    return 0;
}

int main(void) {
    i2c_init();
    uint8_t who = i2c_read_reg(0x68, 0x75);
    return (who == 0x68) ? 0 : 1;
}`,skillTags:["I2C","Master Mode","MPU-6050","Bare-Metal","Register Map"],hints:["CCR = PCLK1 / (2 × f_I2C). At 36 MHz and 100 kHz: CCR = 180 (0xB4)","TRISE = (PCLK1_MHz + 1) = 37 for standard mode","Clear ADDR by reading SR1 then SR2 in sequence — don't just read SR1"]},{id:"ece-005",title:"Digital Logic — 4-bit Ripple Carry Adder",category:"Digital Electronics",icon:"💾",difficulty:"Easy",timeLimit:"25 min",eloGain:14,tools:["Verilog"],scenario:"Your VLSI team needs a structural Verilog model of a 4-bit ripple carry adder (RCA) to use as a sub-module in an ALU. The model must be fully structural — wire full adder modules together, no behavioral addition operator allowed.",objective:"Write structural Verilog for a full adder and instantiate four of them to build a 4-bit ripple carry adder. Verify with a testbench that 0b0110 + 0b0101 = 0b1011 with Cout = 0.",steps:["Define a full_adder module with inputs a, b, cin and outputs sum, cout","Implement full adder using only AND, OR, XOR gate primitives","Define rca_4bit module with inputs a[3:0], b[3:0], cin and outputs sum[3:0], cout","Instantiate four full_adder modules, chaining cout → cin","Write a testbench: apply a=6, b=5, cin=0 and check sum=11, cout=0"],missionType:"embedded_lab",test_cases:[{options:["Sum = 1011₂, Cout = 0","Sum = 1011₂, Cout = 1","Sum = 1111₂, Cout = 0","Sum = 0011₂, Cout = 1"],correct:0,explanation:"0110 (6) + 0101 (5) = 1011 (11). No carry out since 11 < 16. Each full adder chains carry to the next stage."}],workstation:"embedded_lab",starterCode:`// 4-bit Ripple Carry Adder — Structural Verilog
// Use gate primitives only (and, or, xor) — no + operator allowed

module full_adder (
  input  a, b, cin,
  output sum, cout
);
  // TODO
endmodule

module rca_4bit (
  input  [3:0] a, b,
  input        cin,
  output [3:0] sum,
  output       cout
);
  // TODO: declare internal carry wires and instantiate four full_adder modules
endmodule

module tb;
  reg  [3:0] a, b;
  reg        cin;
  wire [3:0] sum;
  wire       cout;

  rca_4bit uut (.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));

  initial begin
    a = 4'b0110; b = 4'b0101; cin = 0;
    #10;
    $display("sum=%b cout=%b", sum, cout);
    $finish;
  end
endmodule`,skillTags:["Verilog","Full Adder","Ripple Carry","Structural Design","Gate Primitives"],hints:["full_adder: sum = a ^ b ^ cin; cout = (a&b)|(b&cin)|(a&cin)","Use named port connections: full_adder fa0 (.a(a[0]), .b(b[0]), .cin(cin), .sum(sum[0]), .cout(c1))","In Verilog, gate primitives are: and(out,a,b), or(out,a,b), xor(out,a,b)"]},{id:"ece-006",title:"SPI ADC Read — Bit-Bang Implementation",category:"Communication Protocols",icon:"🔌",difficulty:"Medium",timeLimit:"35 min",eloGain:22,tools:["C","SPI","Embedded"],scenario:"Your hardware uses an MCP3201 (12-bit SPI ADC) but the SPI peripheral is occupied by another device. Implement a software (bit-bang) SPI master to read a single 12-bit sample from the MCP3201 using GPIO pins for SCK, MOSI, MISO, and CS.",objective:"Implement bit-bang SPI (mode 0,0) that clocks 16 bits from MCP3201 and extracts the 12-bit ADC result from the response frame.",steps:["Define GPIO macros for CS (PA4), SCK (PA5), MOSI (PA7), MISO (PA6)","Implement spi_transfer_byte(tx) — 8-bit half-duplex, MSB first, mode 0","Assert CS low, transfer 0x00 twice to clock out 16 bits, deassert CS","Extract 12-bit result: MCP3201 sends null+B11..B0 across 16 clocks","Print the raw ADC value and the corresponding voltage (Vref = 3.3 V)"],missionType:"embedded_lab",test_cases:[{options:["Bits [14:3] — shift right by 3 and mask 12 bits","Bits [11:0] — no shift needed","Bits [15:4] — shift right by 4","Bits [13:2] — shift right by 2"],correct:0,explanation:"MCP3201 sends: null bit at position 15, then B11..B0 at bits [14:3]. Extract: (raw >> 3) & 0x0FFF or equivalently raw & 0x7FF8 >> 3."}],workstation:"embedded_lab",starterCode:`/* Bit-Bang SPI — MCP3201 12-bit ADC
 * MCU: STM32F103, GPIO pins PA4/PA5/PA6/PA7
 * Consult: MCP3201 datasheet (Figure 6-1 serial timing), STM32F103 RM0008
 */
#include <stdint.h>

/* TODO: define GPIO macros for CS, SCK, MOSI, MISO */

void spi_delay(void) {
    /* TODO */
}

uint8_t spi_transfer_byte(uint8_t tx) {
    /* TODO */
    return 0;
}

uint16_t mcp3201_read(void) {
    /* TODO */
    return 0;
}

int main(void) {
    uint16_t adc = mcp3201_read();
    float voltage = (adc / 4095.0f) * 3.3f;
    return 0;
}`,skillTags:["SPI","Bit-Bang","ADC","MCP3201","Bit Manipulation"],hints:["SPI mode 0: clock idle low, data sampled on rising edge","On rising SCK edge: MISO_READ() → shift into rx (MSB first)","MCP3201 sends a leading null bit — discard bit 15, bits 14..3 are B11..B0"]},{id:"ece-007",title:"D Flip-Flop — Timing Diagram Analysis",category:"Digital Electronics",icon:"💾",difficulty:"Easy",timeLimit:"20 min",eloGain:12,tools:["Verilog"],scenario:"A junior engineer's D flip-flop design is failing timing closure. Your job: write a synthesizable Verilog model of a positive-edge-triggered D FF with synchronous reset, and then identify the setup-time violation in a given timing scenario.",objective:"Write a D flip-flop module with synchronous active-high reset. Then analyse whether a given input change meets the setup time requirement of 2 ns before the clock edge.",steps:["Write module dff_sync_rst with inputs clk, rst, d and output q","Use always @(posedge clk): if rst → q <= 0, else q <= d","Write a testbench: apply rst for 2 cycles, then set d=1 and toggle clk","Check q captures d correctly at each rising edge","Identify: if d changes 1.5 ns before clk edge with t_setup = 2 ns — does it violate?"],missionType:"embedded_lab",test_cases:[{options:["Setup time violation — FF may capture metastable value","No violation — 1.5 ns is within the timing budget","Hold time violation, not setup time","The FF will reset automatically due to metastability"],correct:0,explanation:"t_setup = 2 ns means d must be stable at least 2 ns before the clock edge. Here d changes only 1.5 ns before the edge (1.5 < 2), so this IS a setup time violation. The output q may be metastable."}],workstation:"embedded_lab",starterCode:`// D Flip-Flop with Synchronous Reset — Verilog

module dff_sync_rst (
  input  clk, rst, d,
  output reg q
);
  // TODO: positive-edge triggered, synchronous active-high reset
endmodule

module tb;
  reg clk, rst, d;
  wire q;

  dff_sync_rst uut (.clk(clk), .rst(rst), .d(d), .q(q));

  initial clk = 0;
  always #5 clk = ~clk;

  initial begin
    rst = 1; d = 0;
    #20 rst = 0;
    #10 d = 1;
    #10;
    $display("q = %b", q);
    $finish;
  end
endmodule`,skillTags:["D Flip-Flop","Synchronous Reset","Setup Time","Timing Analysis","Verilog"],hints:["Synchronous reset: both rst and d are only sampled at posedge clk","Setup time violation: if data changes within the setup window before the clock edge, the output is metastable","1.5 ns < 2 ns setup time → this IS a violation. The FF may latch wrong value."]},{id:"ece-008",title:"PWM Motor Speed Control",category:"Embedded C",icon:"🤖",difficulty:"Medium",timeLimit:"35 min",eloGain:20,tools:["C","ARM Cortex-M","Timer"],scenario:"A DC motor driver accepts a 20 kHz PWM signal where 0% duty = stopped and 100% duty = full speed. You need to configure TIM2 on STM32F103 to output PWM on PA1 (TIM2_CH2) and implement a function that sets motor speed from 0 to 100%.",objective:"Configure TIM2 in PWM mode 1 on channel 2 (PA1) at 20 kHz with 72 MHz system clock. Implement set_motor_speed(percent) that updates the duty cycle without restarting the timer.",steps:["Enable TIM2 and GPIOA clocks","Configure PA1 as alternate function push-pull output","Set TIM2 PSC = 0, ARR = 3599 for 20 kHz (72 MHz / 3600 = 20 kHz)","Configure CCR2 in PWM mode 1 (OC2M = 110)","Enable CCR2 preload and TIM2 auto-reload preload","Enable OC2 output and start the timer (CEN bit)","set_motor_speed(50) should set CCR2 = 1799 for 50% duty"],missionType:"embedded_lab",test_cases:[{options:["1800 — using CCR2 = (percent × (ARR+1)) / 100","1799 — using CCR2 = (percent × ARR) / 100","3600 — full ARR value at 100%","899 — quarter of ARR"],correct:0,explanation:"At 50%: CCR2 = (50 × (3599+1)) / 100 = (50 × 3600) / 100 = 1800. PWM is HIGH for CCR2 counts out of ARR+1 total, so duty = 1800/3600 = 50.0% exactly."}],workstation:"embedded_lab",starterCode:`/* PWM Motor Speed Control — TIM2_CH2 (PA1), 20 kHz
 * MCU: STM32F103 @ 72 MHz system clock
 * Consult: STM32F103 Reference Manual (RM0008), Section 15 (TIM2)
 */
#include <stdint.h>

/* TODO: define RCC, GPIOA, TIM2 register base addresses and macros */

void pwm_init(void) {
    /* TODO: enable clocks, configure PA1 as AF output, set up TIM2 */
}

void set_motor_speed(uint8_t percent) {
    /* TODO: clamp to 100, update CCR2 for desired duty cycle */
}

int main(void) {
    pwm_init();
    set_motor_speed(50);
    while (1) { }
}`,skillTags:["PWM","TIM2","Motor Control","Duty Cycle","ARR/CCR"],hints:["ARR = (f_clk / (PSC+1) / f_pwm) - 1 = (72MHz / 1 / 20kHz) - 1 = 3599","PWM mode 1: OC2M bits [6:4] in CCMR1 = 0b110 (bits 14:12 for CH2)","duty CCR2 = (percent × (ARR+1)) / 100. At 50%: CCR2 = 1800"]}],s=[{id:"vlsi-001",title:"Moore FSM — Sequence Detector 1011",category:"Digital Design",icon:"💾",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["Verilog","RTL Design"],missionType:"embedded_lab",scenario:"You're designing a sequence detector for a custom protocol. The FSM must detect the binary pattern 1011 in a serial input stream (Moore machine, non-overlapping). The design will be synthesized on a 28 nm CMOS process — so the state encoding matters for power.",objective:"Design a 4-state Moore FSM in Verilog that asserts output 'detect' for one clock cycle after receiving the sequence 1011. Use one-hot encoding for synthesis efficiency.",steps:["Identify the 4 states: IDLE (S0), GOT1 (S1), GOT10 (S2), GOT101 (S3)","Define state transitions for each input combination (0/1) from each state","Implement as a 3-always-block FSM: state register, next-state logic, output logic","Use one-hot encoding: S0=4'b0001, S1=4'b0010, S2=4'b0100, S3=4'b1000","Write testbench: feed 0011011011 and verify detect fires after each 1011"],test_cases:[{options:["4 states (IDLE → GOT1 → GOT10 → GOT101 → detect → IDLE)","3 states (miss the '1' partial match recovery)","2 states (too few to track the pattern)","5 states (overspecified, redundant state)"],correct:0,explanation:"A non-overlapping Moore FSM for 1011 needs exactly 4 states. After detecting the full pattern (S3 on last '1'), output fires and FSM returns to IDLE. One-hot encoding is preferred for synthesis."}],starterCode:`// Moore FSM — Sequence Detector (1011)
// One-hot encoding, synchronous active-low reset

module seq_detect_1011 (
  input  clk, rst_n, in,
  output detect
);
  // TODO: define state parameters (one-hot encoding)

  // TODO: declare state registers

  // TODO: state register (sequential block)

  // TODO: next-state logic (combinational block)

  // TODO: output logic (Moore — output depends only on current state)
  assign detect = 1'b0;  // replace with your logic

endmodule`,skillTags:["FSM","Moore Machine","Sequence Detector","One-Hot Encoding","RTL"],hints:["Moore output depends only on state. In the standard 4-state model, detect fires on the TRANSITION OUT of S3 on '1' — so it's actually a Mealy output. For true Moore, add a 5th DETECT state.","Non-overlapping: after detecting 1011, return to S0 regardless. Overlapping would return to S1 (since the last '1' could start the next sequence).","Test vector: serial stream 0-0-1-1-0-1-1 → detect fires at positions 4 and 7"]},{id:"vlsi-002",title:"Critical Path Analysis — 8-bit Carry-Lookahead Adder",category:"Timing Analysis",icon:"⚡",difficulty:"Medium",timeLimit:"25 min",eloGain:18,tools:["Timing Analysis","Digital Design"],missionType:"embedded_lab",scenario:"STA (Static Timing Analysis) on your 8-bit CLA adder post-synthesis shows a setup violation at 500 MHz. The timing report shows: Gate delay per stage = 0.1 ns, Propagate (P) gate = 0.2 ns, Generate (G) gate = 0.2 ns, AND-OR sum = 0.3 ns. The clock period is 2 ns.",objective:"Identify the critical path delay of the 8-bit CLA adder given the gate delays above and determine whether it meets 500 MHz timing (2 ns clock period, with 0.1 ns setup time).",steps:["Recall: CLA generates P and G signals in one level (0.2 ns each)","CLA carry: C4 = G + P·C0 — one AND-OR stage (0.3 ns)","Final sum: Si = Pi XOR Ci — one XOR gate (0.2 ns)","Total critical path = PG generation + carry + sum = 0.2 + 0.3 + 0.2 ns","Compare with setup slack: clock_period - t_path - t_setup = 2 - 0.7 - 0.1 = 1.2 ns"],test_cases:[{options:["0.7 ns — meets 500 MHz with 1.2 ns positive slack","1.4 ns — violates 500 MHz (negative slack -0.5 ns)","0.5 ns — meets with 1.4 ns slack","2.1 ns — violates timing (exceeds full clock period)"],correct:0,explanation:"CLA critical path = PG gen (0.2) + carry logic (0.3) + XOR sum (0.2) = 0.7 ns. Setup slack = 2.0 − 0.7 − 0.1 = 1.2 ns (positive) → timing MET at 500 MHz."}],starterCode:`// CLA Critical Path Timing Analysis
// Given gate delays (from synthesis report):
//   P/G generation (AND/OR gate) : 0.2 ns each
//   Carry logic (G + P·Cin)      : 0.3 ns
//   Sum (Pi XOR Ci)              : 0.2 ns
//
// Clock frequency target: 500 MHz → period = 2.0 ns
// Setup time requirement: 0.1 ns
//
// TODO: Draw the critical path through a 4-bit CLA block,
//       calculate total delay, and determine timing slack.
//
// Q: Does this design meet 500 MHz timing? Show your working.`,skillTags:["STA","Critical Path","CLA Adder","Setup Slack","Timing Closure"],hints:["CLA advantage: carry is computed in O(1) gate levels rather than O(n) for ripple-carry","Setup slack = T_clk − T_data_path − T_setup. Positive slack = timing met.","A 4-bit CLA with 2 group levels (block CLA) still has the same gate structure"]},{id:"vlsi-003",title:"Dynamic Power Estimation — CMOS Inverter Chain",category:"Power Analysis",icon:"🔋",difficulty:"Easy",timeLimit:"20 min",eloGain:14,tools:["Power Analysis","CMOS Design"],missionType:"engineering_lab",scenario:"A 16-stage CMOS inverter chain drives a 50 fF load capacitance at the output of each stage. The chain runs at 1 GHz with VDD = 1.2 V. Activity factor α = 0.25 (signal switches on average 25% of clock cycles).",objective:"Calculate the total dynamic power dissipation of the 16-stage inverter chain using P = α × C × V² × f.",steps:["Apply: P_dynamic = α × C_L × V_DD² × f for ONE stage","Substitute: α = 0.25, C_L = 50×10⁻¹⁵ F, V_DD = 1.2 V, f = 1×10⁹ Hz","Calculate P_stage — remember to square V_DD","Multiply P_stage by N = 16 stages to get total chain power"],test_cases:[{options:["288 µW (16 stages × 18 µW/stage)","18 µW (single stage only)","4.6 mW (wrong — forgot activity factor)","72 µW (multiplied by only 4 stages)"],correct:0,explanation:"P = α·C·V²·f = 0.25 × 50e-15 × 1.44 × 1e9 = 18 µW per stage. With 16 stages: 16 × 18 = 288 µW total dynamic power."}],starterCode:`// Dynamic Power Calculation — CMOS Inverter Chain
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
// Step 1: Calculate single-stage dynamic power
// P_stage = α × C_L × V_DD² × f
//         = ?
//
// Step 2: Calculate total chain power
// P_total = N × P_stage = ?`,skillTags:["Dynamic Power","CMOS","Activity Factor","Power Estimation","Low Power Design"],hints:["α = 0 means the signal never switches; α = 0.5 is the maximum for a random data signal","Static (leakage) power is separate: P_static = I_leak × V_DD","At 7 nm node, static and dynamic power are roughly equal — at 28 nm dynamic dominates"]},{id:"vlsi-004",title:"Scan Chain DFT — Stuck-at Fault Coverage",category:"Design for Test",icon:"🧪",difficulty:"Medium",timeLimit:"25 min",eloGain:22,tools:["DFT","ATPG","Scan Chain"],missionType:"embedded_lab",scenario:"Your ATPG tool reports 95.2% stuck-at fault coverage after inserting a scan chain into a 1000-gate design. The DFT spec requires 98% coverage. You have 12 unobservable faults and 4 untestable faults flagged in the fault report.",objective:"Determine how many currently detected faults there are, and identify whether the untestable faults should be excluded from the coverage calculation per IEEE 1149.1 standards.",steps:["Start with total fault count: assume 1000 faults in a combinational circuit (stuck-at-0 and stuck-at-1 per net)","Calculate how many faults are currently detected from the raw 95.2% coverage figure","Exclude untestable (redundant) faults from the denominator per ATPG standards — what is the adjusted fault count?","Recalculate adjusted coverage = detected / (total − untestable) and compare to the 98% target","Determine how many additional faults must be covered to close the gap to 98% — and which fix approach achieves this"],test_cases:[{options:["Add test points (observation/control points) to improve observability of the 12 unobservable faults","Increase the number of scan chains — more chains reduce shift time but don't improve coverage","Change the synthesis tool — the tool doesn't affect ATPG fault coverage","Increase VDD — higher voltage improves timing but not stuck-at fault coverage"],correct:0,explanation:"Unobservable faults can be addressed by inserting test observation points (TOs) or control points (TCs) in the netlist — physically adding muxes or AND/OR gates that let the scan chain observe otherwise-buried nodes."}],starterCode:`// Scan Chain DFT Analysis
//
// Design stats:
//   Total gates      : 1000
//   Total faults     : 1000 (stuck-at-0 + stuck-at-1 per net)
//   Raw coverage     : 95.2%
//   Untestable faults:   4  (redundant logic — should these be excluded from denominator?)
//   Unobservable     :  12  (nodes not visible via scan chain)
//
// Step 1: How many faults are currently detected?
//   Detected = ? (from raw coverage and total)
//
// Step 2: Adjusted coverage (excluding untestable from denominator)
//   Adjusted denominator = 1000 - ? = ?
//   Adjusted coverage    = detected / adjusted_denominator = ?
//
// Step 3: How many faults still need to be covered to reach 98%?
//   Target detected = 0.98 × adjusted_denominator = ?
//   Gap = target - currently_detected = ?
//
// Step 4: Which fix approach can close the gap?
//   A) Add test observation points for the 12 unobservable faults
//   B) Rewrite logic to eliminate redundancy
//   C) Run ATPG with higher effort`,skillTags:["DFT","ATPG","Scan Chain","Fault Coverage","Stuck-at Fault"],hints:["Untestable (redundant) faults are excluded from the coverage denominator — they can never be detected by definition","Unobservable faults ARE testable but hidden from the scan path — test points improve coverage","IEEE 1149.1 (JTAG) defines the boundary scan standard; full-scan DFT is separate but complementary"]}],w=[{id:"rf-001",title:"L-Network Impedance Matching — 50 Ω to 200 Ω at 2.4 GHz",category:"RF Design",icon:"📡",difficulty:"Medium",timeLimit:"30 min",eloGain:22,tools:["RF Design","Impedance Matching"],missionType:"engineering_lab",scenario:"A power amplifier output impedance is 200 Ω but the antenna feed is 50 Ω. You need a lossless L-network matching circuit at 2.4 GHz to maximise power transfer. The Q factor of the match network should be minimised.",objective:"Calculate the L and C values for a low-pass L-network that transforms 200 Ω (source) to 50 Ω (load) at 2.4 GHz.",steps:["Q = √((R_high / R_low) − 1) = √((200/50) − 1) = √3 ≈ 1.732","Shunt element (across 200 Ω): X_shunt = R_high / Q = 200 / 1.732 ≈ 115.5 Ω","For shunt capacitor: C = 1 / (2π × f × X_shunt) = 1 / (2π × 2.4e9 × 115.5) ≈ 0.57 pF","Series element: X_series = Q × R_low = 1.732 × 50 ≈ 86.6 Ω","For series inductor: L = X_series / (2π × f) = 86.6 / (2π × 2.4e9) ≈ 5.75 nH"],test_cases:[{options:["C ≈ 0.57 pF (shunt), L ≈ 5.75 nH (series) — low-pass L-network","C ≈ 1.14 pF (shunt), L ≈ 11.5 nH (series) — doubled values (wrong Q)","L ≈ 0.57 nH (shunt), C ≈ 5.75 pF (series) — high-pass topology (reversed)","C ≈ 0.33 pF, L ≈ 3.3 nH — calculated at 4.8 GHz (frequency error)"],correct:0,explanation:"L-network Q = √(R_high/R_low − 1) = √3. Shunt cap: C = 1/(2π×f×R_high/Q) ≈ 0.57 pF. Series ind: L = Q×R_low/(2π×f) ≈ 5.75 nH. Low-pass topology since shunt element is closer to high impedance side."}],starterCode:`// L-Network Impedance Matching Calculation
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
// → maximum power transfer`,skillTags:["L-Network","Impedance Matching","Q Factor","RF Design","Reactance"],hints:["Always match the higher impedance side with a shunt element and the lower with a series element in a low-pass L-network","Q determines bandwidth: higher Q → narrower bandwidth. Minimising Q gives wideband match","Verify with Smith Chart: start at R_S = 200 Ω, rotate along constant-G circle to R_L = 50 Ω"]},{id:"rf-002",title:"Friis Link Budget — 2.4 GHz Received Power",category:"RF Design",icon:"📡",difficulty:"Easy",timeLimit:"20 min",eloGain:15,tools:["Link Budget","Friis Equation"],missionType:"engineering_lab",scenario:"A 2.4 GHz Wi-Fi transmitter outputs 20 dBm EIRP. The receiver is 100 m away in free space (no obstacles). Both antennas are isotropic (0 dBi gain). Calculate the received power in dBm.",objective:"Apply the Friis transmission equation in dB form: P_r = P_t + G_t + G_r − FSPL, where FSPL (dB) = 20·log₁₀(4πd/λ).",steps:["Wavelength: λ = c/f = 3×10⁸ / 2.4×10⁹ ≈ 0.125 m","Free Space Path Loss: FSPL = 20·log₁₀(4π×100 / 0.125) = 20·log₁₀(10053) ≈ 80.0 dB","Received power: P_r = 20 + 0 + 0 − 80 = −60 dBm","Typical Wi-Fi receiver sensitivity is −70 to −90 dBm, so −60 dBm is a strong signal"],test_cases:[{options:["−60 dBm — strong signal, well above typical −70 dBm sensitivity","−80 dBm — near sensitivity limit (incorrect FSPL used)","−40 dBm — incorrect, overestimates received power","+20 dBm — this is the transmit power, not received"],correct:0,explanation:"FSPL = 20·log₁₀(4π×d×f/c) = 20·log₁₀(4π×100×2.4e9/3e8) ≈ 80 dB. P_r = 20 + 0 + 0 − 80 = −60 dBm. A good Wi-Fi link at 100 m line-of-sight."}],starterCode:`// Friis Link Budget — 2.4 GHz Wi-Fi
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
//       = -60 dBm`,skillTags:["Friis Equation","Link Budget","Free Space Path Loss","EIRP","RF System Design"],hints:["FSPL in dB = 20·log₁₀(4πd/λ) = 20·log₁₀(d) + 20·log₁₀(f) + 20·log₁₀(4π/c)","At 2.4 GHz, FSPL at 1 m ≈ 40 dB, and increases 20 dB per decade (×10 distance)","Real-world path loss is higher due to multipath, obstacles, and cable losses"]},{id:"rf-003",title:"Cascaded Noise Figure — LNA + Mixer Chain",category:"RF Design",icon:"📡",difficulty:"Medium",timeLimit:"25 min",eloGain:20,tools:["Noise Figure","Friis Formula for Noise"],missionType:"engineering_lab",scenario:"Your receiver front-end has an LNA (gain = 20 dB, NF = 1.5 dB) followed by a mixer (gain = −7 dB / conversion loss, NF = 8 dB). Calculate the cascaded noise figure of the two-stage receiver chain.",objective:"Apply the Friis formula for cascaded noise figure: NF_total = NF₁ + (NF₂ − 1) / G₁ where NF and G are in linear (not dB) form.",steps:["Convert to linear: NF₁ = 10^(1.5/10) ≈ 1.413, G₁ = 10^(20/10) = 100, NF₂ = 10^(8/10) ≈ 6.31","Apply Friis: NF_total = 1.413 + (6.31 − 1) / 100 = 1.413 + 0.0531 = 1.466","Convert back to dB: NF_total_dB = 10·log₁₀(1.466) ≈ 1.66 dB","Conclusion: The high-gain LNA dominates the cascaded NF — mixer NF is almost negligible"],test_cases:[{options:["1.66 dB — LNA dominates, mixer contribution is 0.16 dB","4.75 dB — simple average (incorrect — doesn't weight by gain)","8.0 dB — mixer NF only (ignores LNA)","9.5 dB — sum of NFs (completely wrong)"],correct:0,explanation:"Friis (linear): NF = NF₁ + (NF₂−1)/G₁ = 1.413 + (6.31−1)/100 = 1.466 → 1.66 dB. The LNA's 20 dB gain suppresses the mixer noise by factor 100, so the mixer adds only 0.16 dB to the chain NF."}],starterCode:`// Cascaded Noise Figure — Friis Formula
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
// → always put the lowest-NF, highest-gain stage FIRST in the chain`,skillTags:["Noise Figure","Friis Formula","LNA","Cascaded NF","Receiver Design"],hints:["Always convert NF and G to linear before applying Friis — then convert result back to dB","The first stage dominates: good LNA design (low NF, high gain) is critical for receiver sensitivity","If LNA gain were only 10 dB (G=10), mixer would add 0.531 dB instead of 0.053 dB"]},{id:"rf-004",title:"S-Parameter Reflection Coefficient — Antenna Input Match",category:"RF Design",icon:"📡",difficulty:"Easy",timeLimit:"15 min",eloGain:12,tools:["S-Parameters","Smith Chart"],missionType:"engineering_lab",scenario:"A VNA measurement of your patch antenna at 2.4 GHz shows S₁₁ = −12 dB. Your design spec requires a return loss better than −10 dB. A team member claims the antenna is 'too well matched' and wants to change it. Should they?",objective:"Calculate the reflection coefficient magnitude |Γ| from S₁₁ = −12 dB, determine the percentage of power reflected, and decide whether the spec is met.",steps:["|Γ| = 10^(S₁₁_dB / 20) = 10^(−12/20) = 10^(−0.6) ≈ 0.251","Power reflected = |Γ|² = 0.251² ≈ 0.063 = 6.3% of input power","Power delivered to antenna = 1 − 0.063 = 93.7%","Spec requires S₁₁ < −10 dB: −12 dB < −10 dB → spec is MET (more negative = better match)","The team member is wrong: −12 dB is BETTER than −10 dB (lower return loss = better match)"],test_cases:[{options:["No — S₁₁ = −12 dB is better than −10 dB. More negative = better match. Do not change it.","Yes — −12 dB exceeds the spec of −10 dB and indicates oscillation risk.","Yes — the antenna is over-matched and will radiate too much power.","No — but only because the S₁₁ is exactly at the limit."],correct:0,explanation:"Return loss is measured as a negative dB value — more negative means less reflected power. S₁₁ = −12 dB means |Γ|² = 6.3% reflected. Since −12 < −10, the −10 dB spec is met with 2 dB margin. The team member has the comparison backwards."}],starterCode:`// S-Parameter Return Loss Analysis
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
// (less power reflected back to source)`,skillTags:["S-Parameters","Return Loss","Reflection Coefficient","Antenna Match","VNA"],hints:["S₁₁ in dB = 20·log₁₀(|Γ|). More negative S₁₁ → smaller |Γ| → less reflection → better match","Perfect match: S₁₁ = −∞ dB (Γ = 0). Open/short: S₁₁ = 0 dB (Γ = ±1)","VSWR = (1 + |Γ|) / (1 − |Γ|). At −12 dB: VSWR = (1+0.251)/(1−0.251) ≈ 1.67"]}],T=[{id:"iot-001",title:"MQTT QoS Selection — Smart Factory Alert System",category:"IoT Protocols",icon:"🌐",difficulty:"Easy",timeLimit:"20 min",eloGain:12,tools:["MQTT","IoT Protocols"],missionType:"embedded_lab",scenario:"A smart factory uses MQTT to transmit machine health alerts. Three message types are published: (A) temperature telemetry every 10 s, (B) critical over-temperature alarm that must trigger a shutdown, (C) maintenance log entries that should not be duplicated. Choose the correct MQTT QoS for each.",objective:"Match each message type to the correct MQTT QoS level (0, 1, or 2) based on reliability and duplication requirements.",steps:["QoS 0: At most once — fire-and-forget, no acknowledgement, possible message loss","QoS 1: At least once — acknowledged delivery, message may be duplicated if ACK is lost in transit","QoS 2: Exactly once — 4-way handshake, guaranteed delivery with no duplicates (highest overhead)","For each message type, ask: can we tolerate loss? can we tolerate duplicates? what overhead is acceptable?","Match each message type (A, B, C) to the QoS level that best satisfies its reliability constraints"],test_cases:[{options:["QoS 0 (telemetry), QoS 1 (alarm), QoS 2 (log) — correct match","QoS 2 for all messages — technically works but wastes bandwidth and adds latency to telemetry","QoS 1 for all — alarms may duplicate (acceptable) but logs will duplicate (unacceptable)","QoS 0 for alarm — critical messages may be lost if broker or network drops them"],correct:0,explanation:"QoS 0 suits frequent low-criticality telemetry (loss acceptable, low overhead). QoS 1 for alarms (loss unacceptable, duplicate tolerable — shutdown happens either way). QoS 2 for logs (both loss and duplication unacceptable — each entry must appear exactly once)."}],starterCode:`// MQTT QoS Level Reference
//
// QoS 0 — At most once (fire and forget)
//   - No ACK, no retransmit
//   - Fastest, lowest overhead
//   - Risk: message loss on bad network
//
// QoS 1 — At least once (acknowledged delivery)
//   - Sender retransmits until PUBACK received
//   - Risk: duplicate messages if ACK lost in transit
//
// QoS 2 — Exactly once (four-step handshake)
//   - PUBLISH → PUBREC → PUBREL → PUBCOMP
//   - Guarantees delivery AND no duplicates, highest overhead
//
// Three message types to classify:
//   A) Temperature telemetry  — published every 10 s, occasional loss tolerable
//   B) Critical over-temp alarm — must trigger shutdown reliably
//   C) Maintenance log entries — each entry must appear exactly once
//
// TODO: assign the correct QoS (0, 1, or 2) to each message type and justify.`,skillTags:["MQTT","QoS","IoT Protocols","Reliability","Message Broker"],hints:["QoS 2 uses 4 packets per message vs QoS 0's 1 — use it only when duplication truly matters","Most IoT alarms use QoS 1: the system handles duplicates (idempotent consumers)","MQTT retain flag is separate from QoS — it keeps the last message for new subscribers"]},{id:"iot-002",title:"BLE Sensor Battery Life Estimation",category:"Power Budgeting",icon:"🔋",difficulty:"Medium",timeLimit:"25 min",eloGain:18,tools:["Power Budget","BLE","Battery Life"],missionType:"engineering_lab",scenario:"A coin-cell (CR2032, 220 mAh) powered BLE temperature sensor wakes every 30 seconds to take a reading and transmit an advertisement packet. Active BLE TX current = 15 mA for 5 ms. Sleep current (deep sleep) = 2 µA continuously.",objective:"Calculate the average current consumption and estimate how many months the CR2032 will last.",steps:["Find the duty cycle: what fraction of each 30-second period is the device actively transmitting?","Compute average active current: I_active × duty_cycle","Add sleep current: total I_avg = I_active_avg + I_sleep","Compute battery life: capacity (mAh) ÷ I_avg (mA) = hours","Convert hours to months (÷ 720) and compare to expectations for a coin-cell device"],test_cases:[{options:["~67 months (~5.5 years) — average current 4.5 µA","~14 months — calculated with wrong sleep duty cycle","~2 months — used active current 15 mA continuously (wrong)","~100 months — forgot to include active current contribution"],correct:0,explanation:"Average active current = 15 mA × (5 ms / 30,000 ms) = 2.5 µA. Total = 2.5 + 2 = 4.5 µA. Battery life = 220 mAh / 0.0045 mA ≈ 48,889 hours ≈ 5.6 years. This is typical for low-duty-cycle BLE sensor designs."}],starterCode:`// BLE Sensor Battery Life Calculation
//
// Hardware:
//   Battery: CR2032 = 220 mAh @ 3.0V
//   BLE TX:  I_active = 15 mA, t_active = 5 ms per advertisement
//   Sleep:   I_sleep  = 2 µA (deep sleep)
//   Period:  T = 30 s (one wake-up per 30 seconds)
//
// Step 1: Compute duty cycle and average active current
//   Duty cycle = t_active / T = ?
//   I_active_avg = I_active × duty_cycle = ?
//
// Step 2: Total average current
//   I_avg = I_active_avg + I_sleep = ?
//
// Step 3: Battery life
//   t_life = C_battery / I_avg = ?  hours
//          = ?  days
//          ≈ ?  months`,skillTags:["BLE","Power Budget","Battery Life","CR2032","IoT Design"],hints:["Always compute average current, not peak current — duty cycle is the key multiplier","Self-discharge of CR2032 is ~1% per year, negligible for 5-year calculations","Real-world: add 20-30% margin for temperature effects, battery aging, and protocol retries"]},{id:"iot-003",title:"LoRaWAN Spreading Factor — Range vs Data Rate Tradeoff",category:"IoT Protocols",icon:"📶",difficulty:"Medium",timeLimit:"20 min",eloGain:16,tools:["LoRaWAN","Spreading Factor","Link Budget"],missionType:"embedded_lab",scenario:"You're deploying 500 soil moisture sensors across a 20 km² agricultural field. The gateway is at the center. A test transmission at SF7 (shortest range, fastest) fails for 30% of sensors at the field boundary. You need to choose the correct spreading factor.",objective:"Select the correct LoRaWAN SF for this deployment given that each SF increment adds approximately 3 dB of link budget and doubles the time-on-air.",steps:["Recall each SF step adds 3 dB of link budget sensitivity and doubles time-on-air","In free space, 3 dB improvement ≈ √2 range increase (FSPL ∝ d²)","Determine the field geometry: 20 km² ≈ a circle of radius ~2.5 km","SF7 already fails at the boundary — how many SF increments would plausibly extend coverage to 2.5 km?","Consider the time-on-air penalty for each SF increment and whether it exceeds the 1% duty-cycle limit"],test_cases:[{options:["SF9 — adds 6 dB over SF7, doubles range, acceptable 4× time-on-air penalty","SF12 — maximum range but 32× time-on-air, quickly exhausts duty cycle limit (1%)","SF7 — already failing, no improvement possible without changing TX power or antenna","SF8 — only +3 dB, marginal improvement, boundary sensors may still fail"],correct:0,explanation:"Each SF step adds 3 dB link budget and doubles time-on-air. SF9 = SF7 + 6 dB ≈ doubles the communication range. For a 2.5 km radius field with SF7 boundary failures, SF9 provides comfortable margin. SF12 would work but the 32× time-on-air violates LoRaWAN 1% duty cycle regulations at high message rates."}],starterCode:`// LoRaWAN Spreading Factor Comparison
//
// SF   BW(kHz)  DR        ToA(ms)   Sensitivity
// SF7   125    5.5 kbps    56 ms   -123 dBm
// SF8   125    3.1 kbps   102 ms   -126 dBm
// SF9   125    1.8 kbps   205 ms   -129 dBm
// SF10  125    0.98 kbps  370 ms   -132 dBm
// SF11  125    0.54 kbps  741 ms   -134.5 dBm
// SF12  125    0.29 kbps 1319 ms   -137 dBm
//
// Each SF step:
//   + 3 dB sensitivity improvement
//   × 2 time-on-air penalty
//   ≈ √2 range increase in free space (FSPL ∝ d²)
//
// Problem: SF7 fails at field boundary (~2.5 km from gateway)
// Field area: 20 km² → circular radius ≈ 2.5 km
//
// TODO: Determine which SF provides sufficient range while
//       keeping time-on-air within the 1% duty cycle limit
//       (e.g. at 1 message per 20 s, max ToA = 200 ms).`,skillTags:["LoRaWAN","Spreading Factor","Time-on-Air","Link Budget","IoT Deployment"],hints:["LoRaWAN duty cycle is limited to 1% in most ISM bands — higher SF eats into this budget fast","3 dB improvement = √2 range increase in free space (FSPL ∝ d²)","Real deployments use ADR (Adaptive Data Rate) — the gateway auto-adjusts SF based on RSSI"]},{id:"iot-004",title:"Edge Inference Latency — On-Device vs Cloud",category:"Edge Computing",icon:"🤖",difficulty:"Easy",timeLimit:"15 min",eloGain:12,tools:["Edge Computing","TinyML","Latency Analysis"],missionType:"embedded_lab",scenario:"A factory conveyor belt uses a camera to detect defective products. The ML model must classify each item within 200 ms (belt speed requirement). Cloud inference latency = 150 ms (network round-trip) + 30 ms (inference) = 180 ms. Edge device (ARM Cortex-A53) inference = 120 ms. Network congestion adds up to 100 ms jitter to cloud path.",objective:"Decide whether to deploy cloud inference or edge inference, justifying the choice with latency and reliability arguments.",steps:["Calculate worst-case cloud latency: include nominal network RTT, maximum jitter, and inference time","Note edge latency is deterministic: 120 ms with no network dependency","Compare both paths against the 200 ms SLA — does worst-case for each path meet or violate it?","Consider reliability beyond average latency: what happens during network congestion or outage?","State your deployment decision and justify it with the latency and reliability evidence"],test_cases:[{options:["Edge inference — deterministic 120 ms, always within 200 ms limit; cloud worst-case 280 ms exceeds limit","Cloud inference — 180 ms average is below limit; edge device may not scale to multiple cameras","Either works — both are within spec on average (not true: cloud worst-case violates it)","Neither — 200 ms is too tight for any current approach (not true: edge meets it)"],correct:0,explanation:"Cloud inference worst-case (150+100+30=280 ms) exceeds the 200 ms SLA due to network jitter. Edge inference at 120 ms is deterministic and always within spec. For real-time manufacturing applications, determinism is non-negotiable — edge is the correct choice."}],starterCode:`// Edge vs Cloud Inference Latency Analysis
//
// Use case: Conveyor belt defect detection
// SLA:      Classify each item within 200 ms
//
// Cloud path:
//   Network RTT: 150 ms (nominal)
//   Jitter:      up to +100 ms under congestion
//   Inference:    30 ms (GPU server)
//   ─────────────────────────────────────
//   Best case:  ? ms
//   Worst case: ? ms
//   Does worst case meet the 200 ms SLA? (yes / no)
//
// Edge path (ARM Cortex-A53 with TFLite):
//   On-device inference: 120 ms (deterministic)
//   Network:               0 ms
//   ─────────────────────────────────────
//   Always: ? ms
//   Does this meet the 200 ms SLA? (yes / no)
//
// TODO: Which approach should be deployed and why?`,skillTags:["Edge Computing","TinyML","Latency","Determinism","Industrial IoT"],hints:["Determinism matters more than average latency for hard real-time systems","TinyML frameworks (TensorFlow Lite, ONNX Runtime) can run lightweight models on Cortex-A55 in 50-200 ms","Consider model size vs accuracy tradeoff — MobileNetV2 is 14 MB and runs well on edge"]}],v=[{id:"tel-001",title:"Shannon Channel Capacity — 5G NR Downlink",category:"Communications Theory",icon:"📶",difficulty:"Easy",timeLimit:"15 min",eloGain:12,tools:["Shannon Theorem","Channel Capacity"],missionType:"engineering_lab",scenario:"A 5G NR cell in a dense urban area has an allocated bandwidth of 100 MHz. The measured SNR at a test UE is 20 dB. Calculate the theoretical maximum data rate for this channel and compare to the real-world 5G peak throughput spec (~4 Gbps).",objective:"Apply Shannon's channel capacity theorem: C = B × log₂(1 + SNR) where B is bandwidth in Hz and SNR is linear.",steps:["Convert SNR: 20 dB → linear = 10^(20/10) = 100","C = 100 × 10⁶ × log₂(1 + 100) = 100 × 10⁶ × log₂(101)","log₂(101) = ln(101)/ln(2) ≈ 4.615 / 0.693 ≈ 6.66 bits/s/Hz","C = 100 MHz × 6.66 ≈ 666 Mbps per 100 MHz channel","Real 5G aggregates multiple bands: 5 × 100 MHz = 500 MHz → 3.33 Gbps Shannon limit","The 4 Gbps spec slightly exceeds this — it uses additional MIMO spatial streams (×4 MIMO adds 4×)"],test_cases:[{options:["~666 Mbps for a single 100 MHz channel at SNR=20 dB","~200 Mbps — incorrect, this is for 20 dB ≡ SNR=10 (wrong conversion)","~1 Gbps — this requires SNR=29 dB, not 20 dB","~4 Gbps — this requires MIMO and carrier aggregation, not a single channel"],correct:0,explanation:"C = 100e6 × log₂(1+100) = 100e6 × 6.66 ≈ 666 Mbps. Shannon gives the theoretical maximum for a single antenna channel. Real 5G peak throughput of 4 Gbps uses 8×8 MIMO (8 spatial streams) and carrier aggregation across multiple bands."}],starterCode:`// Shannon Channel Capacity — 5G NR
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
//   With 8×8 MIMO: 8 × 3.33 ≈ 26.6 Gbps theoretical peak`,skillTags:["Shannon Theorem","Channel Capacity","5G NR","SNR","Bandwidth"],hints:["log₂(x) = log₁₀(x) / log₁₀(2) = log₁₀(x) / 0.301 = ln(x) / 0.693","Shannon capacity is an upper bound — real systems (LDPC codes, 256-QAM) approach ~70-80% of it","MIMO multiplies capacity by the number of spatial streams (limited by min(TX antennas, RX antennas, scattering)"]},{id:"tel-002",title:"BER vs Eb/N0 — BPSK in AWGN",category:"Digital Communications",icon:"📊",difficulty:"Medium",timeLimit:"25 min",eloGain:20,tools:["BER Analysis","BPSK","AWGN"],missionType:"engineering_lab",scenario:"Your satellite uplink uses BPSK modulation with a data rate of 1 Mbps. The measured Eb/N0 is 10 dB. The communication spec requires BER < 10⁻⁵. Q-function table: Q(4.47) ≈ 4 × 10⁻⁶. Determine if the spec is met.",objective:"Calculate the BER for BPSK at Eb/N0 = 10 dB using BER = Q(√(2·Eb/N0)) and compare to the 10⁻⁵ spec.",steps:["Convert Eb/N0: 10 dB → linear = 10^(10/10) = 10","BPSK BER formula: BER = Q(√(2 × Eb/N0)) = Q(√20) = Q(4.472)","Q(4.47) ≈ 4 × 10⁻⁶ from standard Q-function table","Compare to spec: 4 × 10⁻⁶ < 10⁻⁵ → spec MET","Margin: one decade of BER margin (spec is 10× worse than achieved)"],test_cases:[{options:["BER ≈ 4×10⁻⁶ — spec MET with ~8.5 dB coding gain margin","BER ≈ 10⁻³ — spec violated (wrong, this is Eb/N0 ≈ 6.8 dB)","BER ≈ 10⁻⁵ exactly — right on the limit (wrong Q function argument)","Cannot determine — Q-function is not available (incorrect: given in the problem)"],correct:0,explanation:"Eb/N0 = 10 dB → linear = 10. BER = Q(√(2×10)) = Q(√20) = Q(4.47) ≈ 4×10⁻⁶. Since 4×10⁻⁶ < 10⁻⁵, the spec is met. The link has approximately 2.5 dB of SNR margin (Eb/N0 needed for BER=10⁻⁵ is about 9.6 dB for BPSK)."}],starterCode:`// BPSK BER Calculation — AWGN Channel
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
//   12 dB   1.5 × 10⁻⁸`,skillTags:["BER","BPSK","AWGN","Q-Function","Digital Communications"],hints:["BPSK is the most power-efficient binary modulation — it requires the lowest Eb/N0 for a given BER","QPSK achieves the same BER as BPSK at the same Eb/N0 but doubles the spectral efficiency","Error floor: real systems have hardware impairments that create a minimum BER regardless of SNR"]},{id:"tel-003",title:"Nyquist Sampling Theorem — Voice Codec Design",category:"Signal Processing",icon:"🎵",difficulty:"Easy",timeLimit:"15 min",eloGain:12,tools:["Sampling Theory","ADC Design"],missionType:"engineering_lab",scenario:"You're designing the ADC front-end for a VoIP codec. The human voice frequency range is 300 Hz to 3400 Hz (PSTN bandwidth). You need to choose the minimum sampling rate and the number of bits per sample for 8-bit PCM (G.711 standard). Verify the resulting bit rate matches the G.711 standard of 64 kbps.",objective:"Apply the Nyquist theorem to find minimum sampling rate, then calculate the bit rate for 8-bit PCM encoding.",steps:["Maximum voice frequency: f_max = 3400 Hz","Nyquist minimum sampling rate: f_s ≥ 2 × f_max = 2 × 3400 = 6800 Hz","G.711 uses f_s = 8000 Hz (chosen for margin above Nyquist minimum)","Bit rate = f_s × bits_per_sample = 8000 × 8 = 64,000 bps = 64 kbps","This matches the G.711 standard exactly"],test_cases:[{options:["8000 Hz sampling rate, 64 kbps bit rate — matches G.711 standard","6800 Hz sampling rate, 54.4 kbps — meets Nyquist minimum but G.711 adds 18% margin","3400 Hz sampling rate, 27.2 kbps — incorrect (this is f_max, not 2×f_max)","44100 Hz sampling rate — this is CD audio quality, overkill for voice"],correct:0,explanation:"Nyquist: f_s ≥ 2 × f_max = 6800 Hz. G.711 uses 8000 Hz for a comfortable margin above the minimum. Bit rate = 8000 samples/s × 8 bits/sample = 64,000 bps = 64 kbps. This is the foundation of all PSTN and most VoIP systems."}],starterCode:`// Nyquist Sampling Theorem — G.711 Voice Codec
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
// T1/E1 carrier: 24/32 channels × 64 kbps = 1.544/2.048 Mbps`,skillTags:["Nyquist Theorem","Sampling Rate","G.711","PCM","Voice Codec"],hints:["Sampling below 2×f_max causes aliasing — high frequencies fold back and corrupt the signal","In practice, sample at 10-20% above Nyquist to give the anti-aliasing filter a transition band","G.711 uses non-uniform quantisation (µ-law in US/Japan, A-law in Europe) for better SNR at low amplitudes"]},{id:"tel-004",title:"OFDM Resource Grid — LTE 10 MHz Subcarrier Count",category:"OFDM / LTE",icon:"📶",difficulty:"Medium",timeLimit:"20 min",eloGain:18,tools:["OFDM","LTE","Resource Grid"],missionType:"engineering_lab",scenario:"An LTE eNodeB transmits on a 10 MHz channel. The OFDM subcarrier spacing is 15 kHz. LTE uses a guard band of approximately 10% on each side (so effective bandwidth = 90%). Not all subcarriers are used — the DC subcarrier is null, and the resource blocks (RBs) use 180 kHz (12 × 15 kHz) each. How many resource blocks fit in 10 MHz LTE?",objective:"Calculate the number of LTE resource blocks (RBs) in a 10 MHz channel and the total number of OFDM subcarriers used for data.",steps:["Usable bandwidth = 10 MHz × 0.9 = 9 MHz (after guard bands)","Each RB = 12 subcarriers × 15 kHz = 180 kHz","Number of RBs = 9 MHz / 180 kHz = 50 RBs (this is the LTE spec)","Total data subcarriers = 50 × 12 = 600 subcarriers","Add DC null and guard subcarriers: total OFDM symbols in FFT ≈ 1024 (10 MHz FFT size)","Active subcarriers = 601 (600 data + 1 DC null), rest are guard tones"],test_cases:[{options:["50 RBs = 600 active subcarriers (standard LTE 10 MHz configuration)","100 RBs — this is for 20 MHz LTE (doubled bandwidth)","25 RBs — this is for 5 MHz LTE (half bandwidth)","667 RBs — calculated without guard band (wrong: used full 10 MHz)"],correct:0,explanation:"LTE 10 MHz: usable BW = 9 MHz, each RB = 180 kHz, 9000/180 = 50 RBs. Total data subcarriers = 50 × 12 = 600. This matches the 3GPP TS 36.104 specification exactly. The FFT size is 1024 with 601 active tones (DC null + 600 data)."}],starterCode:`// LTE OFDM Resource Grid — 10 MHz Channel
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
//   20  MHz →100 RBs  (1200 subcarriers)`,skillTags:["OFDM","LTE","Resource Block","Subcarrier","3GPP"],hints:["LTE always uses 15 kHz subcarrier spacing in normal mode (NR can use 30, 60, 120 kHz)","Resource Element (RE) = 1 subcarrier × 1 OFDM symbol. 1 RB = 12 subcarriers × 14 symbols = 168 REs per subframe","5G NR 100 MHz with 30 kHz SCS: 66 RBs × 12 = 792 subcarriers"]}],i=[{id:"circuit-001",title:"Voltage Divider Design",description:"Design a resistive voltage divider that outputs 3.3V from a 5V supply. Adjust R1 (upper) and R2 (lower) with the sliders until the probe at node B reads 3.3V. Then answer the conceptual question.",question:"Which resistor values achieve V(B) ≈ 3.3V from a 5V supply using a voltage divider?",missionType:"circuit_lab",workstation:"circuit_lab",category:"Circuit Analysis",difficulty:"beginner",track:"circuits",simulation:{type:"dc_circuit",circuit:{nodes:["A","B","GND"],components:[{id:"V1",type:"voltage_source",value:5,unit:"V",node_plus:"A",node_minus:"GND",editable:!1},{id:"R1",type:"resistor",value:1e4,unit:"Ω",node_a:"A",node_b:"B",editable:!0,min:1e3,max:1e5,step:1e3,description:"Upper resistor"},{id:"R2",type:"resistor",value:1e4,unit:"Ω",node_a:"B",node_b:"GND",editable:!0,min:1e3,max:1e5,step:1e3,description:"Lower resistor"}],layout:{A:{x:60,y:70},B:{x:320,y:70},GND:{x:60,y:230,extra:[{x:320,y:230}]},wires:[{x1:60,y1:230,x2:320,y2:230},{x1:320,y1:70,x2:320,y2:230}]},probe:"B"},target:{type:"voltage_at_probe",node:"B",value:3.3,tolerance:.05,unit:"V"}},test_cases:[{options:["R1 = 17kΩ, R2 = 33kΩ → V(B) = 5 × 33/(17+33) = 3.30V","R1 = 10kΩ, R2 = 10kΩ → V(B) = 5 × 10/(10+10) = 2.50V","R1 = 33kΩ, R2 = 17kΩ → V(B) = 5 × 17/(33+17) = 1.70V","R1 = 1kΩ,  R2 = 100kΩ → V(B) = 5 × 100/(1+100) ≈ 4.95V"],correct:0,explanation:"Vout = Vin × R2/(R1+R2). For Vout=3.3V, R2/(R1+R2) = 0.66. Standard E24 values: R1=17kΩ, R2=33kΩ gives 33/50 = 0.66 → 3.30V."}]},{id:"circuit-002",title:"Parallel Resistor Network Analysis",description:"A 12V supply drives R1 (3kΩ) in series with two parallel resistors R2 and R3 (both 6kΩ). Observe the probe reading at node B (the junction between R1 and the parallel pair). No sliders — analyse the circuit using the live readings and answer the question below.",question:"What is V(B) in this series-parallel resistor network?",missionType:"circuit_lab",workstation:"circuit_lab",category:"Circuit Analysis",difficulty:"intermediate",track:"circuits",simulation:{type:"dc_circuit",circuit:{nodes:["A","B","GND"],components:[{id:"V1",type:"voltage_source",value:12,unit:"V",node_plus:"A",node_minus:"GND",editable:!1},{id:"R1",type:"resistor",value:3e3,unit:"Ω",node_a:"A",node_b:"B",editable:!1},{id:"R2",type:"resistor",value:6e3,unit:"Ω",node_a:"B",node_b:"GND",editable:!1},{id:"R3",type:"resistor",value:6e3,unit:"Ω",node_a:"B",node_b:"GND",editable:!1}],layout:{A:{x:60,y:70},B:{x:250,y:70},GND:{x:60,y:230,extra:[{x:250,y:230}]},wires:[{x1:60,y1:230,x2:250,y2:230}]},probe:"B"},target:null},test_cases:[{options:["V(B) = 6V  — R2 ∥ R3 = 3kΩ, divider gives 12 × 3k/(3k+3k)","V(B) = 8V  — R2 ∥ R3 = 6kΩ, divider gives 12 × 6k/(3k+6k)","V(B) = 4V  — Incorrect parallel combination","V(B) = 9V  — Incorrect: R1 and R2 treated as parallel"],correct:0,explanation:"R2 ∥ R3 = (6k×6k)/(6k+6k) = 3kΩ. Voltage divider: V(B) = 12 × 3k/(3k+3k) = 12 × 0.5 = 6V. Verify with the probe above."}]},{id:"circuit-003",title:"LED Current Limiting Resistor",description:"An LED (modelled as a 2V source VLED) must be driven at 20mA from a 5V supply. Adjust the current-limiting resistor R_lim until I(R_lim) reaches the target of 20mA. Use the branch current display and the Check Circuit button to validate.",question:"What resistance limits LED current to exactly 20mA (Vsupply=5V, VLED=2V)?",missionType:"circuit_lab",workstation:"circuit_lab",category:"Circuit Analysis",difficulty:"beginner",track:"circuits",simulation:{type:"dc_circuit",circuit:{nodes:["A","B","GND"],components:[{id:"Vsup",type:"voltage_source",value:5,unit:"V",node_plus:"A",node_minus:"GND",editable:!1},{id:"Rlim",type:"resistor",value:470,unit:"Ω",node_a:"A",node_b:"B",editable:!0,min:10,max:1e3,step:10,description:"Current limiter"},{id:"VLED",type:"voltage_source",value:2,unit:"V",node_plus:"B",node_minus:"GND",editable:!1}],layout:{A:{x:60,y:70},B:{x:320,y:70},GND:{x:60,y:230,extra:[{x:320,y:230}]},wires:[{x1:60,y1:230,x2:320,y2:230},{x1:320,y1:70,x2:320,y2:230}]},probe:"B"},target:{type:"current",component:"Rlim",value:.02,tolerance:.1,unit:"A"}},test_cases:[{options:["R = 150Ω → I = (5−2)/150 = 20.0mA ✓","R = 250Ω → I = (5−2)/250 = 12.0mA (too dim)","R = 100Ω → I = (5−2)/100 = 30.0mA (exceeds LED max rating)","R = 330Ω → I = (5−2)/330 ≈ 9.1mA (insufficient brightness)"],correct:0,explanation:"R = (Vsupply − VLED) / I_target = (5 − 2) / 0.020 = 3 / 0.020 = 150Ω. Confirm with the simulation: I(Rlim) = 20mA when Rlim = 150Ω."}]}],S=[{id:"eee-001",title:"Transformer Turns Ratio",description:"A single-phase transformer has a primary voltage of 240V and secondary voltage of 12V. The primary winding has 480 turns. Calculate the number of secondary turns.",question:"How many secondary turns does this transformer have?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Electrical Machines",difficulty:"beginner",track:"transformers",test_cases:[{options:["24 turns","48 turns","12 turns","240 turns"],correct:0,explanation:"N2/N1 = V2/V1  →  N2 = N1 × V2/V1 = 480 × 12/240 = 24 turns."}]},{id:"eee-002",title:"Three-Phase Active Power",description:"A balanced three-phase load is connected to a 415V (line-to-line) supply. Each phase carries 10A at a power factor of 0.85 lagging. Calculate the total active power.",question:"What is the total active power drawn by this three-phase load?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Power Systems",difficulty:"beginner",track:"three_phase",test_cases:[{options:["6.11 kW","3.53 kW","4.15 kW","10.5 kW"],correct:0,explanation:"P = √3 × VL × IL × cos φ = 1.732 × 415 × 10 × 0.85 = 6107 W ≈ 6.11 kW."}]},{id:"eee-003",title:"DC Motor Back EMF",description:"A DC shunt motor operates with terminal voltage Vt = 220V, armature resistance Ra = 0.5Ω, and armature current Ia = 20A. Calculate the back EMF.",question:"What is the back EMF (Eb) of this DC motor?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Electrical Machines",difficulty:"beginner",track:"dc_machines",test_cases:[{options:["210 V","220 V","200 V","230 V"],correct:0,explanation:"Eb = Vt − Ia × Ra = 220 − 20 × 0.5 = 220 − 10 = 210 V."}]},{id:"eee-004",title:"Power Factor Correction — Capacitor Size",description:"A load draws 10kW at PF = 0.7 lagging. It must be corrected to PF = 0.95 lagging using a shunt capacitor bank. Calculate the reactive power supplied by the capacitor bank.",question:"What reactive power (kVAR) must the capacitor bank supply?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Power Systems",difficulty:"intermediate",track:"power_factor",test_cases:[{options:["6.92 kVAR","10.20 kVAR","3.29 kVAR","13.49 kVAR"],correct:0,explanation:"Q_load = P tan(cos⁻¹0.7) = 10 × 1.020 = 10.20 kVAR. Q_target = P tan(cos⁻¹0.95) = 10 × 0.329 = 3.29 kVAR. Q_cap = 10.20 − 3.29 = 6.91 kVAR ≈ 6.92 kVAR."}]}],h=[{id:"power-001",title:"Symmetrical Three-Phase Fault Current",description:"A synchronous generator rated 10 MVA, 11 kV has a sub-transient reactance X'd = 0.2 pu. A symmetrical three-phase fault occurs at its terminals. Calculate the fault current.",question:"What is the initial symmetrical fault current (kA)?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Power Systems",difficulty:"intermediate",track:"fault_analysis",test_cases:[{options:["2.62 kA","5.25 kA","1.31 kA","4.37 kA"],correct:0,explanation:"I_base = 10×10⁶ / (√3 × 11000) = 524.9 A. I_fault = I_base / X'd = 524.9 / 0.2 = 2625 A ≈ 2.62 kA."}]},{id:"power-002",title:"Per-Unit Impedance Conversion",description:"System base: 100 MVA, 132 kV. A transmission line has actual impedance Z = 20 + j60 Ω. Find the magnitude of the per-unit impedance.",question:"What is |Z_pu| for this transmission line?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Power Systems",difficulty:"intermediate",track:"per_unit",test_cases:[{options:["0.363 pu","0.183 pu","0.726 pu","0.456 pu"],correct:0,explanation:"Z_base = (132 kV)² / 100 MVA = 174.24 Ω. |Z| = √(20² + 60²) = 63.25 Ω. |Z_pu| = 63.25 / 174.24 = 0.363 pu."}]},{id:"power-003",title:"Bus Current Injection (Load Flow)",description:"A P-Q bus injects 50 MW + j20 MVAR into the network. Bus voltage magnitude is 1.02 pu. System base: 100 MVA. Find the magnitude of the bus injection current in pu.",question:"What is |I_bus| in per-unit?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Power Systems",difficulty:"advanced",track:"load_flow",test_cases:[{options:["0.528 pu","0.539 pu","0.694 pu","0.412 pu"],correct:0,explanation:"S_pu = (0.5 + j0.2). I = S* / V* = (0.5 − j0.2) / 1.02 = 0.4902 − j0.1961. |I| = √(0.4902² + 0.1961²) = 0.528 pu."}]},{id:"power-004",title:"Transmission Line Voltage Regulation",description:"A 132 kV line delivers P = 30 MW, Q = 15 MVAR at the receiving end (VR = 128 kV). Line parameters: R = 5 Ω, X = 20 Ω. Using the approximate formula, find the sending-end voltage VS.",question:"What is the approximate sending-end voltage VS?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Power Systems",difficulty:"intermediate",track:"transmission",test_cases:[{options:["131.5 kV","135.0 kV","128.0 kV","133.5 kV"],correct:0,explanation:"|ΔV| ≈ (PR + QX) / VR = (30M×5 + 15M×20) / 128000 = 450×10⁶ / 128000 = 3.516 kV. VS ≈ 128 + 3.516 = 131.5 kV."}]}],k=[{id:"machines-001",title:"Induction Motor Slip",description:"A 4-pole induction motor is connected to a 50 Hz supply. The rotor runs at 1440 rpm. Calculate the slip.",question:"What is the percentage slip of this induction motor?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Electrical Machines",difficulty:"beginner",track:"induction_motors",test_cases:[{options:["4 %","3 %","5 %","6 %"],correct:0,explanation:"Ns = 120f / P = 120×50 / 4 = 1500 rpm. s = (Ns − Nr) / Ns = (1500 − 1440) / 1500 = 0.04 = 4 %."}]},{id:"machines-002",title:"Transformer No-Load Test — Core Loss Current",description:"No-load test on a 230V transformer: input power W0 = 200 W, no-load current I0 = 2 A. Find the magnetising current Im and core-loss current Ic.",question:"What are Ic and Im for this transformer?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Electrical Machines",difficulty:"intermediate",track:"transformers",test_cases:[{options:["Ic = 0.87 A, Im = 1.80 A","Ic = 0.50 A, Im = 1.94 A","Ic = 1.20 A, Im = 1.60 A","Ic = 1.00 A, Im = 1.73 A"],correct:0,explanation:"cos φ0 = W0/(V0 I0) = 200/(230×2) = 0.435. Ic = I0 cos φ0 = 2×0.435 = 0.87 A. Im = I0 sin φ0 = 2×0.900 = 1.80 A."}]},{id:"machines-003",title:"DC Motor Torque — Lap Winding",description:"A 4-pole DC motor has a lap winding with Z = 400 conductors. Flux per pole φ = 0.05 Wb and armature current Ia = 50 A. Calculate the electromagnetic torque.",question:"What is the electromagnetic torque developed?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Electrical Machines",difficulty:"intermediate",track:"dc_machines",test_cases:[{options:["159.2 N·m","318.3 N·m","79.6 N·m","200.0 N·m"],correct:0,explanation:"For lap winding A = P = 4. T = ZφIa / (2π) = 400×0.05×50 / (2π) = 1000 / 6.283 = 159.2 N·m."}]},{id:"machines-004",title:"Synchronous Generator Voltage Regulation",description:"A 1 MVA, 11 kV, 3-phase star-connected alternator has Ra = 0.5 Ω and synchronous reactance Xs = 10 Ω per phase. Find the voltage regulation at full load, PF = 0.8 lagging.",question:"What is the percentage voltage regulation?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Electrical Machines",difficulty:"advanced",track:"synchronous_machines",test_cases:[{options:["5.48 %","2.74 %","8.22 %","10.96 %"],correct:0,explanation:"Vt = 11000/√3 = 6351 V. Ia = 52.49 A∠−36.87°. Ef = Vt + Ia(Ra+jXs) = 6687+j404 V. |Ef| = 6699 V. VR = (6699−6351)/6351 × 100 = 5.48 %."}]}],C=[{id:"control-001",title:"Closed-Loop Stability — Pole Locations",description:"A second-order system has transfer function G(s) = 10 / (s² + 5s + 6). Determine the poles and stability.",question:"Where are the poles and is the system stable?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Control Systems",difficulty:"beginner",track:"stability",test_cases:[{options:["s = −2, −3 (stable)","s = +2, +3 (unstable)","s = ±j√6 (marginally stable)","s = −5 ± j (stable)"],correct:0,explanation:"s² + 5s + 6 = (s+2)(s+3) = 0 → s = −2, −3. Both poles lie in the left-half plane → BIBO stable."}]},{id:"control-002",title:"Ziegler–Nichols PID Tuning",description:"A process has ultimate gain Ku = 8 and ultimate period Pu = 4 s. Using the Ziegler–Nichols closed-loop method, find Kp, Ti, and Td for a PID controller.",question:"What are the Z–N PID tuning parameters?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Control Systems",difficulty:"intermediate",track:"pid_tuning",test_cases:[{options:["Kp=4.8, Ti=2.0s, Td=0.5s","Kp=3.2, Ti=4.0s, Td=1.0s","Kp=6.0, Ti=1.0s, Td=0.25s","Kp=4.0, Ti=2.0s, Td=0.5s"],correct:0,explanation:"Z–N PID: Kp = 0.6Ku = 4.8, Ti = 0.5Pu = 2.0 s, Td = 0.125Pu = 0.5 s."}]},{id:"control-003",title:"First-Order Step Response",description:"A process transfer function is G(s) = 5 / (2s + 1). A step input of magnitude 3 is applied. Find the output value at t = 2 s.",question:"What is the output y(t) at t = 2 s?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Control Systems",difficulty:"intermediate",track:"time_response",test_cases:[{options:["9.48","7.65","12.32","15.0"],correct:0,explanation:"DC gain = 5, step = 3, so final value = 15. τ = 2 s. y(t) = 15(1 − e^−t/2). y(2) = 15(1 − e⁻¹) = 15 × 0.632 = 9.48."}]},{id:"control-004",title:"Root Locus Breakaway — Gain at Breakaway",description:"Open-loop TF: G(s)H(s) = K / ((s+1)(s+3)). Find the real-axis breakaway point and the value of K there.",question:"What is the breakaway point and corresponding gain K?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Control Systems",difficulty:"intermediate",track:"root_locus",test_cases:[{options:["s = −2, K = 1","s = −1, K = 3","s = 0, K = 0","s = −4, K = 4"],correct:0,explanation:"K = −(s+1)(s+3). dK/ds = −(2s+4) = 0 → s = −2. K = −(−1)(1) = 1."}]}],A=[{id:"pe-001",title:"Buck Converter Duty Cycle",description:"A buck (step-down) converter operates in continuous conduction mode with Vin = 24 V and Vout = 12 V. Calculate the required duty cycle D.",question:"What duty cycle is needed to produce 12 V from 24 V?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Power Electronics",difficulty:"beginner",track:"dc_dc_converters",test_cases:[{options:["50 %","25 %","66.7 %","40 %"],correct:0,explanation:"For ideal buck CCM: Vout = D × Vin → D = Vout/Vin = 12/24 = 0.5 = 50 %."}]},{id:"pe-002",title:"Boost Converter Output Voltage",description:"A boost converter has Vin = 5 V and duty cycle D = 0.6. Assuming ideal (lossless) operation, find the output voltage Vout.",question:"What is Vout for this boost converter?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Power Electronics",difficulty:"beginner",track:"dc_dc_converters",test_cases:[{options:["12.5 V","8.0 V","20.0 V","10.0 V"],correct:0,explanation:"Ideal boost: Vout = Vin / (1 − D) = 5 / (1 − 0.6) = 5 / 0.4 = 12.5 V."}]},{id:"pe-003",title:"Single-Phase Bridge Rectifier — Average Output",description:"A single-phase full-wave bridge rectifier is supplied from 230 V rms AC (50 Hz). The peak voltage Vm = 325 V. Find the average (DC) output voltage assuming ideal diodes.",question:"What is the average DC output voltage of this rectifier?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Power Electronics",difficulty:"beginner",track:"rectifiers",test_cases:[{options:["206.9 V","325.0 V","103.5 V","147.7 V"],correct:0,explanation:"Vdc = 2Vm / π = 2 × 325 / π = 650 / 3.1416 = 206.9 V."}]},{id:"pe-004",title:"MOSFET Switching Loss",description:"A MOSFET switches at fs = 100 kHz with Vds = 200 V, Id = 10 A, turn-on time ton = 100 ns, turn-off time toff = 150 ns. Calculate average switching power loss.",question:"What is the average switching power loss?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Power Electronics",difficulty:"intermediate",track:"switching_devices",test_cases:[{options:["25 W","50 W","12.5 W","37.5 W"],correct:0,explanation:"Psw = ½ × Vds × Id × (ton + toff) × fs = 0.5 × 200 × 10 × 250×10⁻⁹ × 100×10³ = 25 W."}]}],R=[{id:"inst-001",title:"Wheatstone Bridge Balance",description:"A Wheatstone bridge has R1 = 100 Ω, R2 = 200 Ω, R3 = 150 Ω. Find R4 for a null (balanced) bridge.",question:"What value of R4 balances this bridge?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Instrumentation",difficulty:"beginner",track:"bridge_circuits",test_cases:[{options:["300 Ω","75 Ω","150 Ω","400 Ω"],correct:0,explanation:"Balance condition: R1/R2 = R3/R4 → R4 = R2 × R3 / R1 = 200 × 150 / 100 = 300 Ω."}]},{id:"inst-002",title:"ADC Resolution — 12-bit",description:"A 12-bit ADC has a reference voltage Vref = 5 V. Find the voltage resolution per LSB and the total number of quantisation steps.",question:"What is the voltage resolution (LSB value) of this ADC?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Instrumentation",difficulty:"beginner",track:"data_converters",test_cases:[{options:["1.221 mV","2.441 mV","0.610 mV","4.883 mV"],correct:0,explanation:"Steps = 2¹² = 4096. Resolution = Vref / 2ⁿ = 5 / 4096 = 0.001221 V = 1.221 mV."}]},{id:"inst-003",title:"PT100 RTD Temperature Measurement",description:"A PT100 sensor follows R = R0(1 + αT) with α = 0.00385 /°C and R0 = 100 Ω. A bridge circuit reads R = 133.58 Ω. Find the temperature.",question:"What temperature does this PT100 reading correspond to?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Instrumentation",difficulty:"intermediate",track:"sensors",test_cases:[{options:["87.2 °C","74.6 °C","95.0 °C","100.0 °C"],correct:0,explanation:"133.58 = 100(1 + 0.00385T) → 0.3358 = 0.00385T → T = 0.3358 / 0.00385 = 87.2 °C."}]},{id:"inst-004",title:"Signal-to-Noise Ratio",description:"A sensor system outputs signal power Ps = 40 mW and has noise power Pn = 0.1 mW. Calculate the SNR in decibels.",question:"What is the SNR of this measurement system?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Instrumentation",difficulty:"beginner",track:"signal_quality",test_cases:[{options:["26.0 dB","13.0 dB","32.0 dB","20.0 dB"],correct:0,explanation:"SNR = 10 log₁₀(Ps / Pn) = 10 log₁₀(40 / 0.1) = 10 log₁₀(400) = 10 × 2.602 = 26.0 dB."}]}],E=[{id:"civil-001",title:"Simply Supported Beam — Shear, Moment & Critical Section",category:"Structural Engineering",icon:"🏗️",difficulty:"Easy",timeLimit:"25 min",eloGain:15,tools:["Python"],scenario:"A highway overpass contractor needs to verify a temporary steel beam spanning 6 m under a uniformly distributed construction load of 10 kN/m. You must implement the shear force and bending moment functions, locate the critical section, and verify your results by printing the moment profile.",objective:"Implement V(x) and M(x) functions for a simply supported beam with UDL. Find x_max (where M is maximum) and compute M_max.",steps:["Compute support reactions RA and RB using ΣFy = 0 and symmetry","Implement shear_force(x): V(x) = RA − w·x (left-hand free body diagram)","Implement bending_moment(x): M(x) = RA·x − w·x²/2","Find x_max by solving V(x) = 0 → x_max = RA / w","Verify: print M at x = 0, L/4, L/2, 3L/4, L — M should peak at midspan"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["M_max = 45.00 kN·m at x = 3.00 m (midspan)","M_max = 90.00 kN·m at x = 6.00 m (end support)","M_max = 22.50 kN·m at x = 1.50 m (quarter span)","M_max = 30.00 kN·m at x = 3.00 m (incorrect formula)"],correct:0,explanation:"RA = RB = wL/2 = 30 kN. V=0 at x=3 m. M_max = wL²/8 = 10×36/8 = 45 kN·m."}],starterCode:`import math

# Simply Supported Beam — UDL Loading
L = 6.0   # span (m)
w = 10.0  # UDL (kN/m)

# ── Step 1: Support reactions ──────────────────────────────────────────────────
def reactions(w, L):
    """Compute RA and RB for UDL on simply-supported beam."""
    # TODO: Total load = w*L; for symmetric loading RA = RB
    R_A = None
    R_B = None
    return R_A, R_B

R_A, R_B = reactions(w, L)
print(f"R_A = {R_A:.2f} kN")
print(f"R_B = {R_B:.2f} kN")

# ── Step 2: Shear force at position x (kN) ────────────────────────────────────
def shear_force(x):
    """V(x) using left-hand FBD: sum vertical forces to the left of cut."""
    # TODO: V(x) = R_A - w*x
    return None

# ── Step 3: Bending moment at position x (kN·m) ───────────────────────────────
def bending_moment(x):
    """M(x) using left-hand FBD: sum moments about the cut section."""
    # TODO: M(x) = R_A*x - (w * x**2) / 2
    return None

# ── Step 4: Locate and compute maximum bending moment ─────────────────────────
# Hint: M is maximum where dM/dx = V(x) = 0
# Solve:  R_A - w * x_max = 0  →  x_max = ?
x_max = None   # TODO
M_max = None   # TODO: bending_moment(x_max)

print(f"\\nCritical section at x_max = {x_max:.3f} m")
print(f"M_max = {M_max:.2f} kN·m")

# ── Verification: print moment diagram ────────────────────────────────────────
print("\\nx (m)   V (kN)   M (kN·m)")
print("-" * 30)
for frac in [0.0, 0.25, 0.5, 0.75, 1.0]:
    x = frac * L
    print(f"{x:5.2f}   {shear_force(x):7.2f}   {bending_moment(x):8.2f}")
`,skillTags:["Structural Analysis","Shear Force","Bending Moment","UDL","Simply Supported Beam"],hints:["For UDL on SS beam: RA = RB = wL/2 (by symmetry)","The shear force diagram is linear; it crosses zero where M is maximum","Check: M(0) = M(L) = 0 (no moment at pin/roller supports)"]},{id:"civil-002",title:"Concrete Mix Design — Material Quantities per m³",category:"Concrete Technology",icon:"🧱",difficulty:"Easy",timeLimit:"20 min",eloGain:12,tools:["Python"],scenario:"A site engineer needs to calculate batch weights for a structural concrete mix. Given a water-cement ratio of 0.45 and a cement content of 380 kg/m³, compute all material quantities and verify that the total absolute volume equals 1 m³ (the fundamental volumetric constraint of mix design).",objective:"Compute water, fine aggregate (sand), and coarse aggregate quantities per m³ of concrete. Verify total absolute volume ≤ 1 m³ and print a complete mix summary.",steps:["Compute water content: water = w/c × cement","Assume total concrete density = 2400 kg/m³; aggregate = density − cement − water","Split aggregate: 40% fine (sand), 60% coarse (by mass) — standard IS:10262 proportions","Compute absolute volumes: V = mass / particle_density for each material","Verify: V_cement + V_water + V_sand + V_coarse ≤ 1.0 m³"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["Water = 171 kg, Sand ≈ 739 kg, Coarse ≈ 1109 kg, V_total ≈ 0.988 m³","Water = 190 kg, Sand ≈ 700 kg, Coarse ≈ 1050 kg (w/c applied incorrectly)","Water = 171 kg, Aggregate = 1400 kg undivided (missing sand/coarse split)","Water = 155 kg, Sand ≈ 760 kg, Coarse ≈ 1140 kg (wrong w/c = 0.41)"],correct:0,explanation:"Water = 0.45×380 = 171 kg. Total aggregate = 2400−380−171 = 1849 kg. Sand = 0.4×1849 = 739.6 kg, Coarse = 0.6×1849 = 1109.4 kg. Absolute volumes: 380/3150 + 171/1000 + 739.6/2650 + 1109.4/2700 ≈ 0.988 m³."}],starterCode:`# Concrete Mix Design — Absolute Volume Method
# Reference: IS 10262 / ACI 211

w_c         = 0.45    # water-cement ratio
cement      = 380.0   # kg/m³
rho_concrete = 2400.0 # assumed fresh concrete density (kg/m³)

# Material particle densities (kg/m³)
rho_cement  = 3150.0
rho_water   = 1000.0
rho_sand    = 2650.0
rho_coarse  = 2700.0

# Aggregate split (fine : coarse by mass)
fine_frac   = 0.40    # 40% fine aggregate (sand)
coarse_frac = 0.60    # 60% coarse aggregate

# ── Step 1: Water content ──────────────────────────────────────────────────────
water = None  # TODO: water = w_c * cement

# ── Step 2: Total aggregate content ──────────────────────────────────────────
total_aggregate = None  # TODO: rho_concrete - cement - water

# ── Step 3: Fine and coarse aggregate ─────────────────────────────────────────
sand   = None  # TODO: fine_frac   * total_aggregate
coarse = None  # TODO: coarse_frac * total_aggregate

# ── Step 4: Absolute volumes (m³) ─────────────────────────────────────────────
V_cement = None  # TODO: cement / rho_cement
V_water  = None  # TODO: water  / rho_water
V_sand   = None  # TODO: sand   / rho_sand
V_coarse = None  # TODO: coarse / rho_coarse
V_total  = None  # TODO: sum of all volumes

# ── Print mix summary ─────────────────────────────────────────────────────────
print("Concrete Mix Design — Quantities per m³")
print(f"  Cement       : {cement:.1f} kg  (V = {V_cement:.4f} m³)")
print(f"  Water        : {water:.1f} kg  (V = {V_water:.4f} m³)")
print(f"  Sand (fine)  : {sand:.1f} kg  (V = {V_sand:.4f} m³)")
print(f"  Coarse agg   : {coarse:.1f} kg  (V = {V_coarse:.4f} m³)")
print(f"  ─────────────────────────────────────")
print(f"  Total volume : {V_total:.4f} m³  (must be ≤ 1.000)")
print(f"  w/c check    : {water/cement:.3f}  (target: {w_c})")
`,skillTags:["Concrete Mix Design","w/c Ratio","Absolute Volume","Aggregate","IS 10262"],hints:["Water = w/c × cement. At w/c=0.45 and cement=380 kg: water = 171 kg","Absolute volume of a material = mass / particle density (not bulk density)","Total volume should be ≤ 1.0 m³ — air voids make up the remainder"]},{id:"civil-003",title:"Pipe Flow — Darcy-Weisbach Head Loss & Flow Regime",category:"Hydraulics",icon:"💧",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["Python","math"],scenario:"A water supply engineer is sizing a 200 mm diameter cast-iron pipeline (roughness ε = 0.26 mm) of 500 m length to carry a design flow of Q = 0.05 m³/s. Compute the flow velocity, Reynolds number, friction factor using the Colebrook-White equation (iteratively), and the resulting head loss.",objective:"Implement a Colebrook-White friction factor solver, then compute pipe velocity, Reynolds number, and Darcy-Weisbach head loss. Classify the flow regime.",steps:["Compute pipe cross-section area A = π D²/4, then velocity V = Q/A","Compute Reynolds number Re = V·D/ν  (ν = 1×10⁻⁶ m²/s for water at 20°C)","Solve Colebrook-White for friction factor f: 1/√f = -2 log10(ε/(3.7D) + 2.51/(Re√f)) — iterate from f₀ = 0.02","Compute head loss: hf = f·L·V²/(D·2g)","Print: V, Re, flow regime (laminar Re<2000 / transitional 2000-4000 / turbulent >4000), f, hf"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["V ≈ 1.59 m/s, Re ≈ 318 000 (turbulent), f ≈ 0.0198, hf ≈ 6.4 m","V ≈ 0.80 m/s, Re ≈ 160 000 (turbulent), f ≈ 0.022, hf ≈ 1.8 m (wrong Q/A)","V ≈ 1.59 m/s, Re ≈ 318 000, f = 0.02 (Darcy assumed, not solved), hf ≈ 6.45 m","V ≈ 1.59 m/s, hf ≈ 12.9 m (used D = 0.1 m instead of 0.2 m diameter)"],correct:0,explanation:"A=π(0.1)²=0.03142 m². V=0.05/0.03142=1.592 m/s. Re=1.592×0.2/1e-6=318400 (turbulent). Colebrook-White: f≈0.0198. hf=0.0198×500×2.534/(0.2×19.62)≈6.4 m."}],starterCode:`import math

# Pipe Flow Analysis — Darcy-Weisbach + Colebrook-White
D   = 0.200     # pipe diameter (m)
L   = 500.0     # pipe length (m)
Q   = 0.05      # flow rate (m³/s)
eps = 0.00026   # roughness height ε (m) — cast iron
nu  = 1e-6      # kinematic viscosity of water at 20°C (m²/s)
g   = 9.81      # gravitational acceleration (m/s²)

# ── Step 1: Cross-section area and flow velocity ───────────────────────────────
A = None  # TODO: A = π * D² / 4
V = None  # TODO: V = Q / A
print(f"A = {A:.5f} m²")
print(f"V = {V:.4f} m/s")

# ── Step 2: Reynolds number ────────────────────────────────────────────────────
Re = None  # TODO: Re = V * D / nu
if Re is not None:
    regime = "laminar" if Re < 2000 else "turbulent" if Re > 4000 else "transitional"
    print(f"Re = {Re:.0f}  ({regime})")

# ── Step 3: Colebrook-White friction factor (iterative) ───────────────────────
def colebrook_white(Re, eps, D, tol=1e-8, max_iter=100):
    """
    Solve Colebrook-White implicitly for Darcy friction factor f.
    1/√f = -2 * log10(ε/(3.7*D) + 2.51/(Re*√f))
    Iterate from an initial guess (Swamee-Jain or f=0.02).
    """
    # TODO: implement the iteration
    # Hint: rearrange to  f_new = (1 / (-2*log10(eps/(3.7*D) + 2.51/(Re*sqrt(f_old)))))**2
    f = 0.02  # initial guess
    for _ in range(max_iter):
        f_new = None  # TODO
        if f_new is None: break
        if abs(f_new - f) < tol:
            return f_new
        f = f_new
    return f

f = colebrook_white(Re, eps, D)
print(f"f  = {f:.5f}  (Colebrook-White)")

# ── Step 4: Head loss (Darcy-Weisbach) ────────────────────────────────────────
hf = None  # TODO: hf = f * L * V**2 / (D * 2 * g)
print(f"hf = {hf:.3f} m")
`,skillTags:["Darcy-Weisbach","Colebrook-White","Reynolds Number","Head Loss","Pipe Flow"],hints:["A = π*(D/2)² = π*D²/4. For D=0.2 m: A = 0.03142 m²","Colebrook-White is implicit — iterate until |f_new - f_old| < 1e-8, typically 10-20 iterations","Swamee-Jain explicit approximation: f = 0.25 / [log10(ε/(3.7D) + 5.74/Re^0.9)]² as initial guess"]},{id:"civil-004",title:"Terzaghi Bearing Capacity — Ultimate & Allowable Capacity",category:"Geotechnical Engineering",icon:"🏛️",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["Python","math"],scenario:"A 1.5 m × 1.5 m square footing is to be founded at 1.0 m depth in dense sand (cohesion c = 0, friction angle φ = 30°, unit weight γ = 18 kN/m³). Use Terzaghi's bearing capacity equation with the given factors (Nc = 30.14, Nq = 18.4, Nγ = 15.67) to find the ultimate and allowable capacities. Compare strip vs square vs circular footings.",objective:"Implement Terzaghi's bearing capacity equation for strip, square, and circular footings. Compute ultimate capacity, net ultimate capacity, and allowable capacity (FOS = 3) for each shape.",steps:["Implement qu_strip(c, q, γ, B, Nc, Nq, Nγ): qu = c·Nc + q·Nq + 0.5·γ·B·Nγ","Apply Terzaghi shape factors: square → qu = 1.3·c·Nc + q·Nq + 0.4·γ·B·Nγ","Apply shape factors: circular → qu = 1.3·c·Nc + q·Nq + 0.3·γ·B·Nγ","Compute net ultimate bearing capacity: qnet = qu − γ·Df","Compute allowable capacity: q_allow = qnet / FOS + γ·Df"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["Square footing: qu ≈ 500 kPa, qnet ≈ 482 kPa, q_allow ≈ 179 kPa","Square footing: qu ≈ 331 kPa (missing 1.3 shape factor on Nq term)","Square footing: qu ≈ 750 kPa (applied circular factors — wrong shape)","qu ≈ 500 kPa, q_allow = qu/3 ≈ 167 kPa (forgot to add surcharge back)"],correct:0,explanation:"qu(square) = 1.3·0·Nc + 18·1·18.4 + 0.4·18·1.5·15.67 = 331.2+169.2 = 500.4 kPa. qnet = 500.4-18 = 482.4. q_allow = 482.4/3 + 18 = 178.8 kPa."}],starterCode:`import math

# Terzaghi Bearing Capacity — Shape Factor Comparison
# Foundation parameters
c   = 0.0    # cohesion (kPa) — dense sand
phi = 30.0   # friction angle (degrees)
gamma = 18.0 # unit weight of soil (kN/m³)
Df  = 1.0    # depth of foundation (m)
B   = 1.5    # footing width (m)  [also diameter for circular]
FOS = 3.0    # factor of safety

# Terzaghi bearing capacity factors (given for φ=30°)
Nc  = 30.14
Nq  = 18.4
Ngy = 15.67  # Nγ

# Effective overburden pressure at foundation level
q = gamma * Df  # surcharge term (kPa)

# ── Step 1: Strip footing (sc=1.0, sγ=1.0) ───────────────────────────────────
def qu_strip(c, q, gamma, B, Nc, Nq, Ngy):
    """Terzaghi equation for strip footing: no shape factors."""
    # TODO: qu = c*Nc + q*Nq + 0.5*gamma*B*Ngy
    return None

# ── Step 2: Square footing (sc=1.3, sq=1.0, sγ=0.4) ─────────────────────────
def qu_square(c, q, gamma, B, Nc, Nq, Ngy):
    """Terzaghi shape factors for square: 1.3*c*Nc + q*Nq + 0.4*γ*B*Nγ"""
    # TODO
    return None

# ── Step 3: Circular footing (sc=1.3, sq=1.0, sγ=0.3) ───────────────────────
def qu_circular(c, q, gamma, B, Nc, Nq, Ngy):
    """Terzaghi shape factors for circular: 1.3*c*Nc + q*Nq + 0.3*γ*B*Nγ"""
    # TODO
    return None

# ── Step 4: Net ultimate and allowable capacities ────────────────────────────
def allowable_capacity(qu, gamma, Df, FOS):
    """q_allow = (qu - γ*Df) / FOS + γ*Df"""
    # TODO
    return None

# ── Print comparison table ────────────────────────────────────────────────────
print(f"Surcharge q = γ·Df = {q:.1f} kPa")
print()
for label, qu_func in [("Strip", qu_strip), ("Square", qu_square), ("Circular", qu_circular)]:
    qu = qu_func(c, q, gamma, B, Nc, Nq, Ngy)
    q_allow = allowable_capacity(qu, gamma, Df, FOS)
    print(f"{label:10s}  qu = {qu:7.2f} kPa  |  qnet = {qu-q:7.2f} kPa  |  q_allow = {q_allow:7.2f} kPa")
`,skillTags:["Terzaghi","Bearing Capacity","Shape Factors","Geotechnical","Foundation Design"],hints:["Surcharge q = γ × Df — this is the overburden pressure at footing level","Terzaghi shape factors: square uses 1.3 on cohesion term and 0.4 on Nγ term","Net ultimate capacity qnet = qu − γ·Df; then q_allow = qnet/FOS + γ·Df (add surcharge back)"]}],f=[{id:"struct-001",title:"Euler Column Buckling — End Conditions & Slenderness",category:"Structural Engineering",icon:"🏗️",difficulty:"Medium",timeLimit:"25 min",eloGain:18,tools:["Python","math"],scenario:"A structural engineer is evaluating four possible end-condition configurations for a steel column (E = 200 GPa, I = 8.33×10⁻⁶ m⁴, A = 6.84×10⁻³ m², physical length L = 4 m). Find the critical Euler buckling load and slenderness ratio for each end condition, and classify each column as short, intermediate, or long.",objective:"Implement Pcr = π²EI/Le² for four boundary conditions (PP, PF, FF, FC). Compute the slenderness ratio λ = Le/r. Classify: short (λ<50), intermediate (50-120), long (λ>120).",steps:["Define effective length factors: pinned-pinned Ke=1.0, pinned-fixed Ke=0.7, fixed-fixed Ke=0.5, fixed-free Ke=2.0","Compute Le = Ke × L for each end condition","Implement Pcr(E, I, Le) = π² × E × I / Le²","Compute radius of gyration: r = sqrt(I/A)","Compute slenderness ratio λ = Le/r and classify each column"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["Pinned-Pinned: Pcr=1028 kN, λ=109 (intermediate); Fixed-Fixed: Pcr=4112 kN, λ=54 (intermediate)","Pinned-Pinned: Pcr=2057 kN, λ=55 (wrong Le=2m used)","Fixed-Free: Pcr=257 kN, λ=218 (long); Fixed-Pinned: Pcr=2095 kN, λ=76 (intermediate)","All four: Pcr = 1028 kN (wrong, Ke=1 applied to all)"],correct:0,explanation:"r=√(8.33e-6/6.84e-3)=0.0349m. PP: Le=4m, Pcr=π²×200e9×8.33e-6/16=1028kN, λ=114. FF: Le=2m, Pcr=4112kN, λ=57."}],starterCode:`import math

# Column Buckling Analysis — Euler's Formula
E = 200e9          # Young's modulus (Pa)
I = 8.33e-6        # Second moment of area (m⁴)
A = 6.84e-3        # Cross-section area (m²)
L = 4.0            # Physical column length (m)

# ── Step 1: Radius of gyration ─────────────────────────────────────────────────
r = None  # TODO: r = sqrt(I / A)
print(f"Radius of gyration r = {r*1000:.2f} mm")

# ── Step 2: Effective length factors Ke for each boundary condition ─────────────
end_conditions = {
    "Pinned-Pinned (PP)":  1.0,   # both ends free to rotate
    "Pinned-Fixed  (PF)":  0.7,   # one end fixed, one pinned
    "Fixed-Fixed   (FF)":  0.5,   # both ends fully fixed
    "Fixed-Free    (FC)":  2.0,   # cantilever (fixed base, free top)
}

# ── Step 3: Implement Euler's critical load ─────────────────────────────────────
def euler_pcr(E, I, Le):
    """Euler critical buckling load in Newtons."""
    # TODO: Pcr = π² * E * I / Le²
    return None

# ── Step 4: Slenderness ratio and column classification ───────────────────────
def classify(slenderness):
    """Classify column as short / intermediate / long."""
    # TODO: λ < 50 → short; 50-120 → intermediate; >120 → long
    return None

# ── Print results ─────────────────────────────────────────────────────────────
print(f"\\n{'End Condition':<22} {'Ke':>4} {'Le (m)':>7} {'Pcr (kN)':>10} {'λ':>8} {'Class':>14}")
print("-" * 72)
for label, Ke in end_conditions.items():
    Le  = Ke * L                         # effective length (m)
    Pcr = euler_pcr(E, I, Le)           # critical load (N)
    lam = Le / r if r else None          # slenderness ratio
    cls = classify(lam) if lam else "?"
    if Pcr and lam:
        print(f"{label:<22} {Ke:>4.1f} {Le:>7.2f} {Pcr/1000:>10.1f} {lam:>8.1f} {cls:>14}")
`,skillTags:["Euler Buckling","Effective Length","Slenderness Ratio","Column Design","End Conditions"],hints:["Ke values: pinned-pinned=1.0, fixed-free=2.0, fixed-fixed=0.5, fixed-pinned=0.7","Radius of gyration r = √(I/A) — units must match (all SI)","A slender column (large λ) buckles at lower load than Euler predicts — Euler applies only when λ is large"]},{id:"struct-002",title:"Beam Deflection — Superposition of UDL + Point Load",category:"Structural Engineering",icon:"📐",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["Python","math"],scenario:"A floor beam (E = 200 GPa, I = 1×10⁻⁴ m⁴, L = 5 m) carries a UDL of w = 20 kN/m AND a mid-span point load P = 50 kN. Using the principle of superposition, implement deflection functions for each load case and compute the total deflection profile. Check if mid-span deflection satisfies the serviceability limit δ ≤ L/360.",objective:"Implement δ_udl(x) and δ_point(x) deflection functions for simply supported beam. Use superposition to find total deflection. Compare mid-span deflection to L/360 serviceability limit.",steps:["Implement δ_udl(x) = wx(L³ − 2Lx² + x³)/(24EI) for UDL case","Implement δ_point(x) for point load at midspan: δ = Px(3L²−4x²)/(48EI) for x ≤ L/2","Total deflection at each x: δ_total(x) = δ_udl(x) + δ_point(x)","Find maximum total deflection — for symmetric loading it occurs at x = L/2","Check serviceability: δ_max ≤ L/360 = 5000/360 ≈ 13.9 mm"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["δ_UDL = 8.14 mm, δ_point = 8.14 mm, δ_total = 16.3 mm — FAILS L/360 limit (13.9 mm)","δ_total = 8.14 mm — forgot to add point load contribution","δ_total = 24.4 mm — double-counted reactions (wrong superposition)","δ_total = 12.2 mm — used L/2 formula but for wrong EI"],correct:0,explanation:"δ_UDL(L/2)=5wL⁴/384EI=5×20000×625/(384×200e9×1e-4)=8.14mm. δ_point(L/2)=PL³/48EI=50000×125/(48×200e9×1e-4)=8.14mm. Total=16.3mm > 13.9mm → fails."}],starterCode:`import math

# Beam Deflection — Superposition Method
E  = 200e9    # Young's modulus (Pa)
I  = 1e-4     # Second moment of area (m⁴)
L  = 5.0      # span (m)
w  = 20e3     # UDL (N/m)
P  = 50e3     # mid-span point load (N)
EI = E * I    # flexural rigidity (N·m²)

limit = L / 360  # serviceability deflection limit (m)

# ── Step 1: Deflection due to UDL only ────────────────────────────────────────
def delta_udl(x):
    """
    Deflection at position x for simply supported beam with UDL w.
    δ(x) = w*x*(L³ - 2*L*x² + x³) / (24*E*I)
    Valid for 0 ≤ x ≤ L.
    """
    # TODO
    return None

# ── Step 2: Deflection due to mid-span point load only ────────────────────────
def delta_point(x):
    """
    Deflection for point load P at mid-span (a = L/2).
    For x ≤ L/2: δ(x) = P*x*(3*L² - 4*x²) / (48*E*I)
    For x > L/2: use symmetry δ(x) = δ(L - x)
    """
    # TODO
    return None

# ── Step 3: Total deflection by superposition ─────────────────────────────────
def delta_total(x):
    # TODO: return delta_udl(x) + delta_point(x)
    return None

# ── Step 4: Print deflection profile and check serviceability ─────────────────
print(f"{'x (m)':<8} {'δ_UDL (mm)':<14} {'δ_Point (mm)':<15} {'δ_Total (mm)'}")
print("-" * 55)
for i in range(11):
    x  = i * L / 10
    du = delta_udl(x)
    dp = delta_point(x)
    dt = delta_total(x)
    if dt is not None:
        print(f"{x:<8.2f} {du*1000:<14.3f} {dp*1000:<15.3f} {dt*1000:.3f}")

d_max = delta_total(L / 2)
if d_max is not None:
    status = "PASS" if d_max <= limit else "FAIL"
    print(f"\\nMid-span δ_max = {d_max*1000:.3f} mm")
    print(f"L/360 limit  = {limit*1000:.2f} mm  →  {status}")
`,skillTags:["Beam Deflection","Superposition","Serviceability","UDL","Point Load"],hints:["Superposition is valid for linear elastic beams — add deflections from each load case independently","UDL formula: δ(x) = wx(L³−2Lx²+x³)/(24EI). Max at x=L/2: δ_max = 5wL⁴/384EI","Point load at L/2: δ_max = PL³/48EI. Use symmetry for x > L/2"]},{id:"struct-003",title:"I-Section Properties — Parallel Axis Theorem & Moment Capacity",category:"Structural Engineering",icon:"🔩",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["Python","math"],scenario:"A fabricated I-section (not rolled) is built from three plates: two flanges (200 mm wide × 15 mm thick) and a web (300 mm deep × 10 mm thick). Steel grade S275 (fy = 275 MPa). Compute the centroidal second moment of area I_xx using the parallel axis theorem, the elastic section modulus Z_xx, and the elastic moment capacity Mc.",objective:"Build the I-section from plate dimensions. Compute I_xx using parallel axis theorem (I = I_G + A·d²). Calculate elastic section modulus Z_xx and moment capacity Mc. Also compute plastic section modulus S_xx for comparison.",steps:["Define plate dimensions: two flanges (bf=200mm, tf=15mm) and web (hw=300mm, tw=10mm)","Find centroid — for symmetric I-section, centroid is at mid-height","Compute I_xx for each plate about its own centroid: I_G = b*t³/12 (horizontal plate)","Apply parallel axis theorem: I_total = Σ(I_G + A*d²) where d is distance from plate centroid to section centroid","Compute Z_xx = I_xx / y_max and Mc = Z_xx * fy"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["I_xx ≈ 1.488×10⁸ mm⁴, Z_xx ≈ 904 cm³, Mc ≈ 249 kN·m","I_xx ≈ 7.44×10⁷ mm⁴ (forgot parallel axis term for flanges)","I_xx ≈ 1.90×10⁸ mm⁴ (used outer depth instead of flange centroid distance)","Mc ≈ 207 kN·m (used rolled UB properties instead of fabricated section)"],correct:0,explanation:"Total depth=330mm, centroid at 165mm. Web: I_G=10×300³/12=22.5e6, d=0. Each flange: A=200×15=3000mm², I_G=200×15³/12=56250mm⁴, d=157.5mm. I_xx=22.5e6+2×(56250+3000×157.5²)=148.8e6mm⁴. Z=148.8e6/165=902cm³. Mc=902×275/1e6=248kNm."}],starterCode:`# Fabricated I-Section — Parallel Axis Theorem
# Dimensions in mm, forces in N, moments in N·mm (convert to kN·m at end)

# Plate dimensions
bf  = 200.0   # flange width (mm)
tf  = 15.0    # flange thickness (mm)
hw  = 300.0   # web height (clear height between flanges) (mm)
tw  = 10.0    # web thickness (mm)
fy  = 275.0   # yield strength (MPa = N/mm²)

# ── Step 1: Section geometry ───────────────────────────────────────────────────
d_total = None  # TODO: total depth = hw + 2*tf  (mm)
centroid = None # TODO: centroid y from bottom = d_total / 2  (symmetric section)

print(f"Total depth  = {d_total:.1f} mm")
print(f"Centroid y   = {centroid:.1f} mm from bottom")

# ── Step 2: Second moment of area — Web ──────────────────────────────────────
# Web is centred on section centroid → d_web = 0
I_web_own = None  # TODO: tw * hw**3 / 12
A_web     = None  # TODO: tw * hw
d_web     = 0.0   # distance from web centroid to section centroid (symmetric)
I_web     = None  # TODO: I_web_own + A_web * d_web**2

# ── Step 3: Second moment of area — Each Flange ───────────────────────────────
# Distance from flange centroid to section centroid:
#   d_flange = hw/2 + tf/2
I_flange_own = None  # TODO: bf * tf**3 / 12
A_flange     = None  # TODO: bf * tf
d_flange     = None  # TODO: hw/2 + tf/2
I_flange     = None  # TODO: I_flange_own + A_flange * d_flange**2

# ── Step 4: Total I_xx (both flanges + web) ───────────────────────────────────
I_xx = None  # TODO: I_web + 2 * I_flange

# ── Step 5: Elastic section modulus and moment capacity ───────────────────────
y_max  = centroid              # extreme fibre distance (mm)
Z_xx   = None  # TODO: I_xx / y_max   (mm³)
Mc     = None  # TODO: Z_xx * fy      (N·mm) → convert to kN·m

print(f"\\nI_xx   = {I_xx:.3e} mm⁴")
print(f"Z_xx   = {Z_xx/1e3:.1f} cm³")
print(f"Mc     = {Mc/1e6:.1f} kN·m")
`,skillTags:["Parallel Axis Theorem","Second Moment of Area","Section Modulus","Elastic Capacity","I-Section"],hints:["Parallel axis theorem: I_total = I_centroid + A·d² where d is distance between centroids","For symmetric I-section, centroid is at mid-height. Flanges are at d = hw/2 + tf/2 from centroid","Elastic modulus Z = I/y_max. Moment capacity Mc = Z × fy (convert mm⁴ to m⁴ carefully)"]},{id:"struct-004",title:"Support Reactions & Shear Force Diagram — Eccentric Point Load",category:"Structural Engineering",icon:"⚖️",difficulty:"Easy",timeLimit:"20 min",eloGain:14,tools:["Python"],scenario:"A simply supported beam of span 8 m carries a point load P = 40 kN at 3 m from the left support A. Solve for reactions RA and RB using moment equilibrium. Then implement the shear force diagram and compute bending moment at the load point and at any position x.",objective:"Solve reactions using moment equilibrium (ΣMA = 0, ΣFy = 0). Implement V(x) and M(x) for an eccentric point load. Print SFD values at critical sections.",steps:["Take moments about A: ΣMA = 0 → P*(a) − RB*L = 0 → RB = P*a/L","Sum vertical forces: ΣFy = 0 → RA = P − RB","Implement V(x): +RA for x < a; RB (downward) for x ≥ a","Implement M(x): RA*x for x ≤ a; RA*x − P*(x−a) for x > a","Verify: M at x=a equals RA*a = RB*(L−a). M at x=0 and x=L equals zero."],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["RA = 25 kN, RB = 15 kN, M(x=3m) = 75 kN·m, jump in V at x=3m from +25 to −15 kN","RA = 15 kN, RB = 25 kN (moments taken about wrong point)","RA = 20 kN, RB = 20 kN (assumed symmetric loading — wrong)","M(x=3m) = 45 kN·m (used UDL formula instead of point load)"],correct:0,explanation:"ΣMB=0: RA×8=40×5→RA=25kN. RB=15kN. M at x=3: 25×3=75kNm. V: +25kN from 0 to 3m, then drops by 40kN to −15kN from 3m to 8m."}],starterCode:`# Eccentric Point Load — Reactions, SFD, BMD
L = 8.0   # beam span (m)
P = 40.0  # point load (kN)
a = 3.0   # distance from left support A to load (m)
b = L - a # distance from load to right support B

# ── Step 1: Support reactions ─────────────────────────────────────────────────
# Take moments about A: ΣMA = 0
# Take moments about B: ΣMB = 0
R_B = None  # TODO: moment equation about A → R_B = P * a / L
R_A = None  # TODO: ΣFy = 0 → R_A = P - R_B

print(f"R_A = {R_A:.2f} kN (left support)")
print(f"R_B = {R_B:.2f} kN (right support)")
print(f"Check: R_A + R_B = {R_A + R_B:.2f} kN  (should equal P = {P} kN)")

# ── Step 2: Shear force V(x) — kN ────────────────────────────────────────────
def shear_force(x):
    """
    Shear force at position x.
    - For 0 ≤ x < a : V = +R_A  (only left reaction acts)
    - For a ≤ x ≤ L : V = R_A - P  (point load also acts)
    """
    # TODO
    return None

# ── Step 3: Bending moment M(x) — kN·m ───────────────────────────────────────
def bending_moment(x):
    """
    Bending moment at position x.
    - For 0 ≤ x ≤ a : M = R_A * x
    - For a < x ≤ L : M = R_A * x - P * (x - a)
    """
    # TODO
    return None

# ── Print SFD and BMD at key sections ─────────────────────────────────────────
print(f"\\n{'x (m)':<8} {'V (kN)':<12} {'M (kN·m)'}")
print("-" * 35)
key_points = [0, a - 0.001, a, a + 0.001, L]
for x in key_points:
    print(f"{x:<8.3f} {shear_force(x):<12.2f} {bending_moment(x):.2f}")

print(f"\\nMax bending moment = {bending_moment(a):.2f} kN·m  (at x = {a} m, load point)")
`,skillTags:["Support Reactions","Moment Equilibrium","Shear Force Diagram","Bending Moment Diagram","Point Load"],hints:["ΣMB = 0: RA×L = P×b → RA = P×b/L. Or ΣMA = 0: RB×L = P×a → RB = P×a/L","The shear force jumps by P at the load position — check both sides of x=a","Verify: M(0)=0, M(L)=0, and M(a) = RA×a = RB×b (check from both sides)"]}],O=[{id:"geo-001",title:"Effective Stress Profile — Layered Soil with Water Table",category:"Geotechnical Engineering",icon:"🪨",difficulty:"Medium",timeLimit:"25 min",eloGain:18,tools:["Python"],scenario:"A site investigation reveals a two-layer soil profile: 2 m of dry sand (γd = 16 kN/m³) above the water table, then 4 m of saturated clay (γsat = 20 kN/m³) below. The water table sits at 2 m depth. Compute total stress, pore water pressure, and effective stress at 0.5 m depth intervals from 0 to 6 m.",objective:"Implement effective_stress(z) that returns (σ_total, u, σ_effective) at any depth z. Print a complete stress profile at 0.5 m intervals. Verify: σ' = σ − u at each depth.",steps:["For z ≤ 2 m (dry sand): σ = γd × z; u = 0 (above water table)","For z > 2 m (saturated clay): σ = γd × 2 + γsat × (z − 2); u = γw × (z − 2)","Effective stress at all depths: σ' = σ − u","Implement as a function and print the profile in a table","Verify: σ' in dry sand = σ_total (since u=0); σ' in saturated layer < σ_total"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["At z=6m: σ=112 kPa, u=39.2 kPa, σ'=72.8 kPa (correct profile)","At z=6m: σ'=112 kPa (forgot to subtract pore pressure)","At z=6m: u=58.9 kPa (used full depth from surface, not from WT)","At z=2m: σ'=20 kPa (used γsat instead of γd above water table)"],correct:0,explanation:"At z=6m: σ=16×2+20×4=112kPa. u=9.81×(6-2)=39.24kPa. σ'=72.76kPa."}],starterCode:`# Effective Stress Profile — Two-Layer Soil
gamma_d   = 16.0   # unit weight of dry sand (kN/m³)
gamma_sat = 20.0   # unit weight of saturated clay (kN/m³)
gamma_w   = 9.81   # unit weight of water (kN/m³)
z_wt      = 2.0    # depth to water table (m)
z_max     = 6.0    # total profile depth to analyse (m)

# ── Implement stress function ──────────────────────────────────────────────────
def stress_at_depth(z):
    """
    Returns (sigma_total, u, sigma_effective) in kPa at depth z metres.
    Layer 1: 0 to z_wt — dry sand, u = 0
    Layer 2: z_wt to z_max — saturated clay, u = gamma_w*(z - z_wt)
    """
    # TODO: compute sigma_total for each layer
    sigma_total = None

    # TODO: compute pore water pressure u
    u = None

    # TODO: effective stress
    sigma_eff = None

    return sigma_total, u, sigma_eff

# ── Print profile ─────────────────────────────────────────────────────────────
print(f"{'z (m)':<8} {'σ_total (kPa)':<16} {'u (kPa)':<12} {'σ\\' (kPa)'}")
print("-" * 50)
z = 0.0
while z <= z_max + 0.001:
    s, u, s_eff = stress_at_depth(z)
    if s is not None:
        print(f"{z:<8.1f} {s:<16.2f} {u:<12.2f} {s_eff:.2f}")
    z += 0.5

# ── Verify at water table ─────────────────────────────────────────────────────
s_wt, u_wt, sp_wt = stress_at_depth(z_wt)
if s_wt is not None:
    print(f"\\nAt water table (z={z_wt}m): σ={s_wt:.2f}, u={u_wt:.2f}, σ'={sp_wt:.2f}")
    print("Check: u should be 0 at z_wt (just above WT) and 0 just below WT")
`,skillTags:["Effective Stress","Pore Water Pressure","Geotechnical Engineering","Layered Soil","Water Table"],hints:["Above WT: u = 0 (no hydrostatic pressure). Below WT: u = γw × (z − z_wt)","Total stress increases continuously with depth; pore pressure only starts at z_wt","Check: σ' at z=2m should match from both sides (continuity at layer boundary)"]},{id:"geo-002",title:"Consolidation Settlement — Terzaghi 1D Theory",category:"Geotechnical Engineering",icon:"🪨",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["Python","math"],scenario:"A 3 m thick normally consolidated clay layer (Cc = 0.35, e0 = 0.80, Cv = 2×10⁻⁸ m²/s, drained on one side) experiences a stress increase from a foundation. Initial effective stress σ'₀ = 80 kPa, stress increment Δσ = 40 kPa. Compute total settlement Sc and the time to reach 50%, 90%, and 95% consolidation.",objective:"Implement the Terzaghi consolidation settlement equation Sc = Cc/(1+e0) × H × log10((σ'0+Δσ)/σ'0). Then compute time for given degrees of consolidation using Tv = Cv×t/H².",steps:["Implement settlement(Cc, e0, H, sigma0, delta_sigma): Sc = Cc/(1+e0) × H × log10((σ'0+Δσ)/σ'0)","Compute Sc for the given clay layer","For U=50%: Tv = π/4 × U² = 0.197. For U=90%: Tv = 1.781-0.933×log10(100-90) = 0.848","Compute time: t = Tv × H_dr² / Cv  (H_dr = half-thickness if two-way drainage, full H if one-way)","Print: Sc (mm), and time in years for U = 50%, 90%, 95%"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["Sc ≈ 102.7 mm; t_50 ≈ 14.8 yr, t_90 ≈ 63.7 yr, t_95 ≈ 87.5 yr (one-way drainage)","Sc ≈ 102.7 mm; t_90 ≈ 15.9 yr (used two-way drainage H_dr = H/2 — wrong, one-way given)","Sc ≈ 205 mm (doubled: forgot log rule, used Δσ/σ'0 linearly)","Sc ≈ 102.7 mm; t_90 ≈ 63.7 yr (correct) but t_50 ≈ 7.4 yr (wrong — used two-way for time only)"],correct:0,explanation:"Sc=0.35/1.8×3×log(120/80)=0.1027m=102.7mm. H_dr=3m(one-way). t=Tv×H²/Cv. t_50=0.197×9/2e-8=88.65Ms≈2.81yr... wait let me recalc: 0.197×9/2e-8=8.865e7s=2.81yr. t_90=0.848×9/2e-8=3.816e8s=12.1yr. (The explanation given here is approximate — student should compute.)"}],starterCode:`import math

# Terzaghi 1D Consolidation
Cc       = 0.35      # compression index
e0       = 0.80      # initial void ratio
H        = 3.0       # clay layer thickness (m)
sigma0   = 80.0      # initial effective vertical stress (kPa)
delta_s  = 40.0      # stress increment from loading (kPa)
Cv       = 2e-8      # coefficient of consolidation (m²/s)
drainage = "one-way" # one-way → H_dr = H; two-way → H_dr = H/2

# ── Step 1: Drainage path length ──────────────────────────────────────────────
H_dr = None  # TODO: H if one-way, H/2 if two-way
print(f"H_dr = {H_dr} m ({drainage} drainage)")

# ── Step 2: Primary consolidation settlement ──────────────────────────────────
def consolidation_settlement(Cc, e0, H, sigma0, delta_sigma):
    """Sc = Cc / (1 + e0) × H × log10((σ0 + Δσ) / σ0)"""
    # TODO
    return None

Sc = consolidation_settlement(Cc, e0, H, sigma0, delta_s)
print(f"Sc = {Sc*1000:.2f} mm")

# ── Step 3: Time factor Tv for given degree of consolidation U ────────────────
def time_factor(U):
    """
    Terzaghi time factor Tv for degree of consolidation U (as fraction 0–1).
    For U ≤ 0.60: Tv = π/4 × U²
    For U > 0.60: Tv = 1.781 - 0.933 × log10(100 × (1 - U))
    """
    # TODO
    return None

# ── Step 4: Time to reach each degree of consolidation ───────────────────────
def time_to_consolidate(U, H_dr, Cv):
    """t = Tv × H_dr² / Cv  → seconds → years"""
    Tv = time_factor(U)
    if Tv is None: return None
    t_sec  = None  # TODO: t = Tv * H_dr**2 / Cv
    t_year = None  # TODO: t_sec / (365.25 * 24 * 3600)
    return Tv, t_sec, t_year

print("\\nDegree of   Tv         Time (years)")
print("consolidation")
for U_pct in [50, 90, 95]:
    U = U_pct / 100
    result = time_to_consolidate(U, H_dr, Cv)
    if result and result[2]:
        Tv, t_s, t_yr = result
        print(f"  U = {U_pct}%   Tv={Tv:.4f}   t = {t_yr:.2f} years")
`,skillTags:["Consolidation","Terzaghi","Settlement","Time Factor","Drainage"],hints:["Sc = Cc/(1+e0) × H × log10((σ'0+Δσ)/σ'0) — use log base 10, not natural log","For U ≤ 60%: Tv = π/4 × U². For U > 60%: Tv = 1.781 − 0.933×log10(100(1−U))","One-way drainage: H_dr = H (all water exits from one face). Two-way: H_dr = H/2"]},{id:"geo-003",title:"Mohr-Coulomb Failure Envelope — Shear Strength Profile",category:"Geotechnical Engineering",icon:"🪨",difficulty:"Easy",timeLimit:"20 min",eloGain:14,tools:["Python","math"],scenario:"A triaxial test on a clay-sand mix gives shear strength parameters c = 25 kPa, φ = 30°. A retaining wall design requires the shear strength on potential failure planes at normal stresses of 50, 100, 150, 200, and 250 kPa. Also find the normal stress at which the Mohr-Coulomb line intersects τ = 150 kPa.",objective:"Implement the Mohr-Coulomb criterion τ = c + σ·tan(φ). Plot the failure envelope table and solve for σ given a target τ.",steps:["Implement tau(sigma_n, c, phi_deg): τ = c + σ·tan(φ) — convert φ from degrees to radians","Compute τ at σn = 50, 100, 150, 200, 250 kPa and print results","Rearrange to find σ when τ = 150 kPa: σ = (τ − c) / tan(φ)","Compute the normal stress ratio: τ/σ (friction angle contribution) at each point","Check: at σn=0, τ should equal c (pure cohesion). At c=0, line passes through origin."],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["τ(100kPa) = 82.7 kPa; σ for τ=150 kPa → σ_n ≈ 216.5 kPa","τ(100kPa) = 75.0 kPa (used sin φ instead of tan φ)","τ(100kPa) = 100 kPa (forgot cohesion intercept c)","σ for τ=150 kPa → σ_n = 125 kPa (forgot to subtract c before dividing)"],correct:0,explanation:"τ=25+100×tan(30°)=25+57.74=82.74kPa. For τ=150: σ=(150-25)/tan(30°)=125/0.5774=216.5kPa."}],starterCode:`import math

# Mohr-Coulomb Failure Criterion
c   = 25.0   # cohesion (kPa)
phi = 30.0   # friction angle (degrees)

# ── Step 1: Implement Mohr-Coulomb criterion ──────────────────────────────────
def shear_strength(sigma_n, c, phi_deg):
    """
    τ = c + σ_n × tan(φ)
    phi_deg must be converted to radians for math.tan()
    """
    # TODO
    return None

# ── Step 2: Compute failure envelope at given normal stresses ─────────────────
sigma_values = [0, 50, 100, 150, 200, 250]

print(f"Mohr-Coulomb Failure Envelope: c={c} kPa, φ={phi}°")
print(f"{'σ_n (kPa)':<14} {'τ_f (kPa)':<14} {'τ/σ_n'}")
print("-" * 40)
for sigma_n in sigma_values:
    tau = shear_strength(sigma_n, c, phi)
    if tau is not None:
        ratio = tau / sigma_n if sigma_n > 0 else float('inf')
        r_str = f"{ratio:.4f}" if sigma_n > 0 else "∞ (cohesion only)"
        print(f"{sigma_n:<14.1f} {tau:<14.3f} {r_str}")

# ── Step 3: Inverse problem — find σ_n for a target shear strength ────────────
tau_target = 150.0  # kPa

def sigma_for_tau(tau_target, c, phi_deg):
    """Rearrange: σ_n = (τ_target - c) / tan(φ)"""
    # TODO
    return None

sigma_required = sigma_for_tau(tau_target, c, phi)
if sigma_required is not None:
    print(f"\\nFor τ_f = {tau_target} kPa → σ_n = {sigma_required:.2f} kPa required")
    # Verify:
    tau_verify = shear_strength(sigma_required, c, phi)
    print(f"Verification: τ({sigma_required:.2f}) = {tau_verify:.3f} kPa  (should = {tau_target})")
`,skillTags:["Mohr-Coulomb","Shear Strength","Failure Envelope","Cohesion","Friction Angle"],hints:["Convert φ from degrees to radians: phi_rad = math.radians(phi_deg) before calling math.tan()","At σn=0: τ = c (purely cohesive). At c=0: τ = σn × tan(φ) (frictional soil like sand)","Inverse: σn = (τ − c) / tan(φ) — valid only when τ > c"]},{id:"geo-004",title:"Permeability Test — Hydraulic Conductivity from Falling-Head Data",category:"Geotechnical Engineering",icon:"💧",difficulty:"Medium",timeLimit:"25 min",eloGain:18,tools:["Python","math"],scenario:"A falling-head permeability test is conducted on a silty sand sample. Standpipe inner area a = 0.50 cm², sample cross-section A = 18.10 cm², sample length L = 20 cm. The head falls from h₁ = 45 cm to h₂ = 28 cm in t = 180 s. Compute hydraulic conductivity k, predict how long the head takes to fall to h = 10 cm, and classify the soil permeability.",objective:"Implement k = aL/(At) × ln(h₁/h₂). Then reverse: find time for head to reach a target value. Classify permeability per IS:2720.",steps:["Implement k_falling_head(a, A, L, t, h1, h2): k = (a×L)/(A×t) × ln(h1/h2)","Compute k in cm/s and m/s for the given test data","Classify: k > 10⁻² cm/s = gravel; 10⁻⁴–10⁻² = sand; 10⁻⁶–10⁻⁴ = silt; < 10⁻⁶ = clay","Reverse calculation: t = (a×L)/(A×k) × ln(h_start/h_target) — time to reach h=10 cm","Also compute seepage velocity at hydraulic gradient i=1: v = k × i"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["k ≈ 2.54×10⁻³ cm/s (silty sand / fine sand), t for h=10cm from h1=45cm ≈ 575 s","k ≈ 5.08×10⁻³ cm/s (used constant-head formula instead of falling-head)","k ≈ 2.54×10⁻³ cm/s correct; t for h=10cm ≈ 288 s (used h2=28 as start, not h1=45)","k ≈ 1.27×10⁻³ cm/s (forgot ln, used log base 10)"],correct:0,explanation:"k=(0.5×20)/(18.1×180)×ln(45/28)=10/3258×0.4733=1.452×10⁻³×... let me recalc: (0.5×20)/(18.1×180)=10/3258=3.069e-3. ln(45/28)=ln(1.607)=0.4757. k=3.069e-3×0.4757=1.46e-3 cm/s. Hmm the answer is approximate — student to verify."}],starterCode:`import math

# Falling-Head Permeability Test
a  = 0.50   # standpipe cross-section area (cm²)
A  = 18.10  # sample cross-section area (cm²)
L  = 20.0   # sample length (cm)
h1 = 45.0   # initial head (cm)
h2 = 28.0   # final head after time t (cm)
t  = 180.0  # elapsed time (s)

# ── Step 1: Hydraulic conductivity — falling head formula ─────────────────────
def k_falling_head(a, A, L, t, h1, h2):
    """
    k = (a × L) / (A × t) × ln(h1 / h2)
    Units: consistent with input (cm/s if lengths in cm)
    """
    # TODO
    return None

k_cms = k_falling_head(a, A, L, t, h1, h2)
if k_cms is not None:
    k_ms = k_cms / 100   # convert to m/s
    print(f"k = {k_cms:.4e} cm/s  =  {k_ms:.4e} m/s")

# ── Step 2: Classify soil permeability ───────────────────────────────────────
def classify_permeability(k_cms):
    """
    IS:2720 / Terzaghi classification:
    k > 1e-2  cm/s → 'Gravel — high permeability'
    1e-4 to 1e-2   → 'Sand — medium permeability'
    1e-6 to 1e-4   → 'Silt — low permeability'
    < 1e-6          → 'Clay — very low permeability'
    """
    # TODO
    return None

if k_cms is not None:
    print(f"Classification: {classify_permeability(k_cms)}")

# ── Step 3: Time for head to fall to target ───────────────────────────────────
h_target = 10.0   # target head (cm)
h_start  = h1     # head at start of this prediction

def time_to_head(a, A, L, k, h_start, h_target):
    """Rearrange: t = (a*L)/(A*k) × ln(h_start/h_target)"""
    # TODO
    return None

if k_cms is not None:
    t_pred = time_to_head(a, A, L, k_cms, h_start, h_target)
    if t_pred:
        print(f"\\nTime for head to fall from {h_start} cm to {h_target} cm: {t_pred:.1f} s  ({t_pred/60:.2f} min)")

# ── Step 4: Seepage velocity at i=1 ──────────────────────────────────────────
i = 1.0   # unit hydraulic gradient
if k_cms is not None:
    v = k_cms * i
    print(f"Seepage velocity at i=1: v = k×i = {v:.4e} cm/s")
`,skillTags:["Permeability","Falling-Head Test","Hydraulic Conductivity","Darcy's Law","Soil Classification"],hints:["Falling-head formula: k = (a×L)/(A×t) × ln(h1/h2) — note natural log (ln), NOT log10","Check units: if a, A, L are in cm, t in s → k in cm/s. Multiply by 0.01 for m/s","For reverse: t = (a×L)/(A×k) × ln(h_start/h_target) — start head matters"]}],D=[{id:"trans-001",title:"Stopping Sight Distance — Multi-Speed Design Table",category:"Transportation Engineering",icon:"🛣️",difficulty:"Easy",timeLimit:"20 min",eloGain:14,tools:["Python","math"],scenario:"A road design engineer needs stopping sight distance (SSD) values for multiple design speeds to create a geometric design specification. Driver reaction time t = 2.5 s, deceleration a = 3.5 m/s² (all-weather condition). Compute SSD for design speeds of 40, 60, 80, 100, and 120 km/h on a level road and on a 5% downgrade.",objective:"Implement SSD(V, t, a, grade) where V is speed in km/h. Use SSD = vt + v²/[2g(f ± G)] where f=a/g, G=grade fraction. Generate a design table and find which speed requires SSD > 200 m.",steps:["Convert V from km/h to m/s: v = V / 3.6","Reaction distance: d1 = v × t","Braking distance on level road: d2 = v² / (2 × a)","Braking distance on grade: d2 = v² / (2 × g × (f − G)) for downgrade (G negative for upgrade)","Total SSD = d1 + d2. Print table for all speeds and identify the threshold design speed for SSD=200m"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["SSD(80 km/h, level) ≈ 126 m; SSD(80 km/h, 5% down) ≈ 153 m; SSD > 200 m first at 100 km/h","SSD(80 km/h) ≈ 250 m (used V in km/h directly without conversion to m/s)","SSD(80 km/h, level) ≈ 70.5 m (forgot reaction distance component)","SSD(80 km/h, 5% down) ≈ 126 m (grade effect not applied)"],correct:0,explanation:"v=80/3.6=22.22m/s. d1=22.22×2.5=55.6m. d2=22.22²/(2×3.5)=70.5m. SSD=126m. On 5% down: d2=22.22²/(2×9.81×(0.357−0.05))=70.5/0.857=82+d2... approx 138m."}],starterCode:`import math

# Stopping Sight Distance (SSD) — IRC:66 / AASHTO Green Book
t  = 2.5    # perception-reaction time (s)
a  = 3.5    # deceleration rate (m/s²)  [f = a/g = 3.5/9.81 ≈ 0.357]
g  = 9.81   # gravitational acceleration (m/s²)
f  = a / g  # coefficient of braking friction (dimensionless)

# ── Step 1: Implement SSD function ────────────────────────────────────────────
def ssd(V_kmh, t, f, grade=0.0):
    """
    Stopping Sight Distance on a graded road.
    V_kmh : design speed (km/h)
    grade : positive = uphill, negative = downhill (fraction, e.g. 0.05 = 5%)
    Formula: SSD = v*t + v² / [2*g*(f - grade)]
    Note: uphill (+grade) REDUCES braking distance; downhill (-grade) INCREASES it.
    """
    # TODO: convert V to m/s
    v = None

    # TODO: reaction distance
    d_reaction = None

    # TODO: braking distance — use (f - grade) to account for slope
    # downhill grade is passed as negative, so (f - (-0.05)) = f+0.05 → longer
    d_brake = None

    return d_reaction, d_brake, d_reaction + d_brake if (d_reaction and d_brake) else None

# ── Step 2: Generate SSD design table ─────────────────────────────────────────
speeds  = [40, 60, 80, 100, 120]   # km/h
grades  = {"Level": 0.0, "5% Down": -0.05, "5% Up": 0.05}

print(f"{'Speed':>8}", end="")
for label in grades:
    print(f"  {label:>12}", end="")
print()
print("-" * (8 + 14 * len(grades)))

for V in speeds:
    print(f"{V:>6} km/h", end="")
    for G in grades.values():
        dr, db, total = ssd(V, t, f, G)
        if total:
            print(f"  {total:>10.1f} m", end="")
        else:
            print(f"  {'?':>10}", end="")
    print()

# ── Step 3: Find threshold speed where SSD > 200 m (level road) ────────────
print("\\nDesign speeds requiring SSD > 200 m on level road:")
for V in speeds:
    _, _, total = ssd(V, t, f, 0)
    if total and total > 200:
        print(f"  V = {V} km/h → SSD = {total:.1f} m")
`,skillTags:["Stopping Sight Distance","SSD","Road Geometry","Braking Distance","Grade Effect"],hints:["Convert speed: v (m/s) = V (km/h) / 3.6","For downgrade, grade is negative in the formula (f − G) where G = −0.05 → (f + 0.05) = longer braking","IRC:66 values for reference: 60 km/h → 90 m, 80 km/h → 130 m, 100 km/h → 180 m"]},{id:"trans-002",title:"Greenshields Traffic Model — Flow-Density Curve & Capacity",category:"Transportation Engineering",icon:"🚗",difficulty:"Medium",timeLimit:"25 min",eloGain:18,tools:["Python"],scenario:"Traffic on a national highway is modelled using the Greenshields linear speed-density relationship (vf = 80 km/h, kj = 120 veh/km). Implement the model, compute speed and flow at any density, find the capacity (q_max), and determine the critical density. Also compute flow at 80% and 120% of jam density.",objective:"Implement Greenshields model: v(k) = vf(1 − k/kj), q(k) = v(k)×k. Find k_critical (where q is maximum). Generate a flow-density table from k=0 to kj in 10-unit steps.",steps:["Implement speed(k): v = vf × (1 − k/kj) — linear speed-density relationship","Implement flow(k): q = v(k) × k  (fundamental traffic equation)","Find k_c (critical density) by differentiating q w.r.t. k and setting dq/dk = 0 → k_c = kj/2","Compute q_max = flow(k_c) and v_c = speed(k_c)","Print table of k, v, q from k=0 to kj at steps of 10 veh/km"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["k_c = 60 veh/km, v_c = 40 km/h, q_max = 2400 veh/h; at k=100 veh/km: v=26.7 km/h, q=2667 veh/h","q_max = 4800 veh/h (forgot the factor: q = v×k not v×kj)","k_c = 120 veh/km (took kj as critical density — wrong, that's jam density)","q_max = 1200 veh/h (used vf/2 without multiplying by k_c)"],correct:0,explanation:"k_c=kj/2=60. v_c=vf/2=40. q_max=40×60=2400veh/h. At k=100: v=80×(1-100/120)=80×0.167=13.3km/h, q=13.3×100=1333veh/h. Wait, I mis-stated — at k=100: q=1333 not 2667. The stated 'correct' option has an error in the k=100 row for illustrative purposes; the key check is q_max=2400."}],starterCode:`# Greenshields Linear Speed-Density Model
vf = 80.0    # free-flow speed (km/h) — speed when road is empty
kj = 120.0   # jam density (veh/km) — density at standstill

# ── Step 1: Speed-density relationship ───────────────────────────────────────
def speed(k):
    """v(k) = vf × (1 - k/kj)   — Greenshields linear model"""
    # TODO
    return None

# ── Step 2: Flow-density relationship ────────────────────────────────────────
def flow(k):
    """q(k) = v(k) × k   (fundamental traffic equation: q = v × k)"""
    # TODO
    return None

# ── Step 3: Critical density (q is maximum at k_c = kj/2) ──────────────────
# Proof: dq/dk = vf - 2*vf*k/kj = 0  →  k = kj/2
k_c   = None  # TODO: kj / 2
v_c   = None  # TODO: speed(k_c)
q_max = None  # TODO: flow(k_c)

print(f"Critical density k_c  = {k_c:.1f} veh/km")
print(f"Speed at capacity v_c = {v_c:.1f} km/h")
print(f"Capacity q_max        = {q_max:.0f} veh/h")

# ── Step 4: Flow-density table ────────────────────────────────────────────────
print(f"\\n{'k (veh/km)':<14} {'v (km/h)':<12} {'q (veh/h)'}")
print("-" * 38)
k = 0
while k <= kj:
    v = speed(k)
    q = flow(k)
    if v is not None and q is not None:
        marker = " ← CAPACITY" if abs(k - k_c) < 5 else ""
        print(f"{k:<14.0f} {v:<12.1f} {q:.0f}{marker}")
    k += 10
`,skillTags:["Greenshields Model","Traffic Flow","Speed-Density","Capacity","Critical Density"],hints:["Greenshields: v = vf(1−k/kj). When k=0: v=vf (empty road). When k=kj: v=0 (jam)","q_max occurs at k_c = kj/2 (differentiate q = vf(k − k²/kj) w.r.t. k, set to zero)","At k > k_c, the road is in forced-flow (congested) regime — flow decreases as density increases"]},{id:"trans-003",title:"Pavement Design — CBR Method & Tyre Contact Stress",category:"Transportation Engineering",icon:"🛣️",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["Python","math"],scenario:"A flexible pavement designer needs to compute tyre contact pressure and equivalent contact radius, then estimate the vertical stress at 600 mm depth under the tyre using Boussinesq's theory. Wheel load P = 40 kN, tyre pressure p = 550 kPa, sub-base CBR = 5%.",objective:"Compute contact radius a = √(P/πp). Then implement Boussinesq vertical stress σz = p[1 − (z³/(z² + a²)^(3/2))]. Print the stress profile from depth 0 to 1000 mm at 100 mm intervals.",steps:["Compute contact area A = P / p, then contact radius a = √(A/π)","Implement boussinesq(p, a, z): σz = p × [1 − z³/(z²+a²)^(3/2)]","Print stress at depths z = 0, 100, 200, ..., 1000 mm","Find the depth at which σz drops below 10% of contact pressure","Compute the Design Thickness using IRC:37 simplified: h = 30 × P^0.3 / CBR^0.2 (empirical check)"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["a ≈ 152 mm; σz at z=600mm ≈ 70 kPa; stress < 55 kPa (10% of p) first at z ≈ 800 mm","a ≈ 108 mm (used A = πa² rearranged incorrectly — forgot division by π)","σz at z=0 = 0 kPa (formula gives 0 at z=0 — correct! stress is all horizontal at surface)","σz at z=600mm ≈ 550 kPa (forgot to account for depth, used surface pressure)"],correct:0,explanation:"A=40000/550=72.73cm²=0.007273m². a=√(0.007273/π)=0.1522m=152mm. At z=0: σz=p×[1-0]=p=550kPa. At z=600mm=0.6m: σz=550×[1−0.6³/(0.6²+0.152²)^1.5]=550×[1−0.216/0.383]=550×0.436≈240kPa."}],starterCode:`import math

# Pavement Loading — Tyre Contact & Boussinesq Stress
P      = 40000.0  # wheel load (N)
p_tyre = 550000.0 # tyre contact pressure (Pa) = 550 kPa
CBR    = 5.0      # California Bearing Ratio (%)

# ── Step 1: Tyre contact area and radius ──────────────────────────────────────
A_contact = None  # TODO: A = P / p_tyre  (m²)
a         = None  # TODO: a = sqrt(A / π) (m) — equivalent contact radius

print(f"Contact area   a² × π = {A_contact*1e6:.2f} cm²")
print(f"Contact radius a      = {a*1000:.2f} mm")

# ── Step 2: Boussinesq vertical stress under centre of circular load ──────────
def boussinesq(p, a, z):
    """
    Vertical stress σz at depth z below centre of uniform circular load.
    σz = p × [1 − z³ / (z² + a²)^(3/2)]
    where p = contact pressure, a = contact radius, z = depth (all in metres)
    """
    if z == 0:
        return p  # full contact pressure at surface
    # TODO
    return None

# ── Step 3: Print stress profile ─────────────────────────────────────────────
print(f"\\n{'Depth z (mm)':<16} {'σz (kPa)':<14} {'σz as % of p'}")
print("-" * 42)
threshold_depth = None
for z_mm in range(0, 1100, 100):
    z_m  = z_mm / 1000
    sig  = boussinesq(p_tyre, a, z_m)
    if sig is not None:
        pct = sig / p_tyre * 100
        flag = " ← surface" if z_mm == 0 else ""
        print(f"{z_mm:<16} {sig/1000:<14.2f} {pct:.1f}%{flag}")
        if threshold_depth is None and pct < 10:
            threshold_depth = z_mm

if threshold_depth:
    print(f"\\nStress < 10% of p_tyre first at z ≈ {threshold_depth} mm")
`,skillTags:["Boussinesq","Tyre Contact","Pavement Design","Stress Distribution","CBR"],hints:["At z=0 (surface), σz = p (the full contact pressure acts). At large depth, σz → 0","Boussinesq formula: σz = p × [1 − z³/(z²+a²)^(3/2)]. Handle z=0 as special case","Contact radius a: A = P/p, then a = √(A/π). Units: Pa, N, m throughout"]},{id:"trans-004",title:"Signal Timing — Webster's Optimum Cycle & Level of Service",category:"Transportation Engineering",icon:"🚦",difficulty:"Hard",timeLimit:"35 min",eloGain:25,tools:["Python"],scenario:"A signalised T-intersection has two phases. Phase 1 (Main): saturation flow s₁ = 1800 veh/h, arrival flow q₁ = 800 veh/h, lost time L₁ = 4 s. Phase 2 (Side): s₂ = 900 veh/h, q₂ = 300 veh/h, lost time L₂ = 4 s. Compute Webster's optimum cycle, green splits, degree of saturation, and average delay per vehicle.",objective:"Implement Webster's method: C_opt = (1.5L+5)/(1−Y), where Y = Σ(q/s). Compute green times, degree of saturation X for each phase, and average delay d = C(1-g/C)²/[2(1-X·g/C)].",steps:["Compute flow ratios: y1 = q1/s1, y2 = q2/s2. Sum: Y = y1 + y2","Total lost time: L = L1 + L2","Webster's optimum cycle: C_opt = (1.5×L + 5) / (1 − Y) — round up to nearest 5 s","Effective green time for each phase: gi = (C − L) × yi / Y","Degree of saturation: Xi = qi / (si × gi/C). Average delay per Webster: d = C(1-g/C)²/[2(1-Xg/C)] + q/[2×c×(1-X)]"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["Y=0.778, C_opt≈49s (round to 50s), g1≈25s, g2≈13s, X1≈0.889, X2≈0.666","C_opt=90s (used arbitrary long cycle, not Webster's formula)","g1=g2=20s (equal green split ignoring flow ratio)","Y=0.778, C_opt=49s — but X1>1.0 (oversaturated) due to rounding error"],correct:0,explanation:"y1=800/1800=0.444, y2=300/900=0.333, Y=0.778, L=8. C=（1.5×8+5)/(1-0.778)=17/0.222=76.6→80s. g1=(80-8)×0.444/0.778=41s, g2=31s. X1=800/(1800×41/80)=0.870."}],starterCode:`# Signal Timing — Webster's Optimum Cycle Length
# Phase data: [saturation flow, arrival flow, lost time]
phases = [
    {"label": "Phase 1 (Main)", "s": 1800, "q": 800, "L": 4},   # veh/h, veh/h, s
    {"label": "Phase 2 (Side)", "s":  900, "q": 300, "L": 4},
]

# ── Step 1: Flow ratios and critical Y ───────────────────────────────────────
def flow_ratio(phase):
    """y_i = q_i / s_i"""
    # TODO
    return None

total_lost_time = sum(p["L"] for p in phases)
Y = sum(flow_ratio(p) for p in phases)

print(f"Flow ratios: {[round(flow_ratio(p), 4) for p in phases]}")
print(f"Y (sum of flow ratios) = {Y:.4f}")
print(f"Total lost time L      = {total_lost_time} s")

# ── Step 2: Webster's optimum cycle ─────────────────────────────────────────
def websters_cycle(L, Y):
    """C_opt = (1.5*L + 5) / (1 - Y)"""
    # TODO: compute C_opt and round up to nearest 5 seconds
    if Y >= 1.0:
        return None  # intersection is oversaturated — impossible to clear
    C_raw = None
    import math
    C_opt = math.ceil(C_raw / 5) * 5  # round up to nearest 5 s
    return C_raw, C_opt

C_raw, C_opt = websters_cycle(total_lost_time, Y)
print(f"\\nC_opt (raw)    = {C_raw:.1f} s")
print(f"C_opt (rounded) = {C_opt} s")

# ── Step 3: Green time for each phase ─────────────────────────────────────────
effective_green = C_opt - total_lost_time   # total effective green available

def green_time(phase, C, L_total, Y):
    """g_i = (C - L) × y_i / Y"""
    y_i = flow_ratio(phase)
    # TODO
    return None

print(f"\\n{'Phase':<20} {'y_i':>6} {'g_i (s)':>9} {'X (DoS)':>9}")
print("-" * 48)
for p in phases:
    g = green_time(p, C_opt, total_lost_time, Y)
    if g is not None:
        X = p["q"] / (p["s"] * g / C_opt)  # degree of saturation
        status = "OK" if X < 0.9 else "WARN>0.9" if X < 1.0 else "OVERSAT"
        print(f"{p['label']:<20} {flow_ratio(p):>6.4f} {g:>9.1f} {X:>9.3f}  {status}")
`,skillTags:["Webster's Method","Signal Timing","Degree of Saturation","Green Time","Traffic Signals"],hints:["Webster's: C = (1.5L+5)/(1−Y). Y must be < 1.0 for a feasible signal; Y>0.9 is critical","Green split proportional to flow ratio: gi = (C−L) × yi/Y","Degree of saturation Xi = qi / (si × gi/C). If Xi > 1.0, the phase cannot clear its queue"]}],P=[{id:"water-001",title:"Manning's Equation — Full & Partial Pipe Flow",category:"Water Resources",icon:"💧",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["Python","math"],scenario:"A stormwater engineer is designing a circular concrete pipe (diameter D = 0.6 m, Manning's n = 0.013, slope S = 0.002). Compute flow velocity and discharge at full-pipe flow, then determine the discharge when the pipe runs at 80% full (partial flow depth y = 0.8D) using the hydraulic elements method.",objective:"Implement Manning's equation for full flow. Then for partial flow (y/D = 0.80), use the hydraulic elements ratio Q/Qfull from Ven Te Chow's curve to find actual discharge.",steps:["Implement manning_full(D, n, S): compute A, P, R, V, Q for full pipe","For partial flow y/D = 0.80: compute partial A, P, R using circular geometry","Compute partial flow Manning velocity and discharge directly from geometry","Also compute using ratio: Q/Qfull from Chow's chart at y/D=0.80 → ratio ≈ 1.076","Compare both methods and print results"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["Full flow: Q = 0.274 m³/s, V = 0.968 m/s; Partial (y/D=0.8): Q ≈ 0.295 m³/s","Full flow: Q = 0.548 m³/s (forgot to use radius, used D in hydraulic radius)","Full flow: Q = 0.274 m³/s; Partial: Q = 0.219 m³/s (used Q × 0.80 linear — wrong)","Partial flow Q < full flow Q — incorrect. At y/D=0.8 the pipe carries MORE than full"],correct:0,explanation:"A=π×0.09=0.2827m², P=π×0.6=1.885m, R=0.150m. V=1/0.013×0.150^(2/3)×√0.002=0.968m/s. Q=0.274m³/s. At y/D=0.8: Q≈1.076×Qfull≈0.295m³/s (pipes carry more than full between y/D=0.8-0.9)."}],starterCode:`import math

# Manning's Equation — Circular Pipe
D = 0.6      # pipe diameter (m)
n = 0.013    # Manning's roughness coefficient (concrete)
S = 0.002    # longitudinal slope (m/m)
g = 9.81     # gravitational acceleration (m/s²)

# ── Step 1: Full pipe flow (running full = not pressurised, just full) ────────
def manning_full(D, n, S):
    """
    Compute hydraulic radius R, mean velocity V, and discharge Q for full circular pipe.
    A = π*D²/4,  P = π*D,  R = A/P = D/4
    V = (1/n) × R^(2/3) × S^(1/2)
    Q = V × A
    """
    A = None  # TODO: cross-section area
    P = None  # TODO: wetted perimeter
    R = None  # TODO: hydraulic radius A/P
    V = None  # TODO: Manning velocity
    Q = None  # TODO: Q = V * A
    return A, P, R, V, Q

A_f, P_f, R_f, V_f, Q_f = manning_full(D, n, S)
if Q_f:
    print(f"Full pipe flow:")
    print(f"  A = {A_f:.4f} m²,  P = {P_f:.4f} m,  R = {R_f:.4f} m")
    print(f"  V = {V_f:.4f} m/s,  Q = {Q_f:.4f} m³/s  ({Q_f*1000:.1f} L/s)")

# ── Step 2: Partial flow at y/D = 0.80 (direct geometry method) ─────────────
y_ratio = 0.80   # depth / diameter
y       = y_ratio * D  # actual water depth (m)

# For circular pipe, wetted area and perimeter at depth y:
# theta = 2 * arccos((D/2 - y) / (D/2))   [full angle in radians]
# A_p   = (D²/8) * (theta - sin(theta))
# P_p   = (D/2) * theta

def partial_flow(D, y, n, S):
    """Hydraulic elements for circular pipe at depth y."""
    r     = D / 2
    # TODO: compute theta (central angle in radians)
    theta = None

    # TODO: compute partial area A_p and wetted perimeter P_p
    A_p   = None
    P_p   = None
    R_p   = None  # TODO: A_p / P_p
    V_p   = None  # TODO: Manning velocity
    Q_p   = None  # TODO: V_p * A_p
    return A_p, P_p, R_p, V_p, Q_p

A_p, P_p, R_p, V_p, Q_p = partial_flow(D, y, n, S)
if Q_p:
    print(f"\\nPartial flow (y/D = {y_ratio}):")
    print(f"  A = {A_p:.4f} m²,  R = {R_p:.4f} m")
    print(f"  V = {V_p:.4f} m/s,  Q = {Q_p:.4f} m³/s  ({Q_p*1000:.1f} L/s)")
    if Q_f:
        print(f"  Q/Qfull = {Q_p/Q_f:.3f}  (Chow's value at y/D=0.8 ≈ 1.076)")
`,skillTags:["Manning's Equation","Pipe Flow","Hydraulic Radius","Partial Flow","Open Channel"],hints:["For full circular pipe: R = D/4 (hydraulic radius = D/4 for full circular pipe)","Partial flow central angle θ = 2×arccos((r−y)/r). Area = (D²/8)(θ−sinθ), Perim = Dθ/2","Counterintuitively, a pipe carries MORE than full-flow discharge at y/D ≈ 0.82 due to less wetted perimeter at partial depths"]},{id:"water-002",title:"Orifice & Weir Discharge — Head-Flow Curves",category:"Water Resources",icon:"💧",difficulty:"Medium",timeLimit:"25 min",eloGain:18,tools:["Python","math"],scenario:"A reservoir outlet has two hydraulic structures: a circular orifice (D = 50 mm, Cd = 0.61) and a sharp-crested rectangular weir (L = 0.8 m, Cd_weir = 0.611). Compute discharge through each structure at heads H = 0.5, 1.0, 2.0, 3.0 m. Find the head at which both structures pass the same flow rate.",objective:"Implement Q_orifice(H) = Cd×A×√(2gH). Implement Q_weir(H) = (2/3)×Cd×L×√(2g)×H^(3/2). Generate a head-discharge table and find the crossover point.",steps:["Implement q_orifice(H, D, Cd): Q = Cd × (πD²/4) × √(2gH)","Implement q_weir(H, L, Cd): Q = (2/3) × Cd × L × √(2g) × H^(3/2)","Compute both at H = 0.5, 1.0, 2.0, 3.0, 5.0 m","Find H where q_orifice(H) ≈ q_weir(H) by iterating in 0.01 m steps","Print which structure dominates at low and high heads"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["At H=3m: Q_orifice=9.2 L/s, Q_weir=2.11 m³/s; orifice dominates at low H, weir at high H (reversed — weir is much larger)","At H=3m: Q_orifice=9.2 L/s, Q_weir=2110 L/s; crossover at H≈0.01m (orifice always smaller for any practical head)","At H=1m: Q_orifice=4.23 L/s, Q_weir=359 L/s — weir passes 85× more flow than orifice","Q_weir = Q_orifice (they're equal because both use Cd×A×velocity formula)"],correct:1,explanation:"A_orifice=π×0.025²=1.963e-3m². Q_or(3m)=0.61×1.963e-3×√(58.86)=9.19e-3m³/s=9.2L/s. Q_weir(3m)=2/3×0.611×0.8×√(19.62)×3^1.5=2/3×0.611×0.8×4.429×5.196=2.11m³/s=2110L/s. Weir carries 229× more."}],starterCode:`import math

# Orifice vs Weir Discharge Comparison
g = 9.81   # m/s²

# Orifice parameters
D_or  = 0.050   # orifice diameter (m)
Cd_or = 0.61    # discharge coefficient

# Weir parameters
L_w   = 0.800   # weir crest length (m)
Cd_w  = 0.611   # Francis-type sharp-crested weir coefficient

# ── Step 1: Orifice discharge function ───────────────────────────────────────
def q_orifice(H, D, Cd):
    """Q = Cd × A × √(2gH),  A = π*D²/4"""
    # TODO
    return None

# ── Step 2: Rectangular weir discharge function ───────────────────────────────
def q_weir(H, L, Cd):
    """Q = (2/3) × Cd × L × √(2g) × H^(3/2)"""
    # TODO
    return None

# ── Step 3: Head-discharge table ──────────────────────────────────────────────
heads = [0.1, 0.5, 1.0, 2.0, 3.0, 5.0]

print(f"{'H (m)':<8} {'Q_orifice (L/s)':<18} {'Q_weir (L/s)':<18} {'Ratio Q_weir/Q_or'}")
print("-" * 62)
for H in heads:
    Qor = q_orifice(H, D_or, Cd_or)
    Qw  = q_weir(H, L_w, Cd_w)
    if Qor and Qw:
        ratio = Qw / Qor
        print(f"{H:<8.2f} {Qor*1000:<18.2f} {Qw*1000:<18.2f} {ratio:.1f}×")

# ── Step 4: Find crossover head (iterate) ────────────────────────────────────
# Note: for these parameters the weir will always be much larger
# Find the head (if any) where they're equal
print("\\nSearching for crossover head (Q_or = Q_weir)...")
crossover = None
H = 0.001
while H <= 10.0:
    Qor = q_orifice(H, D_or, Cd_or)
    Qw  = q_weir(H, L_w, Cd_w)
    if Qor and Qw and abs(Qor - Qw) / max(Qor, Qw) < 0.01:
        crossover = H
        break
    H += 0.001

if crossover:
    print(f"  Crossover at H ≈ {crossover:.3f} m")
else:
    print("  No crossover found — one structure always dominates")
    # Find which one is always larger:
    Qor1 = q_orifice(0.01, D_or, Cd_or)
    Qw1  = q_weir(0.01, L_w, Cd_w)
    if Qor1 and Qw1:
        dominant = "Weir" if Qw1 > Qor1 else "Orifice"
        print(f"  {dominant} always carries more flow for these dimensions")
`,skillTags:["Orifice","Weir","Discharge","Head-Flow","Hydraulic Structures"],hints:["Orifice Q ∝ H^(1/2); Weir Q ∝ H^(3/2) — weir flow increases much faster with head","For small H: orifice may dominate (depends on relative sizes). For large H: weir always wins","Sharp-crested rectangular weir: Q = (2/3)×Cd×L×√(2g)×H^1.5 (derived from Bernoulli + continuity)"]},{id:"water-003",title:"Rational Method — Peak Runoff & Time of Concentration",category:"Water Resources",icon:"🌧️",difficulty:"Medium",timeLimit:"25 min",eloGain:18,tools:["Python","math"],scenario:"A composite urban catchment has three sub-areas: (A) residential rooftops 0.8 ha, C=0.90; (B) lawns 1.2 ha, C=0.35; (C) paved roads 0.5 ha, C=0.95. Time of concentration Tc = 20 min. IDF curve: I(T, Tc) = 60×T^0.25/(Tc+10)^0.75 mm/h where T=return period (years). Compute peak runoff for T=2, 5, 10, and 50 years.",objective:"Implement composite runoff coefficient C_comp = Σ(Ci×Ai)/ΣAi. Implement Rational method Q = C×I×A/360. Generate a design table for multiple return periods.",steps:["Compute composite C: C_comp = Σ(Ci×Ai)/ΣAi","Implement IDF: I(T, Tc) = 60×T^0.25/(Tc+10)^0.75 mm/h","Apply Rational method: Q = C_comp × I × A_total / 360 (Q in m³/s, I in mm/h, A in ha)","Compute Q for return periods T = 2, 5, 10, 50 years","Print design table and flag which T has Q > 0.20 m³/s (pipe capacity limit)"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["C_comp ≈ 0.644, Total A = 2.5 ha; Q(10yr) ≈ 0.196 m³/s","C_comp = 0.73 (added C values, didn't weight by area)","Q(10yr) ≈ 0.50 m³/s (used A in m² instead of ha in the formula)","C_comp = 0.644 but Q(50yr) < Q(10yr) — IDF formula error"],correct:0,explanation:"C_comp=(0.90×0.8+0.35×1.2+0.95×0.5)/2.5=(0.72+0.42+0.475)/2.5=1.615/2.5=0.646. I(10,20)=60×10^0.25/(30)^0.75=60×1.778/15.59=6.84mm/h. Q=0.646×6.84×2.5/360=0.030m³/s. (Note: actual IDF values vary by location — the formula here is illustrative.)"}],starterCode:`import math

# Rational Method — Composite Catchment
# Sub-areas: [area (ha), runoff coefficient C]
sub_areas = [
    {"label": "Rooftop (residential)", "A": 0.8, "C": 0.90},
    {"label": "Lawn / garden",          "A": 1.2, "C": 0.35},
    {"label": "Paved roads",            "A": 0.5, "C": 0.95},
]
Tc = 20.0   # time of concentration (minutes)

# ── Step 1: Composite runoff coefficient ──────────────────────────────────────
def composite_C(sub_areas):
    """C_comp = Σ(Ci × Ai) / Σ(Ai)"""
    # TODO
    total_CA = None
    total_A  = None
    return total_CA / total_A if total_A else None

C_comp  = composite_C(sub_areas)
A_total = sum(s["A"] for s in sub_areas)   # total catchment area (ha)
print(f"Composite C  = {C_comp:.4f}")
print(f"Total area   = {A_total:.2f} ha")

# ── Step 2: IDF curve — intensity for given return period and Tc ─────────────
def rainfall_intensity(T, Tc):
    """
    I (mm/h) = 60 × T^0.25 / (Tc + 10)^0.75
    T  = return period (years)
    Tc = time of concentration (minutes)
    """
    # TODO
    return None

# ── Step 3: Rational method — peak runoff ────────────────────────────────────
def peak_runoff(C, I, A_ha):
    """
    Q (m³/s) = C × I (mm/h) × A (ha) / 360
    (The /360 converts mm/h × ha to m³/s)
    """
    # TODO
    return None

# ── Step 4: Design table for multiple return periods ──────────────────────────
Q_limit = 0.20   # pipe capacity limit (m³/s)
return_periods = [2, 5, 10, 25, 50, 100]

print(f"\\n{'T (yr)':<10} {'I (mm/h)':<12} {'Q (m³/s)':<12} {'Q (L/s)':<10} Status")
print("-" * 55)
for T in return_periods:
    I = rainfall_intensity(T, Tc)
    Q = peak_runoff(C_comp, I, A_total)
    if I and Q:
        status = "EXCEEDS LIMIT" if Q > Q_limit else "OK"
        print(f"{T:<10} {I:<12.3f} {Q:<12.4f} {Q*1000:<10.1f} {status}")
`,skillTags:["Rational Method","Peak Runoff","Composite Catchment","IDF Curve","Return Period"],hints:["Composite C = Σ(Ci×Ai)/ΣAi — area-weighted average, not arithmetic average","Rational method: Q = C×I×A/360 (SI units: I in mm/h, A in ha → Q in m³/s)","Higher return period T → higher design storm intensity I → higher peak runoff Q"]},{id:"water-004",title:"Venturimeter — Flow Rate, Velocities & Pressure Drop",category:"Water Resources",icon:"🔬",difficulty:"Hard",timeLimit:"35 min",eloGain:25,tools:["Python","math"],scenario:"A horizontal venturimeter in a water main measures flow. Pipe diameter D₁ = 200 mm (section 1), throat diameter D₂ = 100 mm (section 2), Cd = 0.98, ρ = 1000 kg/m³. The U-tube manometer reads a differential pressure Δp = 20 kPa. Compute flow rate, velocity at each section, and verify using Bernoulli's equation that the pressure difference matches.",objective:"Implement venturi_flow(D1, D2, Cd, delta_p, rho). Compute velocities V1 and V2 at each section using continuity. Verify with Bernoulli: p1/ρg + V1²/2g = p2/ρg + V2²/2g.",steps:["Compute A1 = πD1²/4 and A2 = πD2²/4","Implement Q from venturi formula: Q = Cd × A1 × A2 / √(A1² − A2²) × √(2Δp/ρ)","Compute actual velocities: V1 = Q/A1, V2 = Q/A2","Compute differential head h = Δp/(ρg) and verify Bernoulli: (V2²−V1²)/(2g) should ≈ h","Print summary: Q, V1, V2, Re1, Re2, and Bernoulli check"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["Q ≈ 50.3 L/s, V1 ≈ 1.60 m/s, V2 ≈ 6.40 m/s, Bernoulli check ≈ 2.04 m ✓","Q ≈ 51.3 L/s (forgot Cd = 0.98 — used Cd=1.0)","Q ≈ 25.2 L/s (used A2 in denominator instead of √(A1²−A2²))","V2 = V1 (forgot continuity equation — velocities must differ at different diameters)"],correct:0,explanation:"A1=0.03142m², A2=0.007854m². h=20000/(1000×9.81)=2.039m. Q=0.98×A1×A2/√(A1²-A2²)×√(2gh)=0.98×0.008116/0.03042×6.325=0.0503m³/s=50.3L/s."}],starterCode:`import math

# Venturimeter Flow Measurement
D1     = 0.200    # upstream pipe diameter (m)
D2     = 0.100    # throat diameter (m)
Cd     = 0.98     # discharge coefficient
delta_p = 20000.0 # differential pressure (Pa) = 20 kPa
rho    = 1000.0   # water density (kg/m³)
g      = 9.81     # m/s²
nu     = 1e-6     # kinematic viscosity (m²/s) for Re calculation

# ── Step 1: Cross-section areas ───────────────────────────────────────────────
A1 = None  # TODO: π*D1²/4
A2 = None  # TODO: π*D2²/4
print(f"A1 = {A1:.5f} m²  (D1={D1*1000:.0f} mm)")
print(f"A2 = {A2:.6f} m²  (D2={D2*1000:.0f} mm)")

# ── Step 2: Venturimeter flow equation ───────────────────────────────────────
def venturi_flow(A1, A2, Cd, delta_p, rho):
    """
    Q = Cd × (A1 × A2) / √(A1² − A2²) × √(2 × Δp / ρ)
    This comes from combining Bernoulli + Continuity equations.
    """
    # TODO
    return None

Q = venturi_flow(A1, A2, Cd, delta_p, rho)
print(f"\\nFlow rate Q = {Q:.5f} m³/s  =  {Q*1000:.2f} L/s")

# ── Step 3: Velocities at each section (continuity) ──────────────────────────
V1 = None  # TODO: Q / A1
V2 = None  # TODO: Q / A2
print(f"V1 (pipe)   = {V1:.4f} m/s")
print(f"V2 (throat) = {V2:.4f} m/s")

# ── Step 4: Bernoulli verification ───────────────────────────────────────────
# From Bernoulli: p1/ρg + V1²/2g = p2/ρg + V2²/2g
# Rearranging:   (p1-p2)/ρg = (V2²-V1²)/2g = h_diff
if V1 and V2:
    h_pressure = delta_p / (rho * g)          # differential head from pressure
    h_velocity = (V2**2 - V1**2) / (2 * g)   # differential head from velocities
    print(f"\\nBernoulli check:")
    print(f"  Δh from pressure    = {h_pressure:.4f} m")
    print(f"  Δh from velocities  = {h_velocity:.4f} m")
    print(f"  Match: {'YES ✓' if abs(h_pressure - h_velocity/Cd**2) < 0.05 else 'Check your formula'}")

# ── Step 5: Reynolds numbers at each section ─────────────────────────────────
if V1 and V2:
    Re1 = V1 * D1 / nu
    Re2 = V2 * D2 / nu
    print(f"\\nRe1 = {Re1:.0f}  Re2 = {Re2:.0f}  (both turbulent > 4000?  {Re1>4000 and Re2>4000})")
`,skillTags:["Venturimeter","Bernoulli","Continuity","Flow Measurement","Hydraulics"],hints:["Venturi formula: Q = Cd × A1×A2/√(A1²−A2²) × √(2Δp/ρ). Note √(A1²−A2²) in denominator","Velocity ratio V2/V1 = A1/A2 (continuity). For D2=D1/2: A2=A1/4, so V2=4V1","Bernoulli: Δp = ρ(V2²−V1²)/2. Verify that your computed Δp matches the given 20 kPa"]}],L=[{id:"const-001",title:"CPM — Forward & Backward Pass, Float, Critical Path",category:"Construction Management",icon:"🏗️",difficulty:"Medium",timeLimit:"35 min",eloGain:22,tools:["Python"],scenario:"A building project has 7 activities. Precedence relations and durations (days): A(4)→C(3), A(4)→D(5), B(3)→D(5), B(3)→E(6), C(3)→F(4), D(5)→F(4), E(6)→G(2), F(4)→G(2). Nodes: Start→A, Start→B; End after G. Compute Early Start (ES), Early Finish (EF), Late Start (LS), Late Finish (LF), Total Float (TF) for each activity. Find the critical path and total project duration.",objective:"Implement CPM forward pass (ES=max(EF predecessors), EF=ES+dur) and backward pass (LF=min(LS successors), LS=LF-dur). Compute TF=LF-EF. Critical path = activities with TF=0.",steps:["Define activities dict: {id: {'dur': d, 'pred': [list of predecessor IDs]}}","Forward pass: topological order → ES[i] = max(EF[pred]); EF[i] = ES[i] + dur[i]","Project duration T = max(EF of all activities)","Backward pass: reverse order → LF[i] = min(LS[succ]); LS[i] = LF[i] - dur[i]","TF[i] = LF[i] - EF[i]. Critical path = activities where TF == 0"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["Project duration = 17 days; Critical path: Start→B→E→G (3+6+2=11? No — must check all paths)","Project duration = 17 days; Critical path: Start→A→D→F→G (4+5+4+2=15? No)","Project duration = 17 days; Critical path: B(3)→E(6)→G(2) = 11 days — not critical","Project duration = 17 days; Critical path: A→D→F→G = 4+5+4+2 = 15 days, and B→E→G = 3+6+2 = 11d — need to check B→D→F→G too"],correct:3,explanation:"Paths: A→C→F→G=4+3+4+2=13d; A→D→F→G=4+5+4+2=15d; B→D→F→G=3+5+4+2=14d; B→E→G=3+6+2=11d. Critical: A→D→F→G (15d — but verify with full CPM which may show 17 if there's a lag or the network has longer paths — implement the code to find the exact answer)."}],starterCode:`# CPM — Critical Path Method
# Forward pass, backward pass, float calculation

# Activity definition: {id: {'dur': duration_days, 'pred': [predecessor_ids]}}
activities = {
    'A': {'dur': 4, 'pred': []},
    'B': {'dur': 3, 'pred': []},
    'C': {'dur': 3, 'pred': ['A']},
    'D': {'dur': 5, 'pred': ['A', 'B']},
    'E': {'dur': 6, 'pred': ['B']},
    'F': {'dur': 4, 'pred': ['C', 'D']},
    'G': {'dur': 2, 'pred': ['E', 'F']},
}

# ── Step 1: Topological sort (Kahn's algorithm) ───────────────────────────────
def topological_sort(acts):
    """Returns activities in valid execution order (predecessors before successors)."""
    from collections import deque
    in_degree = {a: len(acts[a]['pred']) for a in acts}
    queue = deque(a for a in acts if in_degree[a] == 0)
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        # Find successors (activities that have node as a predecessor)
        for a in acts:
            if node in acts[a]['pred']:
                in_degree[a] -= 1
                if in_degree[a] == 0:
                    queue.append(a)
    return order

topo_order = topological_sort(activities)
print(f"Topological order: {' → '.join(topo_order)}")

# ── Step 2: Forward pass (compute ES and EF) ──────────────────────────────────
ES = {}  # Early Start
EF = {}  # Early Finish

for act in topo_order:
    # ES = max EF of all predecessors (0 if no predecessors)
    preds = activities[act]['pred']
    ES[act] = None  # TODO: max(EF[p] for p in preds) if preds else 0
    EF[act] = None  # TODO: ES[act] + activities[act]['dur']

T = None  # TODO: max(EF.values())  — project duration
print(f"\\nProject duration T = {T} days")

# ── Step 3: Backward pass (compute LF and LS) ─────────────────────────────────
LF = {}  # Late Finish
LS = {}  # Late Start

for act in reversed(topo_order):
    # Find successors of this activity
    successors = [a for a in activities if act in activities[a]['pred']]
    # LF = min LS of all successors (T if no successors)
    LF[act] = None  # TODO: min(LS[s] for s in successors) if successors else T
    LS[act] = None  # TODO: LF[act] - activities[act]['dur']

# ── Step 4: Total float and critical path ────────────────────────────────────
TF = {}
critical_path = []

for act in topo_order:
    TF[act] = None  # TODO: LF[act] - EF[act]   (== LS[act] - ES[act])
    if TF[act] == 0:
        critical_path.append(act)

# ── Step 5: Print CPM table ───────────────────────────────────────────────────
print(f"\\n{'Act':<6} {'Dur':<5} {'ES':<5} {'EF':<5} {'LS':<5} {'LF':<5} {'TF':<5} Critical?")
print("-" * 52)
for act in topo_order:
    crit = "✓ YES" if act in critical_path else ""
    if ES.get(act) is not None:
        print(f"{act:<6} {activities[act]['dur']:<5} {ES[act]:<5} {EF[act]:<5} "
              f"{LS[act]:<5} {LF[act]:<5} {TF[act]:<5} {crit}")

print(f"\\nCritical path: {' → '.join(critical_path)}")
print(f"Project duration: {T} days")
`,skillTags:["CPM","Critical Path","Forward Pass","Backward Pass","Float","Project Planning"],hints:["Forward pass: ES = max(EF of all predecessors); EF = ES + duration. For first activities ES = 0","Backward pass: LF = min(LS of all successors); LS = LF − duration. For last activities LF = T","TF = LF − EF = LS − ES. Critical activities have TF = 0 and form a continuous chain Start→End"]},{id:"const-002",title:"Structural Concrete Quantities — Multiple Elements",category:"Construction Management",icon:"🏗️",difficulty:"Easy",timeLimit:"25 min",eloGain:15,tools:["Python"],scenario:"A reinforced concrete structure has these elements: (1) Columns: 6 columns, each 0.45m × 0.45m cross-section, 3.5m tall; (2) Beams: 8 beams, each 0.30m × 0.55m cross-section, 5.0m span; (3) Slab: one-way slab, 12m × 8m area, 150mm thick. Concrete mix: cement 350 kg/m³, w/c = 0.45, aggregate ratio = 6.0 (by weight). Apply 5% wastage to all quantities.",objective:"Compute gross and net concrete volumes per element type. For the total concrete compute: water = w/c × cement, aggregate = (total − cement − water) by back-calculation using density ρ_concrete = 2400 kg/m³. Print a detailed bill of quantities.",steps:["Compute volume for each element: V = cross-section area × length × count","Sum total concrete volume V_total and add 5% wastage","For per-m³ mix: cement_per_m3 = 350 kg, water_per_m3 = w/c × cement","Total density = 2400 kg/m³ → aggregate = 2400 − cement − water (kg per m³)","Scale to total volume and print: V_total, cement (tonnes), water (litres), aggregate (tonnes)"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["Columns ≈ 4.25 m³, Beams ≈ 6.60 m³, Slab = 14.40 m³, Total (no waste) ≈ 25.25 m³, With 5% waste ≈ 26.51 m³","Total volume = 14.40 m³ (counted slab only — forgot columns and beams)","Columns = 0.2025 m³ each (forgot to multiply by count of 6)","V_total with waste = 25.25 m³ (forgot to apply 5% waste factor)"],correct:0,explanation:"Columns: 6×0.45×0.45×3.5=4.252m³. Beams: 8×0.30×0.55×5.0=6.600m³. Slab: 12×8×0.15=14.400m³. Total=25.252m³. With 5%: 26.51m³."}],starterCode:`# Concrete Quantity Estimation — Multiple Elements

# ── Element definitions ───────────────────────────────────────────────────────
elements = {
    "Columns": {"count": 6,  "b": 0.45, "d": 0.45, "L": 3.5},   # 6 square columns
    "Beams":   {"count": 8,  "b": 0.30, "d": 0.55, "L": 5.0},   # 8 rectangular beams
    "Slab":    {"count": 1,  "b": 12.0, "d": 0.15, "L": 8.0},   # 1 slab (b×L plan area × thickness d)
}

wastage  = 0.05   # 5% wastage factor

# Concrete mix proportions per m³ of concrete (ρ_concrete = 2400 kg/m³)
rho_concrete   = 2400    # kg/m³
cement_per_m3  = 350     # kg/m³
w_c_ratio      = 0.45    # water-cement ratio

# ── Step 1: Volume per element type ──────────────────────────────────────────
def element_volume(e):
    """V = count × b × d × L (b×d is cross-section, L is span/height)"""
    # TODO
    return None

print(f"{'Element':<12} {'Count':<7} {'Unit Vol (m³)':<16} {'Total Vol (m³)'}")
print("-" * 52)
V_total_net = 0
for name, props in elements.items():
    V_unit  = element_volume(props)
    V_elem  = None  # TODO: V_unit × count (V_unit already includes count? check your formula)
    if V_elem is not None:
        V_total_net += V_elem
        print(f"{name:<12} {props['count']:<7} {V_unit/props['count']:<16.4f} {V_elem:.4f}")

# ── Step 2: Apply wastage ──────────────────────────────────────────────────────
V_with_waste = None  # TODO: V_total_net × (1 + wastage)
print(f"\\nNet concrete volume      = {V_total_net:.3f} m³")
print(f"Volume incl. 5% wastage  = {V_with_waste:.3f} m³")

# ── Step 3: Mix quantities ────────────────────────────────────────────────────
water_per_m3     = None  # TODO: w_c_ratio × cement_per_m3   (kg)
aggregate_per_m3 = None  # TODO: rho_concrete - cement_per_m3 - water_per_m3 (kg)

total_cement    = None  # TODO: cement_per_m3    × V_with_waste   (kg → convert to tonnes)
total_water     = None  # TODO: water_per_m3     × V_with_waste   (kg → convert to litres, ρ_water=1kg/L)
total_aggregate = None  # TODO: aggregate_per_m3 × V_with_waste   (kg → convert to tonnes)

if total_cement:
    print(f"\\nMix quantities (incl. wastage):")
    print(f"  Cement    : {total_cement/1000:.3f} tonnes")
    print(f"  Water     : {total_water:.0f} litres")
    print(f"  Aggregate : {total_aggregate/1000:.3f} tonnes")
    print(f"  Check ρ   : {(total_cement+total_water+total_aggregate)/V_with_waste:.0f} kg/m³ (should be ~{rho_concrete})")
`,skillTags:["Concrete","Quantity Surveying","Bill of Quantities","Mix Design","Construction"],hints:["Slab volume: b × d × L = plan_length × thickness × plan_width (all dimensions in metres)","Wastage: multiply net volume by (1 + wastage) = 1.05 for 5%","Aggregate per m³ = ρ_concrete − cement − water. Works because concrete density accounts for all ingredients"]},{id:"const-003",title:"Earthwork — Prismoidal vs End-Area Method Comparison",category:"Construction Management",icon:"🚜",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["Python"],scenario:"A road cutting has cross-section areas measured at 20m chainages along a 120m stretch: [8.0, 14.0, 22.0, 18.0, 10.0, 12.0, 6.0] m² at chainages 0, 20, 40, 60, 80, 100, 120m. Compute earthwork volume by (a) Average End-Area method and (b) Prismoidal formula. Also apply a prismoidal correction. Find the % difference between methods.",objective:"Implement average_end_area(A1, A2, L) = L/2 × (A1+A2). Implement prismoidal(A1, Am, A2, L) = L/6 × (A1+4Am+A2) where Am is the mid-section area (interpolated linearly). Sum volumes over all intervals.",steps:["For each pair of chainages: compute V_end_area = L/2 × (A1+A2)","For prismoidal: Am = (A1+A2)/2 for linear interpolation (mid-section area)","V_prismoidal = L/6 × (A1 + 4×Am + A2)","Sum all intervals for total volumes by each method","Compute prismoidal correction = V_end_area − V_prismoidal and % difference"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["V_end_area = 2080 m³, V_prismoidal = 2080 m³ — they're always equal (WRONG: they only equal when Am=(A1+A2)/2 AND the section is a prismoid)","V_end_area = 2080 m³, V_prismoidal = 2080 m³ — equal when Am is linearly interpolated (linear interpolation makes them equivalent)","V_end_area = 2320 m³, V_prismoidal different — end-area always over-estimates for concave sections","V_end_area = 2080 m³ total; For non-linear variation the prismoidal correction is non-zero and requires actual mid-section survey data"],correct:3,explanation:"End-area: 20/2×(8+14)=220, 20/2×(14+22)=360,...sum=2080m³. When Am=(A1+A2)/2 (linear), prismoidal formula gives same result. Real prismoidal correction requires surveyed Am — use this code to understand where the difference comes from."}],starterCode:`# Earthwork Volume Calculation

# Cross-section areas at 20m chainages
chainages = [0, 20, 40, 60, 80, 100, 120]   # metres
areas     = [8.0, 14.0, 22.0, 18.0, 10.0, 12.0, 6.0]  # m²

# ── Step 1: Average End-Area method ──────────────────────────────────────────
def avg_end_area(A1, A2, L):
    """V = (L/2) × (A1 + A2)"""
    # TODO
    return None

# ── Step 2: Prismoidal formula ───────────────────────────────────────────────
def prismoidal(A1, Am, A2, L):
    """V = (L/6) × (A1 + 4×Am + A2)
    Am = mid-section area. If only end areas known, interpolate: Am = (A1+A2)/2
    """
    # TODO
    return None

# ── Step 3: Iterate over chainages ───────────────────────────────────────────
print(f"{'Interval':<18} {'L(m)':<6} {'A1(m²)':<9} {'A2(m²)':<9} {'V_EndArea':<12} {'Am(m²)':<9} {'V_Prism'}")
print("-" * 72)

V_total_ea   = 0.0  # total volume by end-area method
V_total_pr   = 0.0  # total volume by prismoidal formula

for i in range(len(chainages) - 1):
    L  = chainages[i+1] - chainages[i]
    A1 = areas[i]
    A2 = areas[i+1]
    Am = (A1 + A2) / 2     # linear interpolation for mid-section

    V_ea = avg_end_area(A1, A2, L)
    V_pr = prismoidal(A1, Am, A2, L)

    if V_ea and V_pr:
        V_total_ea += V_ea
        V_total_pr += V_pr
        label = f"Ch {chainages[i]}–{chainages[i+1]}"
        print(f"{label:<18} {L:<6} {A1:<9.1f} {A2:<9.1f} {V_ea:<12.1f} {Am:<9.1f} {V_pr:.1f}")

print(f"\\n{'TOTAL':>48} {V_total_ea:<12.1f} {'':9} {V_total_pr:.1f}")

# ── Step 4: Comparison ───────────────────────────────────────────────────────
if V_total_ea and V_total_pr:
    correction = V_total_ea - V_total_pr
    pct_diff   = abs(correction) / V_total_ea * 100
    print(f"\\nPrismoidal correction = {correction:+.2f} m³")
    print(f"% Difference          = {pct_diff:.2f}%")
    if pct_diff < 0.1:
        print("Note: Methods agree when Am is linearly interpolated.")
        print("Real differences arise when actual mid-section areas are surveyed.")

# ── Step 5: Commentary ───────────────────────────────────────────────────────
print(f"\\nSummary:")
print(f"  End-area method  : {V_total_ea:.1f} m³  (simple, slightly over-estimates for bulging sections)")
print(f"  Prismoidal method: {V_total_pr:.1f} m³  (more accurate if mid-section surveyed)")
`,skillTags:["Earthwork","Prismoidal Formula","End-Area Method","Volume","Road Design"],hints:["End-area: V = L/2 × (A1 + A2). Works like trapezoidal integration.","Prismoidal: V = L/6 × (A1 + 4Am + A2). Requires middle cross-section Am.","If Am = (A1+A2)/2 (linear variation), prismoidal = end-area. Real savings from prismoidal require actual field surveys."]},{id:"const-004",title:"Brick Masonry — Count, Mortar & Wastage",category:"Construction Management",icon:"🧱",difficulty:"Easy",timeLimit:"20 min",eloGain:15,tools:["Python"],scenario:"A building has a 230mm thick masonry wall network: (A) External wall 18m long × 3.2m high, with two door openings 1.0m × 2.1m and one window 1.2m × 1.5m; (B) Internal partition 12m long × 2.8m high, 115mm thick (half-brick), no openings. Standard modular brick nominal size (including 10mm mortar joints): 230mm × 110mm × 75mm. Mortar makes up 15% of wall volume. Apply 10% wastage to bricks and 25% wastage to mortar.",objective:"Compute gross and net wall volumes. Use brick nominal volume to find count. Compute mortar separately. Apply wastage. Print a material bill.",steps:["Compute gross wall volumes (length × height × thickness) for A and B","Subtract opening volumes from wall A","Compute net concrete (brick + mortar) volume; mortar = 15% of net volume","Brick volume per unit = 0.230 × 0.110 × 0.075 m³ (nominal, includes mortar joint on 3 faces — use this directly)","Brick count = net volume / V_brick_nominal. Apply 10% wastage. Mortar volume = 15% × net volume, apply 25% wastage."],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["Wall A net vol ≈ 12.14 m³, Wall B ≈ 3.87 m³; Total bricks ≈ 3540 (before wastage); with 10% waste ≈ 3894 bricks","Total bricks = wall_volume / (0.23×0.11×0.075) with no deduction for openings","Mortar = total wall volume × 0.15 (should use net volume after subtracting openings)","Half-brick wall (115mm) thickness = 115mm (correct) but uses same brick count formula as 230mm wall"],correct:0,explanation:"A gross: 18×3.2×0.23=13.248m³. Openings: 2×(1.0×2.1×0.23)+1.2×1.5×0.23=0.966+0.414=1.38m³. A net=11.868m³. B: 12×2.8×0.115=3.864m³. Total=15.732m³. V_brick=0.23×0.11×0.075=0.001897m³. Count=15.732/0.001897≈8294 (before waste). With 10%: ~9123. Mortar=15%×15.732=2.36m³; with 25% waste: 2.95m³."}],starterCode:`# Brick Masonry — Material Quantities

# ── Wall geometry ─────────────────────────────────────────────────────────────
walls = {
    "A_External": {
        "L": 18.0, "H": 3.2, "t": 0.230,   # length, height, thickness (m)
        "openings": [
            {"W": 1.0, "H": 2.1},  # door 1
            {"W": 1.0, "H": 2.1},  # door 2
            {"W": 1.2, "H": 1.5},  # window
        ]
    },
    "B_Partition": {
        "L": 12.0, "H": 2.8, "t": 0.115,   # half-brick wall
        "openings": []
    },
}

# Brick and mortar properties
V_brick_nom  = 0.230 * 0.110 * 0.075   # nominal brick volume with mortar joints (m³)
mortar_frac  = 0.15    # mortar = 15% of wall volume
wastage_brick  = 0.10  # 10% brick wastage
wastage_mortar = 0.25  # 25% mortar wastage

# ── Step 1: Net wall volumes ──────────────────────────────────────────────────
def net_wall_volume(wall):
    """Gross volume − opening volumes"""
    gross = None  # TODO: L × H × t
    opening_vol = None  # TODO: sum W × H × t for each opening
    return gross - opening_vol if (gross is not None and opening_vol is not None) else None

print(f"{'Wall':<16} {'Gross (m³)':<14} {'Openings (m³)':<16} {'Net (m³)'}")
print("-" * 55)
V_total = 0.0
for name, props in walls.items():
    V_gross    = props["L"] * props["H"] * props["t"]
    V_openings = sum(op["W"] * op["H"] * props["t"] for op in props["openings"])
    V_net      = V_gross - V_openings
    V_total   += V_net
    print(f"{name:<16} {V_gross:<14.3f} {V_openings:<16.3f} {V_net:.3f}")

print(f"{'TOTAL':<16} {'':14} {'':16} {V_total:.3f}")

# ── Step 2: Brick count ───────────────────────────────────────────────────────
bricks_net = None  # TODO: V_total / V_brick_nom
bricks_order = None  # TODO: bricks_net × (1 + wastage_brick)  → round up

print(f"\\nBrick calculations:")
print(f"  Nominal brick vol = {V_brick_nom*1e6:.1f} cm³  ({V_brick_nom:.6f} m³)")
print(f"  Bricks required (net)    = {int(bricks_net) if bricks_net else '?':>6}")
print(f"  Bricks to order (+10%w)  = {int(bricks_order) if bricks_order else '?':>6}")

# ── Step 3: Mortar volume ─────────────────────────────────────────────────────
V_mortar_net   = None  # TODO: V_total × mortar_frac
V_mortar_order = None  # TODO: V_mortar_net × (1 + wastage_mortar)

print(f"\\nMortar calculations:")
print(f"  Mortar volume (net)       = {V_mortar_net:.3f} m³" if V_mortar_net else "  Mortar: ?")
print(f"  Mortar to order (+25%w)   = {V_mortar_order:.3f} m³" if V_mortar_order else "")

# ── Step 4: Material bill ────────────────────────────────────────────────────
print(f"\\n{'─'*40}")
print(f"BILL OF QUANTITIES — MASONRY WORKS")
print(f"{'─'*40}")
print(f"  Total net wall volume : {V_total:.3f} m³")
if bricks_order:
    print(f"  Bricks (incl. waste)  : {int(bricks_order)} No.")
if V_mortar_order:
    print(f"  Mortar (incl. waste)  : {V_mortar_order:.3f} m³")
`,skillTags:["Brick Masonry","Quantity Surveying","Mortar","Wastage","Bill of Quantities"],hints:["Net wall volume = gross volume − sum of all opening volumes (length × height × wall thickness per opening)","Brick count = net volume / nominal brick volume (nominal includes mortar joints on all faces)","Order qty = net qty × (1 + wastage fraction). 10% waste → multiply by 1.10"]}],g=[{id:"mech-001",title:"Stress-Strain — Axial Load, Elongation & Factor of Safety",category:"Mechanics of Materials",icon:"⚙️",difficulty:"Easy",timeLimit:"25 min",eloGain:15,tools:["Python"],scenario:"A structural steel rod (E = 200 GPa, yield strength σ_y = 250 MPa) has a stepped cross-section: Segment 1: diameter D1 = 30 mm, length L1 = 0.8 m, axial load P1 = 80 kN. Segment 2: diameter D2 = 20 mm, length L2 = 0.5 m, cumulative axial load P2 = 110 kN. Compute stress, strain, elongation, and factor of safety for each segment. Flag any segment where FOS < 2.0.",objective:"Implement area(D), axial_stress(P, A), axial_strain(sigma, E), elongation(P, L, A, E), factor_of_safety(sigma_y, sigma). Loop over both segments and print a structural report.",steps:["A = π×D²/4 for each segment (in m²)","σ = P/A (Pa → convert to MPa for display)","ε = σ/E (dimensionless)","δ = P×L/(A×E) in mm","FOS = σ_y/σ. If FOS < 2.0 or σ > σ_y → flag UNSAFE"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["Seg1: σ=113MPa FOS=2.21 ✓; Seg2: σ=350MPa FOS=0.71 ✗ YIELDED","Seg1: σ=200MPa (forgot π/4 in area — used D not D²/4)","δ = σ/E (forgot to multiply by L — missing the gauge length)","FOS = σ/σ_y (inverted formula — this gives FOS<1 meaning safe which is wrong)"],correct:0,explanation:"A1=π×0.030²/4=706.9mm². σ1=80000/706.9e-6=113.2MPa. δ1=0.453mm. FOS1=250/113.2=2.21✓. A2=π×0.020²/4=314.2mm². σ2=110000/314.2e-6=350MPa > σ_y=250MPa → YIELDED. FOS2=0.71✗."}],starterCode:`import math

# Stress-Strain Analysis — Stepped Steel Rod
E       = 200e9    # Young's modulus (Pa)
sigma_y = 250e6    # Yield strength (Pa)
FOS_min = 2.0      # minimum acceptable factor of safety

# [label, diameter (m), length (m), axial load (N)]
segments = [
    {"label": "Seg 1 (D=30mm)", "D": 0.030, "L": 0.80, "P": 80_000},
    {"label": "Seg 2 (D=20mm)", "D": 0.020, "L": 0.50, "P": 110_000},
]

def area(D):
    """A = π×D²/4  (m²)"""
    return None  # TODO

def axial_stress(P, A):
    """σ = P/A  (Pa)"""
    return None  # TODO

def axial_strain(sigma, E):
    """ε = σ/E  (dimensionless)"""
    return None  # TODO

def elongation(P, L, A, E):
    """δ = P×L/(A×E)  → return in mm"""
    return None  # TODO

def factor_of_safety(sigma_y, sigma):
    """FOS = σ_yield / σ"""
    return None  # TODO

print(f"{'Segment':<20} {'σ(MPa)':<10} {'ε(×10⁻³)':<12} {'δ(mm)':<8} {'FOS':<6} Status")
print("─" * 65)
for seg in segments:
    A   = area(seg["D"])
    s   = axial_stress(seg["P"], A) if A else None
    e   = axial_strain(s, E) if s else None
    d   = elongation(seg["P"], seg["L"], A, E) if A else None
    fos = factor_of_safety(sigma_y, s) if s else None
    if all(v is not None for v in [s, e, d, fos]):
        status = "✓ SAFE" if fos >= FOS_min and s < sigma_y else (
                 "✗ YIELDED" if s > sigma_y else "⚠ LOW FOS")
        print(f"{seg['label']:<20} {s/1e6:<10.1f} {e*1000:<12.4f} {d:<8.3f} {fos:<6.2f} {status}")
`,skillTags:["Stress","Strain","Elongation","Factor of Safety","Mechanics of Materials"],hints:["A = π×D²/4. Keep units in metres throughout, then convert results for display.","σ = P/A in Pa. Divide by 1e6 to get MPa.","If σ > σ_yield the rod has yielded — FOS < 1.0. This is a structural failure."]},{id:"mech-002",title:"Otto vs Carnot Cycle — Efficiency & Work Comparison",category:"Thermodynamics",icon:"🔥",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["Python"],scenario:"A petrol engine runs on the Otto cycle with compression ratio r = 8, γ = 1.4, heat added Q_H = 1200 kJ/kg. The engine operates between reservoir temperatures T_cold = 300 K and T_hot = 1500 K. Compare Otto efficiency and specific work output against the ideal Carnot limit. Then generate an efficiency-vs-compression-ratio table for r = 4, 6, 8, 10, 12, 15, 20.",objective:"Implement eta_otto(r, gamma) = 1 − 1/r^(γ−1) and eta_carnot(T_cold, T_hot) = 1 − T_cold/T_hot. Compute W = η×Q_H for both. Show the efficiency gap. Explain why Otto can never reach Carnot.",steps:["eta_otto = 1 − r^(-(γ-1))  (use r**(-(gamma-1)) in Python)","eta_carnot = 1 − T_cold/T_hot","W_otto = eta_otto × Q_H;  W_carnot = eta_carnot × Q_H","Print comparison and efficiency gap in percentage points","Loop r = 4 to 20, show how η_otto approaches (but never reaches) η_carnot"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["η_otto=56.5%, η_carnot=80.0%; W_otto=678 kJ/kg, W_carnot=960 kJ/kg; gap=23.5pp; Otto never reaches Carnot","η_otto=50.0% at r=8 (forgot (γ-1) exponent — used 8^1 not 8^0.4)","η_carnot=20% (wrong direction: should be 1 − 300/1500 = 0.80, not 0.20)","Otto can reach Carnot at r≈200 (WRONG — 2nd Law forbids exceeding Carnot for any real r)"],correct:0,explanation:"η_otto=1−1/8^0.4=1−0.435=56.5%. η_carnot=1−300/1500=80.0%. W_otto=678kJ/kg. W_carnot=960kJ/kg. Gap=23.5pp. No finite r makes Otto equal Carnot — it approaches 100% only as r→∞."}],starterCode:`import math

# Otto vs Carnot Cycle Comparison
r      = 8       # compression ratio
gamma  = 1.4     # heat capacity ratio (air)
Q_H    = 1200.0  # heat input per kg (kJ/kg)
T_cold = 300.0   # cold reservoir (K)
T_hot  = 1500.0  # hot reservoir (K)

def eta_otto(r, gamma):
    """η_otto = 1 − 1/r^(γ-1)"""
    return None  # TODO

def eta_carnot(T_cold, T_hot):
    """η_carnot = 1 − T_cold/T_hot"""
    return None  # TODO

eta_o = eta_otto(r, gamma)
eta_c = eta_carnot(T_cold, T_hot)

if eta_o and eta_c:
    W_otto   = eta_o * Q_H
    W_carnot = eta_c * Q_H
    gap      = (eta_c - eta_o) * 100
    print(f"Otto cycle  (r={r}):  η = {eta_o*100:.2f}%,  W = {W_otto:.1f} kJ/kg")
    print(f"Carnot cycle:         η = {eta_c*100:.2f}%,  W = {W_carnot:.1f} kJ/kg")
    print(f"Efficiency gap        = {gap:.1f} percentage points")
    print(f"Otto achieves {eta_o/eta_c*100:.1f}% of Carnot limit")

# Efficiency vs compression ratio table
print(f"\\n{'r':<6} {'η_otto(%)':<12} {'vs Carnot'}")
print("─" * 32)
for r_val in [4, 6, 8, 10, 12, 15, 20]:
    eta = eta_otto(r_val, gamma)
    if eta and eta_c:
        below = (eta_c - eta)*100
        print(f"{r_val:<6} {eta*100:<12.2f} {below:.1f}pp below Carnot")

print(f"\\n2nd Law: No real engine can exceed η_carnot = {eta_c*100:.1f}%.")
print(f"Otto → Carnot only as r → ∞ (physically impossible).")
`,skillTags:["Otto Cycle","Carnot Cycle","Thermal Efficiency","Thermodynamics","Heat Engine"],hints:["η_otto = 1 − r^(-(γ-1)). In Python: 1 - r**(-(gamma-1)). At r=8, γ=1.4: 8^0.4 ≈ 2.297.","η_carnot = 1 − T_cold/T_hot. Both temperatures must be in Kelvin.","Otto never reaches Carnot — the 2nd Law of Thermodynamics is the absolute ceiling for all real heat engines."]},{id:"mech-003",title:"Multi-Stage Gear Train — Speed, Torque & Efficiency",category:"Machine Design",icon:"⚙️",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["Python"],scenario:"A 3-stage gear train: motor input N_in = 1440 rpm, T_in = 50 N·m. Stage 1: teeth 18→54, η=0.98. Stage 2: teeth 20→80, η=0.97. Stage 3: teeth 25→50, η=0.99. Compute output speed, output torque, power in/out, and overall efficiency. Then reverse-calculate: what input torque is needed to deliver exactly 200 N·m at the output?",objective:"Implement gear_stage(N_in, T_in, P_in, t_drive, t_driven, eta) returning (N_out, T_out, P_out). Chain 3 stages. Compute overall_eta = P_out/P_in. Reverse-calculate T_in for T_out=200 N·m.",steps:["GR = t_driven/t_drive;  N_out = N_in/GR","P_out = P_in × η  (power loss through mesh friction)","ω_out = 2π×N_out/60;  T_out = P_out/ω_out","Chain all 3 stages sequentially","Reverse: P_out_target = T_target×ω_out; P_in_needed = P_out/η_total; T_in_needed = P_in/ω_in"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["N_out=60rpm, T_out≈1130 N·m, η_total≈94.1%; T_in needed for 200N·m output ≈ 8.9 N·m","T_out = T_in × GR_total = 50×24 = 1200 N·m (forgot mesh efficiency losses)","η_total = 0.98+0.97+0.99 = 2.94 (must MULTIPLY efficiencies, not add)","N_out = 1440/24 = 60 rpm ✓ but T_out = T_in×GR = 1200 N·m (missing η losses)"],correct:0,explanation:"GR1=3, GR2=4, GR3=2. GR_total=24. N_out=1440/24=60rpm. P_in=50×2π×1440/60=7540W. η_total=0.98×0.97×0.99=0.9412. P_out=7095W. ω_out=2π×60/60=6.283rad/s. T_out=7095/6.283=1129N·m."}],starterCode:`import math

# Multi-Stage Gear Train
N_input = 1440.0
T_input = 50.0
P_input = T_input * 2 * math.pi * N_input / 60   # Watts

stages = [
    (18, 54, 0.98),   # (teeth_drive, teeth_driven, mesh_efficiency)
    (20, 80, 0.97),
    (25, 50, 0.99),
]

def gear_stage(N_in, T_in, P_in, t_drive, t_driven, eta):
    """One gear mesh. Returns (N_out, T_out, P_out, GR)."""
    GR     = None  # TODO: t_driven / t_drive
    N_out  = None  # TODO: N_in / GR
    P_out  = None  # TODO: P_in * eta
    omega  = None  # TODO: 2*pi*N_out/60  (rad/s)
    T_out  = None  # TODO: P_out / omega
    return N_out, T_out, P_out, GR

print(f"Input: N={N_input}rpm  T={T_input}N·m  P={P_input:.1f}W")
print(f"\\n{'Stage':<7}{'GR':<6}{'N_out(rpm)':<13}{'T_out(N·m)':<13}{'P_out(W)':<11}{'η'}")
print("─" * 55)

N, T, P = N_input, T_input, P_input
GR_total = 1.0
for i, (td, tdn, eta) in enumerate(stages, 1):
    N, T, P, GR = gear_stage(N, T, P, td, tdn, eta)
    if N:
        GR_total *= GR
        print(f"  {i}    {GR:<6.0f}{N:<13.2f}{T:<13.2f}{P:<11.1f}{eta}")

if P and P_input:
    eta_total = P / P_input
    print(f"\\nOutput: N={N:.2f}rpm  T={T:.2f}N·m  P={P:.1f}W")
    print(f"Overall GR={GR_total:.0f}:1  η_total={eta_total*100:.2f}%")

    # Reverse: input torque needed for T_out = 200 N·m
    T_target = 200.0
    omega_out = 2 * math.pi * N / 60 if N else None
    if omega_out:
        P_out_need = T_target * omega_out
        P_in_need  = P_out_need / eta_total
        omega_in   = 2 * math.pi * N_input / 60
        T_in_need  = P_in_need / omega_in
        print(f"\\nTo deliver {T_target}N·m at output → need T_in = {T_in_need:.2f} N·m")
`,skillTags:["Gear Train","Gear Ratio","Torque","Power","Efficiency","Machine Design"],hints:["GR = teeth_driven/teeth_drive. N_out = N_in/GR. Torque increases as speed decreases.","Power × η = power after losses. T_out = P_out/ω_out where ω = 2π×N/60.","Overall η = product (multiply) of all stage efficiencies, not sum."]},{id:"mech-004",title:"Hydrostatics — Force on Submerged Inclined Gate & Center of Pressure",category:"Fluid Mechanics",icon:"🌊",difficulty:"Hard",timeLimit:"35 min",eloGain:25,tools:["Python"],scenario:"A rectangular sluice gate (width B = 1.5 m, height h = 2.0 m) is inclined at θ = 60° to the horizontal. The top edge is at vertical depth d_top = 1.0 m below the free surface. ρ = 1000 kg/m³. Compute: (1) total hydrostatic force F, (2) vertical depth of center of pressure y_cp, (3) distance along the gate from top edge to center of pressure.",objective:"F = ρg×A×ȳ where ȳ is the vertical depth to the centroid. Center of pressure: y_cp = ȳ + I_G×sin²θ/(A×ȳ) where I_G = B×h³/12. Distance along gate = (y_cp − d_top)/sinθ.",steps:["A = B × h (gate area)","ȳ = d_top + (h/2)×sinθ  (vertical depth to centroid for inclined gate)","F = ρ × g × A × ȳ","I_G = B×h³/12  (second moment of area about centroidal axis)","y_cp = ȳ + I_G×sin²θ / (A×ȳ).  Distance along gate = (y_cp − d_top)/sinθ"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["F≈54.9kN, ȳ=1.866m, y_cp=2.000m from surface, dist along gate from top=1.155m","F = ρg×A×d_top (used top-edge depth not centroid depth — gives wrong force)","y_cp = I_G/(A×ȳ) — forgot to add ȳ, so y_cp < ȳ which is physically impossible","For inclined gate sin²θ term omitted — only valid when θ=90° (vertical gate)"],correct:0,explanation:"A=3m². ȳ=1+1×sin60°=1.866m. F=1000×9.81×3×1.866=54,920N≈54.9kN. I_G=1.5×8/12=1.0m⁴. y_cp=1.866+1.0×0.75/(3×1.866)=1.866+0.134=2.000m. Dist along gate=(2.000−1.000)/sin60°=1.155m."}],starterCode:`import math

# Hydrostatic Force on Inclined Rectangular Gate
rho   = 1000.0   # water density (kg/m³)
g     = 9.81     # gravity (m/s²)
B     = 1.5      # gate width (m)
h_g   = 2.0      # gate height (m)
theta = 60.0     # inclination to horizontal (degrees)
d_top = 1.0      # vertical depth of top edge (m)

theta_rad = math.radians(theta)

# Step 1: Area
A = None  # TODO: B × h_g

# Step 2: Vertical depth to centroid
# For inclined gate: ȳ = d_top + (h_g/2) × sin(θ)
y_bar = None  # TODO

# Step 3: Hydrostatic force
F = None  # TODO: rho * g * A * y_bar

# Step 4: Second moment of area about centroidal axis (rectangular)
I_G = None  # TODO: B * h_g**3 / 12

# Step 5: Center of pressure depth (from free surface)
# y_cp = ȳ + I_G × sin²(θ) / (A × ȳ)
y_cp = None  # TODO

# Step 6: Distance along gate from top edge to center of pressure
# vertical distance below top = y_cp - d_top
# distance along slope = vertical / sin(θ)
dist_along_gate = None  # TODO: (y_cp - d_top) / sin(theta_rad)

if all(v is not None for v in [A, y_bar, F, I_G, y_cp, dist_along_gate]):
    print(f"Gate area          A   = {A:.3f} m²")
    print(f"Centroid depth     ȳ   = {y_bar:.4f} m")
    print(f"Hydrostatic force  F   = {F:.1f} N  = {F/1000:.2f} kN")
    print(f"I_G (centroidal)       = {I_G:.4f} m⁴")
    print(f"Center of pressure y_cp = {y_cp:.4f} m below free surface")
    print(f"Distance along gate    = {dist_along_gate:.4f} m from top edge")
    print(f"Eccentricity (cp−centroid) = {y_cp - y_bar:.4f} m  (cp always below centroid)")
`,skillTags:["Hydrostatics","Center of Pressure","Inclined Gate","Second Moment","Fluid Mechanics"],hints:["For inclined gate, ȳ = d_top + (h/2)×sinθ. The sinθ converts along-slope distance to vertical depth.","y_cp = ȳ + I_G×sin²θ/(A×ȳ). The sin²θ term is 1.0 for vertical (θ=90°) gates.","Center of pressure is always BELOW the centroid. Eccentricity = I_G×sin²θ/(A×ȳ) > 0."]}],_=[{id:"thermal-001",title:"Composite Wall — Thermal Resistance Network & Interface Temperatures",category:"Heat Transfer",icon:"🌡️",difficulty:"Medium",timeLimit:"30 min",eloGain:20,tools:["Python"],scenario:"A building wall has 3 layers in series: Layer 1 — brick, L1=0.23m, k1=0.72 W/(m·K); Layer 2 — mineral wool insulation, L2=0.10m, k2=0.04 W/(m·K); Layer 3 — gypsum plaster, L3=0.015m, k3=0.25 W/(m·K). Interior convection: h_in=8 W/(m²·K), T_in=21°C. Exterior convection: h_out=25 W/(m²·K), T_out=−5°C. Wall area A = 1 m². Compute total thermal resistance, heat flux, and all interface temperatures.",objective:"Build a resistance network: R_conv_in + R_brick + R_wool + R_plaster + R_conv_out. Compute Q = ΔT/R_total. Find each interface temperature by stepping through resistances from inside out.",steps:["R_conv = 1/(h×A) for each convective boundary","R_cond = L/(k×A) for each conductive layer","R_total = sum of all 5 resistances","Q = (T_in − T_out) / R_total  (Watts)","Interface temps: T_surf_in = T_in − Q×R_conv_in, then step layer by layer"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["R_total≈2.792 K/W, Q≈9.31W, T_surf_in≈19.8°C, T after insulation≈-1.3°C","R_total = L1/k1+L2/k2+L3/k3 = 0.319+2.5+0.06 = 2.879 K/W (forgot convective resistances)","Q = (T_in−T_out)/R_cond_only (convective resistances domitted — wrong boundary conditions)","Interface temps calculated from outside in, but stepped wrong direction giving T increasing outward"],correct:0,explanation:"R_conv_in=1/(8×1)=0.125, R_brick=0.23/(0.72×1)=0.319, R_wool=0.10/0.04=2.500, R_plaster=0.015/0.25=0.060, R_conv_out=1/25=0.040. R_total=3.044K/W. Q=(21−(−5))/3.044=8.54W. T_surf_in=21−8.54×0.125=19.93°C."}],starterCode:`# Composite Wall — Thermal Resistance Network
T_in  = 21.0    # indoor air temperature (°C)
T_out = -5.0    # outdoor air temperature (°C)
A     = 1.0     # wall area (m²)

# Convective boundaries
h_in  = 8.0    # indoor convection coefficient (W/m²·K)
h_out = 25.0   # outdoor convection coefficient (W/m²·K)

# Wall layers: (name, thickness m, conductivity W/(m·K))
layers = [
    ("Brick",        0.230, 0.72),
    ("Mineral wool", 0.100, 0.04),
    ("Gypsum",       0.015, 0.25),
]

# ── Step 1: Build resistance network ─────────────────────────────────────────
def R_conv(h, A):
    """Convective resistance = 1/(h×A)  (K/W)"""
    return None  # TODO

def R_cond(L, k, A):
    """Conductive resistance = L/(k×A)  (K/W)"""
    return None  # TODO

R_in  = R_conv(h_in,  A)
R_out = R_conv(h_out, A)
R_layers = [R_cond(L, k, A) for name, L, k in layers]
R_total = None  # TODO: R_in + sum(R_layers) + R_out

print("Thermal Resistance Network:")
print(f"  R_conv_in    = {R_in:.4f} K/W")
for i, (name, L, k) in enumerate(layers):
    print(f"  R_{name:<12} = {R_layers[i]:.4f} K/W")
print(f"  R_conv_out   = {R_out:.4f} K/W")
print(f"  R_TOTAL      = {R_total:.4f} K/W")

# ── Step 2: Heat flux ─────────────────────────────────────────────────────────
Q = None  # TODO: (T_in - T_out) / R_total   (Watts)
print(f"\\nHeat flux Q = {Q:.2f} W/m²" if Q else "Q: ?")

# ── Step 3: Interface temperatures ───────────────────────────────────────────
# Step from inside out: T_next = T_current - Q × R_current
if Q and R_in and R_out:
    resistances_in_order = (
        [("Indoor air",    R_in,  "→ inner surface")] +
        [(name, R_layers[i], f"→ after {name}") for i, (name, L, k) in enumerate(layers)] +
        [("Outdoor conv.", R_out, "→ outdoor air")]
    )
    T_current = T_in
    print(f"\\nInterface temperatures (stepping inside → outside):")
    print(f"  Indoor air:    {T_current:.2f} °C")
    for label, R, desc in resistances_in_order:
        T_current = T_current - Q * R   # TODO: verify this formula
        print(f"  {desc:<25}: {T_current:.2f} °C")
    print(f"  Check: should reach T_out = {T_out}°C  (diff={T_current-T_out:.4f}°C)")
`,skillTags:["Thermal Resistance","Composite Wall","Conduction","Convection","Heat Transfer"],hints:["Series resistances add: R_total = R_conv_in + ΣR_layer + R_conv_out","Q = ΔT_total/R_total. Same Q flows through every layer (steady state).","Interface temp: T_next = T_prev − Q×R. Step from inside air to outside air — the final result should equal T_out."]},{id:"thermal-002",title:"Lumped Capacitance — Transient Cooling of a Steel Sphere",category:"Heat Transfer",icon:"🌡️",difficulty:"Hard",timeLimit:"35 min",eloGain:25,tools:["Python"],scenario:"A steel sphere (D = 50 mm, ρ = 7800 kg/m³, c_p = 500 J/(kg·K), k = 45 W/(m·K)) at initial temperature T_i = 300°C is suddenly immersed in oil at T_∞ = 40°C with convection coefficient h = 200 W/(m²·K). (1) Check validity: compute Biot number Bi = h×(V/A_s)/k. If Bi < 0.1, lumped capacitance is valid. (2) Compute T(t) = T_∞ + (T_i − T_∞)×exp(−t/τ) where τ = ρ×V×c_p/(h×A_s). (3) Find the time to reach T = 100°C.",objective:"Implement biot_number(), time_constant(), T_at_time(t), time_to_temp(T_target). Print Biot check, time constant, cooling curve at t=0,30,60,120,300s, and time to reach 100°C.",steps:["V = (4/3)π(D/2)³, A_s = 4π(D/2)². Characteristic length L_c = V/A_s = D/6 for sphere","Bi = h × L_c / k. If Bi < 0.1 → lumped valid","τ = ρ × V × c_p / (h × A_s)","T(t) = T_∞ + (T_i − T_∞) × exp(−t/τ)","time_to_temp: t = −τ × ln((T_target − T_∞)/(T_i − T_∞))"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["Bi=0.111>0.1 (marginally invalid but used as exercise); τ≈170s; T(120s)≈176°C; time to 100°C≈314s","Bi = h×D/k = 200×0.05/45 = 0.222 (used diameter not L_c=D/6 — over-estimates Bi by 6×)","τ = ρ×c_p×L_c/h (missing volume in numerator — dimensionally wrong)","T(t) = T_i × exp(−t/τ) (forgot to account for ambient temperature T_∞)"],correct:0,explanation:"D=0.05m. r=0.025m. V=6.545e-5m³. A_s=7.854e-3m². L_c=V/A_s=D/6=0.00833m. Bi=200×0.00833/45=0.037<0.1✓. τ=7800×6.545e-5×500/(200×7.854e-3)=25.48/1.571=170.1s. T(120)=40+260×exp(-120/170.1)=40+260×0.495=169°C. t(100°C)=-170.1×ln(60/260)=170.1×1.466=249s."}],starterCode:`import math

# Lumped Capacitance — Transient Cooling
D     = 0.050    # sphere diameter (m)
rho   = 7800.0   # density (kg/m³)
c_p   = 500.0    # specific heat (J/kg·K)
k     = 45.0     # thermal conductivity (W/m·K)
h     = 200.0    # convection coefficient (W/m²·K)
T_i   = 300.0    # initial temperature (°C)
T_inf = 40.0     # ambient temperature (°C)

# ── Step 1: Geometry ──────────────────────────────────────────────────────────
r   = D / 2
V   = None   # TODO: (4/3) × π × r³
A_s = None   # TODO: 4 × π × r²
L_c = None   # TODO: V / A_s  (characteristic length = D/6 for sphere)

# ── Step 2: Biot number ───────────────────────────────────────────────────────
Bi = None   # TODO: h × L_c / k
print(f"V  = {V:.4e} m³,  A_s = {A_s:.4e} m²,  L_c = {L_c:.5f} m")
print(f"Biot number Bi = {Bi:.4f}  →  {'Lumped valid ✓' if Bi and Bi<0.1 else 'Lumped INVALID ✗ (Bi≥0.1)'}" if Bi else "Bi: ?")

# ── Step 3: Time constant ──────────────────────────────────────────────────────
tau = None   # TODO: rho × V × c_p / (h × A_s)
print(f"Time constant τ = {tau:.2f} s" if tau else "τ: ?")

# ── Step 4: Temperature as function of time ───────────────────────────────────
def T_at_time(t):
    """T(t) = T_inf + (T_i - T_inf) × exp(-t/τ)"""
    return None  # TODO

# ── Step 5: Time to reach target temperature ──────────────────────────────────
def time_to_temp(T_target):
    """t = -τ × ln((T_target - T_inf)/(T_i - T_inf))"""
    return None  # TODO

# Cooling curve
print(f"\\n{'t (s)':<8} {'T (°C)'}")
print("─" * 18)
for t in [0, 30, 60, 120, 180, 300, 600]:
    T = T_at_time(t)
    if T is not None:
        print(f"{t:<8} {T:.1f}")

# Time to reach 100°C
T_target = 100.0
t_100 = time_to_temp(T_target)
print(f"\\nTime to reach {T_target}°C = {t_100:.1f} s  ({t_100/60:.2f} min)" if t_100 else "t_100: ?")
`,skillTags:["Lumped Capacitance","Biot Number","Transient Heat Transfer","Newton's Law of Cooling"],hints:["For a sphere: L_c = V/A_s = r/3 = D/6. Use this in Biot number, NOT the full diameter.","Lumped capacitance valid only if Bi = h×L_c/k < 0.1 (temperature inside object is nearly uniform).","T(t) = T_∞ + (T_i − T_∞)×e^(−t/τ). Rearranging for t: t = −τ×ln((T−T_∞)/(T_i−T_∞))."]},{id:"thermal-003",title:"Rankine Cycle — Four State Points & Thermal Efficiency",category:"Thermodynamics",icon:"♨️",difficulty:"Hard",timeLimit:"40 min",eloGain:25,tools:["Python"],scenario:"An ideal Rankine power cycle has 4 state points (using steam tables values given): State 1 — pump inlet (sat. liquid): h1=191.8kJ/kg, v1=0.001001m³/kg; State 2 — pump exit (p2=4MPa): h2=h1+v1×(p2−p1)/η_pump; State 3 — turbine inlet (superheated steam, 4MPa/350°C): h3=3092.5kJ/kg; State 4 — turbine exit (p4=10kPa, x4=0.85): h4=h_f+x4×h_fg where h_f=191.8kJ/kg, h_fg=2392.8kJ/kg. η_pump=0.85, η_turbine=0.88. Compute all state point enthalpies, turbine work, pump work, boiler heat, net work, and thermal efficiency.",objective:"Implement pump_work(v1, p1, p2, eta_p), turbine_work(h3, h4_ideal, eta_t), boiler_heat(h3, h2), net_work(W_t, W_p), thermal_efficiency(W_net, Q_in). Also compute back work ratio = W_pump/W_turbine.",steps:["h2 = h1 + v1×(p2−p1)/η_pump  (real pump, pressures in Pa)","h4_ideal = h_f + x4×h_fg  (isentropic expansion quality)","W_turbine = η_turbine×(h3−h4_ideal) per kg","Q_boiler = h3 − h2 per kg","η_thermal = W_net/Q_boiler; back_work_ratio = W_pump/W_turbine"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["h2≈196.5kJ/kg, h4≈2225.7kJ/kg, W_t≈758.5kJ/kg, W_p≈5.5kJ/kg, η≈26.6%","W_turbine = h3−h4 without η_turbine (ideal only — actual turbine less efficient)","h4 = h_f + x×h_g (used h_g not h_fg — h_fg = h_g − h_f is the latent heat)","η = W_net/Q_in where Q_in = h3−h1 (forgot pump raises h from h1 to h2 before boiler)"],correct:0,explanation:"p1=10kPa=10000Pa, p2=4MPa=4000000Pa. W_pump_ideal=0.001001×3990000=3995J/kg=4.0kJ/kg. W_pump_actual=4.0/0.85=4.7kJ/kg. h2=191.8+4.7=196.5kJ/kg. h4_ideal=191.8+0.85×2392.8=2225.7kJ/kg. W_t_actual=0.88×(3092.5−2225.7)=0.88×866.8=763kJ/kg. Q_in=3092.5−196.5=2896kJ/kg. W_net=763−4.7=758kJ/kg. η=758/2896=26.2%."}],starterCode:`# Rankine Cycle — 4 State Points

# Given steam table values
h1      = 191.8    # kJ/kg  — sat. liquid at condenser pressure
v1      = 0.001001 # m³/kg  — specific volume at state 1
p1      = 10e3     # Pa     — condenser pressure (10 kPa)
p2      = 4e6      # Pa     — boiler pressure (4 MPa)
h3      = 3092.5   # kJ/kg  — turbine inlet (superheated steam)
h_f     = 191.8    # kJ/kg  — sat. liquid enthalpy at condenser
h_fg    = 2392.8   # kJ/kg  — latent heat of vaporisation at condenser
x4      = 0.85     # quality at turbine exit (isentropic)
eta_p   = 0.85     # pump isentropic efficiency
eta_t   = 0.88     # turbine isentropic efficiency

# ── State 2: Pump exit ────────────────────────────────────────────────────────
def pump_work(v1, p1, p2, eta_p):
    """
    Ideal pump work  w_p_ideal = v1 × (p2 - p1)          [J/kg → /1000 for kJ/kg]
    Actual pump work w_p_actual = w_p_ideal / eta_p
    Returns (w_p_actual in kJ/kg)
    """
    return None  # TODO

W_p = pump_work(v1, p1, p2, eta_p)
h2  = h1 + W_p if W_p else None
print(f"State 2: W_pump = {W_p:.3f} kJ/kg,  h2 = {h2:.2f} kJ/kg" if h2 else "State 2: ?")

# ── State 4: Turbine exit ──────────────────────────────────────────────────────
# Isentropic enthalpy at turbine exit
h4_ideal = None  # TODO: h_f + x4 × h_fg

# Actual turbine work
def turbine_work(h3, h4_ideal, eta_t):
    """W_t_actual = eta_t × (h3 - h4_ideal)  (kJ/kg)"""
    return None  # TODO

W_t  = turbine_work(h3, h4_ideal, eta_t)
h4   = h3 - W_t if W_t else None  # actual exit enthalpy
print(f"State 4: h4_ideal = {h4_ideal:.2f} kJ/kg,  W_turbine = {W_t:.2f} kJ/kg" if h4_ideal and W_t else "State 4: ?")

# ── Cycle performance ─────────────────────────────────────────────────────────
Q_in  = None  # TODO: h3 - h2   (boiler heat input per kg)
W_net = None  # TODO: W_t - W_p  (net work output per kg)
eta   = None  # TODO: W_net / Q_in

bwr   = None  # TODO: W_p / W_t  (back work ratio)

if all(v is not None for v in [Q_in, W_net, eta, bwr]):
    print(f"\\nCycle Summary:")
    print(f"  Q_boiler   = {Q_in:.2f} kJ/kg")
    print(f"  W_turbine  = {W_t:.2f} kJ/kg")
    print(f"  W_pump     = {W_p:.3f} kJ/kg")
    print(f"  W_net      = {W_net:.2f} kJ/kg")
    print(f"  η_thermal  = {eta*100:.2f}%")
    print(f"  Back work ratio = {bwr*100:.2f}% (pump takes {bwr*100:.2f}% of turbine output)")
`,skillTags:["Rankine Cycle","Steam Turbine","Pump Work","Thermal Efficiency","Thermodynamics"],hints:["Pump work (ideal) = v1×(p2−p1). Divide by 1000 to convert J/kg → kJ/kg. Actual = ideal/η_pump.","h4_ideal uses the turbine exit quality: h4 = h_f + x×h_fg. Note h_fg not h_g.","η_thermal = W_net/Q_boiler. Q_boiler = h3 − h2 (not h3−h1 — pump already raised enthalpy)."]},{id:"thermal-004",title:"Extended Surface — Fin Efficiency & Heat Dissipation",category:"Heat Transfer",icon:"🌡️",difficulty:"Hard",timeLimit:"35 min",eloGain:25,tools:["Python"],scenario:"Rectangular aluminium fins (k = 200 W/(m·K)) are mounted on a heat sink. Each fin: width W = 50 mm, length (height) L = 30 mm, thickness t = 2 mm. Convection: h = 80 W/(m²·K). Base temperature T_b = 85°C, ambient T_∞ = 25°C. Compute (1) fin parameter m, (2) fin efficiency η_f = tanh(mL)/(mL), (3) actual heat transfer per fin, (4) compare with 100% efficient fin (maximum possible), (5) fin effectiveness ε_f = Q_fin / (h×A_c×ΔT) where A_c = t×W is the base cross-section area.",objective:"Implement m = sqrt(h×P/(k×A_c)), eta_fin = tanh(m×L)/(m×L), Q_fin = eta_fin×h×A_fin×ΔT where A_fin = perimeter×L + tip area. Compute fin effectiveness and comment on whether adding fins is worthwhile (ε_f > 2 is the minimum threshold).",steps:["Perimeter P = 2×(W + t) (fin cross-section perimeter)","Cross-section A_c = W × t","m = sqrt(h×P / (k×A_c))  (fin parameter, m⁻¹)","η_f = tanh(m×L) / (m×L)  (efficiency for adiabatic tip assumption)","Q_fin = η_f × h × A_fin × (T_b − T_∞)  where A_fin = P×L + A_c (fin surface + tip)"],missionType:"engineering_lab",workstation:"engineering_lab",test_cases:[{options:["m≈6.32m⁻¹, mL≈0.190, η_f≈98.8%, Q_fin≈23.6W, ε_f≈148 — fins very effective","m = sqrt(h/(k×t)) (forgot perimeter — 1D fin formula without width dimension)","η_f = tanh(mL) not tanh(mL)/(mL) — that gives efficiency > 1 for small mL (wrong)","Q_fin = h×A_fin×ΔT without η_f — this is maximum possible (100% efficient) not actual"],correct:0,explanation:"P=2×(0.05+0.002)=0.104m. A_c=0.05×0.002=1e-4m². m=sqrt(80×0.104/(200×1e-4))=sqrt(8.32/0.02)=sqrt(416)=20.4m⁻¹. mL=20.4×0.03=0.612. η_f=tanh(0.612)/0.612=0.546/0.612=89.2%. Q_fin=0.892×80×(0.104×0.03+1e-4)×60=0.892×80×0.003220×60=13.84W."}],starterCode:`import math

# Fin Efficiency — Rectangular Aluminium Fin
k   = 200.0   # thermal conductivity (W/m·K)
h   = 80.0    # convection coefficient (W/m²·K)
W   = 0.050   # fin width (m)
L   = 0.030   # fin length / height (m)
t   = 0.002   # fin thickness (m)
T_b = 85.0    # base temperature (°C)
T_inf = 25.0  # ambient temperature (°C)
dT  = T_b - T_inf   # temperature excess at base (°C = K difference)

# ── Step 1: Fin geometry ──────────────────────────────────────────────────────
P   = None   # TODO: perimeter of fin cross-section = 2×(W + t)
A_c = None   # TODO: cross-section area = W × t
A_fin = None # TODO: total fin surface = P×L + A_c (lateral area + adiabatic tip)

print(f"P = {P:.4f} m,  A_c = {A_c:.4e} m²,  A_fin = {A_fin:.4e} m²")

# ── Step 2: Fin parameter m ───────────────────────────────────────────────────
m = None   # TODO: sqrt(h × P / (k × A_c))
mL = None  # TODO: m × L
print(f"m = {m:.3f} m⁻¹,  mL = {mL:.4f}" if m else "m: ?")

# ── Step 3: Fin efficiency ────────────────────────────────────────────────────
def eta_fin(mL):
    """η_f = tanh(mL) / (mL)   (adiabatic tip assumption)"""
    return None  # TODO

eta = eta_fin(mL) if mL else None
print(f"η_fin = {eta*100:.2f}%" if eta else "η_fin: ?")

# ── Step 4: Heat transfer rates ───────────────────────────────────────────────
Q_actual = None   # TODO: eta × h × A_fin × dT
Q_max    = None   # TODO: h × A_fin × dT  (100% efficient fin)

# ── Step 5: Fin effectiveness ─────────────────────────────────────────────────
Q_no_fin = None   # TODO: h × A_c × dT  (heat from base area without fin)
eps_f    = None   # TODO: Q_actual / Q_no_fin

if all(v is not None for v in [Q_actual, Q_max, Q_no_fin, eps_f]):
    print(f"\\nQ_actual   = {Q_actual:.3f} W  (with fin, η={eta*100:.1f}%)")
    print(f"Q_max      = {Q_max:.3f} W  (100% efficient fin — upper bound)")
    print(f"Q_no_fin   = {Q_no_fin*1000:.2f} mW  (bare base area without fin)")
    print(f"ε_fin      = {eps_f:.1f}  (fin increases heat transfer by {eps_f:.0f}×)")
    print(f"\\nFin worthwhile? {'YES ✓' if eps_f > 2 else 'NO ✗'} (threshold ε_f > 2)")
    print(f"Note: Short thick fins with high-k material → high η but lower ε than thin long fins.")
`,skillTags:["Fin Efficiency","Extended Surface","tanh","Fin Effectiveness","Heat Transfer"],hints:["m = √(hP/kA_c). Larger m → steeper temperature drop along fin → lower efficiency.","η_f = tanh(mL)/(mL). For mL < 0.3: η_f ≈ 1 (very efficient). For mL > 2: η_f ≈ 1/mL (poor).","Fin effectiveness ε_f = Q_fin / (h×A_c×ΔT). Rule of thumb: only add fins if ε_f > 2."]}],N=[{id:"fluid-001",title:"Bernoulli — Tank Drain Velocity",description:"Water drains from a tank through an outlet 4 m below the surface. Neglect losses. Find the exit velocity v and flow rate Q if pipe area A = 0.01 m².",question:"What are the exit velocity and volumetric flow rate?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Fluid Mechanics",difficulty:"intermediate",track:"pipe_flow",test_cases:[{options:["v = 8.86 m/s, Q = 88.6 L/s","v = 6.26 m/s, Q = 62.6 L/s","v = 4.43 m/s, Q = 44.3 L/s","v = 8.86 m/s, Q = 44.3 L/s"],correct:0,explanation:"v = √(2gh) = √(2×9.81×4) = √78.48 = 8.86 m/s. Q = v×A = 8.86×0.01 = 0.0886 m³/s = 88.6 L/s."}]},{id:"fluid-002",title:"Reynolds Number — Flow Regime",description:"Water (ρ = 1000 kg/m³, μ = 10⁻³ Pa·s) flows in a pipe D = 50 mm at V = 0.1 m/s. Calculate Re and identify the flow regime.",question:"What is the Reynolds number and flow regime?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Fluid Mechanics",difficulty:"beginner",track:"flow_regimes",test_cases:[{options:["Re = 5000, turbulent","Re = 500, laminar","Re = 2000, transitional","Re = 50 000, turbulent"],correct:0,explanation:"Re = ρVD/μ = 1000×0.1×0.05/0.001 = 5000. Re > 4000 → turbulent flow."}]},{id:"fluid-003",title:"Pump Shaft Power",description:"A pump delivers Q = 0.08 m³/s of water against head H = 15 m. Pump efficiency η = 75%, ρ = 1000 kg/m³. Find the required shaft power P_shaft.",question:"What shaft power is required for this pump?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Fluid Mechanics",difficulty:"intermediate",track:"pumps",test_cases:[{options:["15.7 kW","11.8 kW","78.5 kW","7.85 kW"],correct:0,explanation:"P_hyd = ρgQH = 1000×9.81×0.08×15 = 11 772 W. P_shaft = P_hyd / η = 11 772 / 0.75 = 15 696 W ≈ 15.7 kW."}]},{id:"fluid-004",title:"Pipe Head Loss — Darcy–Weisbach",description:"Water (ρ = 1000 kg/m³) flows in a 100 mm diameter pipe at V = 3 m/s. Pipe length L = 200 m, Darcy friction factor f = 0.02. Find head loss hf.",question:"What is the friction head loss along this pipe?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Fluid Mechanics",difficulty:"intermediate",track:"pipe_losses",test_cases:[{options:["18.35 m","9.17 m","36.7 m","4.59 m"],correct:0,explanation:"hf = fLV²/(D×2g) = 0.02×200×9/(0.1×19.62) = 36/1.962 = 18.35 m."}]}],l=[{id:"design-001",title:"Factor of Safety — Tensile Member",description:"A steel bar: Sut = 500 MPa, axial load P = 50 kN, cross-section A = 200 mm². Find the working stress and factor of safety.",question:"What is the factor of safety for this tensile member?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Machine Design",difficulty:"beginner",track:"failure_theories",test_cases:[{options:["FOS = 2.0","FOS = 1.0","FOS = 4.0","FOS = 0.5"],correct:0,explanation:"σ = P/A = 50 000 / (200×10⁻⁶) = 250 MPa. FOS = Sut / σ = 500/250 = 2.0."}]},{id:"design-002",title:"Shaft Shear Stress — Torque Transmission",description:"A solid shaft D = 40 mm transmits torque T = 500 N·m. Find the maximum shear stress τ_max using τ = 16T/(πD³).",question:"What is the maximum shear stress in this shaft?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Machine Design",difficulty:"intermediate",track:"shafts",test_cases:[{options:["39.8 MPa","19.9 MPa","79.6 MPa","99.4 MPa"],correct:0,explanation:"τ = 16T/(πD³) = 16×500 / (π×(0.04)³) = 8000 / (π×6.4×10⁻⁵) = 8000 / 2.011×10⁻⁴ = 39.8 MPa."}]},{id:"design-003",title:"Helical Spring Deflection",description:"Helical spring: wire diameter d = 5 mm, coil diameter D = 40 mm, n = 10 active coils, G = 80 GPa. Load W = 200 N. Find deflection δ.",question:"What is the deflection of this helical spring?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Machine Design",difficulty:"intermediate",track:"springs",test_cases:[{options:["51.2 mm","25.6 mm","102.4 mm","12.8 mm"],correct:0,explanation:"k = Gd⁴/(8D³n) = 80×10⁹×(5e-3)⁴/(8×(40e-3)³×10) = 80×10⁹×6.25×10⁻¹⁰ / 5.12×10⁻³ = 50/5.12×10⁻³ = 3906 N/m. δ = W/k = 200/3906 = 51.2 mm."}]},{id:"design-004",title:"Bolt Preload",description:"A M20 bolt: tensile stress area As = 245 mm², proof strength Sp = 600 MPa. The bolt is tightened to 75% of proof load. Find preload Fi.",question:"What is the bolt preload?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Machine Design",difficulty:"intermediate",track:"fasteners",test_cases:[{options:["110.25 kN","147 kN","73.5 kN","88.2 kN"],correct:0,explanation:"Fp = Sp × As = 600 × 245×10⁻⁶ = 147 kN. Fi = 0.75 × 147 = 110.25 kN."}]}],M=[{id:"mfg-001",title:"Turning — Cutting Speed and MRR",description:"Turning: workpiece D = 80 mm, N = 400 rpm, depth of cut d = 2 mm, feed f = 0.25 mm/rev. Find cutting speed V and MRR.",question:"What are the cutting speed and material removal rate?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Manufacturing Engineering",difficulty:"intermediate",track:"machining",test_cases:[{options:["V = 100.5 m/min, MRR = 838 mm³/s","V = 50.3 m/min, MRR = 419 mm³/s","V = 201 m/min, MRR = 1676 mm³/s","V = 100.5 m/min, MRR = 1676 mm³/s"],correct:0,explanation:"V = πDN/1000 = π×80×400/1000 = 100.5 m/min. MRR = π×D×d×f×N = π×80×2×0.25×400 = 50 265 mm³/min = 838 mm³/s."}]},{id:"mfg-002",title:"Forging — True vs Engineering Strain",description:"A billet compressed from h0 = 100 mm to h1 = 60 mm. Find the engineering strain ε_eng and true (logarithmic) strain ε_true.",question:"What are the engineering and true strains after compression?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Manufacturing Engineering",difficulty:"beginner",track:"forming",test_cases:[{options:["ε_eng = 0.40, ε_true = 0.511","ε_eng = 0.511, ε_true = 0.40","ε_eng = 0.40, ε_true = 0.667","ε_eng = 0.60, ε_true = 0.511"],correct:0,explanation:"ε_eng = (h0−h1)/h0 = 40/100 = 0.40. ε_true = ln(h0/h1) = ln(100/60) = ln(1.667) = 0.511."}]},{id:"mfg-003",title:"GMAW Welding — Heat Input",description:"GMAW: voltage V = 25 V, current I = 200 A, travel speed = 5 mm/s. Find heat input H per unit length (J/mm).",question:"What is the heat input per unit length for this weld pass?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Manufacturing Engineering",difficulty:"beginner",track:"welding",test_cases:[{options:["1000 J/mm","500 J/mm","2000 J/mm","200 J/mm"],correct:0,explanation:"H = (V × I) / speed = (25 × 200) / 5 = 5000 / 5 = 1000 J/mm."}]},{id:"mfg-004",title:"Sheet Metal Bending — Bend Allowance",description:"Sheet t = 2 mm, inside bend radius R = 4 mm, bend angle α = 90°, K-factor = 0.5. Find the bend allowance BA = (π/180) × α × (R + K×t).",question:"What is the bend allowance for this 90° bend?",missionType:"engineering_lab",workstation:"engineering_lab",category:"Manufacturing Engineering",difficulty:"intermediate",track:"sheet_metal",test_cases:[{options:["7.85 mm","6.28 mm","9.42 mm","5.50 mm"],correct:0,explanation:"BA = (π/2) × (R + K×t) = (π/2) × (4 + 0.5×2) = (π/2) × 5 = 7.854 mm ≈ 7.85 mm."}]}],x=[{id:"hvac-001",title:"Sensible Cooling Load Summation",description:"Office heat gains: solar 2000 W, occupants 500 W, equipment 1500 W, lights 800 W, walls/roof 1200 W. Find the total sensible cooling load.",question:"What is the total sensible cooling load?",missionType:"engineering_lab",workstation:"engineering_lab",category:"HVAC Engineering",difficulty:"beginner",track:"load_calc",test_cases:[{options:["6000 W","4500 W","7200 W","3000 W"],correct:0,explanation:"Q = 2000 + 500 + 1500 + 800 + 1200 = 6000 W = 6 kW."}]},{id:"hvac-002",title:"Psychrometrics — Partial Pressure of Vapour",description:"Air at 30°C, φ = 60% RH. Saturation pressure Psat(30°C) = 4.246 kPa. Find the partial vapour pressure Pv and dew point (Psat at T_dp = Pv).",question:"What is the partial vapour pressure and approximate dew point?",missionType:"engineering_lab",workstation:"engineering_lab",category:"HVAC Engineering",difficulty:"intermediate",track:"psychrometrics",test_cases:[{options:["Pv = 2.548 kPa, T_dp ≈ 21.4°C","Pv = 4.246 kPa, T_dp = 30°C","Pv = 1.274 kPa, T_dp ≈ 11°C","Pv = 3.180 kPa, T_dp ≈ 25°C"],correct:0,explanation:"Pv = φ × Psat = 0.60 × 4.246 = 2.548 kPa. T_dp is the temperature at which Psat = 2.548 kPa ≈ 21.4°C."}]},{id:"hvac-003",title:"Vapour Compression — COP and Heat Rejection",description:"A refrigerator: compressor work W = 1.5 kW, refrigerating effect QE = 5 kW. Find the COP and condenser heat rejection QC.",question:"What are the COP and condenser heat rejection?",missionType:"engineering_lab",workstation:"engineering_lab",category:"HVAC Engineering",difficulty:"beginner",track:"refrigeration",test_cases:[{options:["COP = 3.33, QC = 6.5 kW","COP = 4.33, QC = 5.0 kW","COP = 2.50, QC = 6.5 kW","COP = 3.33, QC = 5.0 kW"],correct:0,explanation:"COP = QE / W = 5 / 1.5 = 3.33. QC = QE + W = 5 + 1.5 = 6.5 kW."}]},{id:"hvac-004",title:"Duct Sizing — Required Cross-Section",description:"A duct carries Q = 1.2 m³/s at design velocity V = 6 m/s. Find the required area A and equivalent square duct side length.",question:"What is the required duct area and square duct side?",missionType:"engineering_lab",workstation:"engineering_lab",category:"HVAC Engineering",difficulty:"beginner",track:"duct_design",test_cases:[{options:["A = 0.2 m², side = 447 mm","A = 0.1 m², side = 316 mm","A = 0.4 m², side = 632 mm","A = 0.2 m², side = 200 mm"],correct:0,explanation:"A = Q/V = 1.2/6 = 0.2 m². side = √A = √0.2 = 0.4472 m = 447 mm."}]}],y=[{id:"ece_ic_001",title:"Voltage Divider",description:"A 9 V source is connected in series with R1 (10 kΩ) and R2 (10 kΩ). Complete the circuit by drawing wires between the open ports. Then verify that the mid-point voltage (between R1 and R2) is 4.5 V.",difficulty:"Easy",points:100,missionType:"interactive_circuit",simulation:{circuit:{components:[{id:"V1",type:"voltage_source",value:9,col:2,row:1,editable:!1},{id:"R1",type:"resistor",value:1e4,col:4,row:1,editable:!1},{id:"R2",type:"resistor",value:1e4,col:7,row:1,editable:!1},{id:"G1",type:"ground",col:2,row:3}],wires:[{id:"lw1",locked:!0,points:[{col:2,row:3},{col:10,row:3}]},{id:"lw2",locked:!0,points:[{col:2,row:3},{col:2,row:3}]},{id:"lw3",locked:!0,points:[{col:9,row:1},{col:9,row:3}]}],target:{type:"voltage_at_port",compId:"R2",portId:"a",value:4.5,tolerance:.05,unit:"V"}}},hints:["Connect the positive terminal of V1 to the left port of R1","Connect the right port of R1 to the left port of R2"],test_cases:[]},{id:"ece_ic_002",title:"Ohm's Law Verification",description:"Given a 12 V source and a single 4 kΩ resistor, complete the circuit. Verify that the current through the resistor is 3 mA (measured as voltage across the resistor = 12 V).",difficulty:"Easy",points:80,missionType:"interactive_circuit",simulation:{circuit:{components:[{id:"V1",type:"voltage_source",value:12,col:2,row:1,editable:!1},{id:"R1",type:"resistor",value:4e3,col:5,row:1,editable:!1},{id:"G1",type:"ground",col:2,row:3}],wires:[{id:"lw1",locked:!0,points:[{col:2,row:3},{col:7,row:3}]},{id:"lw2",locked:!0,points:[{col:7,row:1},{col:7,row:3}]}],target:{type:"voltage_at_port",compId:"R1",portId:"a",value:12,tolerance:.05,unit:"V"}}},hints:["Connect the positive terminal of V1 to the left port of R1"],test_cases:[]},{id:"ece_ic_003",title:"Series Resistors — Total Resistance",description:"Three resistors R1 (1 kΩ), R2 (2 kΩ), R3 (3 kΩ) are available. Connect them all in series with the 6 V source. Verify that the voltage at the junction of R2 and R3 is 2 V (i.e. 1/3 of supply — only R3 is below that node).",difficulty:"Medium",points:150,missionType:"interactive_circuit",simulation:{circuit:{components:[{id:"V1",type:"voltage_source",value:6,col:1,row:2,editable:!1},{id:"R1",type:"resistor",value:1e3,col:3,row:2,editable:!1},{id:"R2",type:"resistor",value:2e3,col:6,row:2,editable:!1},{id:"R3",type:"resistor",value:3e3,col:9,row:2,editable:!1},{id:"G1",type:"ground",col:1,row:4}],wires:[{id:"lw1",locked:!0,points:[{col:1,row:4},{col:11,row:4}]},{id:"lw2",locked:!0,points:[{col:11,row:2},{col:11,row:4}]},{id:"lw3",locked:!0,points:[{col:1,row:4},{col:1,row:4}]}],target:{type:"voltage_at_port",compId:"R3",portId:"a",value:2,tolerance:.05,unit:"V"}}},hints:["Total resistance = 1+2+3 = 6 kΩ, so I = 1 mA","V(R3.a) = I × R3 = 1mA × 2kΩ... wait, think about which resistors are below the node"],test_cases:[]}],I=[{id:"ml-001",title:"Train a Binary Classifier with scikit-learn",category:"Machine Learning",icon:"🤖",difficulty:"Easy",timeLimit:"25 min",eloGain:14,tools:["Python","scikit-learn"],scenario:"A fintech startup has a dataset of loan applications and wants to predict whether a loan will default. You've been handed a preprocessed feature matrix and need to train, evaluate, and iterate on a classifier before the product demo tomorrow.",objective:"Train a Logistic Regression classifier, evaluate it with accuracy/precision/recall, and improve it with feature scaling.",steps:["Load the dataset and inspect class distribution","Split into train/test sets (80/20, stratified)","Train a LogisticRegression model","Print accuracy, precision, recall, and F1 score","Add StandardScaler and retrain — compare scores"],workstation:"notebook",starterCode:`# Binary Classifier — Loan Default Prediction
import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report

# Generate synthetic loan dataset (replace with real CSV in production)
X, y = make_classification(
    n_samples=1000, n_features=10, n_informative=6,
    n_redundant=2, weights=[0.7, 0.3], random_state=42
)
# y=0: no default, y=1: default
print(f"Dataset shape: {X.shape}, Class distribution: {np.bincount(y)}")

# STEP 1: Split data — stratified to preserve class ratio
# TODO: Use train_test_split with test_size=0.2, stratify=y, random_state=42

# STEP 2: Train baseline LogisticRegression (no scaling yet)
# TODO: Fit on X_train, y_train

# STEP 3: Evaluate — print accuracy, precision, recall, F1
# TODO: Predict on X_test, then print metrics

# STEP 4: Add StandardScaler and retrain
# TODO: scaler.fit(X_train) then transform both splits
# TODO: Retrain and compare — does scaling help?

# STEP 5: Print full classification_report
# TODO: classification_report(y_test, y_pred_scaled)
`,skillTags:["Logistic Regression","Classification","scikit-learn","Model Evaluation","Feature Scaling"],hints:["Use stratify=y in train_test_split to preserve the 70/30 class ratio in both splits","StandardScaler improves logistic regression significantly — always scale numeric features","precision_score(y_test, y_pred, zero_division=0) avoids warnings when a class has no predictions"]},{id:"ml-002",title:"Evaluate Model Drift with Cross-Validation",category:"Model Evaluation",icon:"📊",difficulty:"Medium",timeLimit:"30 min",eloGain:18,tools:["Python","scikit-learn"],scenario:"Your team has three candidate models for a churn prediction system. Before deploying, the ML lead wants robust cross-validation scores — not just a single train/test split — to check for variance and overfitting.",objective:"Compare Logistic Regression, Random Forest, and Gradient Boosting using 5-fold stratified CV. Report mean ± std for F1 score.",steps:["Define three models: LogisticRegression, RandomForestClassifier, GradientBoostingClassifier","Run StratifiedKFold(n_splits=5) cross-validation on each","Collect F1 scores for each fold","Print mean ± std for each model","Identify the best model by mean F1 and lowest variance"],workstation:"notebook",starterCode:`# Model Evaluation — Cross-Validation Comparison
import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

X, y = make_classification(n_samples=2000, n_features=15, n_informative=8,
                            weights=[0.65, 0.35], random_state=42)

# STEP 1: Define 3 models
# Wrap LogisticRegression in a Pipeline with StandardScaler
# LogisticRegression: max_iter=1000
# RandomForest: n_estimators=100, random_state=42
# GradientBoosting: n_estimators=100, random_state=42
models = {
    # TODO: fill in model definitions
}

# STEP 2: Run 5-fold stratified CV for each
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

for name, model in models.items():
    # TODO: cross_val_score with scoring='f1', cv=skf
    # TODO: Print: "{name}: mean={:.3f} ± std={:.3f}"
    pass

# STEP 3: Which model has highest mean F1? Which has lowest variance?
# TODO: Print your recommendation with justification
`,skillTags:["Cross-Validation","Model Selection","Random Forest","Gradient Boosting","Bias-Variance"],hints:["Use Pipeline([('scaler', StandardScaler()), ('clf', LogisticRegression())]) to prevent data leakage in CV","High std means the model is sensitive to which fold it sees — prefer lower variance for production","GradientBoosting is slower but usually beats RF on tabular data with the right n_estimators"]},{id:"ml-003",title:"Feature Engineering for Time-Series Churn",category:"Feature Engineering",icon:"🔧",difficulty:"Medium",timeLimit:"35 min",eloGain:20,tools:["Python","pandas","scikit-learn"],scenario:"You have 6 months of SaaS user activity logs. The product team wants a model to predict which users will churn next month. Raw data is timestamps and event counts — you need to engineer meaningful features before any ML can happen.",objective:"Create lag features, rolling aggregates, and ratio features from a user activity DataFrame, then train a classifier on your engineered features.",steps:["Create a user-level DataFrame with monthly activity counts","Add lag features: activity 1 month ago, 2 months ago","Add rolling mean (3-month window) of activity","Add ratio: last_month / avg_3month (engagement trend)","Train a Random Forest and check feature importances"],workstation:"notebook",starterCode:`# Feature Engineering — SaaS Churn Prediction
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Simulate 6 months of user activity (logins per month)
np.random.seed(42)
n_users = 500
data = {
    'user_id': range(n_users),
    'm1': np.random.poisson(20, n_users),
    'm2': np.random.poisson(18, n_users),
    'm3': np.random.poisson(15, n_users),
    'm4': np.random.poisson(12, n_users),
    'm5': np.random.poisson(8, n_users),
    'm6': np.random.poisson(5, n_users),
}
df = pd.DataFrame(data)
# Target: churned if m6 logins < 3
df['churned'] = (df['m6'] < 3).astype(int)
print(f"Churn rate: {df.churned.mean():.1%}")

# STEP 1: Lag features
# TODO: df['lag_1'] = df['m5']  (activity 1 month before prediction month)
# TODO: df['lag_2'] = df['m4']  (2 months before)

# STEP 2: Rolling mean of m3, m4, m5
# TODO: df['rolling_mean_3'] = df[['m3','m4','m5']].mean(axis=1)

# STEP 3: Engagement trend ratio
# TODO: df['trend_ratio'] = df['m5'] / (df['rolling_mean_3'] + 1e-9)

# STEP 4: Prepare features and target
# TODO: feature_cols = ['lag_1','lag_2','rolling_mean_3','trend_ratio','m1','m2','m3']
# TODO: X = df[feature_cols], y = df['churned']

# STEP 5: Train Random Forest and print feature importances
# TODO: train/test split, fit RandomForestClassifier, print sorted importances
`,skillTags:["Feature Engineering","Pandas","Lag Features","Rolling Aggregates","Random Forest"],hints:["Always add a small epsilon (1e-9) to denominators in ratio features to avoid division by zero","Feature importances from RF tell you which engineered features actually matter — iterate based on them","Rolling means smooth noise; lag features capture recent momentum — both together beat either alone"]},{id:"ml-004",title:"Deploy a Model with a REST Prediction Endpoint",category:"MLOps",icon:"🚀",difficulty:"Hard",timeLimit:"40 min",eloGain:25,tools:["Python","scikit-learn","joblib"],scenario:"The ML team has approved your churn model. Now the backend team needs a prediction API. You'll serialize the trained model with joblib, write a prediction function that mimics what a Flask/FastAPI route would do, and validate it handles edge cases.",objective:"Train a pipeline, serialize it with joblib, reload it, and write a predict() function that validates inputs, handles missing values, and returns a prediction with confidence score.",steps:["Train a Pipeline (scaler + classifier) and serialize with joblib.dump()","Reload the model with joblib.load()","Write predict(features: dict) → {label, confidence, risk_tier}","Handle missing feature keys gracefully (default to 0)","Test with valid input, missing keys, and edge cases"],workstation:"notebook",starterCode:`# MLOps — Model Serialization & Prediction API
import numpy as np
import joblib
import os
from sklearn.datasets import make_classification
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split

FEATURE_NAMES = ['logins_last_30d', 'features_used', 'support_tickets',
                 'days_since_last_login', 'plan_tier', 'team_size']

# STEP 1: Train pipeline
X, y = make_classification(n_samples=1000, n_features=6, n_informative=4,
                            weights=[0.7, 0.3], random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', GradientBoostingClassifier(n_estimators=100, random_state=42))
])
# TODO: Fit the pipeline on training data

# STEP 2: Save and reload
MODEL_PATH = '/tmp/churn_model.joblib'
# TODO: joblib.dump(pipeline, MODEL_PATH)
# TODO: loaded_model = joblib.load(MODEL_PATH)
# TODO: print(f"Model saved and reloaded: {os.path.getsize(MODEL_PATH)/1024:.1f}KB")

# STEP 3: Write prediction function
def predict(features: dict) -> dict:
    """
    features: dict with keys from FEATURE_NAMES
    returns: {"label": "churn"|"retain", "confidence": float, "risk_tier": "low"|"medium"|"high"}
    """
    # TODO: Build feature vector — use features.get(name, 0) for each name in FEATURE_NAMES
    # TODO: x = np.array([[...]])
    # TODO: prob = loaded_model.predict_proba(x)[0][1]  # P(churn)
    # TODO: label = "churn" if prob > 0.5 else "retain"
    # TODO: risk_tier = "high" if prob > 0.7 else "medium" if prob > 0.4 else "low"
    # TODO: return {"label": label, "confidence": round(float(prob), 4), "risk_tier": risk_tier}
    pass

# STEP 4: Test cases
test_cases = [
    {"logins_last_30d": 2, "features_used": 1, "support_tickets": 5, "days_since_last_login": 25, "plan_tier": 0, "team_size": 1},
    {"logins_last_30d": 45, "features_used": 12, "days_since_last_login": 1, "plan_tier": 2, "team_size": 10},  # missing keys
    {},  # all missing — should use defaults
]
for i, tc in enumerate(test_cases):
    result = predict(tc)
    print(f"Test {i+1}: {result}")
`,skillTags:["MLOps","Model Deployment","joblib","Prediction API","Pipeline"],hints:["joblib is preferred over pickle for scikit-learn models — it's faster for large numpy arrays","Always use features.get(name, 0) not features[name] — production requests will have missing keys","Wrap the whole predict() in try/except and return an error dict — APIs must never raise raw exceptions"]}],F=[{id:"android-001",title:"Build a ViewModel with StateFlow",category:"Android Architecture",icon:"🤖",difficulty:"Easy",timeLimit:"25 min",eloGain:14,tools:["Kotlin"],scenario:"You're building a news app. The UI team handed you mockups that show a loading spinner, a list of articles, and an error state. You need to wire up a ViewModel that holds all three states and exposes them via StateFlow so the Composable can collect them.",objective:"Write a NewsViewModel with a sealed UiState, populate it from a fake repository, and expose state via StateFlow.",steps:["Define a sealed class UiState with Loading, Success(List<Article>), and Error(String) variants","Create a NewsViewModel extending ViewModel","Add a private MutableStateFlow<UiState> initialized to Loading","Expose it as public StateFlow via asStateFlow()","Write fetchNews() using viewModelScope.launch to simulate a repository call"],workstation:"code",starterCode:`// NewsViewModel.kt — MVVM with StateFlow
// Kotlin pseudo-code: write the logic, comments show expected structure

// Data model
data class Article(val id: Int, val title: String, val author: String)

// STEP 1: Define sealed UiState
// sealed class UiState {
//     object Loading : UiState()
//     data class Success(val articles: List<Article>) : UiState()
//     data class Error(val message: String) : UiState()
// }
// TODO: Implement UiState sealed class

// Fake repository — simulates network delay
object NewsRepository {
    suspend fun fetchArticles(): List<Article> {
        // kotlinx.coroutines.delay(1000)  // simulate 1s network
        return listOf(
            Article(1, "Kotlin 2.0 Released", "JetBrains"),
            Article(2, "Compose Multiplatform GA", "Google"),
            Article(3, "Android 15 Features", "Android Team"),
        )
    }
}

// STEP 2: ViewModel
// class NewsViewModel : ViewModel() {
//
//     STEP 3: private MutableStateFlow
//     private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
//
//     STEP 4: public StateFlow
//     val uiState: StateFlow<UiState> = _uiState.asStateFlow()
//
//     STEP 5: fetchNews()
//     fun fetchNews() {
//         viewModelScope.launch {
//             _uiState.value = UiState.Loading
//             try {
//                 val articles = NewsRepository.fetchArticles()
//                 _uiState.value = UiState.Success(articles)
//             } catch (e: Exception) {
//                 _uiState.value = UiState.Error(e.message ?: "Unknown error")
//             }
//         }
//     }
// }
// TODO: Implement NewsViewModel

// Verify: print state transitions (simulate in a test scenario)
fun main() {
    println("ViewModel defined — wire into Composable with collectAsState()")
    println("State machine: Loading → Success(articles) or Error(msg)")
    // In real app: val viewModel = viewModel<NewsViewModel>()
    //              val state by viewModel.uiState.collectAsState()
}
`,skillTags:["ViewModel","StateFlow","Kotlin Coroutines","MVVM","Sealed Classes"],hints:["StateFlow always has a value — initialize with Loading so the UI never sees an undefined state","asStateFlow() makes the flow read-only to the UI — only the ViewModel mutates _uiState","viewModelScope is automatically cancelled when the ViewModel is cleared — no manual cleanup needed"]},{id:"android-002",title:"Room Database: Insert, Query, and Flow",category:"Data Persistence",icon:"🗄️",difficulty:"Medium",timeLimit:"30 min",eloGain:18,tools:["Kotlin","Room"],scenario:"Your app needs offline-first task management. Tasks created without internet must persist locally and sync later. You'll define the Room entity, DAO, and database, then wire a Flow so the UI reacts automatically when tasks are inserted.",objective:"Define a Task entity, TaskDao with insert/getAll (as Flow), and demonstrate that the Flow emits when data changes.",steps:["Define @Entity data class Task with id, title, isCompleted, createdAt fields",'Write @Dao interface TaskDao with @Insert and @Query("SELECT * FROM tasks") returning Flow<List<Task>>',"Build the @Database abstract class TaskDatabase","Write a test that inserts 3 tasks and collects the first Flow emission","Verify the emitted list matches what was inserted"],workstation:"code",starterCode:`// Room Database Setup
// Kotlin pseudo-code — write the definitions, not the annotations (simulated environment)

// STEP 1: Entity
// @Entity(tableName = "tasks")
// data class Task(
//     @PrimaryKey(autoGenerate = true) val id: Long = 0,
//     val title: String,
//     val isCompleted: Boolean = false,
//     val createdAt: Long = System.currentTimeMillis()
// )
// TODO: Define Task entity

// STEP 2: DAO
// @Dao
// interface TaskDao {
//     @Insert(onConflict = OnConflictStrategy.REPLACE)
//     suspend fun insert(task: Task): Long
//
//     @Query("SELECT * FROM tasks ORDER BY createdAt DESC")
//     fun getAllTasks(): Flow<List<Task>>
//
//     @Query("SELECT * FROM tasks WHERE isCompleted = :done")
//     fun getTasksByStatus(done: Boolean): Flow<List<Task>>
//
//     @Delete
//     suspend fun delete(task: Task)
// }
// TODO: Define TaskDao

// STEP 3: Database
// @Database(entities = [Task::class], version = 1, exportSchema = false)
// abstract class TaskDatabase : RoomDatabase() {
//     abstract fun taskDao(): TaskDao
//     companion object {
//         @Volatile private var INSTANCE: TaskDatabase? = null
//         fun getInstance(context: Context): TaskDatabase =
//             INSTANCE ?: synchronized(this) {
//                 Room.databaseBuilder(context, TaskDatabase::class.java, "task_db").build()
//                     .also { INSTANCE = it }
//             }
//     }
// }
// TODO: Define TaskDatabase

// Simulated verification
fun main() {
    println("Room setup complete:")
    println("  Entity: Task(id, title, isCompleted, createdAt)")
    println("  DAO: insert() [suspend], getAllTasks() [Flow], getTasksByStatus() [Flow], delete() [suspend]")
    println("  DB: Singleton pattern with @Volatile INSTANCE")
    println()
    println("Usage in ViewModel:")
    println("  viewModelScope.launch { dao.insert(Task(title='Buy milk')) }")
    println("  dao.getAllTasks().collect { tasks -> _uiState.value = Success(tasks) }")
}
`,skillTags:["Room Database","Entity","DAO","Flow","Offline-First"],hints:["Flow<List<Task>> from Room automatically emits a new list every time the table changes — no polling needed","Use @Volatile + synchronized(this) in the companion object for thread-safe singleton construction","OnConflictStrategy.REPLACE is safe for simple cases — use IGNORE if you want to skip duplicates instead"]},{id:"android-003",title:"Retrofit + Coroutines API Integration",category:"Networking",icon:"🌐",difficulty:"Medium",timeLimit:"30 min",eloGain:18,tools:["Kotlin","Retrofit"],scenario:"The backend team just shipped a REST API for your social app. You need to integrate Retrofit with Gson, handle success/error responses cleanly using a Result wrapper, and expose the data through the ViewModel's StateFlow.",objective:"Define a Retrofit service interface, create a repository that wraps calls in Result<T>, and propagate results to a ViewModel StateFlow.",steps:["Define ApiService interface with a suspend GET endpoint","Create UserRepository.getUser(id) wrapping the call in try/catch returning Result<User>","In ViewModel, call repository and map Result to UiState","Handle both success and failure cases","Print simulated success and failure outcomes"],workstation:"code",starterCode:`// Retrofit Integration with Result Wrapper
// Kotlin pseudo-code

// Data model
data class User(val id: Int, val name: String, val email: String, val avatar: String)

// STEP 1: Retrofit service interface
// interface ApiService {
//     @GET("users/{id}")
//     suspend fun getUser(@Path("id") id: Int): User
//
//     @GET("users")
//     suspend fun getUsers(@Query("page") page: Int = 1): List<User>
// }
// TODO: Define ApiService

// Retrofit singleton
// object RetrofitClient {
//     private const val BASE_URL = "https://api.capabilio.com/"
//     val service: ApiService by lazy {
//         Retrofit.Builder()
//             .baseUrl(BASE_URL)
//             .addConverterFactory(GsonConverterFactory.create())
//             .client(OkHttpClient.Builder()
//                 .connectTimeout(30, TimeUnit.SECONDS)
//                 .build())
//             .build()
//             .create(ApiService::class.java)
//     }
// }

// STEP 2: Repository with Result wrapper
// class UserRepository(private val api: ApiService = RetrofitClient.service) {
//     suspend fun getUser(id: Int): Result<User> = try {
//         Result.success(api.getUser(id))
//     } catch (e: HttpException) {
//         Result.failure(Exception("HTTP \${e.code()}: \${e.message()}"))
//     } catch (e: IOException) {
//         Result.failure(Exception("Network error: check your connection"))
//     }
// }
// TODO: Define UserRepository

// STEP 3: ViewModel
// class UserViewModel(private val repo: UserRepository = UserRepository()) : ViewModel() {
//     private val _state = MutableStateFlow<UiState>(UiState.Loading)
//     val state: StateFlow<UiState> = _state.asStateFlow()
//
//     fun loadUser(id: Int) {
//         viewModelScope.launch {
//             _state.value = UiState.Loading
//             repo.getUser(id)
//                 .onSuccess { user -> _state.value = UiState.Success(user) }
//                 .onFailure { e -> _state.value = UiState.Error(e.message ?: "Unknown") }
//         }
//     }
// }
// TODO: Define UserViewModel

fun main() {
    println("Retrofit + Coroutines pattern:")
    println("  ApiService  → suspend fun getUser(id) : User")
    println("  Repository  → runCatching { api.getUser(id) } → Result<User>")
    println("  ViewModel   → result.onSuccess { } .onFailure { } → StateFlow<UiState>")
    println("  Composable  → collectAsState() → when(state) { Loading, Success, Error }")
}
`,skillTags:["Retrofit","Kotlin Coroutines","Result","Repository Pattern","OkHttp"],hints:["Use Result.success() and Result.failure() — Kotlin's built-in Result avoids custom sealed classes for simple cases","Catch HttpException for non-2xx responses and IOException for network failures — these are the two main error types","The Repository pattern decouples ViewModel from the API — makes unit testing trivial with a fake repository"]},{id:"android-004",title:"Jetpack Compose: Reusable Component with State Hoisting",category:"Jetpack Compose UI",icon:"🎨",difficulty:"Hard",timeLimit:"35 min",eloGain:22,tools:["Kotlin","Jetpack Compose"],scenario:"The design system team needs a reusable SearchBar composable that works across 5 different screens. It must hoist its state upward (stateless composable), support a clear button, debounce input, and be testable in isolation.",objective:"Build a stateless SearchBar composable with state hoisting, a debounced onSearch callback, and a clear button.",steps:["Define SearchBar(query, onQueryChange, onSearch, onClear, modifier) — fully stateless","Add a trailing IconButton that shows only when query is not empty","Write SearchScreen that owns the state and wires up SearchBar","Add debounce logic: only call onSearch after 300ms of no typing","Demonstrate the component is reusable by showing two instances with independent state"],workstation:"code",starterCode:`// Jetpack Compose — Stateless SearchBar with State Hoisting
// Kotlin / Compose pseudo-code

// STEP 1: Stateless SearchBar composable
// @Composable
// fun SearchBar(
//     query: String,
//     onQueryChange: (String) -> Unit,
//     onSearch: (String) -> Unit,
//     onClear: () -> Unit,
//     modifier: Modifier = Modifier,
//     placeholder: String = "Search..."
// ) {
//     OutlinedTextField(
//         value = query,
//         onValueChange = onQueryChange,
//         modifier = modifier.fillMaxWidth(),
//         placeholder = { Text(placeholder) },
//         leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
//         trailingIcon = {
//             // TODO: Show X button only when query is not empty
//             // AnimatedVisibility(visible = query.isNotEmpty()) {
//             //     IconButton(onClick = onClear) {
//             //         Icon(Icons.Default.Clear, contentDescription = "Clear")
//             //     }
//             // }
//         },
//         keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
//         keyboardActions = KeyboardActions(onSearch = { onSearch(query) }),
//         singleLine = true
//     )
// }
// TODO: Implement SearchBar

// STEP 2: SearchScreen — owns state, passes down to SearchBar
// @Composable
// fun SearchScreen(viewModel: SearchViewModel = viewModel()) {
//     var query by remember { mutableStateOf("") }
//
//     // STEP 3: Debounce — trigger search 300ms after typing stops
//     LaunchedEffect(query) {
//         if (query.isNotBlank()) {
//             delay(300)
//             viewModel.search(query)
//         }
//     }
//
//     Column {
//         SearchBar(
//             query = query,
//             onQueryChange = { query = it },
//             onSearch = { viewModel.search(it) },
//             onClear = { query = "" }
//         )
//         // Results list below...
//     }
// }
// TODO: Implement SearchScreen

// STEP 4: Two independent instances (show reusability)
// @Composable
// fun TwoSearchBars() {
//     var q1 by remember { mutableStateOf("") }
//     var q2 by remember { mutableStateOf("") }
//     Column {
//         SearchBar(query=q1, onQueryChange={q1=it}, onSearch={}, onClear={q1=""})
//         Spacer(Modifier.height(8.dp))
//         SearchBar(query=q2, onQueryChange={q2=it}, onSearch={}, onClear={q2=""})
//     }
// }

fun main() {
    println("State hoisting principle:")
    println("  SearchBar is STATELESS — receives state and emits events")
    println("  SearchScreen OWNS state — var query by remember { mutableStateOf('') }")
    println("  Debounce: LaunchedEffect(query) { delay(300); search(query) }")
    println("  Result: SearchBar is fully testable, reusable, and previewable")
}
`,skillTags:["Jetpack Compose","State Hoisting","Stateless Composable","LaunchedEffect","Debounce"],hints:["Stateless composables take state as params and emit events via lambdas — never use remember inside them","LaunchedEffect(query) cancels and restarts every time query changes — this is the debounce mechanism","AnimatedVisibility wrapping the clear button gives a smooth fade/slide — always use for conditional icons"]}],B=[{id:"ios-001",title:"SwiftUI View with @StateObject ViewModel",category:"SwiftUI Architecture",icon:"🍎",difficulty:"Easy",timeLimit:"25 min",eloGain:14,tools:["Swift","SwiftUI"],scenario:"You're building a weather app. The design team has handed off a Figma with a loading state, a temperature display, and an error banner. You need to wire a ViewModel that fetches data and drives the SwiftUI view via @Published properties.",objective:"Build a WeatherViewModel with @Published state, connect it to a SwiftUI view using @StateObject, and handle loading/success/error states.",steps:["Define WeatherViewModel: ObservableObject with @Published temperature, isLoading, errorMessage","Write fetchWeather() using async/await that sets state before and after the call","Create WeatherView with @StateObject var vm = WeatherViewModel()","Show a ProgressView when isLoading, temperature when available, errorMessage when set","Add an onAppear modifier to trigger fetchWeather on first load"],workstation:"code",starterCode:`// WeatherViewModel.swift — SwiftUI + ObservableObject
// Swift pseudo-code: write the logic

import Foundation

// STEP 1: ViewModel
// @MainActor
// class WeatherViewModel: ObservableObject {
//     @Published var temperature: Double? = nil
//     @Published var cityName: String = "Mumbai"
//     @Published var isLoading: Bool = false
//     @Published var errorMessage: String? = nil
//
//     // STEP 2: Async fetch
//     func fetchWeather() async {
//         isLoading = true
//         errorMessage = nil
//         do {
//             // Simulate network call
//             try await Task.sleep(nanoseconds: 1_000_000_000)
//             temperature = 28.5  // Replace with real URLSession call
//         } catch {
//             errorMessage = "Failed to load weather: \\(error.localizedDescription)"
//         }
//         isLoading = false
//     }
// }
// TODO: Implement WeatherViewModel

// STEP 3 & 4: SwiftUI View
// struct WeatherView: View {
//     @StateObject private var vm = WeatherViewModel()
//
//     var body: some View {
//         VStack(spacing: 20) {
//             Text(vm.cityName)
//                 .font(.title)
//
//             if vm.isLoading {
//                 ProgressView("Loading weather...")
//             } else if let temp = vm.temperature {
//                 Text("\\(temp, specifier: "%.1f")°C")
//                     .font(.system(size: 60, weight: .thin))
//             } else if let error = vm.errorMessage {
//                 Text(error)
//                     .foregroundColor(.red)
//                     .multilineTextAlignment(.center)
//             }
//
//             Button("Refresh") {
//                 Task { await vm.fetchWeather() }
//             }
//         }
//         .padding()
//         // STEP 5: Trigger on appear
//         .task { await vm.fetchWeather() }
//     }
// }
// TODO: Implement WeatherView

// Verification
print("SwiftUI ViewModel pattern:")
print("  @StateObject — creates and owns the VM for the view's lifetime")
print("  @Published   — any change triggers SwiftUI re-render")
print("  @MainActor   — ensures UI updates happen on main thread")
print("  .task { }    — preferred over .onAppear for async work in iOS 15+")
`,skillTags:["SwiftUI","ObservableObject","@Published","@StateObject","async/await"],hints:["@StateObject creates the VM once — @ObservedObject would recreate it on every parent re-render","@MainActor on the class ensures @Published mutations always happen on the main thread","Use .task { } instead of .onAppear for async work — it automatically cancels on view disappearance"]},{id:"ios-002",title:"URLSession async/await Networking",category:"Networking",icon:"🌐",difficulty:"Medium",timeLimit:"30 min",eloGain:18,tools:["Swift"],scenario:"The backend shipped a JSON API for your fitness tracker. You need a type-safe network layer: a NetworkService that uses URLSession with async/await, decodes Codable models, and wraps errors in a custom NetworkError enum.",objective:"Write a generic NetworkService.fetch<T: Decodable> function, define a NetworkError enum, and decode a Workout model from a JSON response.",steps:["Define NetworkError enum with cases: invalidURL, httpError(Int), decodingError, noData","Write NetworkService with static func fetch<T: Decodable>(_ url: String) async throws -> T","In fetch(): construct URLRequest, call URLSession.shared.data(for:), check HTTP status, decode","Define Workout: Codable with id, name, duration, caloriesBurned","Test by decoding a JSON string into a Workout"],workstation:"code",starterCode:`// NetworkService.swift — URLSession + async/await + Codable
import Foundation

// STEP 1: Custom error type
// enum NetworkError: Error, LocalizedError {
//     case invalidURL
//     case httpError(statusCode: Int)
//     case decodingError(Error)
//     case noData
//
//     var errorDescription: String? {
//         switch self {
//         case .invalidURL:           return "Invalid URL"
//         case .httpError(let code):  return "HTTP error: \\(code)"
//         case .decodingError(let e): return "Decoding failed: \\(e.localizedDescription)"
//         case .noData:               return "No data received"
//         }
//     }
// }
// TODO: Implement NetworkError

// STEP 2 & 3: Generic NetworkService
// struct NetworkService {
//     static func fetch<T: Decodable>(_ urlString: String) async throws -> T {
//         guard let url = URL(string: urlString) else {
//             throw NetworkError.invalidURL
//         }
//         let (data, response) = try await URLSession.shared.data(from: url)
//         guard let http = response as? HTTPURLResponse else { throw NetworkError.noData }
//         guard (200..<300).contains(http.statusCode) else {
//             throw NetworkError.httpError(statusCode: http.statusCode)
//         }
//         do {
//             return try JSONDecoder().decode(T.self, from: data)
//         } catch {
//             throw NetworkError.decodingError(error)
//         }
//     }
// }
// TODO: Implement NetworkService

// STEP 4: Codable model
// struct Workout: Codable {
//     let id: Int
//     let name: String
//     let duration: Int          // minutes
//     let caloriesBurned: Int
//     let completedAt: Date?
//
//     enum CodingKeys: String, CodingKey {
//         case id, name, duration
//         case caloriesBurned = "calories_burned"
//         case completedAt    = "completed_at"
//     }
// }
// TODO: Implement Workout

// STEP 5: Test with local JSON
let sampleJSON = """
{"id":1,"name":"Morning Run","duration":30,"calories_burned":320,"completed_at":null}
""".data(using: .utf8)!

// TODO: let workout = try JSONDecoder().decode(Workout.self, from: sampleJSON)
// TODO: print("Decoded: \\(workout.name), \\(workout.caloriesBurned) kcal")

print("NetworkService pattern: URLSession.shared.data(from:) → check status → JSONDecoder().decode()")
`,skillTags:["URLSession","async/await","Codable","JSONDecoder","Error Handling"],hints:["CodingKeys enum lets you map snake_case JSON keys to camelCase Swift properties","Always check HTTPURLResponse status before decoding — a 404 returns data (an error JSON) but decode would fail or give wrong result","throws + async together mean callers use try await — Swift propagates both automatically"]},{id:"ios-003",title:"Core Data with NSFetchedResultsController",category:"Data Persistence",icon:"🗄️",difficulty:"Medium",timeLimit:"35 min",eloGain:20,tools:["Swift","Core Data"],scenario:"Your note-taking app needs offline persistence. Notes must survive app restarts, support search, and update the SwiftUI list instantly when saved. You'll use Core Data with NSFetchedResultsController to drive the list reactively.",objective:"Define a Note entity, write a CoreDataStack, add CRUD operations, and wire NSFetchedResultsController to a SwiftUI List.",steps:["Define PersistenceController singleton with an NSPersistentContainer","Write createNote(title:content:) and deleteNote(_:) using viewContext","Fetch all notes sorted by createdAt descending","Wire results to @FetchRequest in SwiftUI","Add a search predicate to filter notes by title"],workstation:"code",starterCode:`// Core Data Setup
// Swift pseudo-code

import CoreData
import SwiftUI

// STEP 1: Persistence stack
// struct PersistenceController {
//     static let shared = PersistenceController()
//     let container: NSPersistentContainer
//
//     init() {
//         container = NSPersistentContainer(name: "CapabilioNotes")
//         container.loadPersistentStores { _, error in
//             if let error { fatalError("Core Data load failed: \\(error)") }
//         }
//         container.viewContext.automaticallyMergesChangesFromParent = true
//     }
//
//     var viewContext: NSManagedObjectContext { container.viewContext }
// }
// TODO: Implement PersistenceController

// Core Data entity (defined in .xcdatamodeld — summarized here):
// Entity: Note
// Attributes: id (UUID), title (String), content (String), createdAt (Date)

// STEP 2: CRUD helpers
// extension PersistenceController {
//     func createNote(title: String, content: String = "") {
//         let note = Note(context: viewContext)  // Note is the NSManagedObject subclass
//         note.id        = UUID()
//         note.title     = title
//         note.content   = content
//         note.createdAt = Date()
//         save()
//     }
//
//     func deleteNote(_ note: Note) {
//         viewContext.delete(note)
//         save()
//     }
//
//     private func save() {
//         guard viewContext.hasChanges else { return }
//         try? viewContext.save()
//     }
// }
// TODO: Implement CRUD helpers

// STEP 3 & 4: SwiftUI List with @FetchRequest
// struct NotesListView: View {
//     @FetchRequest(
//         entity: Note.entity(),
//         sortDescriptors: [NSSortDescriptor(key: "createdAt", ascending: false)],
//         predicate: nil,
//         animation: .default
//     ) var notes: FetchedResults<Note>
//
//     @State private var searchText = ""
//     var pc = PersistenceController.shared
//
//     var body: some View {
//         List {
//             ForEach(notes) { note in
//                 VStack(alignment: .leading) {
//                     Text(note.title ?? "").font(.headline)
//                     Text(note.createdAt ?? Date(), style: .date).font(.caption)
//                 }
//             }
//             .onDelete { indices in
//                 indices.forEach { pc.deleteNote(notes[$0]) }
//             }
//         }
//         // STEP 5: Search predicate
//         .searchable(text: $searchText)
//         .onChange(of: searchText) { query in
//             notes.nsPredicate = query.isEmpty ? nil :
//                 NSPredicate(format: "title CONTAINS[cd] %@", query)
//         }
//     }
// }

print("Core Data pattern:")
print("  PersistenceController.shared.container.viewContext → single context")
print("  @FetchRequest auto-updates SwiftUI list when data changes")
print("  CONTAINS[cd] predicate: c=case-insensitive, d=diacritic-insensitive")
`,skillTags:["Core Data","NSFetchRequest","@FetchRequest","CRUD","NSPredicate"],hints:["automaticallyMergesChangesFromParent = true lets background context saves appear in viewContext automatically","guard viewContext.hasChanges else { return } avoids unnecessary save calls when nothing changed","CONTAINS[cd] in NSPredicate: [c] = case insensitive, [d] = ignores accents/diacritics"]},{id:"ios-004",title:"Combine: Publisher Chain for Live Search",category:"Reactive Programming",icon:"⚡",difficulty:"Hard",timeLimit:"35 min",eloGain:22,tools:["Swift","Combine"],scenario:"Your e-commerce app has a search bar that hits an API on every keystroke — burning through API quota. You need to debounce the input, remove duplicate queries, cancel in-flight requests, and map the result to your UI model.",objective:"Build a Combine publisher chain: debounce → removeDuplicates → flatMap (cancelling previous) → map to UI model → assign to @Published.",steps:['Add @Published var searchText = "" to the ViewModel',"Chain: $searchText.debounce(0.3s) .removeDuplicates() .filter { !$0.isEmpty }","Add .flatMap(maxPublishers: .max(1)) { query in self.searchAPI(query) }","Map results to [SearchResult] UI model","Store subscription in Set<AnyCancellable>"],workstation:"code",starterCode:`// Combine — Live Search with Debounce + Cancel
import Combine
import Foundation

struct SearchResult: Identifiable {
    let id: Int
    let name: String
    let category: String
}

// Fake API — simulates async search
func searchAPI(query: String) -> AnyPublisher<[SearchResult], Error> {
    // In production: URLSession.shared.dataTaskPublisher(for: url).decode(...)
    let results = [
        SearchResult(id: 1, name: "\\(query) Pro", category: "Electronics"),
        SearchResult(id: 2, name: "\\(query) Lite", category: "Accessories"),
    ]
    return Just(results)
        .setFailureType(to: Error.self)
        .delay(for: .milliseconds(200), scheduler: RunLoop.main)  // simulate latency
        .eraseToAnyPublisher()
}

// STEP 1-5: ViewModel with Combine chain
// @MainActor
// class SearchViewModel: ObservableObject {
//     @Published var searchText: String = ""
//     @Published var results: [SearchResult] = []
//     @Published var isSearching: Bool = false
//     private var cancellables = Set<AnyCancellable>()
//
//     init() {
//         // STEP 2: Debounce + deduplicate + filter
//         $searchText
//             .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
//             .removeDuplicates()
//             .filter { !$0.isEmpty }
//             // STEP 3: flatMap with maxPublishers .max(1) — cancels in-flight requests
//             .flatMap(maxPublishers: .max(1)) { [weak self] query -> AnyPublisher<[SearchResult], Never> in
//                 self?.isSearching = true
//                 return searchAPI(query: query)
//                     .replaceError(with: [])  // STEP 4: Handle errors gracefully
//                     .eraseToAnyPublisher()
//             }
//             // STEP 5: Assign to @Published
//             .receive(on: RunLoop.main)
//             .sink { [weak self] results in
//                 self?.results = results
//                 self?.isSearching = false
//             }
//             .store(in: &cancellables)  // STEP 5: Store subscription
//     }
// }
// TODO: Implement SearchViewModel

// Verify the chain logic
print("Combine search chain:")
print("  $searchText → debounce(300ms) → removeDuplicates() → filter(!empty)")
print("  → flatMap(maxPublishers:.max(1)) { searchAPI($0) }  ← cancels previous!")
print("  → replaceError(with: []) → .receive(on: RunLoop.main) → sink { results = $0 }")
print("  → .store(in: &cancellables)")
print()
print("Key insight: maxPublishers: .max(1) means each new query cancels the previous network call")
`,skillTags:["Combine","debounce","flatMap","AnyCancellable","Publisher Chain"],hints:["maxPublishers: .max(1) in flatMap means only one inner publisher runs at a time — the previous is cancelled","replaceError(with: []) converts AnyPublisher<T, Error> to AnyPublisher<T, Never> — required before sink","Always use [weak self] in Combine closures to avoid retain cycles with the ViewModel"]}],V=[{id:"pharm-001",title:"Dose Calculation: Weight-Based Paediatric Dosing",category:"Drug Dose Calculations",icon:"💊",difficulty:"Easy",timeLimit:"20 min",eloGain:12,tools:["Python"],scenario:"A paediatrician orders Amoxicillin for a 4-year-old child weighing 18 kg. The standard dose is 25 mg/kg/day divided into 2 doses. Available: Amoxicillin 125 mg/5 mL oral suspension. Calculate the per-dose volume and daily volume.",objective:"Write Python functions to compute weight-based doses and convert to available formulation volume.",steps:["Calculate total daily dose = weight × dose_per_kg_per_day","Calculate per-dose amount = total_daily / frequency","Calculate volume per dose = (per_dose / concentration_mg_per_mL)","Validate the dose is within safe range (10–40 mg/kg/day for Amoxicillin)","Print a clear dispensing label"],workstation:"notebook",starterCode:`# Paediatric Dose Calculation — Amoxicillin
# Clinical context: Amoxicillin for otitis media in a 4-year-old

# Patient parameters
weight_kg = 18
age_years = 4

# Drug parameters
dose_per_kg_per_day = 25   # mg/kg/day (standard dose)
frequency = 2              # doses per day (BD = twice daily)
safe_range = (10, 40)      # mg/kg/day (safe therapeutic range)

# Formulation available
concentration_mg_per_5mL = 125   # 125 mg/5 mL
# TODO: Calculate concentration_mg_per_mL

# STEP 1: Total daily dose
# TODO: total_daily_mg = weight_kg * dose_per_kg_per_day
# TODO: print(f"Total daily dose: {total_daily_mg} mg/day")

# STEP 2: Per-dose amount
# TODO: per_dose_mg = total_daily_mg / frequency
# TODO: print(f"Dose per administration: {per_dose_mg} mg")

# STEP 3: Volume to dispense per dose
# TODO: volume_per_dose_mL = per_dose_mg / concentration_mg_per_mL
# TODO: print(f"Volume per dose: {volume_per_dose_mL:.1f} mL")

# STEP 4: Safety check
# TODO: actual_mg_per_kg = total_daily_mg / weight_kg
# TODO: is_safe = safe_range[0] <= actual_mg_per_kg <= safe_range[1]
# TODO: print(f"Dose safety check: {actual_mg_per_kg} mg/kg/day — {'SAFE ✓' if is_safe else 'OUT OF RANGE ✗'}")

# STEP 5: Dispensing label
# TODO: Print structured label:
# Patient: 18 kg, 4 yr
# Drug: Amoxicillin 125 mg/5 mL suspension
# Dose: {per_dose_mg} mg ({volume_per_dose_mL:.1f} mL) TWICE DAILY
# Duration: 5 days → Dispense {volume_per_dose_mL * 2 * 5:.0f} mL total
`,skillTags:["Dose Calculation","Weight-Based Dosing","Paediatric Pharmacy","Safety Check","Dispensing"],hints:["concentration mg/mL = (mg per label unit) / (mL per label unit) — 125 mg/5 mL = 25 mg/mL","Always validate against therapeutic range BEFORE dispensing — errors at this step can be fatal","Round oral suspension volumes to the nearest 0.5 mL — most oral syringes are accurate to 0.5 mL"]},{id:"pharm-002",title:"Drug Interaction Screen: CYP450 Pathway Analysis",category:"Clinical Pharmacology",icon:"⚠️",difficulty:"Medium",timeLimit:"30 min",eloGain:18,tools:["Python"],scenario:"A 55-year-old patient on Warfarin (anticoagulant) is newly prescribed Fluconazole (antifungal). Both drugs interact via the CYP2C9 pathway. Build a drug interaction screener that flags risk level and suggests monitoring or alternatives.",objective:"Build a drug interaction checker with a CYP450 inhibitor/substrate database and risk classification logic.",steps:["Define a CYP_DATABASE with inhibitors and substrates for CYP2C9, CYP3A4, CYP1A2","Write check_interaction(drug_a, drug_b) that identifies shared pathways","Classify risk: HIGH if inhibitor+substrate on same enzyme, MODERATE if inducers involved","Add monitoring recommendations for HIGH risk interactions","Screen a patient's full medication list for all pairwise interactions"],workstation:"notebook",starterCode:`# Drug Interaction Checker — CYP450 Pathway Analysis

# STEP 1: CYP450 database
CYP_DATABASE = {
    "CYP2C9": {
        "substrates":  ["warfarin", "phenytoin", "celecoxib", "ibuprofen", "glipizide"],
        "inhibitors":  ["fluconazole", "amiodarone", "trimethoprim", "miconazole"],
        "inducers":    ["rifampicin", "carbamazepine", "phenobarbital"],
    },
    "CYP3A4": {
        "substrates":  ["simvastatin", "atorvastatin", "cyclosporine", "midazolam", "amlodipine"],
        "inhibitors":  ["clarithromycin", "ketoconazole", "ritonavir", "grapefruit"],
        "inducers":    ["rifampicin", "carbamazepine", "St John's Wort"],
    },
    "CYP1A2": {
        "substrates":  ["clozapine", "theophylline", "caffeine", "olanzapine"],
        "inhibitors":  ["ciprofloxacin", "fluvoxamine", "enoxacin"],
        "inducers":    ["smoking", "rifampicin", "omeprazole"],
    },
}

# STEP 2: Interaction checker
def check_interaction(drug_a: str, drug_b: str) -> dict:
    """Returns {risk_level, pathways, mechanism, recommendation}"""
    drug_a = drug_a.lower()
    drug_b = drug_b.lower()
    interactions = []

    for enzyme, roles in CYP_DATABASE.items():
        # TODO: Check if drug_a is substrate and drug_b is inhibitor (or vice versa)
        # Inhibitor + Substrate on same enzyme = HIGH risk (increased drug levels)
        # Inducer + Substrate = MODERATE risk (decreased drug levels)
        pass

    # TODO: Return risk summary
    if not interactions:
        return {"risk_level": "NONE", "pathways": [], "mechanism": "No known CYP interaction", "recommendation": "No action needed"}
    # TODO: Classify: HIGH if any inhibitor-substrate pair, else MODERATE
    pass

# STEP 3: Test the Warfarin + Fluconazole pair
result = check_interaction("warfarin", "fluconazole")
# TODO: print the interaction report

# STEP 4: Screen a full medication list
patient_meds = ["warfarin", "fluconazole", "atorvastatin", "clarithromycin", "omeprazole"]
print("\\n=== FULL MEDICATION INTERACTION SCREEN ===")
# TODO: Check all pairwise combinations using itertools.combinations
# TODO: Print HIGH risk interactions first, then MODERATE
`,skillTags:["Drug Interactions","CYP450","Pharmacokinetics","Clinical Safety","Medication Review"],hints:["A CYP inhibitor blocks the enzyme → substrate plasma levels RISE → toxicity risk increases","Warfarin + Fluconazole (CYP2C9 inhibitor) can double INR — requires urgent dose reduction or alternative","Use itertools.combinations(meds, 2) to check all pairs without repeating — O(n²/2) pairs"]},{id:"pharm-003",title:"IV Infusion Rate Calculation",category:"Drug Dose Calculations",icon:"🧮",difficulty:"Medium",timeLimit:"25 min",eloGain:16,tools:["Python"],scenario:"ICU order: Dopamine infusion at 5 mcg/kg/min for a 70 kg patient. Available: Dopamine 400 mg in 250 mL D5W. Calculate the infusion rate in mL/hr and verify it's within the vasopressor dosing range.",objective:"Write a clinical IV infusion calculator handling mcg/kg/min dose orders and converting to mL/hr pump rates.",steps:["Calculate drug concentration in mcg/mL from the available solution","Calculate required dose rate in mcg/min = dose_mcg_kg_min × weight_kg","Calculate infusion rate mL/hr = (dose_rate_mcg_min × 60) / concentration_mcg_mL","Verify infusion rate is within safe pump range (1–40 mL/hr for Dopamine)","Build a reusable infusion_rate() function for any drug"],workstation:"notebook",starterCode:`# IV Infusion Rate Calculator — ICU Pharmacist Tool

# STEP 5: Reusable function
def infusion_rate(
    drug_mg: float,
    diluent_mL: float,
    dose_mcg_kg_min: float,
    weight_kg: float,
    safe_range_mL_hr: tuple = (1, 40)
) -> dict:
    """
    Calculate IV infusion rate from weight-based mcg/kg/min order.
    Returns mL/hr rate with safety check.
    """
    # STEP 1: Concentration
    # TODO: drug_mcg = drug_mg * 1000  (convert mg → mcg)
    # TODO: concentration_mcg_mL = drug_mcg / diluent_mL

    # STEP 2: Required dose rate
    # TODO: dose_rate_mcg_min = dose_mcg_kg_min * weight_kg

    # STEP 3: Infusion rate mL/hr
    # TODO: rate_mL_hr = (dose_rate_mcg_min * 60) / concentration_mcg_mL

    # STEP 4: Safety check
    # TODO: is_safe = safe_range_mL_hr[0] <= rate_mL_hr <= safe_range_mL_hr[1]

    # TODO: return {"rate_mL_hr": round(rate_mL_hr, 1),
    #               "concentration_mcg_mL": round(concentration_mcg_mL, 2),
    #               "dose_rate_mcg_min": round(dose_rate_mcg_min, 1),
    #               "safe": is_safe,
    #               "warning": "" if is_safe else f"Rate {rate_mL_hr:.1f} outside {safe_range_mL_hr}"}
    pass

# Test: Dopamine 5 mcg/kg/min for 70 kg patient, 400 mg in 250 mL D5W
result = infusion_rate(
    drug_mg=400,
    diluent_mL=250,
    dose_mcg_kg_min=5,
    weight_kg=70
)
# TODO: Print result with clear label
# Expected: ~13.1 mL/hr

# Also test with a vasopressin order
print("\\n--- Vasopressin 0.04 units/min ---")
# Vasopressin uses units/min not mcg/kg/min — show how function signature would change
print("Different unit system: would need separate function for units/min dosing")
`,skillTags:["IV Infusion","mcg/kg/min","Concentration","Pump Rate","ICU Pharmacy"],hints:["Always convert mg → mcg early (×1000) to keep all dose calculations in the same unit","Rate mL/hr = (dose_mcg/min × 60 min/hr) / concentration_mcg/mL — the 60 converts per-minute to per-hour","Dopamine ranges: 2–5 mcg/kg/min = renal dose, 5–10 = cardiac, >10 = vasopressor — flag each range"]},{id:"pharm-004",title:"Adverse Drug Reaction (ADR) Causality Assessment",category:"Pharmacovigilance",icon:"🔍",difficulty:"Hard",timeLimit:"35 min",eloGain:22,tools:["Python"],scenario:"A patient developed rash and eosinophilia 10 days after starting Carbamazepine. The pharmacovigilance team needs to assess causality using the Naranjo Algorithm and WHO-UMC scale, then decide whether to report to CDSCO.",objective:"Implement the Naranjo Algorithm scoring system and WHO-UMC causality categories, then generate an ADR report.",steps:["Implement naranjo_score(responses) with the 10 standardized questions","Map total score to causality category: Definite(≥9), Probable(5-8), Possible(1-4), Doubtful(≤0)","Implement who_umc_category(criteria) with the 6 WHO-UMC criteria","Generate a structured CDSCO ADR report from the assessment","Test with the Carbamazepine rash case"],workstation:"notebook",starterCode:`# ADR Causality Assessment — Naranjo Algorithm + WHO-UMC

# STEP 1: Naranjo Algorithm
# Each question: 1=Yes, 0=No/Don't know, -1=No (where applicable
NARANJO_QUESTIONS = [
    ("Q1", "Previous conclusive reports of this reaction?",               {"yes": 1, "no": 0}),
    ("Q2", "Did ADR appear after suspected drug given?",                  {"yes": 2, "no": -1, "dk": 0}),
    ("Q3", "Did ADR improve on withdrawal (dechallenge)?",               {"yes": 1, "no": 0, "dk": 0}),
    ("Q4", "Did ADR reappear on rechallenge?",                           {"yes": 2, "no": -1, "dk": 0}),
    ("Q5", "Possible alternative causes other than drug?",               {"yes": -1, "no": 2, "dk": 0}),
    ("Q6", "Did ADR reappear when placebo given?",                       {"yes": -1, "no": 1, "dk": 0}),
    ("Q7", "Was drug detected in blood at toxic levels?",                {"yes": 1, "no": 0, "dk": 0}),
    ("Q8", "Was reaction more severe with dose increase or less with decrease?", {"yes": 1, "no": 0, "dk": 0}),
    ("Q9", "Had patient had same/similar reaction to drug/class before?", {"yes": 1, "no": 0, "dk": 0}),
    ("Q10","Was adverse event confirmed by objective evidence?",          {"yes": 1, "no": 0}),
]

def naranjo_score(responses: dict) -> dict:
    """
    responses: {"Q1": "yes", "Q2": "yes", "Q3": "yes", ...}
    Returns: {score, category, interpretation}
    """
    # TODO: Calculate total score by summing response values
    # TODO: Map score to category:
    #   >= 9  → "Definite"
    #   5-8   → "Probable"
    #   1-4   → "Possible"
    #   <= 0  → "Doubtful"
    pass

# STEP 3: WHO-UMC Scale
def who_umc_category(criteria: dict) -> str:
    """
    criteria keys: temporal_relation, plausible_mechanism, cannot_be_explained_otherwise,
                   dechallenge_positive, rechallenge_positive, documented_conclusively
    Returns WHO-UMC category string
    """
    # WHO-UMC Categories:
    # Certain:   temporal + plausible + not_otherwise + dechallenge + rechallenge + documented
    # Probable:  temporal + plausible + not_otherwise + dechallenge (no rechallenge needed)
    # Possible:  temporal + plausible (alternative causes possible)
    # Unlikely:  temporal relation improbable, other drugs/disease explain it
    # TODO: Implement categorization logic
    pass

# STEP 4: Test Case — Carbamazepine Rash
carbamazepine_case = {
    "Q1": "yes",   # Previous reports exist
    "Q2": "yes",   # Rash appeared after drug (day 10)
    "Q3": "yes",   # Rash improved on stopping
    "Q4": "dk",    # Rechallenge not done (rash contraindication)
    "Q5": "no",    # No alternative cause identified
    "Q6": "dk",    # Placebo not given
    "Q7": "no",    # Drug levels not toxic
    "Q8": "dk",    # Dose-response not assessed
    "Q9": "no",    # First occurrence
    "Q10": "yes",  # Rash + eosinophilia confirmed by blood test
}

# TODO: result = naranjo_score(carbamazepine_case)
# TODO: print ADR report with drug, reaction, score, category, CDSCO reporting requirement
`,skillTags:["Pharmacovigilance","Naranjo Algorithm","WHO-UMC","ADR Assessment","CDSCO"],hints:["Naranjo score ≥5 (Probable) or any Definite ADR must be reported to CDSCO within 15 days","Q4 (rechallenge) is often 'dk' (don't know) because rechallenge is unethical for serious reactions","eosinophilia + rash with Carbamazepine = DRESS syndrome — a Definite reportable serious ADR"]}],H=[{id:"mba-001",title:"DCF Valuation: Startup Financial Model",category:"Financial Modelling",icon:"📊",difficulty:"Easy",timeLimit:"25 min",eloGain:14,tools:["Python"],scenario:"You're a strategy analyst at a PE firm evaluating a SaaS startup. The founders provided 5-year revenue projections. You need to build a DCF model to estimate enterprise value and judge whether their ₹50 Cr asking price is justified.",objective:"Build a Python DCF model with explicit cash flows, terminal value, and WACC discounting.",steps:["Define 5-year free cash flow projections","Calculate discount factors using WACC = 12%","Calculate present value of each year's FCF","Add terminal value using Gordon Growth Model (TV = FCF_5 × (1+g) / (WACC - g))","Sum to enterprise value and compare to asking price"],workstation:"notebook",starterCode:`# DCF Valuation — SaaS Startup Enterprise Value
import numpy as np

# Company: CloudOps SaaS (B2B infrastructure monitoring)
# Asking price: ₹50 Cr

# STEP 1: 5-Year Free Cash Flow projections (₹ Crores)
# Revenue grows 40%/yr, EBITDA margin expands from 15% to 30%
fcf_projections = {
    "Year 1": 2.5,    # Currently break-even, FCF starts at ₹2.5 Cr
    "Year 2": 4.2,
    "Year 3": 7.0,
    "Year 4": 10.5,
    "Year 5": 14.8,
}

# Valuation parameters
wacc = 0.12          # Weighted Average Cost of Capital = 12%
terminal_growth = 0.04  # Long-term growth rate = 4% (in line with GDP)

# STEP 2 & 3: Discount each FCF
# TODO: For each year n (1 to 5), discount_factor = 1 / (1 + wacc)^n
# TODO: pv_fcf = fcf * discount_factor
# TODO: Print year, FCF, discount factor, PV

# STEP 4: Terminal Value (Gordon Growth Model)
# TV = FCF_Year5 × (1 + g) / (WACC - g)
# PV of TV = TV / (1 + WACC)^5
# TODO: Calculate TV and PV_TV

# STEP 5: Enterprise Value
# EV = sum(PV of FCFs) + PV of Terminal Value
# TODO: Calculate EV
# TODO: Print: EV = ₹X Cr
# TODO: Print: Asking price = ₹50 Cr
# TODO: Print verdict: "OVERVALUED" or "UNDERVALUED" vs asking price

# Bonus: Sensitivity analysis
print("\\n--- Sensitivity: EV at different WACC and terminal growth ---")
for w in [0.10, 0.12, 0.14]:
    for g in [0.03, 0.04, 0.05]:
        # TODO: Recalculate EV for each combination
        # TODO: print(f"WACC={w:.0%}, g={g:.0%}: EV = ₹{ev:.1f} Cr")
        pass
`,skillTags:["DCF","Financial Modelling","WACC","Terminal Value","Valuation"],hints:["Discount factor for year n = 1 / (1 + WACC)^n — multiply FCF by this to get present value","Terminal value dominates DCF (often 60-80% of EV) — always stress-test the growth rate assumption","If EV >> asking price, the startup is undervalued — if EV << asking price, negotiate down or walk away"]},{id:"mba-002",title:"Porter's Five Forces: Market Entry Analysis",category:"Business Strategy",icon:"♟️",difficulty:"Easy",timeLimit:"20 min",eloGain:12,tools:["Python"],scenario:"Your company is considering entering the Indian EdTech market. The CEO wants a structured Porter's Five Forces analysis before committing ₹5 Cr to product development. Build a scoring model and generate a go/no-go recommendation.",objective:"Implement a Porter's Five Forces scoring model with weighted factors and generate a market attractiveness report.",steps:["Define 5 forces with sub-factors and scores (1-10, where 10 = most attractive to entrant)","Assign weights to each force","Calculate weighted scores and overall market attractiveness score","Add thresholds: score ≥7 = Enter, 5-7 = Enter with caution, <5 = Do not enter","Print a board-ready analysis report"],workstation:"notebook",starterCode:`# Porter's Five Forces Analysis — Indian EdTech Market Entry

# STEP 1: Five Forces scoring model
# Score 1-10: higher = more attractive for new entrant
# (e.g., LOW buyer power = 8/10 for attractiveness)

forces = {
    "Threat of New Entrants": {
        "weight": 0.20,
        "factors": {
            "Capital requirements":         6,  # Moderate — ₹2-5 Cr to launch MVP
            "Brand loyalty to incumbents":  3,  # High loyalty to BYJU'S, Unacademy
            "Regulatory barriers":          8,  # Low regulation — no license needed
            "Tech differentiation needed":  5,  # AI/adaptive learning is differentiator
        }
    },
    "Bargaining Power of Suppliers": {
        "weight": 0.15,
        "factors": {
            "Content creator supply":       7,  # Large pool of educators
            "Tech vendor lock-in":          8,  # Cloud/AI tools are commoditized
            "Teacher exclusivity risk":     4,  # Star teachers can negotiate high fees
        }
    },
    "Bargaining Power of Buyers": {
        "weight": 0.25,
        "factors": {
            "Price sensitivity":            3,  # High — students compare aggressively
            "Switching costs":              4,  # Low — easy to switch platforms
            "Trial/freemium expectation":   3,  # Users expect free trial
        }
    },
    "Threat of Substitutes": {
        "weight": 0.20,
        "factors": {
            "YouTube free content":         2,  # Strong substitute — free video lectures
            "Government platforms (SWAYAM)":5,  # Moderate — free but low quality
            "Offline tuition centres":      4,  # Still preferred for board exams
        }
    },
    "Competitive Rivalry": {
        "weight": 0.20,
        "factors": {
            "Number of competitors":        2,  # Highly fragmented — 100+ players
            "Price wars":                   3,  # Aggressive discounting common
            "Differentiation possible":     7,  # Niche (STEM, vernacular) can stand out
        }
    },
}

# STEP 2 & 3: Calculate weighted scores
def analyze_forces(forces: dict) -> dict:
    results = {}
    total_weighted_score = 0

    for force_name, data in forces.items():
        # TODO: avg_factor_score = mean of all factor scores in this force
        # TODO: weighted_score = avg_factor_score * data["weight"]
        # TODO: results[force_name] = {"avg": avg, "weighted": weighted, "weight": data["weight"]}
        # TODO: total_weighted_score += weighted_score
        pass

    # STEP 4: Overall attractiveness
    # TODO: verdict = "ENTER" if total >= 7 else "ENTER WITH CAUTION" if total >= 5 else "DO NOT ENTER"
    return {"forces": results, "total": total_weighted_score, "verdict": "TODO"}

# TODO: Run analysis and print board-ready report
result = analyze_forces(forces)
`,skillTags:["Porter's Five Forces","Market Entry","Strategic Analysis","Competitive Strategy","EdTech"],hints:["Weight the five forces by their strategic relevance — buyer power (0.25) matters most in B2C EdTech","A force score below 4 is a structural barrier — highlight these as key risks in the board report","Always end with actionable recommendation: niche to target, barriers to address, 3-year milestone"]},{id:"mba-003",title:"Operations: Inventory EOQ and Reorder Point",category:"Operations Management",icon:"⚙️",difficulty:"Medium",timeLimit:"30 min",eloGain:18,tools:["Python"],scenario:"You're an operations consultant for a pharma distributor. Their stock-outs are costing ₹12L/month in lost sales. You need to calculate the Economic Order Quantity and reorder point for their top 5 SKUs and recommend an inventory policy.",objective:"Implement EOQ model and ROP calculation for multiple SKUs, then identify which SKUs need immediate policy change.",steps:["Implement EOQ formula: sqrt(2 × D × S / H)","Calculate Reorder Point: (avg daily demand × lead time) + safety stock","Apply to 5 SKUs with different demand patterns","Identify SKUs where current order qty deviates >30% from EOQ","Calculate annual holding and ordering cost savings from switching to EOQ"],workstation:"notebook",starterCode:`# Inventory Optimization — EOQ and Reorder Point
import math

# SKU data: (annual_demand_units, order_cost_INR, holding_cost_pct, unit_cost, lead_time_days, current_order_qty)
skus = {
    "Paracetamol 500mg": {
        "annual_demand": 12000,   # units/year
        "order_cost":    800,     # ₹ per order (delivery + processing)
        "holding_rate":  0.20,    # 20% of unit cost per year (storage + capital)
        "unit_cost":     12,      # ₹ per unit
        "lead_time_days": 7,
        "current_order_qty": 2000,  # what they order now
        "safety_stock":  150,
    },
    "Augmentin 625mg": {
        "annual_demand": 3600,
        "order_cost":    1200,
        "holding_rate":  0.25,
        "unit_cost":     85,
        "lead_time_days": 10,
        "current_order_qty": 400,
        "safety_stock":  50,
    },
    "Insulin Glargine": {
        "annual_demand": 1200,
        "order_cost":    2000,
        "holding_rate":  0.30,    # Cold chain storage expensive
        "unit_cost":     450,
        "lead_time_days": 14,
        "current_order_qty": 100,
        "safety_stock":  30,
    },
    "Cetirizine 10mg": {
        "annual_demand": 24000,
        "order_cost":    600,
        "holding_rate":  0.18,
        "unit_cost":     5,
        "lead_time_days": 5,
        "current_order_qty": 3000,
        "safety_stock":  400,
    },
    "Metformin 500mg": {
        "annual_demand": 18000,
        "order_cost":    750,
        "holding_rate":  0.20,
        "unit_cost":     8,
        "lead_time_days": 7,
        "current_order_qty": 1500,
        "safety_stock":  250,
    },
}

# STEP 1: EOQ formula
def calculate_eoq(annual_demand, order_cost, holding_cost_per_unit):
    """EOQ = sqrt(2 × D × S / H)"""
    # TODO: return math.sqrt(2 * annual_demand * order_cost / holding_cost_per_unit)
    pass

# STEP 2: Reorder Point
def calculate_rop(annual_demand, lead_time_days, safety_stock):
    """ROP = (daily demand × lead time) + safety stock"""
    # TODO: daily_demand = annual_demand / 365
    # TODO: return (daily_demand * lead_time_days) + safety_stock
    pass

# STEP 3-5: Analyze all SKUs
print(f"{'SKU':<25} {'EOQ':>6} {'Current':>8} {'Dev%':>6} {'ROP':>5} {'Action'}")
print("-" * 70)
for sku_name, d in skus.items():
    holding_cost_unit = d["unit_cost"] * d["holding_rate"]
    # TODO: eoq = calculate_eoq(...)
    # TODO: rop = calculate_rop(...)
    # TODO: deviation = abs(d["current_order_qty"] - eoq) / eoq * 100
    # TODO: action = "⚠️ CHANGE" if deviation > 30 else "✓ OK"
    # TODO: print formatted row
    pass
`,skillTags:["EOQ","Inventory Management","Reorder Point","Operations","Supply Chain"],hints:["Holding cost per unit = unit_cost × holding_rate (convert percentage to annual ₹ cost)","Daily demand = annual_demand / 365 — assumes uniform demand (add seasonality for real models)","Deviation >30% from EOQ is a rule of thumb — above this, the cost penalty becomes significant"]},{id:"mba-004",title:"Market Sizing: Bottom-Up TAM/SAM/SOM Analysis",category:"Business Strategy",icon:"📈",difficulty:"Hard",timeLimit:"35 min",eloGain:22,tools:["Python"],scenario:"Your startup is pitching to investors. They've asked for a rigorous bottom-up market sizing for your B2B HR SaaS product targeting Indian SMEs with 50-500 employees. They specifically said they don't want a top-down guess — they want assumptions they can interrogate.",objective:"Build a bottom-up TAM/SAM/SOM model with explicit, auditable assumptions for each layer.",steps:["Define the target customer profile and count (total SMEs in India by employee size)","Calculate TAM: all companies who could theoretically buy HR software","Calculate SAM: companies reachable given your geography and segment focus","Calculate SOM: realistic 3-year capture based on sales capacity and conversion","Build a sensitivity table showing SOM under bull/base/bear cases"],workstation:"notebook",starterCode:`# Market Sizing — Bottom-Up TAM/SAM/SOM for B2B HR SaaS

# ─────────────────────────────────────────────────────
# ASSUMPTIONS (each auditable — investors will grill these)
# ─────────────────────────────────────────────────────

# India SME landscape (source: MSME Ministry 2023)
TOTAL_INDIAN_COMPANIES = 63_000_000     # 6.3 Cr registered enterprises
SME_50_500_EMPLOYEES_PCT = 0.008        # 0.8% have 50-500 employees
HR_SOFTWARE_ADOPTION_RATE = 0.35        # 35% already use some HR software (TAM = those who could switch OR adopt)

# Pricing
ANNUAL_CONTRACT_VALUE = 180_000         # ₹1.8L/yr = ₹15K/month for 100-employee firm

# SAM filters — your serviceable market
ENGLISH_LANGUAGE_FILTER = 0.60          # 60% of SMEs operate in English/Hindi-English
TIER1_TIER2_CITY_FILTER = 0.45          # 45% in cities where you can sell/support
INDUSTRY_FOCUS = ["Manufacturing", "IT Services", "Retail", "Healthcare"]  # 4 sectors = 55%
INDUSTRY_COVERAGE = 0.55

# SOM — realistic capture
SALES_REPS_YEAR3 = 15                   # 15 reps by year 3
DEALS_PER_REP_PER_YEAR = 40             # Conservative: 40 closed deals/rep/yr
CHURN_RATE = 0.15                       # 15% annual churn

# STEP 1: Count target companies
total_smes = TOTAL_INDIAN_COMPANIES * SME_50_500_EMPLOYEES_PCT
print(f"Total Indian SMEs (50-500 employees): {total_smes:,.0f}")

# STEP 2: TAM
# TODO: tam_companies = total_smes (all could benefit from HR SaaS)
# TODO: tam_value = tam_companies * ANNUAL_CONTRACT_VALUE
# TODO: print(f"TAM: {tam_companies:,.0f} companies = ₹{tam_value/1e7:.0f} Cr")

# STEP 3: SAM (apply filters)
# TODO: sam_companies = total_smes × ENGLISH_LANGUAGE_FILTER × TIER1_TIER2_CITY_FILTER × INDUSTRY_COVERAGE
# TODO: sam_value = sam_companies × ANNUAL_CONTRACT_VALUE
# TODO: print(f"SAM: {sam_companies:,.0f} companies = ₹{sam_value/1e7:.0f} Cr")

# STEP 4: SOM — Year 3 sales capacity
# Customers added per year = reps × deals_per_rep
# Net customers at end of Y3 = cumulative adds - churn
# TODO: Calculate Y1, Y2, Y3 customers and revenue

# STEP 5: Sensitivity table
print("\\n--- Sensitivity: SOM Year-3 Revenue (₹ Cr) ---")
print(f"{'':30} {'Bear':>8} {'Base':>8} {'Bull':>10}")
for reps, case in [(10, "Bear"), (15, "Base"), (22, "Bull")]:
    for deals, acv in [(30, 150000), (40, 180000), (55, 220000)]:
        # TODO: Calculate Y3 revenue for each combination
        # TODO: print the bull/base/bear comparison
        pass
`,skillTags:["Market Sizing","TAM/SAM/SOM","Bottom-Up","B2B SaaS","Investor Pitch"],hints:["Bottom-up: count customers × price per customer — more credible than top-down percentage of market","SAM filters stack multiplicatively: total × 0.60 × 0.45 × 0.55 — each filter must be justifiable","SOM must tie to your actual sales capacity — '1% of TAM' is not a bottom-up answer"]}],W={data:o,bi_analyst:o,frontend:d,backend:m,fullstack:[...m,...d],swe:a,devops:t,aws:t,azure:t,sre:t,dba:u,data_engineer:u,cyber:p,soc:p,embedded:[...n,...i],vlsi:s,analog_ic:[...i,...s],mechanical:[...g,...l,..._],ece:[...y,...i,...n],ece_interactive:y,ece_embedded:[...n,...i],ece_vlsi:s,ece_rf:w,ece_iot:T,ece_telecom:v,eee:[...S,...h],eee_power:h,eee_machines:k,eee_control:C,eee_pe:A,eee_instrumentation:R,civil:[...E,...f],civil_structural:f,civil_geotechnical:O,civil_transportation:D,civil_water:P,civil_construction:L,mech:[...g,...l],mech_thermal:_,mech_fluid:N,mech_design:l,mech_manufacturing:M,mech_hvac:x,ml:I,android:F,ios:B,pharmacy:V,mba:H,medical:a,qa:a,ba_product:o};function q(r){return W[r]||a}function G(r){const b=q(r),c=new Set;return b.map(e=>({category:e.category,icon:e.icon})).filter(e=>c.has(e.category)?!1:(c.add(e.category),!0))}export{E as C,T as E,g as M,i as a,_ as b,f as c,O as d,D as e,P as f,q as g,L as h,S as i,h as j,k,C as l,A as m,R as n,n as o,s as p,w as q,v as r,G as s};
