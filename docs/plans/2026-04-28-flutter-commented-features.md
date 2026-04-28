# Flutter 앱 주석화/비활성 기능 정리

- 작성 시각: 2026-04-28 17:32:47 KST
- 기준 경로: `flutter_app/lib`
- 목적: 현재 코드베이스에 남아 있는 주석화된 기능, 롤백용 보존 코드, 사용자 노출은 막혀 있지만 코드상 남아 있는 기능을 한 곳에 정리

## 1. 설정 화면에서 주석화한 기능

### 실험적 AI UI 설정 토글
- 파일: `flutter_app/lib/features/settings/settings_page.dart`
- 상태: 사용자 화면에서 주석 처리
- 원래 기능:
  - `AI 기능` 섹션 노출
  - `실험적 AI 기능 UI 사용` 스위치
  - `aiFeatureUiProvider`로 중앙 AI 버튼/확장 UI 토글
- 현재 판단:
  - 사용자 설정 화면에서는 숨기고, 내부 플래그와 코드 경로는 유지

### 설정의 이전 UI 복구 안내
- 파일: `flutter_app/lib/features/settings/settings_page.dart`
- 상태: 사용자 화면에서 주석 처리
- 원래 기능:
  - `복구` 섹션 노출
  - `이전 UI 복구` 안내 카드 표시
  - `flutter_app\tool\restore_legacy_ui.ps1` 실행 경로 안내
- 현재 판단:
  - 운영 사용자에게는 불필요한 개발자용 안내라서 화면에서는 숨기고, 복구용 코드와 문구는 그대로 보존

## 2. 주석화되어 남아 있는 기능

### 도움말의 추가 안내 섹션
- 파일: `flutter_app/lib/features/help/help_page.dart`
- 상태: UI 전체가 주석 처리
- 내용:
  - 개인정보 처리방침 링크
  - 문의하기로 이동
  - 설정으로 돌아가기
- 비고:
  - `_LinkTile` 위젯은 보존 중

### 홈의 AI Insight 섹션
- 파일: `flutter_app/lib/features/home/home_page.dart`
- 상태: `currently hidden; kept for quick rollback`
- 내용:
  - 예전 AI 인사이트 섹션 코드가 숨겨진 채 보존됨
- 비고:
  - 빠른 롤백용으로 남아 있음

### 홈의 Legacy read-result UI
- 파일: `flutter_app/lib/features/home/home_page.dart`
- 상태: `Preserved for rollback/reference`
- 내용:
  - 예전 홈 읽기 결과 UI 보존

### 채팅의 Legacy read-result UI
- 파일: `flutter_app/lib/features/chat/screens/chat_screen.dart`
- 상태: `Preserved for rollback/reference`
- 내용:
  - 예전 채팅 읽기 결과 UI 보존

### AI 검색 결과의 Legacy query pill
- 파일: `flutter_app/lib/shared/widgets/ai_search_result_card.dart`
- 상태: `kept for rollback/reference only`
- 내용:
  - 예전 쿼리 pill 관련 코드/위젯 보존

## 3. 비활성 또는 준비 중인 기능

### 카카오 로그인
- 파일: `flutter_app/lib/features/auth/login_page.dart`
- 상태: 버튼은 있으나 동작은 비활성
- 현재 동작:
  - 탭 시 `카카오 로그인은 준비 중입니다.` 메시지 표시

### 개인정보 처리방침 화면
- 파일: `flutter_app/lib/features/settings/settings_page.dart`
- 상태: 메뉴는 있으나 실제 페이지 미연결
- 현재 동작:
  - 탭 시 `준비 중입니다.` 스낵바 표시

## 4. 테스트용 임시 조건

### 자동 리포트 생성 조건 완화
- 파일: `flutter_app/lib/shared/providers/auto_report_provider.dart`
- 상태: TODO 주석으로 임시 테스트 조건 유지
- 내용:
  - 주간 리포트 조건: 테스트 후 `date.weekday == DateTime.sunday`로 복원 예정
  - 월간 리포트 조건: 테스트 후 월말 체크 로직으로 복원 예정

## 5. 롤백/복구용 구조

### legacy_ui 전체 보존
- 경로: `flutter_app/lib/legacy_ui`
- 상태: 현재 활성 UI와 별도로 보존
- 목적:
  - 이전 UI 기준 복구
  - 참조 및 비교

## 6. 제외한 항목

아래는 이번 문서에서 별도 기능으로 보지 않았습니다.

- `*.freezed.dart`의 `ignore_for_file: unused_element`
  - 생성 코드 경고 억제이므로 기능 단위가 아님
- 단순 analyzer 회피용 `// ignore: unused_element`
  - 기능 보존 여부와 무관한 경우 제외
