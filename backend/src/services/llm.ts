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
      max_tokens: 4096, // Increased for complex responses like reports
    });

    console.log('[Workers AI Call] Raw response:', response);

    // Debug: Log response structure in detail
    if (response.choices && Array.isArray(response.choices)) {
      console.log('[Workers AI Call] Choices count:', response.choices.length);
      const choice = response.choices[0];
      if (choice) {
        console.log('[Workers AI Call] First choice keys:', Object.keys(choice));
        console.log('[Workers AI Call] Message type:', typeof choice.message);
        if (choice.message) {
          console.log('[Workers AI Call] Message keys:', Object.keys(choice.message));
          console.log('[Workers AI Call] Message content type:', typeof choice.message.content);
          console.log('[Workers AI Call] Message content value:', choice.message.content);
        }
      }
    }

    // Extract text from response - handle OpenAI format (choices array)
    let text: string | undefined;

    // Try OpenAI format first (choices[0].message.content)
    if (response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
      const choice = response.choices[0];
      if (choice && typeof choice === 'object') {
        const message = choice.message;

        // Debug each step
        console.log('[Workers AI Call] Step 1: message =', message);

        if (message && typeof message === 'object') {
          console.log('[Workers AI Call] Step 2: message.content =', message.content);
          // message could be { content: string } or just a string
          if (typeof message.content === 'string') {
            text = message.content;
            console.log('[Workers AI Call] Step 3: Using message.content');
          } else if (typeof message === 'string') {
            text = message;
            console.log('[Workers AI Call] Step 3: Using message as string');
          }

          // Fallback to reasoning_content if content is null (for long responses)
          if (!text && message.reasoning_content && typeof message.reasoning_content === 'string') {
            console.log('[Workers AI Call] Step 3.5: Falling back to reasoning_content');
            // reasoning_content contains thinking/reasoning, not the actual response
            // This indicates the model response was cut off - we should error rather than use it
            console.error('[Workers AI Call] WARNING: Response was cut off, using reasoning_content as fallback');
            // Don't use reasoning_content - it's not the actual response
            // Instead, this indicates max_tokens was too small
            text = undefined;
          }
        }
      }
    }

    // Fallback to direct response field
    if (!text && response.response) {
      console.log('[Workers AI Call] Fallback 1: Using response.response');
      text = response.response;
    }

    // Fallback to result.response
    if (!text && response.result?.response) {
      console.log('[Workers AI Call] Fallback 2: Using response.result.response');
      text = response.result.response;
    }

    if (!text) {
      console.error('[Workers AI Error] No text extracted from response');
      console.error('[Workers AI Error] Full response:', response);

      // Check if this was a token limit issue
      const hasReasoningContent = response.choices?.[0]?.message?.reasoning_content;
      if (hasReasoningContent) {
        console.error('[Workers AI Error] Response appears to have been cut off (reasoning_content present, content empty)');
        throw new Error('Response was truncated - increase max_tokens or reduce context size');
      }

      // Try to extract anything that looks like text
      try {
        const jsonStr = JSON.stringify(response, null, 2);
        console.error('[Workers AI Error] Stringified response:', jsonStr);
      } catch (e) {
        console.error('[Workers AI Error] Could not stringify response:', e);
      }
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
