module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    // Legacy / style (keep off)
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',

    // Strict types
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-throw-literal': 'error',

    // No magic / dangerous
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',

    // Predictability and consistency
    'keyword-spacing': ['error', { after: true, before: true }],
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-nested-ternary': 'warn',
    'consistent-return': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-duplicate-imports': 'error',

    // Readability and maintainability
    'no-magic-numbers': [
      'warn',
      {
        ignore: [0, 1, -1],
        ignoreArrayIndexes: true,
        enforceConst: true,
        detectObjects: false,
      },
    ],
    'complexity': ['warn', { max: 12 }],
    'max-depth': ['warn', 3],
    'max-lines-per-function': [
      'warn',
      { max: 60, skipBlankLines: true, skipComments: true },
    ],
    'max-params': ['warn', 4],
  },
  overrides: [
    {
      files: ['**/*.dto.ts', '**/game.interface.ts'],
      rules: {
        'no-magic-numbers': 'off',
      },
    },
    {
      files: ['src/main.ts'],
      rules: {
        'no-console': 'off',
        'no-magic-numbers': 'off',
      },
    },
  ],
};
