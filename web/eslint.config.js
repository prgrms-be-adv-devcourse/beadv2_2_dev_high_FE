import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
// import { defineConfig, globalIgnores } from 'eslint/config' // 이 부분은 표준 방식이 아니므로 제거하거나 확인 필요

export default [ // defineConfig 대신 직접 배열 내보내기
  {
    ignores: ['dist'], // globalIgnores 대신 ignores 사용
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended, // 배열 확장
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module', // sourceType 추가
      globals: globals.browser,
      parser: tseslint.parser, // parser 추가
      parserOptions: {
        project: './tsconfig.json', // project 설정 추가
      },
    },
    plugins: {
      // 플러그인 설정 (필요시)
    },
    rules: {
      // 사용하지 않는 변수를 에러 대신 경고로 처리
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // 다른 ESLint 규칙들...
      // 예를 들어, React 17+에서 더 이상 필요 없는 규칙 비활성화
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 필요에 따라 strictness 완화
      // 'no-unused-vars': 'off', // @typescript-eslint/no-unused-vars가 이를 대체
    },
  },
]
