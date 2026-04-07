# Quick Start: Apply Database Migrations

## TL;DR - Execute These SQL Statements

Run these in your Turso database shell or SQLite client:

```sql
-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_updated ON sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions(user_id, created_at);

-- Add session_id to chat_messages if not already present
ALTER TABLE chat_messages ADD COLUMN session_id INTEGER;

-- Create indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at DESC);
```

## For Turso Users

```bash
# 1. Open Turso shell
turso db shell <your-db-name>

# 2. Paste the SQL above
# 3. Verify with:
SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';
```

## For Local SQLite

```bash
# 1. Open SQLite
sqlite3 path/to/database.db

# 2. Paste the SQL above
# 3. Type: .exit
```

## Verify Success

After running migrations:

```sql
-- Should show: sessions
SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';

-- Should show session_id column
PRAGMA table_info(chat_messages);
```

## For Full Details

See `docs/MIGRATION_GUIDE.md` for:
- Complete migration files
- Detailed Turso/SQLite instructions
- Troubleshooting
- Rollback procedures

## Timeline

- Migrations are in: `backend/src/db/migrations/`
- Files:
  - `001_add_reports_table.sql`
  - `002_add_session_id_to_chat_messages.sql`
  - `003_create_sessions_table.sql` (NEW)

---

**Once migrations are applied, all backend and frontend features are ready to use!**
