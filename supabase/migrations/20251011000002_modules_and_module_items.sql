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
    content_type TEXT,
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

-- Create files table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lms_id TEXT NOT NULL,
    module_item_id UUID REFERENCES module_items(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    content_type TEXT,
    url TEXT,
    uuid TEXT,
    size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT files_lms_id_course_id_key UNIQUE (lms_id, course_id)
);

-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lms_id TEXT NOT NULL,
    module_item_id UUID NOT NULL REFERENCES module_items(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    html_url TEXT,
    body TEXT,
    created_at_db TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT pages_lms_id_course_id_key UNIQUE (lms_id, course_id)
);

-- Create discussion_topics table
CREATE TABLE IF NOT EXISTS discussion_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lms_id TEXT NOT NULL,
    module_item_id UUID NOT NULL REFERENCES module_items(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    last_reply_at TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    message TEXT,
    html_url TEXT,
    discussion_subentry_count INTEGER DEFAULT 0,
    subscribed BOOLEAN DEFAULT false,
    read_state TEXT,
    permissions JSONB,
    created_at_db TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT discussion_topics_lms_id_course_id_key UNIQUE (lms_id, course_id)
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_files_lms_id ON files(lms_id);
CREATE INDEX IF NOT EXISTS idx_files_module_item_id ON files(module_item_id);
CREATE INDEX IF NOT EXISTS idx_files_course_id ON files(course_id);
CREATE INDEX IF NOT EXISTS idx_pages_lms_id ON pages(lms_id);
CREATE INDEX IF NOT EXISTS idx_pages_module_item_id ON pages(module_item_id);
CREATE INDEX IF NOT EXISTS idx_pages_course_id ON pages(course_id);
CREATE INDEX IF NOT EXISTS idx_discussion_topics_lms_id ON discussion_topics(lms_id);
CREATE INDEX IF NOT EXISTS idx_discussion_topics_module_item_id ON discussion_topics(module_item_id);
CREATE INDEX IF NOT EXISTS idx_discussion_topics_course_id ON discussion_topics(course_id);

-- Enable RLS for new tables
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_topics ENABLE ROW LEVEL SECURITY;

-- Files policies
CREATE POLICY "Users can view files" ON files
    FOR SELECT USING (true);

CREATE POLICY "Users can create files" ON files
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update files" ON files
    FOR UPDATE USING (true);

-- Pages policies
CREATE POLICY "Users can view pages" ON pages
    FOR SELECT USING (true);

CREATE POLICY "Users can create pages" ON pages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update pages" ON pages
    FOR UPDATE USING (true);

-- Discussion topics policies
CREATE POLICY "Users can view discussion topics" ON discussion_topics
    FOR SELECT USING (true);

CREATE POLICY "Users can create discussion topics" ON discussion_topics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update discussion topics" ON discussion_topics
    FOR UPDATE USING (true);

-- Triggers for timestamp updates
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_items_updated_at BEFORE UPDATE ON module_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_topics_updated_at BEFORE UPDATE ON discussion_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

