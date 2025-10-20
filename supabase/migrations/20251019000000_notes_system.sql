-- Notes System Schema
-- Created: January 17, 2025

-- Create note_folders table
CREATE TABLE IF NOT EXISTS note_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT note_folders_user_course_name_unique UNIQUE (user_id, course_id, name)
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES note_folders(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_note_folders_user_id ON note_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_note_folders_course_id ON note_folders(course_id);
CREATE INDEX IF NOT EXISTS idx_note_folders_user_course ON note_folders(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_course_id ON notes(course_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_course ON notes(user_id, course_id);

-- Enable RLS
ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_folders
CREATE POLICY "Users can view their own note folders" ON note_folders
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own note folders" ON note_folders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own note folders" ON note_folders
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own note folders" ON note_folders
    FOR DELETE USING (true);

-- RLS Policies for notes
CREATE POLICY "Users can view their own notes" ON notes
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own notes" ON notes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notes" ON notes
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own notes" ON notes
    FOR DELETE USING (true);

-- Triggers for timestamp updates
CREATE TRIGGER update_note_folders_updated_at BEFORE UPDATE ON note_folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
