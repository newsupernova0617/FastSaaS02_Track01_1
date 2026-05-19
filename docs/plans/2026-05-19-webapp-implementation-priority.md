# Webapp Implementation Priority

- 작성일: 2026-05-19
- 기준: `webapp/`를 Flutter 대체 또는 공존 앱으로 유지하는 방향
- 목적: 다음 goal을 줄 때 범위를 좁히기 위한 우선순위 문서

## 현재 상태

이미 webapp으로 많이 옮겨진 기능:

- 홈
- 달력
- 기록
- 통계
- 월간 리포트
- 세션 CRUD
- 프로필/로그아웃 기본
- guest fallback
- app-facing API 읽기/쓰기 다수

아직 남아 있는 기능:

- 온보딩
- AI 허브
- 도움말
- 문의
- 리포트 상세의 완전한 CRUD/이름변경 UX
- Flutter식 로그인/OAuth UX 정합성
- 설정 화면 정리

의도적으로 webapp에 그대로 옮기지 않을 가능성이 큰 것:

- 광고
- foreground service
- overlay
- quick entry
- 기타 네이티브 전용 기능

## 우선순위 원칙

1. 실제 사용자 흐름에 직접 영향을 주는 것부터 한다.
2. 낮은 우선순위의 화면은 하나로 합칠 수 있으면 합친다.
3. Flutter 기능의 1:1 복제보다, webapp/PWA 기준의 사용성 우선을 둔다.
4. backend low-level API는 유지하고, webapp에서 app-facing API를 우선 소비한다.
5. 런타임 검증이 끝나기 전에는 Flutter를 바로 제거하지 않는다.

## P0. 실데이터 런타임 검증

목표:

- 배포/로컬 환경에서 `api/app/*`가 실제 데이터로 끝까지 도는지 확인
- 로그인 -> bootstrap -> home/calendar/record/stats/monthlyReport/reports/search -> chat -> transaction CRUD 흐름 검증

해야 할 일:

- Supabase 세션 정상 동작 확인
- `/api/app/bootstrap` 확인
- `/api/app/home`, `/api/app/calendar`, `/api/app/record`, `/api/app/stats`, `/api/app/reports/current` 확인
- `/api/app/chat`, `/api/app/sessions`, `/api/app/transactions` 쓰기 확인
- guest fallback이 live 경로를 덮어쓰지 않는지 확인

완료 기준:

- 실제 데이터로 주요 화면이 모두 로드된다.
- 전송/저장/삭제가 DB에 반영된다.
- preview fallback은 guest 전용으로만 남는다.

## P1. 핵심 상호작용 보강

### 1) 세션 채팅 화면 정리

우선 이유:

- Flutter에서 AI 채팅은 핵심 입력면이다.
- 홈 composer는 이미 있지만, 세션 기반 대화 경험은 아직 완전하지 않다.

범위:

- full-screen chat 경험 정리
- 세션 sidebar 경험 정리
- 세션 선택/이름변경/삭제 UX 정리
- 홈과 채팅의 관계 정리

추천 대상 파일:

- `webapp/src/app.tsx`
- `webapp/src/components/app-components.tsx`
- `webapp/src/state/app-store.ts`
- `backend/src/routes/app.ts`

### 2) 리포트 상세 CRUD 정리

우선 이유:

- Flutter의 `report_detail_page`는 저장/이름변경/삭제가 핵심이다.
- webapp의 monthly report/report list는 있으나 상세 관리 UX는 아직 덜 정리됐다.

범위:

- 리포트 상세 조회
- 이름 변경
- 저장/삭제
- report name dialog에 해당하는 입력 UX

추천 대상 파일:

- `webapp/src/app.tsx`
- `webapp/src/components/app-components.tsx`
- `backend/src/routes/app.ts`

## P2. 진입점과 계정 화면

### 1) 로그인 UX 정합성

우선 이유:

- 앱 진입점이기 때문이다.
- Flutter의 OAuth 흐름과 webapp의 현재 로그인 패널이 정책적으로 다를 수 있다.

범위:

- Google OAuth 재검토 여부
- Kakao 버튼 처리 정책
- 로그인 실패/로딩/세션 복원 UX

### 2) 온보딩

우선 이유:

- 신규 사용자 첫 경험을 정리할 때만 필요하다.
- 기존 사용자 전환용으로는 우선순위가 낮다.

권장:

- 별도 4-step 온보딩을 복제할지 먼저 결정한다.
- 필요 없으면 랜딩/로그인 카피로 흡수한다.

### 3) 설정

우선 이유:

- 프로필, 구독, 로그아웃, 약관, 문의 이동이 한 곳에 모이기 쉽다.

권장:

- 별도 settings route를 만들거나
- profile card + support section으로 흡수한다.

## P3. 지원/보조 화면

### 1) 도움말

- 별도 help page가 꼭 필요한지 먼저 결정
- 필요하면 FAQ/지원 링크 위주로 최소 구현

### 2) 문의

- contact form이 꼭 앱 내부여야 하는지 판단
- 보통은 support endpoint 또는 외부 폼으로 넘길 수 있다

### 3) AI 허브

- webapp에 별도 AI hub가 꼭 필요한지 재검토
- home/search/monthly report로 기능이 분산되어 있으면 별도 탭은 중복일 수 있다

## P4. 명시적 비대상

아래는 webapp/PWA로 그대로 옮길 대상이 아니다. 다만 `foreground service / quick entry`는 fallback 중심이 아니라, Android Chrome에서 inline reply 주경로를 먼저 살리는 방향으로 본다.

- 광고 배너
- interstitial ad
- foreground service
- overlay
- quick entry native action
- 기타 Android 네이티브 전용 기능

### quick entry 방향

- 주경로: Android Chrome의 Web Push inline reply
- 보조경로: 알림 클릭 후 webapp 열기 + 입력창 복원
- 알림 tag: 같은 알림을 교체/묶는 식별자
- renotify: 교체 시 다시 알릴지 여부
- 재표시: tag만으로는 안 되므로, 앱 상태 저장 또는 서버 재푸시가 필요

## 다음 goal을 줄 때의 권장 방식

1. P0만 목표로 잡는다.
2. P0가 끝나면 런타임 검증 결과를 보고 P1로 간다.
3. P1은 `chat`과 `report detail`을 각각 별도 goal로 쪼갤 수 있다.
4. P2/P3는 제품 판단이 섞이므로, 구현 전에 범위를 다시 확인한다.

## 한 줄 요약

webapp은 이미 Flutter의 핵심 업무 기능을 많이 흡수했다.
다음에 할 일은 전면 재작성보다, `P0 런타임 검증 -> P1 핵심 상호작용 보강 -> P2 진입점 정리` 순서로 좁혀 가는 것이다.
