-- Chat System Schema
-- Created: October 12, 2025

-- Create document_chats table
CREATE TABLE IF NOT EXISTS document_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES module_items(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT document_chats_user_document_unique UNIQUE (user_id, document_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES document_chats(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
    content TEXT NOT NULL,
    tokens INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create chat_context_snapshots table
CREATE TABLE IF NOT EXISTS chat_context_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES document_chats(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    message_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chat_context_snapshots_chat_id_unique UNIQUE (chat_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_chats_user_id ON document_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chats_document_id ON document_chats(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chats_user_document ON document_chats(user_id, document_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(chat_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_context_snapshots_chat_id ON chat_context_snapshots(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_context_snapshots_created_at ON chat_context_snapshots(chat_id, created_at DESC);

-- Enable RLS
ALTER TABLE document_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_context_snapshots ENABLE ROW LEVEL SECURITY;

-- Document chats policies
CREATE POLICY "Users can view their own chat sessions" ON document_chats
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own chat sessions" ON document_chats
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat sessions" ON document_chats
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own chat sessions" ON document_chats
    FOR DELETE USING (user_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Users can view messages from their chat sessions" ON chat_messages
    FOR SELECT USING (
        chat_id IN (
            SELECT id FROM document_chats WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in their chat sessions" ON chat_messages
    FOR INSERT WITH CHECK (
        chat_id IN (
            SELECT id FROM document_chats WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update messages in their chat sessions" ON chat_messages
    FOR UPDATE USING (
        chat_id IN (
            SELECT id FROM document_chats WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages from their chat sessions" ON chat_messages
    FOR DELETE USING (
        chat_id IN (
            SELECT id FROM document_chats WHERE user_id = auth.uid()
        )
    );

-- Chat context snapshots policies
CREATE POLICY "Users can view snapshots from their chat sessions" ON chat_context_snapshots
    FOR SELECT USING (
        chat_id IN (
            SELECT id FROM document_chats WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create snapshots in their chat sessions" ON chat_context_snapshots
    FOR INSERT WITH CHECK (
        chat_id IN (
            SELECT id FROM document_chats WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update snapshots in their chat sessions" ON chat_context_snapshots
    FOR UPDATE USING (
        chat_id IN (
            SELECT id FROM document_chats WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete snapshots from their chat sessions" ON chat_context_snapshots
    FOR DELETE USING (
        chat_id IN (
            SELECT id FROM document_chats WHERE user_id = auth.uid()
        )
    );

-- Triggers for timestamp updates
CREATE TRIGGER update_document_chats_updated_at BEFORE UPDATE ON document_chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
