import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public', 'art'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly', URL: 'readonly', setTimeout: 'readonly' } },
  },
  {
    // dev probes drive the game in a browser via Playwright: page.evaluate callbacks run in the page
    files: ['scripts/dev/*.mjs'],
    languageOptions: { globals: { window: 'readonly', localStorage: 'readonly' } },
  },
);
