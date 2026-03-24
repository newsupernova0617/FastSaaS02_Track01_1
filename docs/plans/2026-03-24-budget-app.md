# 가계부 앱 구현 플랜

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 모바일 우선 가계부 앱 — 지출/수입 기록, 달력 뷰, 월별 파이 차트 통계 기능 구현

**Architecture:** 프론트(Vite+React)와 백엔드(Hono)를 `frontend/`, `backend/` 디렉토리로 분리. 백엔드는 Hono REST API로 Turso(libSQL)에 저장하고, 프론트는 Cloudflare Pages → 하단 탭바 SPA.

**Tech Stack:** Vite, React, TypeScript, Hono, drizzle-orm, drizzle-kit, @libsql/client, Tailwind CSS v4, Capacitor.js, Cloudflare Pages, Cloudflare Workers, Turso

---

## Task 1: 프로젝트 초기 설정 — Backend

**Files:**
- Create: `backend/`

**Step 1: Hono Workers 프로젝트 생성**

```bash
mkdir -p backend && cd backend
npm create hono@latest . -- --template cloudflare-workers
```

Expected: `backend/src/index.ts`, `backend/wrangler.toml`, `backend/package.json` 생성

**Step 2: 패키지 설치**

```bash
cd backend
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

| 패키지 | 용도 |
|--------|------|
| drizzle-orm | ORM 쿼리빌더 |
| @libsql/client | Turso libSQL 드라이버 |
| drizzle-kit | 스키마 마이그레이션 CLI (dev) |

**Step 3: `wrangler.toml` 환경변수 섹션 추가**

`backend/wrangler.toml`에 추가 (실제 값은 `.dev.vars`에 따로 설정):

```toml
[vars]
TURSO_DB_URL = ""
TURSO_AUTH_TOKEN = ""
```

**Step 4: `.dev.vars` 파일 생성 (로컬 개발용, gitignore)**

```
TURSO_DB_URL=libsql://your-db-url.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

`backend/.gitignore`에 `.dev.vars` 추가.

**Step 5: Commit**

```bash
git add backend/
git commit -m "chore: init backend hono cloudflare workers + drizzle"
```

---

## Task 2: Drizzle 스키마 & 마이그레이션 — Backend

**Files:**
- Create: `backend/src/db/schema.ts`
- Create: `backend/src/db/index.ts`
- Create: `backend/drizzle.config.ts`

**Step 1: `backend/src/db/schema.ts` 작성 — Drizzle 테이블 정의**

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }), // PK, 자동 증가
  type: text('type', { enum: ['income', 'expense'] }).notNull(), // 수입 | 지출
  amount: integer('amount').notNull(), // 금액 (원 단위)
  category: text('category').notNull(), // 고정 카테고리
  memo: text('memo'), // 메모 (선택)
  date: text('date').notNull(), // YYYY-MM-DD
  createdAt: text('created_at').default(sql`(datetime('now'))`), // 생성일시 자동
});

export type Transaction = typeof transactions.$inferSelect; // SELECT 결과 타입
export type NewTransaction = typeof transactions.$inferInsert; // INSERT 입력 타입
```

**Step 2: `backend/src/db/index.ts` 작성 — Drizzle 클라이언트**

```typescript
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Workers Bindings 타입
export type Env = {
  TURSO_DB_URL: string;
  TURSO_AUTH_TOKEN: string;
};

// 요청마다 새 클라이언트 생성 (Workers stateless)
export function getDb(env: Env) {
  const client = createClient({
    url: env.TURSO_DB_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema }); // 스키마 타입 연결
}
```

**Step 3: `backend/drizzle.config.ts` 작성 — drizzle-kit 설정**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'turso', // libSQL 방언
  schema: './src/db/schema.ts', // 스키마 파일 위치
  out: './drizzle', // 마이그레이션 SQL 출력 폴더
  dbCredentials: {
    url: process.env.TURSO_DB_URL!, // 로컬: .dev.vars에서 주입
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

**Step 4: 마이그레이션 파일 생성 및 Turso에 적용**

```bash
cd backend
# 마이그레이션 SQL 생성
npx drizzle-kit generate

# Turso DB에 마이그레이션 적용
npx drizzle-kit migrate
```

Expected: `backend/drizzle/` 폴더에 SQL 파일 생성, Turso DB에 `transactions` 테이블 생성

**Step 5: Commit**

```bash
git add backend/src/db/ backend/drizzle/ backend/drizzle.config.ts
git commit -m "feat: add drizzle schema and migration"
```

---

## Task 3: Transactions API 구현 — Backend

**Files:**
- Create: `backend/src/routes/transactions.ts`
- Modify: `backend/src/index.ts`

**Step 1: `backend/src/routes/transactions.ts` 작성 — Drizzle 쿼리빌더 사용**

```typescript
import { Hono } from 'hono';
import { eq, like, sql } from 'drizzle-orm';
import { getDb, Env } from '../db/index';
import { transactions } from '../db/schema';

const router = new Hono<{ Bindings: Env }>();

// 전체 or 월 필터 조회 (?date=YYYY-MM)
router.get('/', async (c) => {
  const db = getDb(c.env);
  const date = c.req.query('date');
  const rows = date
    ? await db.select().from(transactions).where(like(transactions.date, `${date}%`))
    : await db.select().from(transactions);
  return c.json(rows);
});

// 새 기록 저장, 삽입된 id 반환
router.post('/', async (c) => {
  const db = getDb(c.env);
  const body = await c.req.json();
  const result = await db
    .insert(transactions)
    .values({
      type: body.type,
      amount: body.amount,
      category: body.category,
      memo: body.memo ?? null,
      date: body.date,
    })
    .returning({ id: transactions.id }); // 삽입된 id만 반환
  return c.json({ id: result[0].id }, 201);
});

// id로 단건 삭제
router.delete('/:id', async (c) => {
  const db = getDb(c.env);
  const id = Number(c.req.param('id'));
  await db.delete(transactions).where(eq(transactions.id, id));
  return c.json({ success: true });
});

// 월별 카테고리 합계 (?month=YYYY-MM)
router.get('/summary', async (c) => {
  const db = getDb(c.env);
  const month = c.req.query('month') ?? new Date().toISOString().slice(0, 7);
  const rows = await db
    .select({
      type: transactions.type,
      category: transactions.category,
      total: sql<number>`SUM(${transactions.amount})`.as('total'), // 집계
    })
    .from(transactions)
    .where(like(transactions.date, `${month}%`))
    .groupBy(transactions.type, transactions.category);
  return c.json(rows);
});

export default router;
```

**Step 2: `backend/src/index.ts` 수정 — CORS + 라우트 등록**

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import transactions from './routes/transactions';

const app = new Hono();

app.use('*', cors());
app.route('/api/transactions', transactions);

export default app;
```

**Step 3: 로컬 실행 확인**

```bash
cd backend
npm run dev
```

별도 터미널에서:
```bash
curl -X POST http://localhost:8787/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","amount":15000,"category":"식비","memo":"점심","date":"2026-03-24"}'
# Expected: {"id":1}

curl http://localhost:8787/api/transactions
# Expected: [{"id":1,"type":"expense","amount":15000,...}]
```

**Step 4: Commit**

```bash
git add backend/src/
git commit -m "feat: implement transactions API with drizzle orm"
```

---

## Task 4: 프론트엔드 초기 설정

**Files:**
- Create: `frontend/`

**Step 1: Vite + React + TypeScript 프로젝트 생성**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

**Step 2: 추가 패키지 설치**

```bash
cd frontend
npm install react-router-dom recharts
npm install -D @types/react-router-dom @tailwindcss/vite tailwindcss
```

| 패키지 | 용도 |
|--------|------|
| react-router-dom | 탭 라우팅 |
| recharts | 파이 차트 |
| tailwindcss + @tailwindcss/vite | CSS 유틸리티 (v4, Vite 플러그인 방식) |

**Step 3: Tailwind CSS v4 Vite 플러그인 설정**

`frontend/vite.config.ts` 수정:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

`frontend/src/index.css` 최상단에 추가:
```css
@import "tailwindcss";
```

**Step 4: 환경변수 파일 생성**

`frontend/.env.local`:
```
VITE_API_BASE_URL=http://localhost:8787
```

`frontend/.env.production`:
```
VITE_API_BASE_URL=https://your-worker.workers.dev
```

**Step 5: Commit**

```bash
git add frontend/
git commit -m "chore: init frontend vite react typescript + tailwind v4"
```

---

## Task 5: 공통 컴포넌트 및 API 클라이언트 — Frontend

**Files:**
- Create: `frontend/src/api.ts`
- Create: `frontend/src/constants/categories.ts`
- Create: `frontend/src/components/BottomNav.tsx`

**Step 1: `frontend/src/constants/categories.ts`**

```typescript
// 고정 카테고리 — as const로 리터럴 타입 유지
export const EXPENSE_CATEGORIES = ['식비', '교통', '쇼핑', '의료', '문화/여가', '월세', '기타'] as const;
export const INCOME_CATEGORIES = ['월급', '부업', '용돈', '기타'] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
export type IncomeCategory = typeof INCOME_CATEGORIES[number];
```

**Step 2: `frontend/src/api.ts`**

```typescript
const BASE = import.meta.env.VITE_API_BASE_URL; // 환경별 API 베이스 URL

export type Transaction = {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  memo: string | null;
  date: string; // YYYY-MM-DD
  created_at: string;
};

export type SummaryRow = {
  type: 'income' | 'expense';
  category: string;
  total: number; // 카테고리 합계
};

export const api = {
  // 거래 목록 조회 (date 전달 시 해당 월만)
  getTransactions: (date?: string): Promise<Transaction[]> =>
    fetch(`${BASE}/api/transactions${date ? `?date=${date}` : ''}`).then((r) => r.json()),

  // 새 거래 추가
  addTransaction: (data: Omit<Transaction, 'id' | 'created_at'>): Promise<{ id: number }> =>
    fetch(`${BASE}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  // 거래 삭제
  deleteTransaction: (id: number): Promise<{ success: boolean }> =>
    fetch(`${BASE}/api/transactions/${id}`, { method: 'DELETE' }).then((r) => r.json()),

  // 월별 카테고리 통계
  getSummary: (month: string): Promise<SummaryRow[]> =>
    fetch(`${BASE}/api/transactions/summary?month=${month}`).then((r) => r.json()),
};
```

**Step 3: `frontend/src/components/BottomNav.tsx`**

```typescript
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/record', label: '기록', icon: '✏️' },
  { to: '/calendar', label: '달력', icon: '📅' },
  { to: '/stats', label: '통계', icon: '📊' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex bg-white border-t border-gray-100 z-50 max-w-[480px] mx-auto">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2.5 text-xs gap-0.5 no-underline ${
              isActive ? 'text-indigo-500 font-semibold' : 'text-gray-400'
            }`
          }
        >
          <span className="text-lg">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add api client, categories constants, BottomNav"
```

---

## Task 6: 기록 페이지 구현 (RecordPage)

**Files:**
- Create: `frontend/src/pages/RecordPage.tsx`

**Step 1: `frontend/src/pages/RecordPage.tsx` 작성**

```typescript
import { useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';
import { api } from '../api';
import styles from './RecordPage.module.css';

export default function RecordPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;
    setSaving(true);
    await api.addTransaction({ type, amount: Number(amount), category, memo, date });
    setSaving(false);
    setDone(true);
    setAmount('');
    setCategory('');
    setMemo('');
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>기록하기</h1>

      <div className={styles.toggle}>
        <button
          className={type === 'expense' ? styles.active : ''}
          onClick={() => { setType('expense'); setCategory(''); }}
        >지출</button>
        <button
          className={type === 'income' ? styles.active : ''}
          onClick={() => { setType('income'); setCategory(''); }}
        >수입</button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label>금액
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
          />
        </label>

        <label>카테고리
          <div className={styles.chips}>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={category === c ? styles.chipActive : styles.chip}
                onClick={() => setCategory(c)}
              >{c}</button>
            ))}
          </div>
        </label>

        <label>날짜
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label>메모 (선택)
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모를 입력하세요"
          />
        </label>

        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? '저장 중...' : done ? '✅ 저장됨' : '저장'}
        </button>
      </form>
    </div>
  );
}
```

`frontend/src/pages/RecordPage.module.css` — 모바일 스타일 정의.

**Step 2: 로컬에서 시각 확인**

```bash
cd frontend
npm run dev
```
브라우저에서 `http://localhost:5173/record` 접속 → 폼 표시 확인

**Step 3: Commit**

```bash
git add frontend/src/pages/RecordPage.tsx
git commit -m "feat: implement RecordPage"
```

---

## Task 7: 달력 페이지 구현 (CalendarPage)

**Files:**
- Create: `frontend/src/pages/CalendarPage.tsx`

**Step 1: `frontend/src/pages/CalendarPage.tsx` 작성**

달력은 외부 라이브러리 대신 직접 구현 (경량화):

```typescript
import { useState, useEffect } from 'react';
import { api, Transaction } from '../api';
import styles from './CalendarPage.module.css';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => {
    api.getTransactions(monthStr).then(setTransactions);
  }, [monthStr]);

  const dayMap = transactions.reduce<Record<string, { income: number; expense: number }>>((acc, t) => {
    if (!acc[t.date]) acc[t.date] = { income: 0, expense: 0 };
    acc[t.date][t.type] += t.amount;
    return acc;
  }, {});

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun

  const selectedTxns = transactions.filter((t) => t.date === selected);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button onClick={prevMonth}>‹</button>
        <span>{year}년 {month + 1}월</span>
        <button onClick={nextMonth}>›</button>
      </div>

      <div className={styles.grid}>
        {['일','월','화','수','목','금','토'].map(d => <div key={d} className={styles.dayLabel}>{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
          const info = dayMap[dateStr];
          return (
            <div key={day} className={`${styles.cell} ${selected === dateStr ? styles.selected : ''}`} onClick={() => setSelected(dateStr)}>
              <span className={styles.dayNum}>{day}</span>
              {info?.income > 0 && <span className={styles.income}>+{(info.income / 1000).toFixed(0)}k</span>}
              {info?.expense > 0 && <span className={styles.expense}>-{(info.expense / 1000).toFixed(0)}k</span>}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className={styles.detail}>
          <h3>{selected}</h3>
          {selectedTxns.length === 0 ? <p>기록 없음</p> : selectedTxns.map((t) => (
            <div key={t.id} className={styles.txRow}>
              <span className={t.type === 'income' ? styles.income : styles.expense}>
                {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}원
              </span>
              <span>{t.category}</span>
              <span>{t.memo}</span>
              <button onClick={() => api.deleteTransaction(t.id).then(() => api.getTransactions(monthStr).then(setTransactions))}>🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: 로컬 확인** — 달력 렌더링, 날짜 클릭 시 상세 표시

**Step 3: Commit**

```bash
git add frontend/src/pages/CalendarPage.tsx
git commit -m "feat: implement CalendarPage with transaction detail"
```

---

## Task 8: 통계 페이지 구현 (StatsPage)

**Files:**
- Create: `frontend/src/pages/StatsPage.tsx`

**Step 1: `frontend/src/pages/StatsPage.tsx` 작성**

```typescript
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { api, SummaryRow } from '../api';
import styles from './StatsPage.module.css';

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#a855f7','#ec4899','#14b8a6'];

export default function StatsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<SummaryRow[]>([]);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  useEffect(() => {
    api.getSummary(monthStr).then(setSummary);
  }, [monthStr]);

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const totalIncome = summary.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.total), 0);
  const totalExpense = summary.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.total), 0);
  const pieData = summary.filter(r => r.type === 'expense').map(r => ({ name: r.category, value: Number(r.total) }));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button onClick={prevMonth}>‹</button>
        <span>{year}년 {month}월</span>
        <button onClick={nextMonth}>›</button>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <span>수입</span>
          <strong className={styles.income}>+{totalIncome.toLocaleString()}원</strong>
        </div>
        <div className={styles.card}>
          <span>지출</span>
          <strong className={styles.expense}>-{totalExpense.toLocaleString()}원</strong>
        </div>
        <div className={styles.card}>
          <span>순수익</span>
          <strong>{(totalIncome - totalExpense).toLocaleString()}원</strong>
        </div>
      </div>

      {pieData.length > 0 ? (
        <PieChart width={320} height={280}>
          <Pie data={pieData} cx={160} cy={130} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => `${v.toLocaleString()}원`} />
        </PieChart>
      ) : (
        <p className={styles.empty}>이번 달 지출 기록이 없습니다</p>
      )}
    </div>
  );
}
```

**Step 2: 로컬 확인** — 통계 카드 + 파이 차트 렌더링

**Step 3: Commit**

```bash
git add frontend/src/pages/StatsPage.tsx
git commit -m "feat: implement StatsPage with pie chart"
```

---

## Task 9: App 라우팅 및 전체 스타일 — Frontend

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/index.css`

**Step 1: `frontend/src/App.tsx` 수정 — 탭 라우팅 구성**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import RecordPage from './pages/RecordPage';
import CalendarPage from './pages/CalendarPage';
import StatsPage from './pages/StatsPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="max-w-[480px] mx-auto min-h-[100dvh] flex flex-col bg-[#f8f8fc]">
        <main className="flex-1 overflow-y-auto pb-[70px]">
          <Routes>
            <Route path="/" element={<Navigate to="/record" replace />} />
            <Route path="/record" element={<RecordPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
```



**Step 2: `frontend/src/index.css` 추가 스타일 (Tailwind Preflight 이후)**

> Tailwind v4의 `@import "tailwindcss"`는 **Preflight** 리셋을 자동 포함 —
> `box-sizing`, `margin/padding`, `font: inherit`, `border/background: none` 등은 별도 작성 불필요.
> 아래 두 가지만 추가.

```css
@import "tailwindcss";

/* Preflight에 없는 것만 추가 */
button { cursor: pointer; }     /* Preflight 미포함 */
body { background: #f0f0f5; }   /* 앱 배경색 */
```

**Step 3: 전체 통합 확인**

```bash
cd frontend && npm run dev
```
`http://localhost:5173` 접속 → 하단 탭바 3개 탭 전환 확인

**Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/index.css
git commit -m "feat: wire up tab routing and global styles with tailwind"
```

---

## Task 10: Capacitor 설정 — iOS/Android 네이티브 앱

**Files:**
- Modify: `frontend/capacitor.config.ts`

**Step 1: Capacitor 패키지 설치**

```bash
cd frontend
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
```

**Step 2: Capacitor 초기화**

```bash
cd frontend
npx cap init
# App name: 가계부
# App ID: com.yourname.budget
# Web dir: dist
```

**Step 3: `frontend/capacitor.config.ts` 작성**

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.budget', // 번들 ID
  appName: '가계부',
  webDir: 'dist', // Vite 빌드 출력
  server: {
    // 로컬 개발 시 라이브리로드 (선택)
    // url: 'http://192.168.x.x:5173',
    // cleartext: true,
  },
};

export default config;
```

**Step 4: 플랫폼 추가 및 동기화**

```bash
cd frontend

# 빌드 먼저 (Capacitor은 dist/ 기준으로 동작)
npm run build

# iOS / Android 플랫폼 추가
npx cap add ios
npx cap add android

# 빌드 결과를 네이티브 프로젝트에 동기화
npx cap sync
```

Expected: `frontend/ios/`, `frontend/android/` 폴더 생성

**Step 5: 실망 실행 확인**

```bash
# iOS (Xcode 필요)
npx cap open ios

# Android (Android Studio 필요)
npx cap open android
```

> 판보 및 CORS: Capacitor 앱은 네이티브에서 `file://` 스키마로 동작. backend CORS에 `capacitor://localhost` 허용 필요.
> ```typescript
> // backend/src/index.ts
> app.use('*', cors({ origin: ['https://your-app.pages.dev', 'capacitor://localhost'] }));
> ```

**Step 6: Commit**

```bash
git add frontend/capacitor.config.ts frontend/ios/ frontend/android/
git commit -m "feat: add capacitor ios/android setup"
```

---

## Task 11: 배포 설정

**Step 1: Frontend — Cloudflare Pages 설정**

`frontend/` 루트에 `_redirects` 파일 생성 (SPA 라우팅):
```
/* /index.html 200
```

Cloudflare Pages Dashboard:
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `frontend`
- 환경변수: `VITE_API_BASE_URL=https://your-worker.workers.dev`

**Step 2: Backend — Cloudflare Workers 배포**

```bash
cd backend
npx wrangler secret put TURSO_DB_URL
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler deploy
```

**Step 3: CORS 업데이트**

`backend/src/index.ts`의 cors 설정을 Pages 및 Capacitor 도메인으로 한정:
```typescript
app.use('*', cors({ origin: ['https://your-app.pages.dev', 'capacitor://localhost'] }));
```

**Step 4: Commit**

```bash
git add .
git commit -m "chore: add deployment config"
```
