export type LLMProvider = 'ai-studio' | 'gemini' | 'openrouter' | 'openai';

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
 * Unified LLM caller supporting Gemini / AI Studio, OpenRouter, and OpenAI providers.
 * Returns the text content of the model's response.
 */
export async function callLLM(
  messages: LLMMessage[],
  config: LLMConfig
): Promise<string> {
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

/**
 * Build LLMConfig from environment variables.
 * Priority:
 *   1. Explicit AI_PROVIDER when the matching credentials exist
 *   2. AI Studio / Gemini
 *   3. OpenRouter
 *   4. OpenAI
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
}): LLMConfig {
  if (env.AI_PROVIDER === 'openrouter') {
    return {
      provider: 'openrouter',
      apiKey: env.OPENROUTER_API_KEY || '',
      modelName: env.OPENROUTER_MODEL_NAME || 'openai/gpt-4o-mini',
    };
  }
  if (env.AI_PROVIDER === 'openai') {
    return {
      provider: 'openai',
      apiKey: env.OPENAI_API_KEY || '',
      modelName: env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
    };
  }
  const geminiApiKey = env.AI_STUDIO_API_KEY || env.GEMINI_API_KEY;
  if (env.AI_PROVIDER === 'gemini' || env.AI_PROVIDER === 'ai-studio') {
    return {
      provider: env.AI_PROVIDER === 'ai-studio' ? 'ai-studio' : 'gemini',
      apiKey: geminiApiKey || '',
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
    provider: 'openai',
    apiKey: env.OPENAI_API_KEY || '',
    modelName: env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
  };
}
