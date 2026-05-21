export const APP_CATEGORY_NAMES = [
  '식비',
  '교통',
  '쇼핑',
  '의료',
  '문화여가',
  '월세',
  '월급',
  '부업',
  '용돈',
  '기타',
] as const;

export const LEGACY_CATEGORY_NAMES = [
  'food',
  'transport',
  'work',
  'shopping',
  'entertainment',
  'utilities',
  'medicine',
  'other',
] as const;

const LEGACY_TO_APP_CATEGORY: Record<string, string> = {
  food: '식비',
  transport: '교통',
  work: '월급',
  shopping: '쇼핑',
  entertainment: '문화여가',
  utilities: '월세',
  medicine: '의료',
  other: '기타',
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  식비: [
    '음식',
    '음식점',
    '식사',
    '밥',
    '아침',
    '점심',
    '저녁',
    '야식',
    '간식',
    '외식',
    '커피',
    '카페',
    '스타벅스',
    '편의점',
    '마트',
    '배달',
    '배민',
    '요기요',
    '쿠팡이츠',
    'dining',
    'meal',
    'restaurant',
    'coffee',
    'cafe',
    'grocery',
    'groceries',
  ],
  교통: [
    '버스',
    '지하철',
    '택시',
    '기차',
    'ktx',
    '주유',
    '기름',
    '주차',
    '톨비',
    'transportation',
    'bus',
    'subway',
    'taxi',
    'fuel',
    'parking',
  ],
  쇼핑: [
    '구매',
    '옷',
    '의류',
    '신발',
    '가방',
    '화장품',
    '쿠팡',
    '온라인쇼핑',
    '다이소',
    'clothes',
    'clothing',
    'fashion',
  ],
  의료: [
    '병원',
    '약국',
    '약',
    '진료',
    '치료',
    '치과',
    'medical',
    'hospital',
    'pharmacy',
    'healthcare',
  ],
  문화여가: [
    '문화',
    '여가',
    '영화',
    '공연',
    '콘서트',
    '게임',
    '구독',
    '넷플릭스',
    '유튜브',
    '헬스',
    '운동',
    '여행',
    'leisure',
    'movie',
    'game',
    'subscription',
    'fitness',
    'travel',
  ],
  월세: [
    '관리비',
    '공과금',
    '전기세',
    '전기',
    '수도세',
    '수도',
    '가스비',
    '가스',
    '통신비',
    '인터넷',
    'rent',
    'utility',
    'housing',
  ],
  월급: ['급여', '연봉', 'salary', 'paycheck'],
  부업: ['알바', '아르바이트', '프리랜서', '외주', 'side job', 'sidejob', 'freelance', 'part-time', 'part time'],
  용돈: ['allowance', 'pocket money'],
  기타: ['etc', 'misc', 'miscellaneous'],
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function toAppCategory(category: string): string {
  const trimmed = category.trim();
  const lower = trimmed.toLowerCase();

  if ((APP_CATEGORY_NAMES as readonly string[]).includes(trimmed)) {
    return trimmed;
  }

  if (LEGACY_TO_APP_CATEGORY[lower]) {
    return LEGACY_TO_APP_CATEGORY[lower];
  }

  for (const [appCategory, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === lower)) {
      return appCategory;
    }
  }

  return trimmed;
}

export function buildCategoryPromptList(userCategories: string[]): string[] {
  const customCategories = userCategories
    .map((category) => category.trim())
    .filter((category) => {
      const canonical = toAppCategory(category);
      return category && canonical === category && !(APP_CATEGORY_NAMES as readonly string[]).includes(category);
    });

  return unique([...APP_CATEGORY_NAMES, ...customCategories]);
}

export function extractCategoryFromText(text: string): string | undefined {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  for (const category of APP_CATEGORY_NAMES) {
    if (trimmed === category || lower.includes(category.toLowerCase())) {
      return category;
    }
  }

  for (const category of LEGACY_CATEGORY_NAMES) {
    const legacy = category.toLowerCase();
    if (lower === legacy || lower.includes(legacy)) {
      return category;
    }
  }

  for (const [appCategory, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((alias) => lower.includes(alias.toLowerCase()))) {
      return appCategory;
    }
  }

  return undefined;
}

export const CATEGORY_PROMPT_GUIDE = `Category mapping (use broad app categories, not merchant/item names):
- 식비: meals, restaurants, coffee/cafes, delivery, groceries, convenience-store food
- 교통: bus, subway, taxi, train, fuel, parking
- 쇼핑: clothes, goods, cosmetics, online shopping
- 의료: hospital, pharmacy, medicine, dental, healthcare
- 문화여가: movies, games, subscriptions, fitness, travel, leisure
- 월세: rent, utilities, housing-related bills
- 월급: salary/paycheck
- 부업: side job, freelance, part-time income
- 용돈: allowance/pocket money
- 기타: only when none of the above fits
Do not create narrow categories like "커피" or "스타벅스"; put those in memo and use 식비.`;
