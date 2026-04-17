# Flutter 코드 읽기 가이드

> 이 문서는 Flutter 코드베이스를 처음 파악할 때 어떤 순서로 읽으면 좋은지 안내합니다.
> 각 파일 상단에 한국어 주석이 있으니 함께 참고하세요.

---

## 1단계: 앱이 어떻게 시작되는지

| 순서 | 파일 | 설명 |
|------|------|------|
| 1 | `lib/main.dart` | 앱 시작점. 초기화 순서 파악 |
| 2 | `lib/app.dart` | ProviderScope, MaterialApp 구조 |
| 3 | `lib/routes/app_router.dart` | 전체 화면 구조 + 로그인 리다이렉트 로직 |

## 2단계: 설정값과 테마

| 순서 | 파일 | 설명 |
|------|------|------|
| 4 | `lib/core/constants/app_constants.dart` | API URL, 타임아웃 등 |
| 5 | `lib/core/constants/categories.dart` | 지출/수입 카테고리 목록 |
| 6 | `lib/core/theme/app_theme.dart` | 색상, 폰트, 버튼 테마 정의 |

## 3단계: 인증 흐름 (로그인 → 토큰)

| 순서 | 파일 | 설명 |
|------|------|------|
| 7 | `lib/core/auth/supabase_auth.dart` | 인증 서비스 본체 (싱글톤) |
| 8 | `lib/shared/providers/auth_provider.dart` | 인증 상태 provider들 |
| 9 | `lib/features/auth/login_page.dart` | 로그인 화면 UI (Google/Kakao OAuth) |

## 4단계: 서버 통신 구조 (가장 중요)

| 순서 | 파일 | 설명 |
|------|------|------|
| 10 | `lib/core/api/api_interceptor.dart` | JWT 자동 첨부 + 401 토큰 갱신 |
| 11 | `lib/shared/providers/api_provider.dart` | Dio + ApiClient 생성/제공 |
| 12 | `lib/core/api/api_client.dart` | 모든 API 호출 메서드 모음 |

## 5단계: 데이터 모델 (간단히 훑기)

| 순서 | 파일 | 설명 |
|------|------|------|
| 13 | `lib/shared/models/transaction.dart` | 수입/지출 거래 |
| 14 | `lib/shared/models/chat_message.dart` | 채팅 메시지 |
| 15 | `lib/shared/models/summary_row.dart` | 월별 카테고리 요약 |
| 16 | `lib/shared/models/report.dart` | AI 리포트 |
| 17 | `lib/shared/models/ai_action_response.dart` | 레거시 AI 응답 |

## 6단계: 메인 화면들 (하단탭 순서대로)

| 순서 | 파일 | 설명 |
|------|------|------|
| 18 | `lib/shared/widgets/bottom_nav_shell.dart` | 하단 네비게이션 껍데기 |
| 19 | `lib/shared/providers/transaction_provider.dart` | 거래 CRUD provider |
| 20 | `lib/features/record/record_page.dart` | 탭1: 거래 입력 폼 |
| 21 | `lib/features/calendar/calendar_page.dart` | 탭2: 달력 + 거래 목록 |
| 22 | `lib/features/stats/stats_page.dart` | 탭3: 통계 + 리포트 탭 |

## 7단계: 채팅 기능 (핵심 기능)

| 순서 | 파일 | 설명 |
|------|------|------|
| 23 | `lib/features/chat/providers/session_provider.dart` | 세션 CRUD + 활성 세션 |
| 24 | `lib/shared/providers/chat_provider.dart` | 메시지 조회/전송 |
| 25 | `lib/features/chat/screens/chat_screen.dart` | 탭4: 세션 기반 채팅 화면 |
| 26 | `lib/features/chat/widgets/session_sidebar.dart` | 세션 목록 사이드바 |

## 8단계: AI 채팅 위젯 (채팅 내부 구성요소)

| 순서 | 파일 | 설명 |
|------|------|------|
| 27 | `lib/features/ai_chat/widgets/chat_bubble.dart` | 말풍선 (사용자/AI) |
| 28 | `lib/features/ai_chat/widgets/chat_input.dart` | 메시지 입력창 |
| 29 | `lib/features/ai_chat/widgets/action_button.dart` | AI 응답 액션 버튼 |
| 30 | `lib/features/ai_chat/widgets/report_card.dart` | 리포트 카드 위젯 |
| 31 | `lib/features/ai_chat/widgets/report_chart.dart` | 리포트 차트 위젯 |

## 9단계: 나머지 (필요할 때 참고)

| 순서 | 파일 | 설명 |
|------|------|------|
| 32 | `lib/features/reports/report_detail_page.dart` | 리포트 상세 화면 |
| 33 | `lib/features/reports/report_list_item.dart` | 리포트 목록 항목 |
| 34 | `lib/features/reports/widgets/report_name_dialog.dart` | 리포트 이름 다이얼로그 |
| 35 | `lib/features/ai_chat/ai_chat_page.dart` | 레거시 AI 채팅 (세션 없는 버전) |
| 36 | `lib/shared/providers/ai_chat_provider.dart` | 레거시 AI 채팅 provider |
| 37 | `lib/shared/providers/report_provider.dart` | 리포트 CRUD provider |
| 38 | `lib/shared/widgets/user_profile_button.dart` | AppBar 프로필 버튼 |
| 39 | `lib/shared/widgets/user_profile_sheet.dart` | 프로필 바텀시트 |
| 40 | `lib/native/foreground_service/foreground_service_manager.dart` | Android 포그라운드 서비스 |
| 41 | `lib/native/foreground_service/quick_entry_main.dart` | 빠른입력 헤드리스 엔트리포인트 |
| 42 | `lib/native/foreground_service/quick_entry_handler.dart` | 빠른입력 처리 로직 |
| 43 | `lib/native/overlay/overlay_service.dart` | 플로팅 오버레이 |
| 44 | `lib/core/storage/native_shared_prefs.dart` | Flutter↔Android 데이터 공유 |
| 45 | `lib/core/logger/logger.dart` | 로거 유틸리티 |
| 46 | `lib/core/logger/network_logger.dart` | HTTP 요청/응답 로거 |

---

## 이해도 체크포인트

- **1~3번 읽은 후**: "앱이 시작되면 뭐가 초기화되고, 어떤 화면들이 있는지" 알게 됨
- **7~9번 읽은 후**: "로그인이 어떻게 동작하는지" 알게 됨
- **10~12번 읽은 후**: "서버와 어떻게 통신하는지, 토큰은 어떻게 관리되는지" 알게 됨 (핵심!)
- **18~22번 읽은 후**: "메인 화면 4개가 각각 무슨 일을 하는지" 알게 됨
- **23~26번 읽은 후**: "AI 채팅이 어떻게 동작하는지" 알게 됨

> **팁**: 1~12번(1~4단계)을 이해하면 앱의 뼈대가 잡히고, 26번까지 보면 전체 기능이 파악됩니다.
> 8~9단계는 세부 위젯이라 수정이 필요할 때 참고하면 됩니다.
