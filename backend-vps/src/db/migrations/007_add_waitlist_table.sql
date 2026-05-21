-- 007_add_waitlist_table.sql
-- 랜딩페이지의 출시 알림 이메일 수집용 테이블
-- 공개 엔드포인트이므로 userId 없음. email에 UNIQUE 제약으로 중복 방지.

CREATE TABLE IF NOT EXISTS waitlist (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at);
