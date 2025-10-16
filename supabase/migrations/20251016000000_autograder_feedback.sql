-- Autograder Feedback Schema
-- Created: October 16, 2025

-- Create autograder_feedback table
CREATE TABLE IF NOT EXISTS autograder_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assignment_id TEXT NOT NULL, -- Canvas assignment file ID
    feedback_text TEXT NOT NULL,
    solution_file_names TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_autograder_feedback_user_id ON autograder_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_autograder_feedback_course_id ON autograder_feedback(course_id);
CREATE INDEX IF NOT EXISTS idx_autograder_feedback_assignment_id ON autograder_feedback(assignment_id);
CREATE INDEX IF NOT EXISTS idx_autograder_feedback_created_at ON autograder_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autograder_feedback_user_assignment ON autograder_feedback(user_id, assignment_id);

-- Enable RLS
ALTER TABLE autograder_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to access their own feedback
CREATE POLICY "Users can view their own autograder feedback" ON autograder_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own autograder feedback" ON autograder_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);
