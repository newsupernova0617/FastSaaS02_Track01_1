// NOTE: LLM smoke tests use a mocked callLLM boundary with structural assertions.
// To run real LLM calls, point the backend at a live provider and unmock the helper.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include:
      process.env.RUN_LLM_TESTS === '1'
        ? ['tests/llm-smoke/**/*.llm.test.ts']
        : [],
    setupFiles: ['./tests/setup-env.ts'],
  },
});
