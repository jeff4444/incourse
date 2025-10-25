-- Add generation status tracking to flashcard_decks and quizzes tables
-- Created: October 26, 2025

-- Add status and error_message columns to flashcard_decks
ALTER TABLE flashcard_decks 
ADD COLUMN status TEXT NOT NULL DEFAULT 'completed' 
CHECK (status IN ('generating', 'completed', 'failed'));

ALTER TABLE flashcard_decks 
ADD COLUMN error_message TEXT;

-- Add status and error_message columns to quizzes
ALTER TABLE quizzes 
ADD COLUMN status TEXT NOT NULL DEFAULT 'completed' 
CHECK (status IN ('generating', 'completed', 'failed'));

ALTER TABLE quizzes 
ADD COLUMN error_message TEXT;

-- Create indexes for efficient querying by status
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_status ON flashcard_decks(status);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_status ON flashcard_decks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_status ON quizzes(user_id, status);

-- Update existing records to have 'completed' status (they were already generated)
UPDATE flashcard_decks SET status = 'completed' WHERE status = 'completed';
UPDATE quizzes SET status = 'completed' WHERE status = 'completed';
