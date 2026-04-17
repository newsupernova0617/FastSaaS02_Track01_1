// ============================================================
// [DB 조작 + 보안] 명확화 세션 서비스 (Clarification)
//
// 사용자가 애매한 입력("커피 5000원")을 보냈을 때,
// AI가 추가 정보를 묻고 → 답변을 기존 데이터에 합치는 과정을 관리합니다.
//
// 흐름 예시:
//   1. 사용자: "커피 5000원" → AI: "지출인가요, 수입인가요?"
//      → saveClarification()으로 부분 데이터 저장
//   2. 사용자: "지출이요" → mergeClarificationResponse()로 합침
//      → 모든 필드가 채워지면 deleteClarification() 후 거래 생성
//
// 보안 핵심 규칙:
//   - 모든 조회/삭제에 userId AND chatSessionId 이중 필터
//   - 다른 사용자의 명확화 세션에 접근 불가
//   - 5분 후 자동 만료 (cleanupExpired) → 방치된 세션 정리
// ============================================================

import { clarificationSessions } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import crypto from 'crypto';

// 허용되는 거래 카테고리 목록 (validation.ts와 동일해야 함)
const VALID_CATEGORIES = ['food', 'transport', 'work', 'shopping', 'entertainment', 'utilities', 'medicine', 'other'] as const;

export interface ClarificationState {
  missingFields: string[];
  partialData: {
    transactionType?: 'income' | 'expense';
    amount?: number;
    category?: string;
    memo?: string;
    date?: string;
  };
  messageId: string;
}

export class ClarificationService {
  /**
   * Save a new clarification session
   */
  async saveClarification(
    db: any,
    userId: string,
    chatSessionId: number,
    state: ClarificationState
  ): Promise<string> {
    const id = crypto.randomUUID();
    await db.insert(clarificationSessions).values({
      id,
      userId,
      chatSessionId,
      state: JSON.stringify(state),
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  /**
   * Get active clarification for a chat session
   * Only one clarification can be active per user+session combination
   */
  async getClarification(
    db: any,
    userId: string,
    chatSessionId: number
  ): Promise<ClarificationState | null> {
    const result = await db
      .select()
      .from(clarificationSessions)
      .where(
        and(
          eq(clarificationSessions.userId, userId),
          eq(clarificationSessions.chatSessionId, chatSessionId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    try {
      return JSON.parse(result[0].state) as ClarificationState;
    } catch (error) {
      console.error('[Clarification] Failed to parse clarification state:', error);
      return null;
    }
  }

  /**
   * Merge user's clarification response with partial data
   * Extracts missing fields (amount, category, transactionType) from user input
   * Returns updated partial data and remaining missing fields
   */
  async mergeClarificationResponse(
    userResponse: string,
    currentState: ClarificationState
  ): Promise<{
    mergedData: ClarificationState['partialData'];
    stillMissingFields: string[];
  }> {
    const { missingFields, partialData } = currentState;
    const mergedData = { ...partialData };
    const lowerResponse = userResponse.toLowerCase().trim();

    // Try to extract amount if it's missing
    if (missingFields.includes('amount')) {
      const amountMatch = lowerResponse.match(/(\d+)/);
      if (amountMatch) {
        const amount = parseInt(amountMatch[1], 10);
        // Validate amount is positive
        if (amount > 0 && amount <= 1000000000) {
          mergedData.amount = amount;
        }
      }
    }

    // Try to extract category if it's missing
    if (missingFields.includes('category')) {
      for (const cat of VALID_CATEGORIES) {
        if (lowerResponse.includes(cat)) {
          mergedData.category = cat;
          break;
        }
      }
    }

    // Try to extract transactionType if it's missing
    if (missingFields.includes('transactionType')) {
      if (lowerResponse.includes('expense') || lowerResponse.includes('지출') || lowerResponse.includes('썼')) {
        mergedData.transactionType = 'expense';
      } else if (lowerResponse.includes('income') || lowerResponse.includes('수입') || lowerResponse.includes('받')) {
        mergedData.transactionType = 'income';
      }
    }

    // Determine still-missing fields
    const stillMissing = [];
    if (missingFields.includes('amount') && !mergedData.amount) stillMissing.push('amount');
    if (missingFields.includes('category') && !mergedData.category) stillMissing.push('category');
    if (missingFields.includes('transactionType') && !mergedData.transactionType) stillMissing.push('transactionType');

    return {
      mergedData,
      stillMissingFields: stillMissing,
    };
  }

  /**
   * Delete clarification session (when done or cancelled)
   */
  async deleteClarification(db: any, userId: string, chatSessionId: number): Promise<void> {
    await db
      .delete(clarificationSessions)
      .where(
        and(
          eq(clarificationSessions.userId, userId),
          eq(clarificationSessions.chatSessionId, chatSessionId)
        )
      );
  }

  /**
   * Clean up expired clarifications (> 5 minutes old)
   * Should be called periodically (e.g., every 10 minutes) to prevent stale sessions
   * Prevents users being stuck in a clarification state if they abandon the chat
   */
  async cleanupExpired(db: any): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await db
      .delete(clarificationSessions)
      .where(lt(clarificationSessions.createdAt, fiveMinutesAgo));
  }
}

export const clarificationService = new ClarificationService();
