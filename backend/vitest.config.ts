import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: [
            'src/**/*.test.ts',
            'tests/unit/**/*.test.ts',
            'tests/helpers/**/*.test.ts',
            // existing test locations (not yet migrated)
            'tests/routes/**/*.test.ts',
            'tests/services/**/*.test.ts',
            'tests/seeds/**/*.test.ts',
          ],
          setupFiles: ['./tests/setup-env.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.integration.test.ts'],
          setupFiles: ['./tests/setup-env.ts'],
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.e2e.test.ts'],
          setupFiles: ['./tests/setup-env.ts'],
        },
      },
      // llm-smoke project added in Phase 6
    ],
  },
});
