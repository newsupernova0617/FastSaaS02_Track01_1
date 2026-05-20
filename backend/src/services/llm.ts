export type LLMProvider = 'ai-studio' | 'gemini' | 'openrouter' | 'openai' | 'workers-ai';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  modelName: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Unified LLM caller supporting Workers AI, Gemini / AI Studio, OpenRouter, and OpenAI providers.
 * Returns the text content of the model's response.
 */
export async function callLLM(
  messages: LLMMessage[],
  config: LLMConfig,
  ai?: any // Optional Cloudflare Workers AI binding
): Promise<string> {
  if (config.provider === 'workers-ai') {
    if (!ai) {
      throw new Error('Workers AI binding not available in environment');
    }
    return callWorkersAI(messages, config, ai);
  }
  if (config.provider === 'gemini' || config.provider === 'ai-studio') {
    return callGemini(messages, config);
  }
  if (config.provider === 'openrouter') {
    return callOpenRouter(messages, config);
  }
  if (config.provider === 'openai') {
    return callOpenAI(messages, config);
  }
  throw new Error('Unknown LLM provider');
}

async function callOpenAI(messages: LLMMessage[], config: LLMConfig): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  const text = data.choices[0]?.message?.content;
  if (!text) throw new Error('No response from OpenAI');
  return text;
}

async function callGemini(messages: LLMMessage[], config: LLMConfig): Promise<string> {
  const systemMsg = messages.find((m) => m.role === 'system');
  const userMessages = messages.filter((m) => m.role !== 'system');

  const body: Record<string, unknown> = {
    contents: userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { responseMimeType: 'application/json' },
  };

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelName}:generateContent?key=${config.apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { candidates: { content: { parts: { text: string }[] } }[] };
  const text = data.candidates[0]?.content?.parts[0]?.text;
  if (!text) throw new Error('No response from Gemini');
  return text;
}

async function callOpenRouter(messages: LLMMessage[], config: LLMConfig): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  const text = data.choices[0]?.message?.content;
  if (!text) throw new Error('No response from OpenRouter');
  return text;
}

async function callWorkersAI(
  messages: LLMMessage[],
  config: LLMConfig,
  ai: any // Cloudflare Workers AI binding from Env
): Promise<string> {
  const formattedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const response = await ai.run(config.modelName, {
      messages: formattedMessages,
      max_tokens: 4096, // Increased for complex responses like reports
    });

    let text: string | undefined;
    const choice = Array.isArray(response?.choices) ? response.choices[0] : undefined;
    const message = choice && typeof choice === 'object' ? choice.message : undefined;

    if (typeof message === 'string') {
      text = message;
    } else if (message && typeof message === 'object') {
      if (typeof message.content === 'string') {
        text = message.content;
      } else if (typeof message.reasoning_content === 'string') {
        throw new Error('Response was truncated - increase max_tokens or reduce context size');
      }
    }

    if (!text) {
      if (typeof response?.response === 'string') {
        text = response.response;
      } else if (typeof response?.result?.response === 'string') {
        text = response.result.response;
      }
    }

    if (!text) {
      throw new Error('No response from Workers AI');
    }

    return text;
  } catch (error) {
    throw new Error(`Workers AI error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Build LLMConfig from environment variables.
 * Priority:
 *   1. Explicit AI_PROVIDER when the matching credentials exist
 *   2. AI Studio / Gemini
 *   3. OpenRouter
 *   4. OpenAI
 *   5. Workers AI (Cloudflare-only fallback)
 */
export function getLLMConfig(env: {
  AI_PROVIDER?: string;
  AI_STUDIO_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL_NAME?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL_NAME?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL_NAME?: string;
  WORKERS_AI_MODEL_NAME?: string;
}): LLMConfig {
  if (env.AI_PROVIDER === 'workers-ai') {
    return {
      provider: 'workers-ai',
      apiKey: '', // Not used for Workers AI
      modelName: env.WORKERS_AI_MODEL_NAME || '@cf/openai/gpt-oss-120b',
    };
  }
  if (env.AI_PROVIDER === 'openrouter' && env.OPENROUTER_API_KEY) {
    return {
      provider: 'openrouter',
      apiKey: env.OPENROUTER_API_KEY,
      modelName: env.OPENROUTER_MODEL_NAME || 'openai/gpt-4o-mini',
    };
  }
  if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: env.OPENAI_API_KEY,
      modelName: env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
    };
  }
  const geminiApiKey = env.AI_STUDIO_API_KEY || env.GEMINI_API_KEY;
  if ((env.AI_PROVIDER === 'gemini' || env.AI_PROVIDER === 'ai-studio') && geminiApiKey) {
    return {
      provider: env.AI_PROVIDER === 'ai-studio' ? 'ai-studio' : 'gemini',
      apiKey: geminiApiKey,
      modelName: env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
    };
  }

  if (geminiApiKey) {
    return {
      provider: 'ai-studio',
      apiKey: geminiApiKey,
      modelName: env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
    };
  }

  if (env.OPENROUTER_API_KEY) {
    return {
      provider: 'openrouter',
      apiKey: env.OPENROUTER_API_KEY,
      modelName: env.OPENROUTER_MODEL_NAME || 'openai/gpt-4o-mini',
    };
  }

  if (env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: env.OPENAI_API_KEY,
      modelName: env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
    };
  }

  return {
    provider: 'workers-ai',
    apiKey: '', // Not used for Workers AI
    modelName: env.WORKERS_AI_MODEL_NAME || '@cf/openai/gpt-oss-120b',
  };
}
