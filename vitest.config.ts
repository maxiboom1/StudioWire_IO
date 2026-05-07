import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['tools/diff_logs/**', 'dist/**', 'build/**', 'node_modules/**'],
  },
});
