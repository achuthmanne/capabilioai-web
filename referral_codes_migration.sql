-- ─────────────────────────────────────────────────────────────────────────────
-- referral_codes_migration.sql
-- Run once in Supabase SQL Editor (production project eybchcqwbizjmzyrviri)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create referral_codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code           TEXT NOT NULL UNIQUE,
  referrer_name  TEXT,
  used           INTEGER NOT NULL DEFAULT 0,
  max_uses       INTEGER NOT NULL DEFAULT 50,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code    ON public.referral_codes(code);

-- RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read codes (needed for validate endpoint via service_role; frontend uses API)
CREATE POLICY "Service role full access" ON public.referral_codes
  USING (true) WITH CHECK (true);

-- 2. Helper: generate a unique 8-char alphanumeric referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no 0/O/1/I (ambiguous)
  code  TEXT := '';
  i     INT;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE referral_codes.code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- 3. Trigger: auto-create a referral code for every new user on signup
CREATE OR REPLACE FUNCTION public.create_referral_code_for_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.referral_codes (user_id, code, referrer_name)
  VALUES (
    NEW.id,
    generate_referral_code(),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;   -- idempotent
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_referral ON auth.users;
CREATE TRIGGER on_auth_user_created_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_referral_code_for_new_user();

-- 4. Back-fill: generate codes for all existing users who don't have one yet
INSERT INTO public.referral_codes (user_id, code, referrer_name)
SELECT
  u.id,
  generate_referral_code(),
  COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.referral_codes rc WHERE rc.user_id = u.id
);
