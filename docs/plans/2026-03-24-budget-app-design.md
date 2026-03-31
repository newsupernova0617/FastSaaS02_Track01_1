# 가계부 앱 설계 문서

**날짜**: 2026-03-24  
**스택**: Vite + React (Cloudflare Pages + Capacitor) / Hono (Cloudflare Workers) / Turso (libSQL)

---

## 개요

모바일 우선 단일 사용자 가계부 앱. 인증 없이 바로 사용 가능하며, 3가지 핵심 기능(기록, 달력, 통계)을 하단 탭바로 전환하는 SPA 구조.

---

## 아키텍처

```
/0324_fastsaas
├── frontend/          # Vite + React → Cloudflare Pages 배포
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── RecordPage.tsx      # 지출/수입 기록 폼
│   │   │   ├── CalendarPage.tsx    # 날짜별 기록 조회
│   │   │   └── StatsPage.tsx       # 월별 통계 파이 차트
│   │   ├── App.tsx                 # 하단 탭바 라우팅
│   │   └── main.tsx
│   └── package.json
└── backend/           # Hono → Cloudflare Workers 배포
    ├── src/
    │   ├── index.ts
    │   └── routes/
    │       └── transactions.ts
    └── package.json
```

**UI 패턴**: 하단 탭바 (📝 기록 | 📅 달력 | 📊 통계)

---

## 데이터 모델

```sql
CREATE TABLE transactions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL,      -- 'income' | 'expense'
  amount     INTEGER NOT NULL,   -- 원 단위 정수
  category   TEXT NOT NULL,
  memo       TEXT,
  date       TEXT NOT NULL,      -- 'YYYY-MM-DD'
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 고정 카테고리

| 지출 | 수입 |
|------|------|
| 식비 | 월급 |
| 교통 | 부업 |
| 쇼핑 | 용돈 |
| 의료 | 기타 |
| 문화/여가 | |
| 월세 | |
| 기타 | |

---

## API 설계

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/transactions` | 전체 조회 (쿼리: `?date=YYYY-MM`) |
| POST | `/api/transactions` | 새 기록 추가 |
| DELETE | `/api/transactions/:id` | 기록 삭제 |
| GET | `/api/transactions/summary` | 월별 통계 (`?month=YYYY-MM`) |

> 수정(PATCH)은 YAGNI 원칙에 따라 제외 — 삭제 후 재등록으로 커버

---

## 화면별 기능

### 1. 기록 페이지 (RecordPage)
- 수입/지출 토글
- 금액 입력
- 카테고리 선택 (고정 목록)
- 날짜 선택 (기본: 오늘)
- 메모 입력 (선택)
- 저장 버튼

### 2. 달력 페이지 (CalendarPage)
- 월 캘린더 뷰
- 날짜에 당일 수입/지출 합계 표시
- 날짜 클릭 → 해당 날짜 기록 목록 표시 (슬라이드업 모달)
- 기록에서 삭제 버튼

### 3. 통계 페이지 (StatsPage)
- 월 선택 (이전/다음 월 이동)
- 이번 달 수입 합계 / 지출 합계 / 순수익 카드
- 카테고리별 지출 파이 차트

---

## 배포

- **Frontend (웹)**: Cloudflare Pages — `frontend/` 디렉토리 독립 배포
- **Frontend (앱)**: Capacitor.js — Vite 빌드 결과를 iOS/Android 네이티브 앱으로 래핑
- **Backend**: Cloudflare Workers — `backend/` 디렉토리 독립 배포
- **DB**: Turso — `@libsql/client`로 Workers에서 연결
- **CORS**: Workers에서 Cloudflare Pages 도메인 허용
- **스타일링**: Tailwind CSS v4 (Vite 플러그인 방식)