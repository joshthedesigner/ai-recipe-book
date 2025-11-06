-- ========================================
-- Friends Groups Integration Rollback
-- ========================================
-- Removes friends groups integration functions
-- Run this to revert friends recipe visibility

DROP FUNCTION IF EXISTS are_friends(UUID, UUID);
DROP FUNCTION IF EXISTS get_friends_groups();

-- ROLLBACK NOTE: This removes ability for friends to see each other's groups
-- Does not affect core friends table or invite functionality

