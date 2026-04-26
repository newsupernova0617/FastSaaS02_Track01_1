# 블로그 CTA 추적 맵

## 목적

현재 랜딩과 블로그에는 클릭형 이벤트와 웨이트리스트 제출 이벤트가 이미 붙어 있다. 이 문서는 어떤 이벤트가 어디서 발생하는지, 무엇을 보면 되는지 빠르게 파악하기 위한 운영용 맵이다.

## 현재 수집 중인 주요 이벤트

### 홈 진입 관련

- `home_waitlist_click`
  - 위치: 메인 히어로의 `출시 알림 받기`
  - 파일: `frontend/src/components/Hero.astro`

- `home_features_click`
  - 위치: 메인 히어로의 `기능 자세히 보기`
  - 파일: `frontend/src/components/Hero.astro`

- `home_blog_click`
  - 위치: 메인 히어로의 `블로그 보기`
  - 파일: `frontend/src/components/Hero.astro`

### 홈 블로그 진입 관련

- `home_blog_index_click`
  - 위치: 홈의 최신 블로그 섹션에서 목록 전체 보기
  - 파일: `frontend/src/components/HomeBlogPreview.astro`

- `home_blog_card_click`
  - 위치: 홈의 최신 블로그 카드 클릭
  - 파일: `frontend/src/components/HomeBlogPreview.astro`
  - 주요 속성: `slug`

### 블로그 목록/상세 관련

- `blog_card_click`
  - 위치: `/blog` 목록 카드 클릭
  - 파일: `frontend/src/pages/blog/index.astro`
  - 주요 속성: `slug`, `category`, `source`

- `blog_related_click`
  - 위치: 블로그 상세 하단 관련 글 카드
  - 파일: `frontend/src/pages/blog/[slug].astro`
  - 주요 속성: `slug`, `source`

- `blog_cta_click`
  - 위치: 블로그 상세 하단 CTA
  - 파일: `frontend/src/components/BlogPostCta.astro`
  - 주요 속성:
    - `source=blog_post`
    - `cta=primary|secondary`
    - `label`

### 웨이트리스트 전환

- `waitlist_submit`
  - 위치: 웨이트리스트 폼 제출
  - 파일: `frontend/src/components/WaitlistForm.tsx`
  - 주요 속성:
    - `status=success|already|error`
    - `source=waitlist_form`

## 이벤트가 들어오는 경로

- 공통 브리지: `frontend/src/layouts/BaseLayout.astro`
- 동작 방식:
  - `data-track-event` 속성이 붙은 요소를 클릭하면 공통 스크립트가 이벤트를 수집
  - `window.dataLayer`가 있으면 push
  - `window.plausible`이 있으면 함께 전송
  - 브라우저에서 `fastsaas:analytics` 커스텀 이벤트도 발생

## 운영할 때 먼저 볼 것

### 1. 어떤 글이 블로그 진입을 가장 많이 받는가

우선 순위:

- `home_blog_card_click`
- `blog_card_click`
- `blog_related_click`

이 세 이벤트를 보면

- 홈에서 어떤 글이 눌리는지
- `/blog` 목록에서는 어떤 주제가 강한지
- 상세 페이지 안에서 어떤 내부링크 흐름이 만들어지는지

를 파악할 수 있다.

### 2. 어떤 글이 CTA 클릭으로 이어지는가

우선 순위:

- `blog_cta_click`
- `waitlist_submit`

핵심은 클릭 수 자체보다, 어떤 글에서 CTA 클릭이 나오고 그 다음 웨이트리스트 제출까지 이어지는지를 보는 것이다.

### 3. 어떤 CTA 문구가 더 잘 먹히는가

현재는 `blog_cta_click`에 아래 속성이 들어간다.

- `cta=primary`
- `cta=secondary`
- `label`

따라서 글마다 어떤 CTA 버튼이 더 자주 눌리는지 비교할 수 있다.

## 지금 바로 볼 수 있는 해석 기준

### 좋은 신호

- `home_blog_card_click`이 꾸준히 발생
- `blog_card_click` 대비 `blog_cta_click` 비율이 너무 낮지 않음
- `waitlist_submit status=success`가 특정 글에서 반복적으로 나옴
- `blog_related_click`이 활발해서 블로그 내 탐색이 이어짐

### 점검이 필요한 신호

- 블로그 목록 클릭은 많은데 `blog_cta_click`이 거의 없음
- 특정 글만 눌리고 나머지는 거의 반응이 없음
- `waitlist_submit status=error` 비율이 높음
- 홈에서는 클릭되는데 상세 페이지에서 이탈이 큼

## 다음 개선 후보

현재 추적만으로도 기본 분석은 가능하다. 다만 이후 필요하면 아래를 추가할 수 있다.

- `blog_toc_click`
  - 목차 클릭 분석

- `blog_scroll_depth`
  - 글을 어디까지 읽는지 측정

- `waitlist_view`
  - 클릭이 아니라 폼 노출 기준 추적

- `blog_cta_click`에 `slug` 추가
  - 어떤 글에서 CTA가 눌렸는지 더 직접적으로 파악 가능

## 실무 우선순위

1. `blog_cta_click`과 `waitlist_submit`을 먼저 본다.
2. 클릭이 잘 나오는 글 3개를 찾는다.
3. 그 글의 CTA 문구와 배치가 공통점이 있는지 본다.
4. 클릭이 적은 글은 도입부 구조와 CTA 문구를 먼저 손본다.
