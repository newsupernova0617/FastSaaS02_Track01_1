export type LLMProvider = 'gemini' | 'openai' | 'workers-ai';

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
  if (config.provider === 'gemini') {
    return callGemini(messages, config);
  }
  if (config.provider === 'openai') {
    return callOpenAI(messages, config);
  }
  // Groq provider removed - use Workers AI instead
  throw new Error('Unknown LLM provider');
}

// async function callGroq(messages: LLMMessage[], config: LLMConfig): Promise<string> {
//   console.log('[Groq API Call] Starting request to api.groq.com');
//   const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': `Bearer ${config.apiKey}`,
//     },
//     body: JSON.stringify({
//       model: config.modelName,
//       messages,
//       response_format: { type: 'json_object' },
//     }),
//   });
//
//   if (!response.ok) {
//     const err = await response.json().catch(() => ({}));
//     console.error('[Groq API Error]', {
//       status: response.status,
//       statusText: response.statusText,
//       error: err,
//     });
//     throw new Error(`Groq API error: ${response.status} ${JSON.stringify(err)}`);
//   }
//
//   const data = await response.json() as { choices: { message: { content: string } }[] };
//   const text = data.choices[0]?.message?.content;
//   if (!text) throw new Error('No response from Groq');
//   return text;
// }

async function callOpenAI(messages: LLMMessage[], config: LLMConfig): Promise<string> {
  console.log('[OpenAI API Call] Starting request to api.openai.com');
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
    const err = await response.json().catch(() => ({}));
    console.error('[OpenAI API Error]', {
      status: response.status,
      statusText: response.statusText,
      error: err,
    });
    throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(err)}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  const text = data.choices[0]?.message?.content;
  if (!text) throw new Error('No response from OpenAI');
  return text;
}

async function callGemini(messages: LLMMessage[], config: LLMConfig): Promise<string> {
  console.log('[Gemini API Call] Starting request to generativelanguage.googleapis.com');
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
    console.error('[Gemini API Error]', {
      status: response.status,
      statusText: response.statusText,
      error: err,
    });
    throw new Error(`Gemini API error: ${response.status} ${JSON.stringify(err)}`);
  }

  const data = await response.json() as { candidates: { content: { parts: { text: string }[] } }[] };
  const text = data.candidates[0]?.content?.parts[0]?.text;
  if (!text) throw new Error('No response from Gemini');
  return text;
}

async function callWorkersAI(
  messages: LLMMessage[],
  config: LLMConfig,
  ai: any // Cloudflare Workers AI binding from Env
): Promise<string> {
  console.log('[Workers AI Call] Starting request to Cloudflare Workers AI');
  console.log('[Workers AI Call] Model:', config.modelName);
  console.log('[Workers AI Call] Messages count:', messages.length);

  // Format messages for Cloudflare Workers AI
  const formattedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const response = await ai.run(config.modelName, {
      messages: formattedMessages,
      max_tokens: 1024,
    });

    console.log('[Workers AI Call] Raw response:', response);

    // Extract text from response
    const text = response.result?.response || response?.response;
    if (!text) {
      console.error('[Workers AI Error] No text extracted from response:', response);
      throw new Error('No response from Workers AI');
    }

    console.log('[Workers AI Call] Extracted text:', text);
    return text;
  } catch (error) {
    console.error('[Workers AI Error]', {
      model: config.modelName,
      error: error instanceof Error ? error.message : String(error),
      fullError: error,
    });
    throw new Error(`Workers AI error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Build LLMConfig from environment variables.
 * If AI_PROVIDER is 'workers-ai', uses Cloudflare Workers AI.
 * If AI_PROVIDER is 'openai' and OPENAI_API_KEY is set, uses OpenAI.
 * If AI_PROVIDER is 'gemini' and GEMINI_API_KEY is set, uses Gemini.
 * Otherwise falls back to Groq.
 */
export function getLLMConfig(env: {
  AI_PROVIDER?: string;
  // GROQ_API_KEY: string;
  // GROQ_MODEL_NAME?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL_NAME?: string;
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
  if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: env.OPENAI_API_KEY,
      modelName: env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
    };
  }
  if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
    return {
      provider: 'gemini',
      apiKey: env.GEMINI_API_KEY,
      modelName: env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
    };
  }
  // Groq fallback removed - using Workers AI as default
  return {
    provider: 'workers-ai',
    apiKey: '', // Not used for Workers AI
    modelName: env.WORKERS_AI_MODEL_NAME || '@cf/meta/llama-2-7b-chat-int8',
  };
}
