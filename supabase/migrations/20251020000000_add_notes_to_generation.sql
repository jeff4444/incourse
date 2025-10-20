-- Add Notes Support to Generation Tables
-- Created: January 18, 2025

-- Add note_ids column to quizzes table
ALTER TABLE quizzes ADD COLUMN note_ids JSONB DEFAULT '[]'::jsonb;

-- Add note_ids column to flashcard_decks table  
ALTER TABLE flashcard_decks ADD COLUMN note_ids JSONB DEFAULT '[]'::jsonb;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_quizzes_note_ids ON quizzes USING GIN (note_ids);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_note_ids ON flashcard_decks USING GIN (note_ids);
