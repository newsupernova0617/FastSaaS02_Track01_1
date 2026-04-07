CREATE TABLE IF NOT EXISTS clarification_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  chat_session_id INTEGER NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (chat_session_id) REFERENCES sessions(id)
);

CREATE INDEX idx_clarification_sessions_user_id ON clarification_sessions(user_id);
CREATE INDEX idx_clarification_sessions_chat_session_id ON clarification_sessions(chat_session_id);
