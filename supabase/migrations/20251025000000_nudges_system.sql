-- Nudges System Schema
-- Created: October 25, 2025

-- Create nudges table
CREATE TABLE IF NOT EXISTS nudges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    nudge_text TEXT NOT NULL,
    action TEXT NOT NULL,
    label TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dismissed', 'expired')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE
);

-- Create nudge_interactions table
CREATE TABLE IF NOT EXISTS nudge_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nudge_id UUID NOT NULL REFERENCES nudges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('viewed', 'clicked', 'completed', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nudges_user_id ON nudges(user_id);
CREATE INDEX IF NOT EXISTS idx_nudges_status ON nudges(status);
CREATE INDEX IF NOT EXISTS idx_nudges_created_at ON nudges(created_at);
CREATE INDEX IF NOT EXISTS idx_nudges_user_status ON nudges(user_id, status);
CREATE INDEX IF NOT EXISTS idx_nudges_course_id ON nudges(course_id);

CREATE INDEX IF NOT EXISTS idx_nudge_interactions_nudge_id ON nudge_interactions(nudge_id);
CREATE INDEX IF NOT EXISTS idx_nudge_interactions_user_id ON nudge_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_nudge_interactions_type ON nudge_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_nudge_interactions_created_at ON nudge_interactions(created_at);

-- Enable RLS
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nudges
CREATE POLICY "Users can view their own nudges" ON nudges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own nudges" ON nudges
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create nudges for users" ON nudges
    FOR INSERT WITH CHECK (true);

-- RLS Policies for nudge_interactions
CREATE POLICY "Users can view their own nudge interactions" ON nudge_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nudge interactions" ON nudge_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger for timestamp updates
CREATE TRIGGER update_nudges_updated_at BEFORE UPDATE ON nudges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
