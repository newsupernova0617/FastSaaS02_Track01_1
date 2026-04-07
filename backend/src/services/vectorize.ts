import type { VectorSearchRequest, EmbeddingResponse } from '../types/rag';

export class VectorizeService {
  private apiToken: string;
  private apiBaseUrl: string = 'https://api.cloudflare.com/client/v4/accounts';

  constructor(accountId: string, apiToken: string) {
    this.apiToken = apiToken;
    this.apiBaseUrl = `${this.apiBaseUrl}/${accountId}/ai/run`;
  }

  /**
   * Embed text using Cloudflare Vectorize
   * Returns numerical embedding vector
   */
  async embedText(text: string): Promise<number[]> {
    try {
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
        console.error(`Vectorize API error: ${response.status} ${response.statusText}`);
        return []; // Return empty on error (graceful fallback)
      }

      const data = (await response.json()) as EmbeddingResponse;
      return data.embedding || [];
    } catch (error) {
      console.error('Failed to embed text:', error);
      return []; // Return empty on error
    }
  }

  /**
   * Search vectors in database by similarity
   * Mock implementation for now (would query Vectorize DB in production)
   */
  async searchVectors(
    embedding: number[],
    table: string,
    limit: number,
    userId?: string
  ): Promise<Array<{ id: string; content: string; score: number }>> {
    // This is a placeholder for Cloudflare Vectorize vector search
    // In production, would query against Vectorize vector DB
    // For MVP, we'll do simple similarity search against stored embeddings

    console.log(`Searching ${table} with limit ${limit}${userId ? ` for user ${userId}` : ''}`);

    // Return empty for now - will be implemented with actual vector search
    return [];
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
