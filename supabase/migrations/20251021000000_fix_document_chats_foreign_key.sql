-- Fix document_chats foreign key to reference files instead of module_items
-- Created: October 21, 2025

-- First, drop the existing foreign key constraint
ALTER TABLE document_chats DROP CONSTRAINT IF EXISTS document_chats_document_id_fkey;

-- Add the new foreign key constraint to reference files table
ALTER TABLE document_chats 
ADD CONSTRAINT document_chats_document_id_fkey 
FOREIGN KEY (document_id) REFERENCES files(id) ON DELETE CASCADE;

-- Update the index to reflect the new relationship
DROP INDEX IF EXISTS idx_document_chats_document_id;
CREATE INDEX IF NOT EXISTS idx_document_chats_document_id ON document_chats(document_id);
