// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import { useAuthStore } from './stores/auth'; // 追加: authStore のインポート
import axios from './axios'; // カスタムAxiosインスタンスをインポート
import Toast, { POSITION } from 'vue-toastification';
import 'vue-toastification/dist/index.css'; // スタイルシートのインポート

const app = createApp(App);
const pinia = createPinia();

// グローバルプロパティとしてAxiosを設定（オプション）
app.config.globalProperties.$axios = axios;

app.use(pinia);
app.use(router);
app.use(Toast, {
  position: POSITION.TOP_RIGHT,
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
});

const authStore = useAuthStore();

// アプリ起動前に認証状態チェックを実施
authStore.checkLoginStatus().then(() => {
  app.mount('#app');
});
