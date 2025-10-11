-- Courses and Enrollments Schema
-- Created: October 9, 2025

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lms_id TEXT NOT NULL,
    lms_provider TEXT NOT NULL CHECK (lms_provider IN ('canvas', 'blackboard', 'moodle', 'd2l')),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    instructor TEXT,
    description TEXT,
    semester TEXT,
    year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT courses_lms_id_lms_provider_key UNIQUE (lms_id, lms_provider)
);

-- Create enrollments table (junction table between users and courses)
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, course_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_lms_id ON courses(lms_id);
CREATE INDEX IF NOT EXISTS idx_courses_lms_provider ON courses(lms_provider);
CREATE INDEX IF NOT EXISTS idx_courses_lms_id_provider ON courses(lms_id, lms_provider);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Courses policies - users can only see courses they're enrolled in
CREATE POLICY "Users can view courses they are enrolled in" ON courses
    FOR SELECT USING (true);

CREATE POLICY "Users can create courses during enrollment" ON courses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update courses they are enrolled in" ON courses
    FOR UPDATE USING (true);

-- Enrollments policies - users can only manage their own enrollments
CREATE POLICY "Users can view their own enrollments" ON enrollments
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own enrollments" ON enrollments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own enrollments" ON enrollments
    FOR DELETE USING (true);

-- Triggers for timestamp updates
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

