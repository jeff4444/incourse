-- Drop user_api_keys table
-- Created: October 23, 2025
-- Purpose: Remove API key storage from database

-- Drop the user_api_keys table entirely
DROP TABLE IF EXISTS user_api_keys CASCADE;

-- Note: This migration removes the ability to store encrypted API keys in the database.
-- Users will now need to provide their Canvas API tokens manually for syncing/resyncing.
