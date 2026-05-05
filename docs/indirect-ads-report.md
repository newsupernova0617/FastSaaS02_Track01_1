# 간접광고 삽입 현황

## 신규 컴포넌트
`frontend/src/components/blog/AppShowcase.astro`
- 구성: 스크린샷 플레이스홀더 | 기능 리스트 (✓) | CTA 버튼
- imageSrc prop 비어 있으면 회색 점선 박스 + 사진 설명 텍스트 표시

---

## 삽입 파일 5개

### 1. `how-to-start-household-book.mdx`
- **위치**: "어떤 사람에게 앱형 가계부가 더 잘 맞을까" FitGuide 블록 바로 아래
- **강조**: 자연어 입력, AI 자동분류, 달력 복습, 월간 리포트
- **필요 사진**: 앱 홈 화면 (AI 입력창 + 이번 달 지출 카드 + 퀵 칩)

### 2. `how-to-analyze-spending-patterns.mdx`
- **위치**: "앱을 쓰면 분석이 쉬운 이유" ProductFlow 블록 바로 아래
- **강조**: AI 6종 리포트, 파이차트 + 인사이트 텍스트, 반복 결제 감지, 전월 비교
- **필요 사진**: AI 리포트 화면 (차트 + 텍스트 인사이트)

### 3. `budget-for-living-alone.mdx`
- **위치**: "앱으로 관리하면 더 쉬운 경우" 설명 바로 아래
- **강조**: Android 알림 빠른 입력, AI 자동분류, 자취 맞춤 카테고리
- **필요 사진**: Android 알림창 빠른 입력 모습

### 4. `why-people-quit-household-book.mdx`
- **위치**: "방식이 안 맞으면 바꾸는 게 맞다" ProductFlow + Callout 아래
- **강조**: 채팅 3초 입력, 알림 빠른 입력, 취소(undo) 기능
- **필요 사진**: AI 채팅 입력 화면 (한국어 자연어 → AI 응답)

### 5. `first-salary-money-guide.mdx`
- **위치**: "가계부와 예산을 같이 붙여야 하는 이유" 본문 아래
- **강조**: 홈 화면 지출 흐름, 통계 탭 파이차트, AI 질문 기능, 월간 리포트
- **필요 사진**: 앱 통계 화면 또는 홈 화면

---

## 필요 사진 목록

| # | 설명 | 사용 파일 |
|---|---|---|
| 1 | 앱 홈 화면 (AI 입력창 + 지출 카드) | how-to-start |
| 2 | AI 리포트 화면 (차트 + 인사이트) | analyze-patterns |
| 3 | Android 알림 빠른 입력 | budget-alone, why-quit |
| 4 | AI 채팅 입력 화면 | why-quit |
| 5 | 앱 통계 화면 | first-salary |

사진 준비 후 각 `<AppShowcase>` 의 `imageSrc="/images/앱사진.png"` prop에 경로 추가하면 플레이스홀더가 실제 이미지로 교체됩니다.
