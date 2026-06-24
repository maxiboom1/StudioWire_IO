const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.vite/**',
      '.playwright-cli/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      'output/**',
      '.source-package/**',
      '*.tsbuildinfo',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'tools/**/*.{ts,mjs}', 'tests/**/*.{ts,tsx}', '*.config.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        Blob: 'readonly',
        console: 'readonly',
        document: 'readonly',
        File: 'readonly',
        localStorage: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        window: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
];
