export const site = {
  brand: '쉬운AI가계부',
  tagline: '자연어로 대화하듯 기록하는 AI 가계부',
  subTagline: '영수증도, 엑셀도 필요 없어요. 한국어로 말만 하면 AI가 알아서 분류합니다.',
  description: '자연어로 대화하듯 기록하는 AI 가계부. 한국어로 거래를 말하면 AI가 자동으로 분류하고 리포트를 만들어 드립니다.',
  contactEmail: 'hello@fastsaas.example',
} as const;

export const features = [
  {
    icon: 'MessageSquareText',
    title: '자연어 입력',
    body: '"어제 점심 12000원 썼어" 한 문장이면 끝. AI가 카테고리, 금액, 날짜를 자동으로 추출합니다.',
  },
  {
    icon: 'BarChart3',
    title: '자동 리포트',
    body: '월별·카테고리별 지출 분석을 AI가 대신 정리해 드립니다. 이상 지출 패턴도 알려드려요.',
  },
  {
    icon: 'Search',
    title: '대화형 검색',
    body: '"지난달 식비 얼마 썼지?" 처럼 대화로 묻기만 하세요. 클릭 없이 답을 받습니다.',
  },
] as const;

export const waitlistCopy = {
  heading: '가장 먼저 사용해보세요',
  sub: '정식 출시되면 이메일로 알려드릴게요.',
  placeholder: 'you@example.com',
  cta: '알림 받기',
  success: '등록 완료! 출시되면 알려드릴게요.',
  already: '이미 등록된 이메일이에요.',
  error: '잠시 후 다시 시도해 주세요.',
  invalid: '올바른 이메일 형식이 아니에요.',
} as const;

export const downloadCopy = {
  androidPending: '출시 예정',
  iosPending: '출시 예정',
  note: '현재 스토어 심사 진행 중입니다.',
} as const;
