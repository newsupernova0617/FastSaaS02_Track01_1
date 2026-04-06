import type { TransactionAction } from '../types/ai';
import type { Transaction } from '../db/schema';
import { validateAIResponse } from './validation';
<<<<<<< HEAD
import { callLLM, type LLMConfig } from './llm';

const SYSTEM_PROMPT = `You are a budget transaction assistant. Users write in natural language (Korean),
and you extract/modify financial transactions or request financial analysis.

Always respond with valid JSON. No explanations, no markdown.
=======

const SYSTEM_PROMPT = `You are a financial assistant.;
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a

Payload schemas for each type:

1. CREATE: User records a new transaction
   {"type":"create","payload":{"transactionType":"expense","amount":12000,"category":"food","memo":"lunch","date":"YYYY-MM-DD"},"confidence":0.95}
   - transactionType MUST be exactly "income" or "expense" (English, lowercase)
   - Infer from context: spent/bought/paid → "expense", earned/received/salary → "income"
   - amount: positive integer (Korean Won, no commas)
   - category: one of food, transport, work, shopping, entertainment, utilities, medicine, other
   - memo: short description (optional, omit if not provided)
   - date: YYYY-MM-DD, use today if not specified

2. UPDATE: User modifies an existing transaction
   {"type":"update","payload":{"id":123,"amount":15000,"category":"food"},"confidence":0.9}
   - id: transaction ID from recent transactions context
   - Only include fields that change; transactionType must be "income" or "expense" if provided

3. READ: User asks to view transactions
   {"type":"read","payload":{"month":"YYYY-MM","category":"food","type":"expense"},"confidence":0.9}
   - All fields optional; month format YYYY-MM

4. DELETE: User removes a transaction
   {"type":"delete","payload":{"id":123},"confidence":0.9}
   - id: transaction ID from recent transactions context

5. REPORT: User asks for financial analysis or summary
   {"type":"report","payload":{"reportType":"monthly_summary","params":{"month":"YYYY-MM"}},"confidence":0.9}
   - reportType: one of monthly_summary, category_detail, spending_pattern, anomaly, suggestion
   - params: {month: "YYYY-MM"} or {category: "food"} if specified

Rules:
- For currency, assume Korean Won (원)
- If date is not specified, use today's date (YYYY-MM-DD format)
- For UPDATE/DELETE, match transaction details to user's recent transactions if ID is ambiguous
- Be strict about amounts—don't guess or round

Only return valid JSON. No explanations.`;

export class AIService {
<<<<<<< HEAD
  private config: LLMConfig;
  private ai?: any;

  constructor(config: LLMConfig, ai?: any) {
    this.config = config;
    this.ai = ai;
=======
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'llama-3.1-8b-instant') {
    this.apiKey = apiKey;
    this.modelName = modelName;
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
  }

  async parseUserInput(
    userText: string,
    recentTransactions: Transaction[],
    userCategories: string[]
  ): Promise<TransactionAction> {
    const recentTxsFormatted = recentTransactions
      .map(
        (t) =>
          `- ${t.date}: ${t.type === 'income' ? '수입' : '지출'} ₩${t.amount} (${t.category}) - ${t.memo || 'no memo'}`
      )
      .join('\n');

    const contextMessage = `User said: "${userText}"

Recent transactions (for context):
${recentTxsFormatted || '(none)'}

User's categories: ${userCategories.join(', ') || '(none)'}`;

    try {
<<<<<<< HEAD
      const responseText = await callLLM(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: contextMessage },
        ],
        this.config,
        this.ai
      );

      const parsed = JSON.parse(responseText);
      return validateAIResponse(parsed);
    } catch (error) {
      console.error('AI model API error:', error);
=======
      // 디버깅용 로그
      const apiKeyMasked = this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NOT_SET';
      console.log('[Groq API] Request params:', {
        apiKey: apiKeyMasked,
        model: this.modelName,
        userTextLength: userText.length,
        recentTxsCount: recentTransactions.length,
        userCategoriesCount: userCategories.length,
      });

      const requestBody = {
        model: this.modelName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: contextMessage },
        ],
      };

      console.log('[Groq API] Request body model:', requestBody.model);
      console.log('[Groq API] Messages count:', requestBody.messages.length);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      };

      console.log('[Groq API] Request headers:', {
        'Content-Type': headers['Content-Type'],
        'Authorization_format': `Bearer {56-char-key}`,
        'apiKey_chars': {
          first20: this.apiKey.substring(0, 20),
          last20: this.apiKey.substring(Math.max(0, this.apiKey.length - 20)),
        },
      });

      console.log('[Groq API] Full request body:', {
        model: requestBody.model,
        messagesCount: requestBody.messages.length,
        messageRoles: requestBody.messages.map((m: any) => m.role),
        firstMessageContentLength: requestBody.messages[0]?.content.length,
        secondMessageContentLength: requestBody.messages[1]?.content.length,
      });

      const bodyString = JSON.stringify(requestBody);
      console.log('[Groq API] Request body size:', bodyString.length, 'bytes');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers,
        body: bodyString,
      });

      console.log('[Groq API] Response status:', response.status);
      console.log('[Groq API] Response headers:', {
        'content-type': response.headers.get('content-type'),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('[Groq API] Error details:', {
          status: response.status,
          statusText: response.statusText,
          error: err,
        });
        throw new Error(`Groq API error: ${response.status} ${JSON.stringify(err)}`);
      }

      const data = await response.json() as { choices: { message: { content: string } }[] };
      const responseText = data.choices[0]?.message?.content;
      if (!responseText) throw new Error('No response from AI');

      console.log('[Groq API] Successfully parsed response');
      const parsed = JSON.parse(responseText);
      return validateAIResponse(parsed);
    } catch (error) {
      console.error('[Groq API] Caught error:', error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      } : error);
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
      throw new Error('Failed to process request. Please try again.');
    }
  }
}

<<<<<<< HEAD
export function createAIService(config: LLMConfig): AIService {
  return new AIService(config);
}
=======
export function createAIService(apiKey: string): AIService {
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  return new AIService(apiKey);
}
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
