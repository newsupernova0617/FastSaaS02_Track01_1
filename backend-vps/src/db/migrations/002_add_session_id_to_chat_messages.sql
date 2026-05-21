-- Migration: Add sessionId column to chat_messages table
-- Date: 2026-04-07
-- Purpose: Support organizing chat messages by session

ALTER TABLE chat_messages ADD COLUMN session_id INTEGER;

-- Add foreign key constraint
-- Note: SQLite doesn't support adding constraints after table creation via ALTER TABLE
-- The constraint is defined in the Drizzle schema but may need manual enforcement

-- Create index for faster queries by sessionId
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- Create compound index for common queries (sessionId + createdAt)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at DESC);
