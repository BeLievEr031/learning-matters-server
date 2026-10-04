// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'drizzle/**'],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // No floating promises – always handle async errors
      '@typescript-eslint/no-floating-promises': 'error',
      // No misused promises (e.g. passing async fn where sync is expected)
      '@typescript-eslint/no-misused-promises': 'error',
      // Unused vars as errors, except vars prefixed with _
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Consistent type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // No console – use the pino logger instead
      'no-console': 'error',
    },
  },
  {
    files: ['*.ts', '*.js', '*.mjs', '*.cjs', 'tests/**/*.ts'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Disable formatting rules that conflict with Prettier (always last)
  prettier,
);
