-- Assignments Schema
-- Created: October 24, 2025

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lms_id TEXT NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMP WITH TIME ZONE,
    lock_at TIMESTAMP WITH TIME ZONE,
    locked_for_user BOOLEAN DEFAULT false,
    points_possible INTEGER,
    html_url TEXT,
    submission_types JSONB DEFAULT '[]'::jsonb,
    has_submitted_submissions BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT assignments_lms_id_course_id_key UNIQUE (lms_id, course_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_lms_id ON assignments(lms_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_at ON assignments(due_at);
CREATE INDEX IF NOT EXISTS idx_assignments_lms_id_course_id ON assignments(lms_id, course_id);

-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Assignments policies
CREATE POLICY "Users can view assignments" ON assignments
    FOR SELECT USING (true);

CREATE POLICY "Users can create assignments" ON assignments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update assignments" ON assignments
    FOR UPDATE USING (true);

-- Trigger for timestamp updates
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
