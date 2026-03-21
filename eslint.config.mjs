import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    ignores: ['.next/**', 'node_modules/**', 'dev-scripts/**'],
  },
  // Node.js globals for test helpers and CI scripts
  {
    files: ['tests/helpers/**'],
    languageOptions: {
      globals: globals.node,
    },
  },
];
