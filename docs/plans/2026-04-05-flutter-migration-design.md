# Flutter 프론트엔드 마이그레이션 디자인

> 작성일: 2026-04-05
> 상태: 승인됨

## 배경

현재 AI 기반 가계부 앱의 프론트엔드는 React + Vite + TailwindCSS + Capacitor로 구성되어 있다.
네이티브 기능(Floating Overlay, Foreground Service, 푸시 알림, 카메라 등)이 필요해졌으나,
Capacitor로는 Floating Overlay와 Foreground Service를 구현할 수 없어 Flutter로 전면 마이그레이션한다.

## 핵심 결정 사항

- **방식**: 클린 Flutter 프로젝트 (기존 React 앱과 병렬 유지 후 폐기)
- **타겟 플랫폼**: Android(메인) + iOS(메인) + Web(보조)
- **상태관리**: Riverpod
- **UI 방향**: 기존 구조 유지 + Material 3로 부분 개선
- **백엔드**: 변경 없음 (기존 Hono REST API 그대로 사용)

## 1. 프로젝트 구조

```
mingunFastSaaS_Error_fixed/
├── backend/              # 기존 유지 (Hono + Cloudflare Workers)
├── frontend/             # 기존 유지 (웹 배포용, 점진적 폐기)
├── flutter_app/          # 새로운 Flutter 프로젝트
│   ├── lib/
│   │   ├── main.dart
│   │   ├── app.dart                  # MaterialApp, 라우팅, 테마
│   │   ├── core/
│   │   │   ├── api/
│   │   │   │   ├── api_client.dart       # Dio 기반 HTTP 클라이언트
│   │   │   │   └── api_interceptor.dart  # JWT 토큰 자동 주입
│   │   │   ├── auth/
│   │   │   │   └── supabase_auth.dart    # Supabase 인증
│   │   │   ├── theme/
│   │   │   │   └── app_theme.dart        # Material 3 테마
│   │   │   └── constants/
│   │   │       └── app_constants.dart
│   │   ├── features/
│   │   │   ├── auth/                 # 로그인 페이지
│   │   │   ├── record/              # 수입/지출 기록
│   │   │   ├── calendar/            # 캘린더 뷰
│   │   │   ├── stats/               # 통계 차트
│   │   │   └── ai_chat/             # AI 채팅
│   │   ├── native/
│   │   │   ├── overlay/             # Floating Overlay (Android)
│   │   │   └── foreground_service/  # Foreground Service (Android)
│   │   └── shared/
│   │       ├── models/              # Transaction, ChatMessage 등
│   │       ├── widgets/             # 공용 위젯 (BottomNav 등)
│   │       └── providers/           # Riverpod providers
│   ├── android/
│   ├── ios/
│   ├── web/
│   └── pubspec.yaml
└── docs/
```

**설계 원칙:**
- Feature-first 구조: 각 기능이 독립된 폴더에 자체 UI/로직 포함
- `core/`: 인증, API, 테마 등 앱 전반 인프라
- `native/`: Android 전용 네이티브 기능을 별도 분리 (Platform Channel)
- `shared/`: 여러 feature에서 공유하는 모델, 위젯, provider

## 2. 기술 스택

| 영역 | 패키지 | 이유 |
|------|--------|------|
| 상태관리 | `flutter_riverpod` + `riverpod_annotation` | 코드 생성으로 보일러플레이트 최소화 |
| HTTP | `dio` | 인터셉터로 JWT 자동 주입, 에러 핸들링 |
| 인증 | `supabase_flutter` | 기존 Supabase OAuth 그대로 활용 |
| 라우팅 | `go_router` | 선언적 라우팅, 딥링크/OAuth 콜백 |
| 차트 | `fl_chart` | recharts 대체, Flutter 네이티브 차트 |
| 캘린더 | `table_calendar` | 기존 커스텀 캘린더 대체 |
| 로컬 저장소 | `shared_preferences` | 설정 값, 토큰 캐시 |
| Overlay | Platform Channel + Android `WindowManager` | 네이티브 Kotlin 구현 |
| Foreground Service | `flutter_foreground_task` | 오버레이 유지 서비스 |
| 푸시 알림 | `firebase_messaging` (미래) | FCM 백엔드 추가 시 |
| 카메라 | `image_picker` | 갤러리/카메라 접근 |
| 코드 생성 | `freezed` + `json_serializable` | 불변 모델, JSON 직렬화 |

### API 통신 흐름

```
Flutter App (Dio + JWT)
    ↓ REST API (JSON)
Hono Backend (Cloudflare Workers)
    ↓ Drizzle ORM
Turso DB (SQLite)
```

기존 백엔드 API 엔드포인트를 그대로 사용:
- `GET/POST /api/transactions` — 거래 조회/생성
- `DELETE /api/transactions/:id` — 거래 삭제
- `GET /api/transactions/summary` — 월별 요약
- `POST /api/ai/action` — AI 메시지 전송
- `GET/DELETE /api/ai/chat/history` — 채팅 히스토리

### Floating Overlay 아키텍처 (Android)

```
Flutter Main App
    ↓ MethodChannel
Android Native (Kotlin)
    ├── ForegroundService (앱 종료 후에도 유지)
    └── WindowManager (오버레이 뷰 생성)
         └── Mini AI Chat UI
```

오버레이 UI는 별도의 Flutter Engine으로 렌더링하거나 간단한 네이티브 Android View로 구현.
메인 앱 ↔ 오버레이 간 통신은 Platform Channel 또는 로컬 브로드캐스트.

## 3. 기능 매핑

### React → Flutter 페이지 대응

| React | Flutter | 변경사항 |
|-------|---------|---------|
| `LoginPage.tsx` | `features/auth/` | `supabase_flutter`로 대체 |
| `AuthCallback.tsx` | `go_router` redirect | 별도 페이지 불필요 |
| `RecordPage.tsx` | `features/record/` | Material 3 입력 위젯 |
| `CalendarPage.tsx` | `features/calendar/` | `table_calendar` 활용 |
| `StatsPage.tsx` | `features/stats/` | `fl_chart`로 대체 |
| `AIPage.tsx` | `features/ai_chat/` | 네이티브 채팅 UI |
| `BottomNav.tsx` | `shared/widgets/` | Material 3 `NavigationBar` |

### 새로 추가되는 네이티브 기능

| 기능 | 플랫폼 | 설명 |
|------|--------|------|
| Floating Overlay | Android | 앱 밖 AI 미니 채팅 버블 |
| Foreground Service | Android | 오버레이 유지 백그라운드 서비스 |
| 카메라/갤러리 | Android + iOS | 영수증 촬영 |
| 푸시 알림 | Android + iOS | 미래 FCM 연동 |

### 데이터 모델 (freezed)

```dart
@freezed
class Transaction with _$Transaction {
  factory Transaction({
    required int id,
    required String userId,
    required String type,         // 'income' | 'expense'
    required int amount,
    required String category,
    String? memo,
    required String date,          // 'YYYY-MM-DD'
    required String createdAt,
  }) = _Transaction;

  factory Transaction.fromJson(Map<String, dynamic> json) =>
    _$TransactionFromJson(json);
}

@freezed
class ChatMessage with _$ChatMessage {
  factory ChatMessage({
    required int id,
    required String userId,
    required String role,          // 'user' | 'assistant'
    required String content,
    Map<String, dynamic>? metadata,
    required String createdAt,
  }) = _ChatMessage;

  factory ChatMessage.fromJson(Map<String, dynamic> json) =>
    _$ChatMessageFromJson(json);
}
```

### 인증 흐름

```
앱 시작
  → supabase_flutter 초기화
  → 저장된 세션 확인
  → 있으면 → 메인 화면 (go_router redirect)
  → 없으면 → 로그인 화면
       → Google/Kakao OAuth
       → 딥링크 콜백 (com.fastsaas02.app://auth/callback)
       → 세션 저장 → 메인 화면
```

## 4. 에러 핸들링

```dart
class ApiInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    switch (err.response?.statusCode) {
      case 401:  // 토큰 만료 → Supabase 세션 리프레시
      case 403:  // 권한 없음 → 로그인 화면으로
      case 500:  // 서버 에러 → 사용자 안내
    }
  }
}
```

- 네트워크 에러: 오프라인 안내 스낵바
- 인증 에러: 토큰 리프레시 → 실패 시 로그아웃
- API 에러: 서버 에러 메시지를 사용자 친화적으로 변환
- Overlay 에러: 권한 미허용 시 설정 화면 안내

## 5. 테스트 전략

| 레벨 | 대상 | 도구 |
|------|------|------|
| Unit | Provider 로직, API 클라이언트, 데이터 모델 | `flutter_test` + `mocktail` |
| Widget | 각 페이지 UI, 공용 위젯 | `flutter_test` |
| Integration | 인증 플로우, 거래 기록 플로우 | `integration_test` |

## 6. 마이그레이션 순서

```
Phase 1: 기반 구축
  ├── Flutter 프로젝트 생성 + 패키지 설정
  ├── 테마 (Material 3) + 라우팅 (go_router)
  ├── Supabase 인증 연동
  └── Dio API 클라이언트 + 데이터 모델

Phase 2: 핵심 페이지 마이그레이션
  ├── 로그인 페이지
  ├── 수입/지출 기록 페이지
  ├── 캘린더 페이지
  ├── 통계 페이지
  └── AI 채팅 페이지

Phase 3: 네이티브 기능
  ├── 카메라/갤러리 연동
  ├── Foreground Service (Android)
  └── Floating Overlay (Android)

Phase 4: 마무리
  ├── 웹 빌드 설정 (Flutter Web)
  ├── iOS 빌드 & 테스트
  └── 기존 React frontend/ 폐기 결정
```

- Phase 1~2 완료 시 기존 React 앱과 동일한 기능을 Flutter로 사용 가능
- Phase 3은 Flutter 전환의 핵심 가치 — 네이티브 기능 추가
- Phase 4에서 기존 `frontend/` 디렉토리 제거 여부 결정
- 기존 `frontend/`는 Flutter Web이 안정적으로 동작할 때까지 웹 배포용으로 유지
