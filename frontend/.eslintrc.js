// frontend/.eslintrc.js

module.exports = {
    root: true,
    env: {
      browser: true,
      node: true,
      es2021: true,
    },
    extends: [
      'plugin:vue/vue3-essential', // Vue 3 の基本ルール
      'eslint:recommended',          // ESLint の推奨ルール
    ],
    parserOptions: {
      ecmaVersion: 2021,   // 最新の ECMAScript 機能をサポート
      sourceType: 'module', // ES6 モジュールを使用
    },
    rules: {
      'vue/multi-word-component-names': 'off', // マルチワードコンポーネント名のルールを無効化
    },
  };
  