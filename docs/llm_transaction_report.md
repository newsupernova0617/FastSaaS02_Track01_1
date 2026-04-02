# 자연어 가계부 입력 시스템 백엔드 도입 보고서

## 1. 시스템 개요
본 문서는 사용자의 자연어 입력("어제 스타벅스 5400원 지출")을 정형화된 데이터로 파싱하여 가계부(Ledger)에 등록하는 백엔드 파이프라인의 핵심 설계와 검증 시나리오를 정리한 보고서입니다.

- **목표**: 자연어 형태의 소비/수입 내역을 LLM을 통해 분석 후 데이터베이스에 삽입.
- **아키텍처 스택**: Cloudflare Workers (Runtime), Hono (API Framework), Turso (DB), Drizzle (ORM)

---

## 2. 모듈별 구현 설계

### 2.1. 신규 LLM 유틸리티 (`src/utils/llm.ts`)
Cloudflare Workers 런타임 특성상 크고 복잡한 Node.js 전용 SDK보다 내장된 표준 `fetch` 함수를 사용하여 API를 호출하는 것이 콜드 스타트 최적화 및 호환성에 유리합니다.

```typescript
// backend/src/utils/llm.ts
type ParsedTransaction = {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  memo: string;
  date: string; // YYYY-MM-DD
};

export async function parseNaturalLanguageTransaction(
  text: string,
  apiKey: string,
  currentDate: string
): Promise<ParsedTransaction | null> {
  const systemPrompt = \`
  당신은 가계부 데이터 파싱 어시스턴트입니다.
  사용자의 자연어 입력을 분석하여 지정된 JSON 형식으로만 반환하세요.
  
  [규칙]
  1. 오늘 날짜는 \${currentDate} 입니다. 상대적인 시간 표현을 정확한 YYYY-MM-DD 로 변환하세요.
  2. \`type\`은 수입이면 "income", 지출이면 "expense".
  3. \`amount\`는 구분자 없는 숫자입니다.
  4. \`category\`는 식비, 교통, 쇼핑, 문화/여가, 급여, 기타 중 하나로 지정하세요.
  5. \`memo\`는 사용처를 간단히 요약하세요.
  \`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', 
      response_format: { type: "json_object" }, 
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ]
    })
  });

  if (!response.ok) return null;

  const data = await response.json() as any;
  try {
    return JSON.parse(data.choices[0].message.content) as ParsedTransaction;
  } catch (error) {
    return null;
  }
}
```

### 2.2. 신규 API 라우터 (`src/routes/transactions.ts`)
가공된 JSON 응답값을 Drizzle ORM을 통해 Turso DB에 Insert하는 엔드포인트입니다.

```typescript
// backend/src/routes/transactions.ts
import { Hono } from 'hono';
import { db } from '../db'; 
import { transactions } from '../db/schema';
import { parseNaturalLanguageTransaction } from '../utils/llm';

type Bindings = { OPENAI_API_KEY: string };
const app = new Hono<{ Bindings: Bindings; Variables: { userId: string } }>();

app.post('/nl', async (c) => {
  try {
    const userId = c.get('userId'); 
    const { text } = await c.req.json<{ text: string }>();

    if (!text) return c.json({ error: '텍스트 누락' }, 400);

    // KST 시간대 보정 로직 (UTC + 9시간)
    const kstOffset = 9 * 60 * 60 * 1000;
    const nowKst = new Date(Date.now() + kstOffset);
    const currentDate = nowKst.toISOString().split('T')[0];
    
    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) return c.json({ error: '인증 키 누락' }, 500);

    // 파싱 및 변환
    const parsedData = await parseNaturalLanguageTransaction(text, apiKey, currentDate);
    if (!parsedData) return c.json({ error: '자연어 변환 실패' }, 422);

    // DB 삽입
    const inserted = await db.insert(transactions).values({
      userId,
      type: parsedData.type,
      amount: parsedData.amount,
      category: parsedData.category,
      memo: parsedData.memo,
      date: parsedData.date,
    }).returning(); 

    return c.json({ success: true, data: inserted[0] }, 201);
  } catch (error) {
    return c.json({ error: '서버 에러' }, 500);
  }
});

export default app;
```

---

## 3. 핵심 검증 시나리오 (Checklist)

> [!CAUTION]
> 운영 환경 배포 전 다음 검증 사항들을 필수적으로 확인해야 합니다.

1. **환경변수 매핑 검증**
   - 로컬(`.dev.vars`) 및 배포 환경(Cloudflare Secret)에 `OPENAI_API_KEY`가 올바르게 설정되어 Hono 인스턴스 `c.env`에 할당되는지 확인.
2. **타임존(KST) 및 상대 날짜 인식**
   - Cloudflare 서버 기준 시간(일반적으로 UTC)을 한국 시간(KST) 표준으로 정확히 오프셋하여 프롬프트에 제공하는지 로깅 필수. "오늘", "어제"가 엇갈리지 않도록 테스트.
3. **LLM 카테고리 환각 제어 방식**
   - 프롬프트에 명시되지 않은 모호한 카테고리 발생 여부 확인. 제약 범위를 이탈할 경우 대비책 마련 필요 (예: 매칭 불능 시 무조건 **기타** 지정 로직 등).
4. **치명적 예외처리 (금액 누락)**
   - "스타벅스 커피 삼" 처럼 금액이 누락된 문구를 입력할 시, 에러율(422 반환 등)을 확인하여 Null Insert 방지.
5. **Drizzle ORM 호환성 점검**
   - `@libsql/client` 환경에서 `returning()` 쿼리가 예상대로 JSON 형식의 등록 Row를 즉시 반환하는지 기능 점검.
