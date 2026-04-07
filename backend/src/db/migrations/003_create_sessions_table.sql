-- Migration: Create sessions table for organizing chat conversations
-- Date: 2026-04-07
-- Purpose: Support session-based chat organization like Claude.ai

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create index for faster queries by userId and updatedAt
CREATE INDEX IF NOT EXISTS idx_sessions_user_updated ON sessions(user_id, updated_at DESC);

-- Create index for listing user sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions(user_id, created_at);
