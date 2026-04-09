# Turso 마이그레이션 가이드

Turso 대시보드에서 아래 SQL을 순서대로 실행하세요.

---

## ✅ 완료됨

### 1. 002_add_session_id_to_chat_messages.sql (이미 실행됨)

```sql
ALTER TABLE chat_messages ADD COLUMN session_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at DESC);
```

---

## 🔄 다음 실행할 것

### 2. 003_create_sessions_table.sql

```sql
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
```

### 3. 001_add_reports_table.sql

```sql
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

CREATE INDEX IF NOT EXISTS idx_reports_user_created ON reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user_month ON reports(user_id, created_at);
```

### 4. 004_add_clarification_sessions_table.sql

```sql
CREATE TABLE IF NOT EXISTS clarification_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  chat_session_id INTEGER NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (chat_session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_clarification_sessions_user_session ON clarification_sessions(user_id, chat_session_id);
CREATE INDEX IF NOT EXISTS idx_clarification_sessions_created ON clarification_sessions(created_at);
```

### 5. 005_add_user_notes_and_knowledge_base_tables.sql

```sql
CREATE TABLE IF NOT EXISTS user_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_updated ON user_notes(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    category TEXT,
    embedding_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
```

---

## 📋 마이그레이션 확인

각 마이그레이션 실행 후 성공 메시지를 확인하세요:
- ✅ `Table created successfully` 또는 `Query executed successfully`

---

## 🔍 검증

모든 마이그레이션 완료 후, Turso 대시보드의 "Tables" 탭에서 다음 테이블들이 있는지 확인:

- ✅ `users`
- ✅ `transactions`
- ✅ `chat_messages` (session_id 컬럼 추가됨)
- ✅ `sessions` (새로 생성됨)
- ✅ `reports` (새로 생성됨)
- ✅ `clarification_sessions` (새로 생성됨)
- ✅ `user_notes` (새로 생성됨)
- ✅ `knowledge_base` (새로 생성됨)

---

## ⚠️ 주의사항

- 각 SQL은 순서대로 실행해야 합니다 (FK 의존성 때문)
- `IF NOT EXISTS` 절이 있으므로 중복 실행해도 안전합니다
- 실행 중 에러 발생 시 에러 메시지를 캡처해서 알려주세요

---

## 🚀 완료 후

모든 마이그레이션이 완료되면:

1. 백엔드 서버 재시작 (또는 재배포)
2. Chat API 다시 테스트: `GET /api/ai/chat/history`
3. 세션 생성 테스트: `POST /api/sessions`
4. 리포트 저장 테스트: `POST /api/reports`

---

**마이그레이션 상태**: 1/5 완료
**다음 단계**: 003_create_sessions_table.sql 실행
