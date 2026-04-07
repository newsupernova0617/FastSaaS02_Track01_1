# Database Migration Guide - Chat Features Implementation

## Overview

This guide walks you through applying the database migrations for the new chat features (plain text rejection + session-based chat).

## Migration Files

All migration files are located in `backend/src/db/migrations/`:

1. **001_add_reports_table.sql** (existing) - Creates `reports` table
2. **002_add_session_id_to_chat_messages.sql** (existing) - Adds `session_id` column to `chat_messages`
3. **003_create_sessions_table.sql** (new) - Creates `sessions` table

## What's Being Created

### Sessions Table (`sessions`)

```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Purpose:** Organize chat messages into conversation sessions (like Claude.ai)

**Columns:**
- `id` - Unique session identifier
- `user_id` - Which user owns this session (foreign key to `users.id`)
- `title` - Session title (auto-generated from first message or user-provided)
- `created_at` - When the session was created
- `updated_at` - When the session was last modified

**Indexes:**
- `idx_sessions_user_updated` - For listing user sessions by most recent first
- `idx_sessions_user_created` - For listing user sessions chronologically

### Chat Messages Update

The `chat_messages` table is updated to include:
- `session_id` column (INTEGER, foreign key to `sessions.id`)
- Indexes for fast session-based queries

## How to Apply Migrations

### Option 1: Turso CLI (Recommended for Production)

If you're using Turso as your database:

```bash
# 1. Install Turso CLI if not already installed
curl https://get.turso.tech | bash

# 2. Authenticate with Turso
turso auth login

# 3. Apply migrations manually via SQL shell
turso db shell <your-database-name>

# 4. Copy and paste each migration SQL into the shell
```

**Step-by-step in Turso shell:**

```sql
-- Run 003_create_sessions_table.sql
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_updated ON sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions(user_id, created_at);

-- Run 002_add_session_id_to_chat_messages.sql if not already applied
ALTER TABLE chat_messages ADD COLUMN session_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at DESC);
```

### Option 2: SQLite CLI (Local Development)

If using a local SQLite database:

```bash
# Connect to your database
sqlite3 /path/to/your/database.db

# Copy and paste the SQL from migration files
```

### Option 3: Drizzle Kit (TypeScript Integration)

Drizzle Kit can manage migrations, but for manual SQL files:

```bash
cd backend

# Generate migrations from schema changes
drizzle-kit generate:sqlite

# Push migrations to database
drizzle-kit push:sqlite
```

## Verification

After applying migrations, verify they worked:

### Check Sessions Table Exists

```sql
-- In Turso shell or SQLite
SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';
-- Should return: sessions
```

### Check Indexes Exist

```sql
SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='sessions';
-- Should return:
-- idx_sessions_user_updated
-- idx_sessions_user_created
```

### Check Chat Messages Has session_id

```sql
PRAGMA table_info(chat_messages);
-- Should show a column: session_id | INTEGER
```

## Troubleshooting

### "Table already exists" error
- This is normal if you already ran the migration
- The `CREATE TABLE IF NOT EXISTS` clause prevents errors

### "Cannot add column" error
- May happen if session_id was already added
- Check `PRAGMA table_info(chat_messages)` to verify

### Foreign key constraint errors
- Ensure `users` table exists before creating `sessions`
- Ensure `users.id` column exists and matches the type expected

### No indexes showing
- Indexes are optional for functionality but improve performance
- If creation fails, the table will still work

## What's Next

Once migrations are applied:

1. **Backend is ready** - Sessions API endpoints will work
2. **Frontend is ready** - Flutter chat screen can create/manage sessions
3. **Test the flow:**
   - Create a session via API or Flutter UI
   - Send a financial message (auto-saves to session)
   - Send a plain text message (gets friendly fallback, saves to session)
   - Switch between sessions

## Rollback (If Needed)

If you need to rollback (remove sessions):

```sql
-- WARNING: This is permanent if you have data!

-- Drop indexes
DROP INDEX IF EXISTS idx_sessions_user_updated;
DROP INDEX IF EXISTS idx_sessions_user_created;
DROP INDEX IF EXISTS idx_chat_messages_session;
DROP INDEX IF EXISTS idx_chat_messages_session_created;

-- Drop sessions table
DROP TABLE IF EXISTS sessions;

-- Remove session_id column from chat_messages
-- Note: SQLite doesn't support ALTER TABLE DROP COLUMN directly
-- You'd need to recreate the table without the column
```

## More Information

- **Drizzle ORM Docs:** https://orm.drizzle.team/
- **Turso Documentation:** https://turso.tech/
- **SQLite Documentation:** https://www.sqlite.org/lang.html
