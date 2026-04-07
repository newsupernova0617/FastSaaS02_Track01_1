import type { TransactionAction } from '../types/ai';
import type { Transaction } from '../db/schema';
import { validateAIResponse } from './validation';
import { callLLM, type LLMConfig } from './llm';

const SYSTEM_PROMPT = `You are a budget transaction assistant. Users write in natural language (Korean),
and you extract/modify financial transactions or request financial analysis.

CRITICAL: Return ONLY a valid JSON object. Do not wrap the JSON in quotes. Do not return JSON as a string.
Output must be parseable by JSON.parse(). No explanations, no markdown, no extra text.

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
  private config: LLMConfig;
  private ai?: any;

  constructor(config: LLMConfig, ai?: any) {
    this.config = config;
    this.ai = ai;
  }

  async parseUserInput(
    userText: string,
    recentTransactions: Transaction[],
    userCategories: string[],
    userId?: string,
    contextService?: any,
    db?: any
  ): Promise<TransactionAction> {
    const recentTxsFormatted = recentTransactions
      .map(
        (t) =>
          `- [id:${t.id}] ${t.date}: ${t.type === 'income' ? '수입' : '지출'} ₩${t.amount} (${t.category}) - ${t.memo || 'no memo'}`
      )
      .join('\n');

    const baseContextMessage = `User said: "${userText}"

Recent transactions (for context):
${recentTxsFormatted || '(none)'}

User's categories: ${userCategories.join(', ') || '(none)'}`;

    try {
      // First, determine the action type
      const actionDeterminationResponse = await callLLM(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: baseContextMessage },
        ],
        this.config,
        this.ai
      );

      const jsonMatch = actionDeterminationResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      const actionResult = JSON.parse(jsonMatch[0]);
      const actionType = actionResult.type;

      // Get context for the determined action type if all dependencies available
      let contextData = null;
      if (contextService && userId && db) {
        try {
          contextData = await contextService.getContextForAction(db, userId, actionType, userText);
        } catch (error) {
          console.error('Failed to fetch context:', error);
          // Continue without context on error (graceful fallback)
        }
      }

      // Build messages array with context if available
      const messages: any[] = [
        { role: 'system', content: SYSTEM_PROMPT },
      ];

      // Add context as a separate system message if available
      if (contextData?.formatted) {
        messages.push({
          role: 'system',
          content: contextData.formatted,
        });
      }

      messages.push({
        role: 'user',
        content: baseContextMessage,
      });

      // Make LLM call with context-enhanced messages
      const responseText = await callLLM(
        messages,
        this.config,
        this.ai
      );

      // Extract first JSON object from response (model may return extra text)
      const finalJsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!finalJsonMatch) throw new Error('No JSON found in response');
      const parsed = JSON.parse(finalJsonMatch[0]);

      // Ensure confidence field is present (some models may not include it)
      if (!parsed.confidence) {
        parsed.confidence = 0.9;
      }

      return validateAIResponse(parsed);
    } catch (error) {
      console.error('AI model API error:', error);
      throw new Error('Failed to process request. Please try again.');
    }
  }
}

export function createAIService(config: LLMConfig, ai?: any): AIService {
  return new AIService(config, ai);
}
