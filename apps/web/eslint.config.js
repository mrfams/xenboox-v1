import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // ── Node / CommonJS config files (Next, Tailwind, PostCSS, scripts) ──
  {
    files: ['**/*.cjs', '**/*.mjs', 'postcss.config.js', 'next.config.ts', 'playwright.config.ts', 'vitest.config.*', 'scripts/**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // ── Generated Next.js type declarations (managed by Next, never edited) ──
  {
    files: ['next-env.d.ts', '.next/**/*.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      'import': importPlugin,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': 'off',
      'import/order': ['warn', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
      }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'off',
      'no-control-regex': 'off',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'app/opengraph-image.ts'],
  },
];