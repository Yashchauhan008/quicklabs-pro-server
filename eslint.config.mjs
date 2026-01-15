import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      // ========================================
      // SPACING RULES (Your Requirements)
      // ========================================
      
      // Maximum 1 blank line between code
      'no-multiple-empty-lines': ['error', { 
        max: 1, // Max 1 blank line in code
        maxEOF: 1, // Max 1 at end of file
        maxBOF: 0, // No blank lines at start
      }],
      
      // Space around operators (=, +, -, etc.)
      'space-infix-ops': 'error',
      
      // Space before blocks: if (x) { }
      'space-before-blocks': 'error',
      
      // Space around keywords: if (...) else (...)
      'keyword-spacing': ['error', { 
        before: true, 
        after: true,
      }],
      
      // No multiple spaces
      'no-multi-spaces': 'error',
      
      // Space in objects: { key: value }
      'key-spacing': ['error', { 
        beforeColon: false, 
        afterColon: true,
      }],
      
      // Space inside curly braces: { foo }
      'object-curly-spacing': ['error', 'always'],
      
      // No space inside brackets: [foo]
      'array-bracket-spacing': ['error', 'never'],
      
      // Space after commas: [a, b, c]
      'comma-spacing': ['error', { 
        before: false, 
        after: true,
      }],
      
      // Space before function parentheses
      'space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      }],
      
      // Consistent indentation (2 spaces)
      'indent': ['error', 2, { 
        SwitchCase: 1,
      }],
      
      // Semicolons required
      'semi': ['error', 'always'],
      
      // Single quotes preferred
      'quotes': ['error', 'single', { 
        avoidEscape: true,
      }],
      
      // Space after keywords: } else {
      'space-before-keywords': 'off',
      
      // Newline after var declarations
      'newline-after-var': 'off',
      
      // Consistent line breaks
      'linebreak-style': ['error', 'unix'],
      
      // Trailing commas (ES5 style)
      'comma-dangle': ['error', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never',
      }],
    },
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.min.js',
      'db/**',
      'logs/**',
    ],
  },
];