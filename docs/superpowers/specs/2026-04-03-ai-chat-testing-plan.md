# AI 채팅 + 리포트 기능 테스트 계획

> **For agentic workers:** Use superpowers:writing-plans to create implementation plan from this spec.

**Date:** 2026-04-03  
**Scope:** 완성된 AI 채팅 인터페이스 및 인라인 리포트 기능의 종합 테스트  
**Test Pyramid:** 유닛 (48개) > 통합 (24개) > E2E (6개) = **총 78개 테스트**

---

## 개요

방금 구현한 AI 채팅 + 리포트 기능 전체를 테스트합니다:
- **백엔드:** Chat CRUD, AI Report 서비스, 확장된 라우트
- **프론트엔드:** 7개 컴포넌트, AIPage, 라우팅
- **데이터베이스:** chat_messages 테이블

**테스트 철학:**
- Mock 전략: 유닛은 모두 mock → 빠르고 격리된 테스트
- 통합은 실제 Gemini API + 개발 DB → 진짜 동작 확인
- E2E는 완전한 사용자 흐름 (Playwright 브라우저)

---

## Phase 1: 백엔드 유닛 테스트 (~48개, 10초)

### 1.1 Chat Service 테스트 (`backend/tests/services/chat.test.ts`)

**saveMessage()**
- ✅ 일반 메시지 저장 (role='user')
- ✅ metadata 포함하여 저장
- ✅ JSON metadata 직렬화 검증
- ✅ createdAt 자동 생성
- ✅ userId 저장 검증

**getChatHistory()**
- ✅ 사용자 메시지만 반환 (다른 유저 메시지 제외)
- ✅ limit 파라미터 적용 (기본값 50)
- ✅ beforeId 커서 기반 페이지네이션 (id < beforeId)
- ✅ 빈 히스토리 ([]반환)
- ✅ 100개+ 메시지 조회 성능

**clearChatHistory()**
- ✅ 모든 메시지 삭제
- ✅ 삭제된 개수 반환
- ✅ 다른 유저 메시지는 영향 없음

---

### 1.2 AI Report Service 테스트 (`backend/tests/services/ai-report.test.ts`)

**AIReportService.generateReport()** (Mock Gemini)
- ✅ 유효한 reportType으로 Report 객체 반환
- ✅ title, subtitle 생성 (subtitle은 month 있을 때만)
- ✅ sections 배열 생성
- ✅ generatedAt ISO 타임스탬프

**aggregateTransactionData()** (private)
- ✅ 모든 거래 합계 (totalIncome, totalExpense)
- ✅ 월 필터 (YYYY-MM): 해당 월의 거래만
- ✅ 카테고리 필터: 특정 카테고리만
- ✅ byCategory 브레이크다운 (income/expense별)
- ✅ 거래 없을 때 빈 aggregated 반환
- ✅ 월 + 카테고리 동시 필터

**Mock Gemini 응답**
- ✅ 유효한 JSON 파싱
- ✅ sections 배열 포함
- ✅ section.type 검증 (card/pie/bar/line/alert/suggestion)

---

### 1.3 Validation 테스트 (`backend/tests/services/validation.test.ts`)

**validateReportPayload()**
- ✅ 유효한 reportType (monthly_summary, category_detail 등)
- ✅ params.month 형식 YYYY-MM 검증
- ✅ 잘못된 월 (2026-13, 2026-0) → ZodError
- ✅ params 선택사항 (생략 가능)
- ✅ category 선택사항
- ✅ reportType 필수

---

## Phase 2: 프론트엔드 유닛 테스트 (~28개, 15초)

### 2.1 컴포넌트 테스트 (Vitest + React Testing Library)

**ChatInput.tsx**
- ✅ 텍스트 입력 (onChange)
- ✅ Enter 키 → onSend 호출
- ✅ Shift+Enter → 줄바꿈 (onSend 호출 안 함)
- ✅ 로딩 중 (isLoading=true) 버튼 비활성
- ✅ 전송 후 입력 필드 비우기
- ✅ 에러 발생 시 텍스트 복구

**ChatBubble.tsx**
- ✅ role='user' → 파란색 배경
- ✅ role='assistant' → 회색 배경
- ✅ metadata 없음 → ActionButton 미렌더링
- ✅ metadata.actionType='report' → ActionButton 렌더링
- ✅ reportSections 배열 → ReportCard/ReportChart 렌더링
- ✅ whitespace-pre-wrap 유지

**ChatMessageList.tsx**
- ✅ messages=[] → 환영 메시지 ("Start a conversation")
- ✅ 메시지 추가 시 자동 스크롤 (endRef)
- ✅ isLoading=true → 로딩 표시기 (3개 점 애니메이션)
- ✅ 각 메시지 ChatBubble로 렌더링

**ReportCard.tsx**
- ✅ section.type='card' → 회색 배경
- ✅ section.type='alert' → 노란색 배경 + AlertCircle 아이콘
- ✅ section.type='suggestion' → 파란색 배경 + Lightbulb 아이콘
- ✅ metric ₩ 포맷팅 (1000 → "₩1,000")
- ✅ trend='up' → TrendingUp (빨강)
- ✅ trend='down' → TrendingDown (초록)
- ✅ section.data 키-값 렌더링

**ReportChart.tsx**
- ✅ section.type='pie' → PieChart 렌더링
- ✅ section.type='bar' → BarChart 렌더링
- ✅ section.type='line' → LineChart 렌더링
- ✅ section.type='card' → null 반환 (차트 안 함)
- ✅ chartData=[] → null 반환
- ✅ tooltip 통화 포맷팅

**ActionButton.tsx**
- ✅ metadata 없음 → null 반환
- ✅ actionType='create' → /calendar?date=YYYY-MM-DD 네비게이션
- ✅ actionType='report' → /stats?month=YYYY-MM 네비게이션
- ✅ actionType='report'이지만 month 없음 → 현재 월 사용

**AIPage.tsx**
- ✅ useEffect → getChatHistory(100) 호출
- ✅ 로드 성공 → messages 상태 업데이트
- ✅ 로드 실패 → error 상태 설정

---

### 2.2 API 함수 테스트 (`frontend/tests/api.test.ts`)

**sendAIMessage(text)**
- ✅ POST /api/ai/action 호출
- ✅ Authorization 헤더 포함
- ✅ text 파라미터 전송
- ✅ 응답 파싱 (success, content, metadata)

**getChatHistory(limit?, before?)**
- ✅ GET /api/ai/chat/history 호출
- ✅ ?limit=20&before=123 쿼리 파라미터
- ✅ 빈 배열 반환

**clearChatHistory()**
- ✅ DELETE /api/ai/chat/history 호출
- ✅ deletedCount 반환

---

## Phase 3: 백엔드 통합 테스트 (~24개, 30초)

### 3.1 REPORT 라우트 테스트 (`backend/tests/routes/ai.integration.test.ts`)

**POST /api/ai/action (type=report)** - 실제 Gemini 사용
- ✅ 사용자 메시지 저장 (role='user')
- ✅ Gemini 호출 (실제 API)
- ✅ 어시스턴트 응답 저장 (role='assistant', metadata 포함)
- ✅ chat_messages 테이블에 2개 행 존재
- ✅ reportPayload 유효성 검사 (YYYY-MM 형식)

**실패 시나리오:**
- ❌ Gemini API timeout → 500 에러
- ❌ 유효하지 않은 reportType → 400 ZodError
- ❌ 월 형식 잘못됨 (2026-13) → 400 에러
- ❌ 인증 토큰 없음 → 401
- ❌ DB 저장 실패 → 500

---

### 3.2 Chat History 라우트 테스트

**GET /api/ai/chat/history** - 개발 DB 사용
- ✅ 기본 호출 (limit 기본값 50)
- ✅ ?limit=20 → 20개 반환
- ✅ ?before=100 → id < 100인 메시지
- ✅ ?limit=10&before=50 → 10개, id<50
- ✅ 빈 결과 → []
- ✅ 다른 유저 메시지는 제외

**DELETE /api/ai/chat/history**
- ✅ 모든 메시지 삭제
- ✅ deletedCount = 0 (처음부터 비었을 때)
- ✅ 다른 유저 메시지는 영향 없음

---

## Phase 4: 프론트엔드 통합 테스트 (~12개, 20초)

### 4.1 AIPage 상태 관리 테스트

**초기 로드**
- ✅ mount → getChatHistory 호출
- ✅ messages 상태 업데이트
- ✅ error=null

**메시지 전송 (Happy Path)**
- ✅ ChatInput에서 "분석해줘" 입력
- ✅ onSend 호출 → 옵티미스틱 UI (사용자 메시지 즉시 표시)
- ✅ sendAIMessage 호출 중 (isLoading=true)
- ✅ 응답 받음 (report 타입)
- ✅ 어시스턴트 메시지 + metadata 추가
- ✅ isLoading=false

**에러 처리**
- ✅ sendAIMessage 실패 → error 상태 설정
- ✅ 옵티미스틱 사용자 메시지 제거
- ✅ 텍스트 복구

**페이지네이션 (선택사항)**
- ✅ 100+ 메시지 로드
- ✅ 스크롤 성능

---

### 4.2 컴포넌트 협력 테스트

**ChatInput → AIPage → ChatMessageList → ChatBubble**
- ✅ 메시지 입력 → AIPage로 전달
- ✅ AIPage에서 messages 상태 업데이트
- ✅ ChatMessageList에서 새 메시지 렌더링
- ✅ ChatBubble에서 적절한 스타일 적용

**Report 렌더링**
- ✅ ReportCard (summary 섹션) 렌더링
- ✅ ReportChart (pie 섹션) Recharts 호출
- ✅ ActionButton 네비게이션 준비

---

## Phase 5: E2E 테스트 (Playwright, ~6개, 3분)

### 5.1 파일 구조

```
frontend/tests/e2e/
├── fixtures/
│   ├── auth.ts           # authenticatedPage
│   └── db-setup.ts       # cleanAIHistory
├── pages/
│   ├── ai.page.ts        # AIPage POM
│   └── stats.page.ts     # StatsPage POM
└── specs/
    ├── ai-chat.spec.ts              # 메시지 송수신
    ├── ai-report.spec.ts            # 리포트 렌더링
    └── ai-navigation.spec.ts        # Query param
```

---

### 5.2 테스트 케이스 (실제 브라우저)

**ai-chat.spec.ts**
- ✅ **Happy Path:** 로그인 → AI 탭 → "분석해줘" → 응답 대기 → 메시지 렌더링
- ✅ **Multiple Messages:** 3개 메시지 연속 전송 → 순서 유지 → 자동 스크롤
- ✅ **Network Timeout:** 오프라인 → 메시지 전송 → 에러 표시 → 온라인 → 재시도

**ai-report.spec.ts**
- ✅ **Report Rendering:** 리포트 응답 → ReportCard (통화 포맷 ₩) 확인 → ReportChart (차트) 확인
- ✅ **View Details Navigation:** "View Details" 클릭 → /stats?month=2026-04 → Stats 페이지에서 데이터 표시

**ai-navigation.spec.ts**
- ✅ **Query Param:** /stats?month=2026-03 직접 방문 → Stats에서 3월 표시 확인
- ✅ **Route Persistence:** Stats → /ai → Stats (month 유지)

---

### 5.3 Fixture & Setup

**authenticatedPage fixture**
```typescript
- Supabase 테스트 유저 로그인
- JWT 토큰 저장
- 다음 테스트에서 재사용
```

**cleanAIHistory fixture**
```typescript
beforeEach: DELETE FROM chat_messages WHERE userId = <test-user>
afterEach: 동일
```

---

## 실행 가능한 명령어

```bash
# 모든 테스트
npm run test

# 계층별 실행
npm run test:backend:unit        # Phase 1 (~10초)
npm run test:frontend:unit       # Phase 2 (~15초)
npm run test:backend:integration # Phase 3 (~30초)
npm run test:frontend:integration # Phase 4 (~20초)
npm run test:e2e                 # Phase 5 (~3분)

# Playwright UI 모드 (디버깅)
npm run test:e2e:ui

# 특정 테스트
npm run test:e2e -- ai-chat.spec.ts
```

---

## 데이터 정리 전략

### 유닛 테스트
- DB 접근 없음 (mocks 사용)
- 정리 불필요

### 통합 테스트
```typescript
beforeEach: () => {
  // 테스트 시작 전 테스트 유저의 chat_messages 정리
  await db.delete(chatMessages)
    .where(eq(chatMessages.userId, 'integration-test-user'))
}
```

### E2E 테스트
- Playwright fixture (cleanAIHistory)로 자동 정리

---

## 기대 효과

✅ **백엔드 신뢰성**
- Chat CRUD 동작 검증
- AI Report 2-stage 처리 검증
- 에러 처리 (timeout, validation) 검증

✅ **프론트엔드 안정성**
- 7개 컴포넌트 단위 테스트
- AIPage 상태 관리 검증
- 네비게이션 (query params) 검증

✅ **통합 검증**
- 실제 Gemini API와의 상호작용
- DB 저장/조회 검증
- 사용자 관점의 완전한 흐름

✅ **회귀 방지**
- 향후 기능 추가 시 기존 기능 보호
- 리팩토링 안전성 확보

---

## 다음 단계

이 테스트 계획에 대한 구현 계획은 writing-plans 스킬로 생성됩니다.
- Task 단위 분해
- 각 Phase별 순서 정의
- 체크리스트 + 검증 방법
