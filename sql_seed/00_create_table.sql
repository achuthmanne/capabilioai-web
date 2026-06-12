-- STEP 0: Create table (run first, once)
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
