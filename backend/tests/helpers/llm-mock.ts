import { vi, type MockInstance } from 'vitest';
import * as llmModule from '../../src/services/llm';

export function mockLlmResponse(response: string | object): MockInstance {
  const text = typeof response === 'string' ? response : JSON.stringify(response);
  return vi.spyOn(llmModule, 'callLLM').mockResolvedValue(text);
}

export function restoreLlmMock(): void {
  vi.restoreAllMocks();
}
