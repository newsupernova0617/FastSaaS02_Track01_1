import type { VectorSearchRequest, EmbeddingResponse, VectorResult } from '../types/rag';

export class VectorizeService {
  private apiToken: string;
  private apiBaseUrl: string = 'https://api.cloudflare.com/client/v4/accounts';

  constructor(accountId: string, apiToken: string) {
    this.apiToken = apiToken;
    this.apiBaseUrl = `${this.apiBaseUrl}/${accountId}/ai/run`;
  }

  /**
   * Call a function with exponential backoff retry logic
   * Attempts up to maxRetries times with delays between attempts
   * @param fn Function to call
   * @param maxRetries Maximum number of attempts (default 3)
   * @param delays Array of delays in ms to wait before each retry (default [0, 100, 300])
   * @returns Result from fn or null if all retries fail
   */
  private async callWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delays: number[] = [0, 100, 300]
  ): Promise<T | null> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (i > 0) {
          await new Promise(r => setTimeout(r, delays[i]));
        }
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) {
          console.error(`Failed after ${maxRetries} retries:`, error);
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Embed text using Cloudflare Vectorize
   * Returns numerical embedding vector with retry logic
   */
  async embedText(text: string): Promise<number[]> {
    const result = await this.callWithRetry(async () => {
      const response = await fetch(`${this.apiBaseUrl}/@cf/baai/bge-base-en-v1.5`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Vectorize API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as EmbeddingResponse;
      return data.embedding || [];
    });

    return result || []; // Return empty on error (graceful fallback)
  }

  /**
   * Search vectors in database by similarity
   * Queries Cloudflare Vectorize API with exponential backoff retry
   * @param embedding Vector to search with
   * @param table Table to search in ("user_notes", "knowledge_base", or "transactions")
   * @param limit Maximum results to return
   * @param userId Optional user ID for data isolation filtering
   * @returns Array of results with id, content, and similarity score (0-1)
   */
  async searchVectors(
    embedding: number[],
    table: string,
    limit: number,
    userId?: string
  ): Promise<Array<{ id: string; content: string; score: number }>> {
    if (!embedding || embedding.length === 0) {
      console.warn('searchVectors called with empty embedding');
      return [];
    }

    const result = await this.callWithRetry(async () => {
      // Call Cloudflare Vectorize search endpoint
      const searchUrl = `${this.apiBaseUrl.replace('/ai/run', '')}/vectorize/indexes/${table}/query`;

      const requestBody = {
        vector: embedding,
        returnMetadata: true,
        topK: limit,
      };

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Vectorize search failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { matches: VectorResult[] };

      if (!data.matches || !Array.isArray(data.matches)) {
        return [];
      }

      // Map API results to expected format and apply userId filter if provided
      return data.matches
        .filter(match => {
          // If userId provided, filter to only that user's results
          if (userId && match.metadata) {
            return match.metadata.userId === userId;
          }
          return true;
        })
        .slice(0, limit)
        .map(match => ({
          id: match.id,
          content: (match.metadata?.content as string) || '',
          score: Math.max(0, Math.min(1, match.score)), // Normalize score to 0-1
        }));
    });

    return result || []; // Return empty array on error (graceful fallback)
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

export const vectorizeService = (accountId: string, apiToken: string) =>
  new VectorizeService(accountId, apiToken);
