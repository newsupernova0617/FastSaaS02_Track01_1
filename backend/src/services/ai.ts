import type { TransactionAction } from '../types/ai';
import type { Transaction } from '../db/schema';
import { validateAIResponse } from './validation';

const SYSTEM_PROMPT = `You are a budget transaction assistant. Users write in natural language (Korean),
and you extract/modify financial transactions or request financial analysis.

Always respond with valid JSON. No explanations, no markdown.

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
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'llama-3.1-8b-instant') {
    this.apiKey = apiKey;
    this.modelName = modelName;
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
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: contextMessage },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Groq API error: ${response.status} ${JSON.stringify(err)}`);
      }

      const data = await response.json() as { choices: { message: { content: string } }[] };
      const responseText = data.choices[0]?.message?.content;
      if (!responseText) throw new Error('No response from AI');

      const parsed = JSON.parse(responseText);
      return validateAIResponse(parsed);
    } catch (error) {
      console.error('AI model API error:', error);
      throw new Error('Failed to process request. Please try again.');
    }
  }
}

export function createAIService(apiKey: string): AIService {
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  return new AIService(apiKey);
}
