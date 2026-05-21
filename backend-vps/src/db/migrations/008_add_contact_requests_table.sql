CREATE TABLE IF NOT EXISTS contact_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'account', 'billing', 'other')),
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  metadata TEXT NOT NULL DEFAULT '{}',
  admin_note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_user_created
ON contact_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_requests_status_created
ON contact_requests(status, created_at DESC);
