# Report 저장 & 조회 기능 설계

## Context

현재 시스템에서는 AI가 생성한 리포트가 Chat 메시지의 metadata에만 저장되어 있습니다. 사용자가 과거 리포트를 재조회하거나 비교할 수 없는 문제가 있습니다.

이 설계는:
- Reports를 별도 테이블에 저장
- Chat에서만 리포트를 생성할 수 있도록 함
- Stats 페이지의 새로운 "저장됨" 탭에서 저장된 리포트를 조회할 수 있도록 함
- 새로운 Report 상세 페이지 추가

## Database Schema

### `reports` 테이블 추가

```typescript
export const reports = sqliteTable('reports', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id),
    reportType: text('report_type', {
        enum: ['monthly_summary', 'category_detail', 'spending_pattern', 'anomaly', 'suggestion']
    }).notNull(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    reportData: text('report_data').notNull(), // JSON 형식의 전체 Report 객체
    params: text('params').notNull(), // JSON 형식 {month?, category?}
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
```

### 특징

- `reportData`: 한 번 생성된 리포트를 JSON으로 저장 → 재조회 시 바로 표시
- `params`: 같은 조건으로 "다시 생성" 가능하게 저장
- userId로 사용자별 리포트 분리
- createdAt으로 리포트 생성 순서 추적

## Backend API

### 새 라우트: `/api/reports`

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/reports` | 리포트 저장 | ✅ |
| GET | `/api/reports?month=YYYY-MM` | 저장된 리포트 목록 조회 | ✅ |
| GET | `/api/reports/:id` | 특정 리포트 상세 조회 | ✅ |
| DELETE | `/api/reports/:id` | 리포트 삭제 (논리적 삭제) | ✅ |

### POST /api/reports - 리포트 저장

**요청:**
```json
{
  "reportType": "monthly_summary",
  "title": "April 2026 Financial Summary",
  "subtitle": "April 2026",
  "reportData": {
    "reportType": "monthly_summary",
    "title": "April 2026 Financial Summary",
    "sections": [...]
  },
  "params": { "month": "2026-04" }
}
```

**응답 (201 Created):**
```json
{
  "success": true,
  "id": 123,
  "createdAt": "2026-04-07T08:30:45.000Z"
}
```

### GET /api/reports - 리포트 목록 조회

**쿼리 파라미터:**
- `month`: YYYY-MM 형식 (선택사항, 필터링용)
- `limit`: 조회 건수 (기본값: 50)

**응답:**
```json
{
  "success": true,
  "reports": [
    {
      "id": 123,
      "reportType": "monthly_summary",
      "title": "April 2026 Financial Summary",
      "subtitle": "April 2026",
      "createdAt": "2026-04-07T..."
    },
    {
      "id": 122,
      "reportType": "category_detail",
      "title": "Category Analysis",
      "subtitle": "food",
      "createdAt": "2026-04-05T..."
    }
  ]
}
```

### GET /api/reports/:id - 리포트 상세 조회

**응답:**
```json
{
  "success": true,
  "report": {
    "id": 123,
    "reportType": "monthly_summary",
    "title": "April 2026 Financial Summary",
    "subtitle": "April 2026",
    "reportData": { ... },
    "params": { "month": "2026-04" },
    "createdAt": "2026-04-07T..."
  }
}
```

### DELETE /api/reports/:id - 리포트 삭제

**응답:**
```json
{
  "success": true,
  "message": "Report deleted"
}
```

## Flutter UI

### 1. Chat 페이지 - 리포트 저장 Flow

```
[Chat 메시지]
   ↓ (AI가 리포트 생성)
[Report 메시지 (카드, 파이, 바 차트)]
   ↓ (탭/클릭)
[Report 상세 페이지]
   - 전체 리포트 표시 (sections)
   - "저장하기" 버튼
   - "닫기" 버튼
   ↓ (저장 클릭)
POST /api/reports
   ↓ (성공)
[스낵바] "리포트가 저장되었습니다"
```

### 2. Stats 페이지 - "저장됨" 탭

**탭 구조:**
```
Stats 페이지
├── "생성" 탭 (기존 - 통계 생성)
└── "저장됨" 탭 (새로 추가)
```

**"저장됨" 탭 내용:**
```
[저장된 리포트 목록]
- April 2026 - monthly_summary (2026-04-07)
  - 카테고리 분석 (2026-04-05)
  - Category Detail - food (2026-04-03)

(빈 상태 텍스트)
저장된 리포트가 없습니다.
Chat에서 리포트를 생성하고 저장해보세요.
```

### 3. Report 상세 페이지 (`ReportDetailPage`)

**Chat에서 열 때:**
```
[Report 상세 페이지]
├── 제목, 부제목
├── 리포트 데이터 표시 (sections)
│   ├── Card (메트릭)
│   ├── Pie Chart (지출 분석)
│   ├── Bar Chart (수입 분석)
│   ├── Alert (이상 탐지)
│   └── Suggestion (제안)
└── "저장하기" 버튼
└── "닫기" 버튼
```

**Stats에서 열 때:**
```
[Report 상세 페이지]
├── 제목, 부제목
├── 리포트 데이터 표시 (sections)
└── "삭제하기" 버튼
└── "다시 생성" 버튼 (같은 params로)
└── "닫기" 버튼
```

## 파일 구조

### Backend

```
backend/src/
├── db/
│   └── schema.ts (reports 테이블 추가)
├── routes/
│   └── reports.ts (새로 생성)
│       ├── POST /api/reports
│       ├── GET /api/reports
│       ├── GET /api/reports/:id
│       └── DELETE /api/reports/:id
└── services/
    └── reports.ts (리포트 CRUD 로직)
```

### Flutter

```
flutter_app/lib/
├── core/api/
│   └── api_client.dart
│       ├── saveReport(reportData, params): Future<int>
│       ├── getReports(month?): Future<List<ReportSummary>>
│       └── getReportDetail(id): Future<Report>
│       └── deleteReport(id): Future<bool>
├── shared/models/
│   └── report.dart (새로 생성)
│       ├── ReportSummary
│       └── ReportDetail
├── shared/providers/
│   └── report_provider.dart (새로 생성)
│       ├── getReportsProvider
│       ├── saveReportProvider
│       └── deleteReportProvider
├── features/
│   ├── reports/ (새로 생성)
│   │   ├── report_detail_page.dart
│   │   └── report_list_item.dart
│   └── stats/
│       └── stats_page.dart (저장됨 탭 추가)
└── routes/
    └── app_router.dart (리포트 상세 페이지 라우트 추가)
```

## 데이터 Flow

### 1. 리포트 저장 Flow (Chat → Report 상세 페이지 → Stats)

```
Chat Page
  ↓ AI가 리포트 생성
Report 메시지 (metadata.report)
  ↓ 사용자 탭
ReportDetailPage (Chat 모드)
  ├─ reportData 표시
  ├─ params 보유
  └─ "저장하기" 버튼
    ↓ 클릭
POST /api/reports
  ├─ reportType, title, subtitle
  ├─ reportData (JSON)
  └─ params (JSON)
  ↓ 성공
Stats Page - "저장됨" 탭
  ├─ 저장된 리포트 목록 GET /api/reports
  └─ 리포트 아이템 표시
```

### 2. 리포트 조회 Flow

```
Stats Page - "저장됨" 탭
  ├─ 저장된 리포트 목록 로드
  │  GET /api/reports?month=YYYY-MM
  └─ 리포트 아이템 표시
    ↓ 클릭
ReportDetailPage (Stats 모드)
  ├─ GET /api/reports/:id
  ├─ reportData 표시
  └─ "삭제하기" / "다시 생성" 버튼
```

## 에러 처리

### 백엔드

- **400 Bad Request**: 필수 필드 누락 또는 유효하지 않은 reportType
- **401 Unauthorized**: 인증되지 않은 사용자
- **404 Not Found**: 리포트 없음 또는 다른 사용자의 리포트
- **500 Internal Server Error**: DB 오류

### Flutter

- 저장 실패: 스낵바에 에러 메시지
- 로드 실패: 에러 UI 표시
- 네트워크 오류: 재시도 버튼 제공

## 테스트 전략

### 백엔드

1. **POST /api/reports** - 리포트 저장
   - 유효한 데이터: 201 Created
   - 필수 필드 누락: 400 Bad Request
   - 다른 사용자 접근: 401 Unauthorized

2. **GET /api/reports** - 목록 조회
   - 저장된 리포트 조회
   - month 필터링
   - 페이지네이션 (limit)

3. **GET /api/reports/:id** - 상세 조회
   - 유효한 ID: 리포트 반환
   - 유효하지 않은 ID: 404
   - 다른 사용자: 404

4. **DELETE /api/reports/:id** - 삭제
   - 유효한 ID: 삭제 성공
   - 유효하지 않은 ID: 404

### Flutter

1. 리포트 저장 (Chat에서)
2. 저장된 리포트 조회 (Stats)
3. 리포트 상세 조회
4. 리포트 삭제
5. 네트워크 오류 처리

## 향후 확장

- 리포트 비교 기능 (두 개 이상의 리포트 비교)
- 리포트 공유 기능
- 리포트 내보내기 (PDF, CSV)
- 리포트 자동 생성 스케줄 (매달 자동)
