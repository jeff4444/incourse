-- Modules and Module Items Schema
-- Created: October 11, 2025

-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lms_id TEXT NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    items_count INTEGER DEFAULT 0,
    prerequisites TEXT[], -- Array of prerequisite module IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT modules_lms_id_course_id_key UNIQUE (lms_id, course_id)
);

-- Create module_items table
CREATE TABLE IF NOT EXISTS module_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lms_id TEXT NOT NULL,
    lms_content_id TEXT,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'File', 'Page', 'Discussion', 'Assignment', etc.
    url TEXT,
    position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT module_items_lms_id_module_id_key UNIQUE (lms_id, module_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_modules_lms_id ON modules(lms_id);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_lms_id_course_id ON modules(lms_id, course_id);
CREATE INDEX IF NOT EXISTS idx_module_items_lms_id ON module_items(lms_id);
CREATE INDEX IF NOT EXISTS idx_module_items_module_id ON module_items(module_id);
CREATE INDEX IF NOT EXISTS idx_module_items_course_id ON module_items(course_id);
CREATE INDEX IF NOT EXISTS idx_module_items_type ON module_items(type);

-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_items ENABLE ROW LEVEL SECURITY;

-- Modules policies
CREATE POLICY "Users can view modules" ON modules
    FOR SELECT USING (true);

CREATE POLICY "Users can create modules" ON modules
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update modules" ON modules
    FOR UPDATE USING (true);

-- Module items policies
CREATE POLICY "Users can view module items" ON module_items
    FOR SELECT USING (true);

CREATE POLICY "Users can create module items" ON module_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update module items" ON module_items
    FOR UPDATE USING (true);

-- Triggers for timestamp updates
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_items_updated_at BEFORE UPDATE ON module_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

