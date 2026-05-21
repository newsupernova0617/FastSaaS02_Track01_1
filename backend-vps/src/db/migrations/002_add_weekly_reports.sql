-- Migration: allow weekly AI summary reports
-- Date: 2026-04-24
--
-- SQLite cannot alter a CHECK constraint in place. Apply this migration only
-- after backing up production data.

CREATE TABLE IF NOT EXISTS reports_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK(report_type IN ('weekly_summary', 'monthly_summary', 'category_detail', 'spending_pattern', 'anomaly', 'suggestion')),
  title TEXT NOT NULL,
  subtitle TEXT,
  report_data TEXT NOT NULL,
  params TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO reports_new (id, user_id, report_type, title, subtitle, report_data, params, created_at, updated_at)
SELECT id, user_id, report_type, title, subtitle, report_data, params, created_at, updated_at
FROM reports;

DROP TABLE reports;
ALTER TABLE reports_new RENAME TO reports;

CREATE INDEX IF NOT EXISTS idx_reports_user_created ON reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user_month ON reports(user_id, created_at);
