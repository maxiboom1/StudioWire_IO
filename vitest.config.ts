import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['dist/**', 'build/**', 'node_modules/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/domain/**/*.ts', 'src/state/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
        'src/domain/projectImport.ts': {
          lines: 80,
          functions: 95,
          branches: 70,
          statements: 80,
        },
        'src/state/projectStorage.ts': {
          lines: 70,
          functions: 60,
          branches: 70,
          statements: 70,
        },
        'src/domain/connections.ts': {
          lines: 75,
          functions: 75,
          branches: 70,
          statements: 75,
        },
        'src/domain/validators.ts': {
          lines: 65,
          functions: 70,
          branches: 75,
          statements: 65,
        },
        'src/state/projectReducer.ts': {
          lines: 40,
          functions: 70,
          branches: 45,
          statements: 40,
        },
      },
    },
  },
});
