import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const combinedRules = {
  ...js.configs.recommended.rules,
  ...reactHooks.configs.recommended.rules,
  ...reactRefresh.configs.vite.rules,
  'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
}

const combinedPlugins = {
  'react-hooks': reactHooks,
  ...(reactRefresh.configs.vite.plugins || {}),
}

const combinedSettings = {
  ...(reactHooks.configs.recommended.settings || {}),
  ...(reactRefresh.configs.vite.settings || {}),
}

export default [
  {
    ignores: ['dist', 'backend/**'],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: combinedPlugins,
    settings: combinedSettings,
    rules: combinedRules,
  },
]
