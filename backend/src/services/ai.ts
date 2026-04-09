import type { TransactionAction } from '../types/ai';
import type { Transaction } from '../db/schema';
import { validateAIResponse } from './validation';
import { callLLM, type LLMConfig } from './llm';

function getSystemPrompt(userCategories: string[]): string {
  const categoryList = userCategories.length > 0
    ? userCategories.join(', ')
    : 'food, transport, work, shopping, entertainment, utilities, medicine, other';

  return `You are a budget transaction assistant. Users write in natural language (Korean),
and you extract/modify financial transactions or request financial analysis.

CRITICAL: Return ONLY a valid JSON object. Do not wrap the JSON in quotes. Do not return JSON as a string.
Output must be parseable by JSON.parse(). No explanations, no markdown, no extra text.

Payload schemas for each type:

1. CREATE: User records a new transaction or multiple transactions
   Single:
   {"type":"create","payload":{"transactionType":"expense","amount":12000,"category":"식비","memo":"lunch","date":"YYYY-MM-DD"},"confidence":0.95}
   Multiple:
   {"type":"create","payload":{"items":[{"transactionType":"expense","amount":12000,"category":"식비","date":"YYYY-MM-DD"},{"transactionType":"income","amount":50000,"category":"월급","date":"YYYY-MM-DD"}]},"confidence":0.9}
   - transactionType MUST be exactly "income" or "expense" (English, lowercase)
   - Infer from context: spent/bought/paid → "expense", earned/received/salary → "income"
   - amount: positive integer (Korean Won, no commas)
   - category: one of ${categoryList} (use EXACT category name from user's existing categories)
   - memo: short description (optional, omit if not provided)
   - date: YYYY-MM-DD, use today if not specified

2. UPDATE: User modifies one or more existing transactions
   Single:
   {"type":"update","payload":{"id":123,"amount":15000,"category":"식비"},"confidence":0.9}
   Multiple:
   {"type":"update","payload":{"updates":[{"id":123,"amount":15000},{"id":124,"category":"식비"}]},"confidence":0.9}
   - id: transaction ID from recent transactions context (for single update)
   - updates: array of updates with id + fields to change (for multiple updates)
   - Only include fields that change; transactionType must be "income" or "expense" if provided

3. READ: User asks to view transactions
   {"type":"read","payload":{"month":"YYYY-MM","category":"식비","type":"expense"},"confidence":0.9}
   - All fields optional; month format YYYY-MM

4. DELETE: User removes one or more transactions
   Single:
   {"type":"delete","payload":{"id":123},"confidence":0.9}
   Multiple:
   {"type":"delete","payload":{"items":[123,124,125]},"confidence":0.9}
   - id: single transaction ID from recent transactions context
   - items: array of transaction IDs when deleting multiple transactions (e.g., "delete all on this date")

5. REPORT: User asks for financial analysis or summary
   {"type":"report","payload":{"reportType":"monthly_summary","params":{"month":"YYYY-MM"}},"confidence":0.9}
   - reportType: one of monthly_summary, category_detail, spending_pattern, anomaly, suggestion
   - params: {month: "YYYY-MM"} or {category: "식비"} if specified

6. CLARIFY: User input is ambiguous or missing critical fields (confidence < 0.7)
   {"type":"clarify","payload":{"message":"커피를 찾았어요! 얼마를 썼나요?","missingFields":["amount"],"partialData":{"transactionType":"expense","category":"식비","memo":"커피"},"confidence":0.65}
   - message: natural Korean question asking for the missing field(s)
   - missingFields: array of field names user needs to provide (e.g., ["amount"], ["category"], ["amount","category"])
   - partialData: object with fields already extracted (transactionType, category, memo, date, amount - only include what you extracted)
   - confidence: 0.3-0.7 (indicating uncertainty that requires clarification)

7. PLAIN_TEXT: User sends non-financial messages (greetings, casual chat, etc.)
   {"type":"plain_text","payload":{},"confidence":0.95}
   - For ANY message that is NOT related to expense management
   - For greetings like "안녕", "hi", casual chat
   - For off-topic questions not about finances
   - Set confidence to 0.95 (very certain this is a plain text message)

8. UNDO: User wants to reverse the most recent create, update, or delete action
   {"type":"undo","payload":{"targetActionType":"delete"},"confidence":0.92}
   {"type":"undo","payload":{"targetActionType":"create"},"confidence":0.90}
   {"type":"undo","payload":{"targetActionType":"update"},"confidence":0.88}
   - targetActionType: what kind of action to reverse
     - "delete" → user says "그 거래 되돌려줘", "삭제 취소", "복원해줘"
     - "create" → user says "방금 추가한 거 없애줘", "그 거래 취소해줘" (after just creating)
     - "update" → user says "아까 수정한 거 되돌려줘", "원래대로 해줘"
   - hint: (optional) any identifying detail the user mentions, e.g. "커피", "5000원"
   - Only return UNDO when context clearly indicates reversal of a prior AI action
   - Do NOT return UNDO for a fresh delete request — use DELETE instead

Rules:
- For currency, assume Korean Won (원)
- If date is not specified, use today's date (YYYY-MM-DD format)
- For UPDATE/DELETE, match transaction details to user's recent transactions if ID is ambiguous
- Be strict about amounts—don't guess or round
- For DELETE operations: If you're not 100% certain which transaction to delete, use a LOW confidence score (0.1-0.3)
- For DELETE operations: If deleting multiple transactions, verify the action is clear from context (e.g., "4월 7일 모든 거래 삭제")
- For PLAIN_TEXT: If the message could be financial-related OR casual, prefer financial action with lower confidence (0.5-0.7)

Confidence Score Guidelines:
- 0.95+: Very certain about the interpretation and action (CREATE/DELETE/READ with all clear data)
- 0.7-0.9: Reasonably confident (most CREATE/UPDATE with inferred data)
- 0.3-0.7: Uncertain—return CLARIFY action and ask for missing field(s)
- 0.1-0.3: Very uncertain—use CLARIFY with lower confidence (0.2-0.3)

Decision Tree:
1. Is the user asking to undo/reverse a recent action? → UNDO
2. Can you extract all required fields (transactionType, amount, category) with high confidence (≥0.7)? → CREATE/UPDATE/DELETE
3. Is this clearly a non-financial message? → PLAIN_TEXT
4. Is the message financial but missing fields or ambiguous? → CLARIFY with message asking for missing data
5. Is the user asking for analysis or reports? → REPORT

Only return valid JSON. No explanations.`;
}

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
    userId: string,
    contextService: any,
    db: any
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
      // Get dynamic system prompt with user's actual categories
      const systemPrompt = getSystemPrompt(userCategories);

      // First, determine the action type
      const actionDeterminationResponse = await callLLM(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: baseContextMessage },
        ],
        this.config,
        this.ai
      );

      const jsonMatch = actionDeterminationResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      const actionResult = JSON.parse(jsonMatch[0]);
      const actionType = actionResult.type;

      // Get context for the determined action type
      let contextData = null;
      try {
        contextData = await contextService.getContextForAction(db, userId, actionType, userText);
      } catch (error) {
        console.error('Failed to fetch context:', error);
        // Continue without context on error (graceful fallback)
      }

      // Build messages array with context if available
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
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
