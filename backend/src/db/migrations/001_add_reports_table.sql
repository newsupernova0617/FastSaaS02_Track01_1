-- Migration: Add reports table for persisting AI-generated reports
-- Date: 2026-04-07

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK(report_type IN ('monthly_summary', 'category_detail', 'spending_pattern', 'anomaly', 'suggestion')),
  title TEXT NOT NULL,
  subtitle TEXT,
  report_data TEXT NOT NULL,
  params TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create index for faster queries by userId and createdAt
CREATE INDEX IF NOT EXISTS idx_reports_user_created ON reports(user_id, created_at DESC);

-- Create index for month-based filtering
CREATE INDEX IF NOT EXISTS idx_reports_user_month ON reports(user_id, created_at);
