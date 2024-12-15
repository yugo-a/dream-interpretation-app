// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import axios from './axios'; // カスタムAxiosインスタンスをインポート
import Toast, { POSITION } from 'vue-toastification';
import 'vue-toastification/dist/index.css'; // スタイルシートのインポート

const app = createApp(App);

// グローバルプロパティとしてAxiosを設定（オプション）
app.config.globalProperties.$axios = axios;

app.use(router);
app.use(Toast, {
  // オプションを必要に応じて設定
  position: POSITION.TOP_RIGHT,
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
});

app.mount('#app');
