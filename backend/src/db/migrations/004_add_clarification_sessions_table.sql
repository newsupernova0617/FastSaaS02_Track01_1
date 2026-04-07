-- Migration: Create clarification_sessions table for handling ambiguous user input
-- Date: 2026-04-07
-- Purpose: Track ongoing clarifications when users provide ambiguous transaction data

CREATE TABLE IF NOT EXISTS clarification_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  chat_session_id INTEGER NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (chat_session_id) REFERENCES sessions(id)
);

-- Create index for looking up active clarifications by user and session
CREATE INDEX IF NOT EXISTS idx_clarification_sessions_user_session ON clarification_sessions(user_id, chat_session_id);

-- Create index for cleanup of expired clarifications
CREATE INDEX IF NOT EXISTS idx_clarification_sessions_created ON clarification_sessions(created_at);
