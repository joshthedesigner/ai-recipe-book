-- Roles & Permissions Migration
-- Creates recipe groups and group members system for multi-user access control

-- =====================================================
-- TABLE: recipe_groups
-- Purpose: Represents a collection of recipes owned by a primary user
-- =====================================================
CREATE TABLE IF NOT EXISTS recipe_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_recipe_groups_owner ON recipe_groups(owner_id);

-- =====================================================
-- TABLE: group_members
-- Purpose: Tracks users who have access to a recipe group and their roles
-- =====================================================
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES recipe_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL, -- For invites before signup
  role TEXT NOT NULL CHECK (role IN ('read', 'write')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'inactive')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(group_id, email) -- Prevent duplicate invites
);

-- Indexes for faster lookups
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_email ON group_members(email);
CREATE INDEX idx_group_members_status ON group_members(status);

-- =====================================================
-- UPDATE: recipes table
-- Add group_id to link recipes to groups
-- =====================================================
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES recipe_groups(id) ON DELETE CASCADE;

-- Index for faster group-based recipe queries
CREATE INDEX IF NOT EXISTS idx_recipes_group ON recipes(group_id);

-- =====================================================
-- RLS POLICIES: recipe_groups
-- =====================================================

-- Enable RLS
ALTER TABLE recipe_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view groups they own or are members of
CREATE POLICY "Users can view their groups"
  ON recipe_groups FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: Users can create their own groups
CREATE POLICY "Users can create groups"
  ON recipe_groups FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Policy: Only group owners can update their groups
CREATE POLICY "Owners can update their groups"
  ON recipe_groups FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy: Only group owners can delete their groups
CREATE POLICY "Owners can delete their groups"
  ON recipe_groups FOR DELETE
  USING (owner_id = auth.uid());

-- =====================================================
-- RLS POLICIES: group_members
-- =====================================================

-- Enable RLS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view members of groups they own or belong to
CREATE POLICY "Users can view group members"
  ON group_members FOR SELECT
  USING (
    -- Group owner can see all members
    group_id IN (SELECT id FROM recipe_groups WHERE owner_id = auth.uid())
    OR
    -- Members can see other members
    (user_id = auth.uid() AND status = 'active')
    OR
    -- Users can see their own pending invites
    (email = auth.email() AND status = 'pending')
  );

-- Policy: Group owners can invite users
CREATE POLICY "Owners can invite users"
  ON group_members FOR INSERT
  WITH CHECK (
    group_id IN (SELECT id FROM recipe_groups WHERE owner_id = auth.uid())
  );

-- Policy: Group owners can update member roles/status
CREATE POLICY "Owners can update members"
  ON group_members FOR UPDATE
  USING (
    group_id IN (SELECT id FROM recipe_groups WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    group_id IN (SELECT id FROM recipe_groups WHERE owner_id = auth.uid())
  );

-- Policy: Group owners can remove members
CREATE POLICY "Owners can remove members"
  ON group_members FOR DELETE
  USING (
    group_id IN (SELECT id FROM recipe_groups WHERE owner_id = auth.uid())
  );

-- =====================================================
-- UPDATE RLS POLICIES: recipes
-- Update to work with groups
-- =====================================================

-- Drop existing policies (we'll recreate them)
DROP POLICY IF EXISTS "Users can view their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can create recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete their own recipes" ON recipes;

-- Policy: Users can view recipes in groups they have access to
CREATE POLICY "Users can view group recipes"
  ON recipes FOR SELECT
  USING (
    -- User is the creator
    user_id = auth.uid()
    OR
    -- User owns the group
    group_id IN (SELECT id FROM recipe_groups WHERE owner_id = auth.uid())
    OR
    -- User is a member of the group
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: Users can create recipes if they have write access
CREATE POLICY "Users can create recipes with write access"
  ON recipes FOR INSERT
  WITH CHECK (
    -- User owns the group
    group_id IN (SELECT id FROM recipe_groups WHERE owner_id = auth.uid())
    OR
    -- User has write access
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() 
        AND role = 'write' 
        AND status = 'active'
    )
  );

-- Policy: Users can update recipes they created
CREATE POLICY "Users can update their own recipes"
  ON recipes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete recipes they created OR group owner can delete any
CREATE POLICY "Users can delete recipes"
  ON recipes FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    group_id IN (SELECT id FROM recipe_groups WHERE owner_id = auth.uid())
  );

-- =====================================================
-- MIGRATION: Create default groups for existing users
-- =====================================================

-- Create a default group for each user who has recipes but no group
INSERT INTO recipe_groups (name, owner_id)
SELECT 
  COALESCE(
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = r.user_id),
    'User'
  ) || '''s Recipe Collection' as name,
  r.user_id as owner_id
FROM recipes r
WHERE r.user_id IS NOT NULL
  AND r.user_id NOT IN (SELECT owner_id FROM recipe_groups)
GROUP BY r.user_id;

-- Link existing recipes to their owner's group
UPDATE recipes
SET group_id = (
  SELECT id FROM recipe_groups WHERE owner_id = recipes.user_id LIMIT 1
)
WHERE group_id IS NULL AND user_id IS NOT NULL;

-- Add group owner as active write member
INSERT INTO group_members (group_id, user_id, email, role, status, invited_by, joined_at)
SELECT 
  rg.id,
  rg.owner_id,
  (SELECT email FROM auth.users WHERE id = rg.owner_id),
  'write',
  'active',
  rg.owner_id,
  NOW()
FROM recipe_groups rg
WHERE NOT EXISTS (
  SELECT 1 FROM group_members gm 
  WHERE gm.group_id = rg.id AND gm.user_id = rg.owner_id
);

-- =====================================================
-- FUNCTIONS: Helper functions for permissions
-- =====================================================

-- Function to check if user has write access to a group
CREATE OR REPLACE FUNCTION has_write_access(p_user_id UUID, p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM recipe_groups WHERE id = p_group_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = p_group_id 
      AND user_id = p_user_id 
      AND role = 'write' 
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in a group
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID, p_group_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- Check if owner
  IF EXISTS (SELECT 1 FROM recipe_groups WHERE id = p_group_id AND owner_id = p_user_id) THEN
    RETURN 'owner';
  END IF;
  
  -- Check member role
  RETURN (
    SELECT role FROM group_members 
    WHERE group_id = p_group_id 
      AND user_id = p_user_id 
      AND status = 'active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE recipe_groups IS 'Recipe collections owned by users';
COMMENT ON TABLE group_members IS 'Users who have access to recipe groups with their roles';
COMMENT ON COLUMN group_members.role IS 'Permission level: read (view only) or write (view + add recipes)';
COMMENT ON COLUMN group_members.status IS 'Member status: pending (invited but not joined), active (joined), inactive (removed)';

