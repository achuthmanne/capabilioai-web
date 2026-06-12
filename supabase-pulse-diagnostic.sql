-- Run this FIRST to see what currently exists in your DB
-- Supabase Dashboard → SQL Editor → paste → Run

SELECT
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
  ON c.table_name = t.table_name AND c.table_schema = 'public'
WHERE t.table_schema = 'public'
  AND t.table_name IN ('pulse_posts','post_comments','post_interactions','connections','follows','notifications')
ORDER BY t.table_name, c.ordinal_position;
