CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('android')),
  product_id TEXT NOT NULL,
  purchase_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('active', 'expired', 'canceled', 'pending', 'revoked', 'unknown')),
  plan TEXT NOT NULL CHECK(plan IN ('free', 'paid')),
  expires_at TEXT,
  auto_renewing INTEGER NOT NULL DEFAULT 0,
  raw_provider_data TEXT NOT NULL,
  last_verified_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_updated
  ON user_subscriptions(user_id, updated_at DESC);
