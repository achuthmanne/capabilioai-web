-- Run this in the Supabase SQL Editor
DROP TABLE IF EXISTS public.community_posts;

CREATE TABLE public.community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT,
    author_role TEXT,
    author_avatar TEXT,
    author_tier TEXT DEFAULT 'none',
    content TEXT NOT NULL,
    embed_data JSONB,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read posts
CREATE POLICY "Allow public read access" ON public.community_posts FOR SELECT USING (true);

-- Allow authenticated users to insert posts
CREATE POLICY "Allow authenticated users to insert posts" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Optional: Allow users to delete their own posts
CREATE POLICY "Allow users to delete own posts" ON public.community_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
