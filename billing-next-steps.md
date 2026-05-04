# Billing Next Steps

- Play Console에서 `easy_ai_budget_premium_monthly` 구독 상품과 base plan을 생성해야 함.
- Android internal test 트랙에 앱을 배포하고 라이선스 테스트 계정을 등록해야 함.
- Cloudflare Worker 환경 변수/secret을 설정해야 함:
  - `GOOGLE_PLAY_PACKAGE_NAME`
  - `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY`
  - `GOOGLE_PUBSUB_PUSH_AUDIENCE`
  - `GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL`
- Google Pub/Sub push subscription을 만들고 RTDN을 `/billing/google-play/rtdn`으로 연결해야 함.
- Pub/Sub push subscription에는 OIDC 인증을 켜고, 위 audience/service account 값과 맞춰야 함.
- 실기기에서 신규 구독, 갱신, 취소, 만료, 복원 시나리오를 모두 확인해야 함.
- 현재 premium 혜택은 광고 제거 중심이므로, 추가 premium 기능이 있으면 `billingPlanProvider` 기준으로 연결해야 함.
