-- ========================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ========================================
-- This trigger automatically creates a user record in the public.users table
-- whenever a new user signs up via Supabase Auth

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger that fires after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- INSTRUCTIONS
-- ========================================
-- Run this script in your Supabase SQL Editor to enable automatic user creation.
-- 
-- What it does:
-- 1. When someone signs up, Supabase creates a record in auth.users
-- 2. This trigger automatically creates a matching record in public.users
-- 3. The user's name comes from the signup metadata, or defaults to their email prefix
-- 4. The UUID from auth.users is used as the ID in public.users
--
-- This ensures every authenticated user has a profile in your users table!

