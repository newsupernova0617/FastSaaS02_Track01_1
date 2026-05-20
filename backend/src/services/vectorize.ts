import type { Client } from '@libsql/client';
import { getDbClient, type Env } from '../db/index';

export type VectorTable = 'knowledge_base' | 'user_notes';

const EMBEDDING_DIMENSIONS = 768;

function normalizeEmbedding(values: number[], targetDimensions = EMBEDDING_DIMENSIONS): number[] {
  if (values.length === targetDimensions) return values;
  if (values.length === 0) return Array.from({ length: targetDimensions }, () => 0);

  if (values.length > targetDimensions) {
    const compressed = Array.from({ length: targetDimensions }, () => 0);
    const counts = Array.from({ length: targetDimensions }, () => 0);

    values.forEach((value, index) => {
      const targetIndex = Math.floor((index * targetDimensions) / values.length);
      compressed[targetIndex] += value;
      counts[targetIndex] += 1;
    });

    return compressed.map((value, index) => (counts[index] ? value / counts[index] : 0));
  }

  return [...values, ...Array.from({ length: targetDimensions - values.length }, () => 0)];
}

function textToFallbackEmbedding(text: string): number[] {
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  const normalized = text.trim().toLowerCase();

  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    const slot = (code * 131 + i * 17) % EMBEDDING_DIMENSIONS;
    const magnitude = ((code % 41) - 20) / 20;
    vector[slot] += magnitude;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    return vector;
  }

  return vector.map((value) => value / norm);
}

function parseVectorRow(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    content: String(row.content ?? ''),
    score: Number(row.score ?? 0),
  };
}

export class VectorizeService {
  private legacyMode = false;
  private legacyAccountId = '';
  private legacyApiToken = '';
  private env: Env;
  private client?: Client;

  constructor(
    envOrAccountId: Env | string,
    clientOrApiToken?: Client | string,
  ) {
    if (typeof envOrAccountId === 'string') {
      this.legacyMode = true;
      this.legacyAccountId = envOrAccountId;
      this.legacyApiToken = typeof clientOrApiToken === 'string' ? clientOrApiToken : '';
      this.env = {
        TURSO_DB_URL: process.env.TURSO_DB_URL || '',
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || '',
        SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',
        SUPABASE_URL: process.env.SUPABASE_URL || '',
        ADMIN_DASHBOARD_PASSWORD: process.env.ADMIN_DASHBOARD_PASSWORD,
        AI_STUDIO_API_KEY: process.env.AI_STUDIO_API_KEY,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_MODEL_NAME: process.env.GEMINI_MODEL_NAME,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        OPENROUTER_MODEL_NAME: process.env.OPENROUTER_MODEL_NAME,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_MODEL_NAME: process.env.OPENAI_MODEL_NAME,
        WORKERS_AI_MODEL_NAME: process.env.WORKERS_AI_MODEL_NAME,
        AI_PROVIDER: process.env.AI_PROVIDER as Env['AI_PROVIDER'],
        AI: undefined,
        VECTORIZE: undefined,
        CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
        ENVIRONMENT: process.env.ENVIRONMENT,
        GOOGLE_PLAY_PACKAGE_NAME: process.env.GOOGLE_PLAY_PACKAGE_NAME,
        GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY,
        GOOGLE_PLAY_ACCESS_TOKEN: process.env.GOOGLE_PLAY_ACCESS_TOKEN,
        GOOGLE_PUBSUB_PUSH_AUDIENCE: process.env.GOOGLE_PUBSUB_PUSH_AUDIENCE,
        GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL,
        WEB_PUSH_VAPID_PUBLIC_KEY: process.env.WEB_PUSH_VAPID_PUBLIC_KEY,
        WEB_PUSH_VAPID_PRIVATE_KEY_JWK: process.env.WEB_PUSH_VAPID_PRIVATE_KEY_JWK,
        WEB_PUSH_SUBJECT: process.env.WEB_PUSH_SUBJECT,
      };
      this.client = undefined;
      return;
    }

    this.env = envOrAccountId;
    this.client = (clientOrApiToken as Client | undefined) ?? getDbClient(envOrAccountId);
  }

  private resolveEmbeddingProvider(): 'ai-studio' | 'gemini' | 'openai' | 'openrouter' | 'workers-ai' | 'local' {
    const provider = this.env.AI_PROVIDER;

    if ((provider === 'ai-studio' || provider === 'gemini') && (this.env.AI_STUDIO_API_KEY || this.env.GEMINI_API_KEY)) {
      return provider;
    }

    if (provider === 'openai' && this.env.OPENAI_API_KEY) {
      return 'openai';
    }

    if (provider === 'openrouter' && this.env.OPENROUTER_API_KEY) {
      return 'openrouter';
    }

    if (provider === 'workers-ai' && this.env.AI) {
      return 'workers-ai';
    }

    if (this.env.AI_STUDIO_API_KEY || this.env.GEMINI_API_KEY) {
      return 'ai-studio';
    }

    if (this.env.OPENROUTER_API_KEY) {
      return 'openrouter';
    }

    if (this.env.OPENAI_API_KEY) {
      return 'openai';
    }

    if (this.env.AI) {
      return 'workers-ai';
    }

    return 'local';
  }

  private async callWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delays = [0, 100, 300]
  ): Promise<T | null> {
    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, delays[attempt] ?? delays[delays.length - 1] ?? 0));
        }
        return await fn();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          console.error(`Failed after ${maxRetries} retries:`, error);
          return null;
        }
      }
    }

    return null;
  }

  async embedText(text: string): Promise<number[]> {
    if (this.legacyMode) {
      return this.embedTextLegacy(text);
    }

    const provider = this.resolveEmbeddingProvider();

    if (provider === 'ai-studio' || provider === 'gemini') {
      const apiKey = this.env.AI_STUDIO_API_KEY || this.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          return await this.embedWithGemini(text, apiKey);
        } catch (error) {
          console.warn('[RAG] Gemini embedding failed, falling back:', error);
        }
      }
    }

    if (provider === 'openai') {
      if (this.env.OPENAI_API_KEY) {
        try {
          return await this.embedWithOpenAI(text, this.env.OPENAI_API_KEY, this.env.OPENAI_MODEL_NAME || 'text-embedding-3-small');
        } catch (error) {
          console.warn('[RAG] OpenAI embedding failed, falling back:', error);
        }
      }
    }

    if (provider === 'openrouter') {
      if (this.env.OPENROUTER_API_KEY) {
        try {
          return await this.embedWithOpenRouter(text, this.env.OPENROUTER_API_KEY, this.env.OPENROUTER_MODEL_NAME || 'openai/text-embedding-3-small');
        } catch (error) {
          console.warn('[RAG] OpenRouter embedding failed, falling back:', error);
        }
      }
    }

    if (provider === 'workers-ai' && this.env.AI) {
      try {
        return await this.embedWithWorkersAI(text);
      } catch (error) {
        console.warn('[RAG] Workers AI embedding failed, falling back:', error);
      }
    }

    return textToFallbackEmbedding(text);
  }

  async searchVectors(
    embedding: number[],
    table: VectorTable | string,
    limit: number,
    userId?: string
  ): Promise<Array<{ id: string; content: string; score: number }>> {
    if (!embedding.length || limit <= 0) return [];

    if (this.legacyMode) {
      return this.searchVectorsLegacy(embedding, table, limit, userId);
    }

    const queryVector = JSON.stringify(normalizeEmbedding(embedding));
    const vectorIndex = table === 'user_notes' ? 'user_notes_embedding_idx' : 'knowledge_base_embedding_idx';
    const client = this.client ?? getDbClient(this.env);

    try {
      if (table === 'user_notes') {
        if (!userId) return [];

        const result = await client.execute(
          `SELECT n.id, n.content, vector_distance_cos(n.embedding, vector32(?)) AS score
           FROM vector_top_k('${vectorIndex}', vector32(?), ?) top
           JOIN user_notes n ON n.rowid = top.id
           WHERE n.user_id = ?
           ORDER BY score ASC`,
          [queryVector, queryVector, limit, userId]
        );

        return result.rows.map((row) => parseVectorRow(row as Record<string, unknown>));
      }

      const result = await client.execute(
        `SELECT k.id, k.content, vector_distance_cos(k.embedding, vector32(?)) AS score
         FROM vector_top_k('${vectorIndex}', vector32(?), ?) top
         JOIN knowledge_base k ON k.rowid = top.id
         ORDER BY score ASC`,
        [queryVector, queryVector, limit]
      );

      return result.rows.map((row) => parseVectorRow(row as Record<string, unknown>));
    } catch (error) {
      console.warn('[RAG] Turso vector query failed, returning empty result:', error);
      return [];
    }
  }

  private async embedTextLegacy(text: string): Promise<number[]> {
    const result = await this.callWithRetry(async () => {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.legacyAccountId}/ai/run/@cf/baai/bge-base-en-v1.5`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.legacyApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Vectorize API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { embedding?: number[] };
      return data.embedding || [];
    });

    return result || [];
  }

  private async searchVectorsLegacy(
    embedding: number[],
    table: VectorTable | string,
    limit: number,
    userId?: string
  ): Promise<Array<{ id: string; content: string; score: number }>> {
    const result = await this.callWithRetry(async () => {
      const searchUrl = `https://api.cloudflare.com/client/v4/accounts/${this.legacyAccountId}/vectorize/indexes/${table}/query`;
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.legacyApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector: embedding,
          returnMetadata: true,
          topK: limit,
        }),
      });

      if (!response.ok) {
        throw new Error(`Vectorize search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { matches?: Array<{ id: string; score: number; metadata?: Record<string, unknown> }> };
      const matches = data.matches || [];

      return matches
        .filter((match) => {
          if (userId && match.metadata) {
            return match.metadata.userId === userId;
          }
          return true;
        })
        .slice(0, limit)
        .map((match) => ({
          id: match.id,
          content: String(match.metadata?.content || ''),
          score: Math.max(0, Math.min(1, match.score)),
        }));
    });

    return result || [];
  }

  private async embedWithGemini(text: string, apiKey: string): Promise<number[]> {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        content: {
          parts: [{ text }],
        },
        output_dimensionality: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini embedding error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      embedding?: { values?: number[] };
      embeddings?: Array<{ values?: number[] }>;
    };

    const values = data.embedding?.values ?? data.embeddings?.[0]?.values ?? [];
    return normalizeEmbedding(values);
  }

  private async embedWithOpenAI(text: string, apiKey: string, modelName: string): Promise<number[]> {
    const attempt = async (includeDimensions: boolean) => {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          input: text,
          ...(includeDimensions ? { dimensions: EMBEDDING_DIMENSIONS } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI embedding error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { data?: Array<{ embedding?: number[] }> };
      return data.data?.[0]?.embedding ?? [];
    };

    try {
      return normalizeEmbedding(await attempt(true));
    } catch (error) {
      console.warn('[RAG] OpenAI embedding with dimensions failed, retrying default dimensions:', error);
      return normalizeEmbedding(await attempt(false));
    }
  }

  private async embedWithOpenRouter(text: string, apiKey: string, modelName: string): Promise<number[]> {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': this.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost',
        'X-Title': 'FastSaaS',
      },
      body: JSON.stringify({
        model: modelName,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter embedding error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data?: Array<{ embedding?: number[] }> };
    return normalizeEmbedding(data.data?.[0]?.embedding ?? []);
  }

  private async embedWithWorkersAI(text: string): Promise<number[]> {
    const response = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text,
    });

    const embedding =
      (response as { embedding?: number[] }).embedding ||
      (response as { data?: number[] }).data ||
      [];

    return normalizeEmbedding(embedding);
  }
}

let cachedVectorizeKey: string | undefined;
let cachedVectorizeService: VectorizeService | undefined;

export const vectorizeService = (envOrAccountId: Env | string, clientOrApiToken?: Client | string) => {
  const env = typeof envOrAccountId === 'string'
    ? {
        TURSO_DB_URL: process.env.TURSO_DB_URL || '',
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || '',
        SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',
        SUPABASE_URL: process.env.SUPABASE_URL || '',
        ADMIN_DASHBOARD_PASSWORD: process.env.ADMIN_DASHBOARD_PASSWORD,
        AI_STUDIO_API_KEY: process.env.AI_STUDIO_API_KEY,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_MODEL_NAME: process.env.GEMINI_MODEL_NAME,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        OPENROUTER_MODEL_NAME: process.env.OPENROUTER_MODEL_NAME,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_MODEL_NAME: process.env.OPENAI_MODEL_NAME,
        WORKERS_AI_MODEL_NAME: process.env.WORKERS_AI_MODEL_NAME,
        AI_PROVIDER: process.env.AI_PROVIDER as Env['AI_PROVIDER'],
        AI: undefined,
        VECTORIZE: undefined,
        CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
        ENVIRONMENT: process.env.ENVIRONMENT,
        GOOGLE_PLAY_PACKAGE_NAME: process.env.GOOGLE_PLAY_PACKAGE_NAME,
        GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY,
        GOOGLE_PLAY_ACCESS_TOKEN: process.env.GOOGLE_PLAY_ACCESS_TOKEN,
        GOOGLE_PUBSUB_PUSH_AUDIENCE: process.env.GOOGLE_PUBSUB_PUSH_AUDIENCE,
        GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL,
        WEB_PUSH_VAPID_PUBLIC_KEY: process.env.WEB_PUSH_VAPID_PUBLIC_KEY,
        WEB_PUSH_VAPID_PRIVATE_KEY_JWK: process.env.WEB_PUSH_VAPID_PRIVATE_KEY_JWK,
        WEB_PUSH_SUBJECT: process.env.WEB_PUSH_SUBJECT,
      } as Env
    : envOrAccountId;

  const client = typeof envOrAccountId === 'string'
    ? undefined
    : clientOrApiToken as Client | undefined;

  const key = `${typeof envOrAccountId === 'string' ? 'legacy' : env.AI_PROVIDER || ''}\0${typeof envOrAccountId === 'string' ? envOrAccountId : env.AI_STUDIO_API_KEY || ''}\0${typeof envOrAccountId === 'string' ? String(clientOrApiToken || '') : env.GEMINI_API_KEY || ''}\0${env.OPENAI_API_KEY || ''}\0${env.OPENROUTER_API_KEY || ''}\0${env.TURSO_DB_URL}\0${env.TURSO_AUTH_TOKEN}`;
  if (cachedVectorizeService && cachedVectorizeKey === key) {
    return cachedVectorizeService;
  }

  cachedVectorizeKey = key;
  cachedVectorizeService = new VectorizeService(env, client ?? undefined);
  return cachedVectorizeService;
};
