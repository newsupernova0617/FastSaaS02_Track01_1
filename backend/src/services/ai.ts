import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type { TransactionAction } from '../types/ai';
import type { Transaction } from '../db/schema';
import { validateAIResponse } from './validation';

const SYSTEM_PROMPT = `You are a budget transaction assistant. Users write in natural language (Korean),
and you extract/modify financial transactions.

Always respond with valid JSON matching this schema:
{
  "type": "create" | "update" | "read" | "delete",
  "payload": { ... },
  "confidence": 0.0 - 1.0
}

Rules:
- For currency, assume Korean Won (원)
- If date is not specified, use today's date (YYYY-MM-DD format)
- For UPDATE/DELETE, match transaction details to user's recent transactions if ID is ambiguous
- Be strict about amounts—don't guess or round
- Common categories: food, transport, work, shopping, entertainment, utilities, medicine, other
- For CREATE: infer type (income/expense) from context (spent → expense, earned/received → income)
- For READ: support filters like month (YYYY-MM), category, type (income/expense)

Only return valid JSON. No explanations.`;

export class AIService {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: 'models/gemma-2-9b-it' });
  }

  async parseUserInput(
    userText: string,
    recentTransactions: Transaction[],
    userCategories: string[]
  ): Promise<TransactionAction> {
    // Build context message
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
      const result = await this.model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: contextMessage },
      ]);

      const responseText = result.response.text();

      // Try to parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch || !jsonMatch[0]) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return validateAIResponse(parsed);
    } catch (error) {
      console.error('AI model API error:', error);
      throw new Error('Failed to process request. Please try again.');
    }
  }
}

export function createAIService(apiKey: string): AIService {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY (Google AI Studio) environment variable is not set');
  }
  return new AIService(apiKey);
}
