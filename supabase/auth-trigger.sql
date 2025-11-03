-- ========================================
-- AUTO-CREATE USER PROFILE AND RECIPE GROUP ON SIGNUP
-- ========================================
-- This trigger automatically creates:
-- 1. A user record in the public.users table
-- 2. A default recipe group for the user
-- 3. Adds the user as an active member of their own group
-- whenever a new user signs up via Supabase Auth

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_group_id UUID;
  user_name TEXT;
BEGIN
  -- Create user profile
  INSERT INTO public.users (id, email, name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Get user's name for group name
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Create default recipe group for the user
  INSERT INTO public.recipe_groups (name, owner_id)
  VALUES (
    user_name || '''s Recipe Book',
    NEW.id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_group_id;

  -- Add user as active member of their own group (if group was created)
  IF new_group_id IS NOT NULL THEN
    INSERT INTO public.group_members (group_id, user_id, email, role, status, invited_by, joined_at)
    VALUES (
      new_group_id,
      NEW.id,
      NEW.email,
      'write',
      'active',
      NEW.id,
      NOW()
    )
    ON CONFLICT (group_id, email) DO NOTHING;
  END IF;

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
-- Run this script in your Supabase SQL Editor to enable automatic user and group creation.
-- 
-- What it does:
-- 1. When someone signs up, Supabase creates a record in auth.users
-- 2. This trigger automatically creates:
--    - A matching record in public.users
--    - A default recipe group owned by the user
--    - Adds the user as an active write member of their own group
-- 3. The user's name comes from the signup metadata, or defaults to their email prefix
-- 4. The UUID from auth.users is used as the ID in public.users and recipe_groups.owner_id
--
-- This ensures every authenticated user has:
-- - A profile in your users table
-- - Their own recipe book (group) they can invite others to
-- - Write access to their own group

