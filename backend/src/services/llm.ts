export type LLMProvider = 'groq' | 'gemini';

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
 * Unified LLM caller supporting Groq and Gemini providers.
 * Returns the text content of the model's response.
 */
export async function callLLM(messages: LLMMessage[], config: LLMConfig): Promise<string> {
  if (config.provider === 'gemini') {
    return callGemini(messages, config);
  }
  return callGroq(messages, config);
}

async function callGroq(messages: LLMMessage[], config: LLMConfig): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq API error: ${response.status} ${JSON.stringify(err)}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  const text = data.choices[0]?.message?.content;
  if (!text) throw new Error('No response from Groq');
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
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${response.status} ${JSON.stringify(err)}`);
  }

  const data = await response.json() as { candidates: { content: { parts: { text: string }[] } }[] };
  const text = data.candidates[0]?.content?.parts[0]?.text;
  if (!text) throw new Error('No response from Gemini');
  return text;
}

/**
 * Build LLMConfig from environment variables.
 * If AI_PROVIDER is 'gemini' and GEMINI_API_KEY is set, uses Gemini.
 * Otherwise falls back to Groq.
 */
export function getLLMConfig(env: {
  AI_PROVIDER?: string;
  GROQ_API_KEY: string;
  GROQ_MODEL_NAME?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL_NAME?: string;
}): LLMConfig {
  if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
    return {
      provider: 'gemini',
      apiKey: env.GEMINI_API_KEY,
      modelName: env.GEMINI_MODEL_NAME || 'gemini-2.0-flash',
    };
  }
  return {
    provider: 'groq',
    apiKey: env.GROQ_API_KEY,
    modelName: env.GROQ_MODEL_NAME || 'llama-3.1-8b-instant',
  };
}
