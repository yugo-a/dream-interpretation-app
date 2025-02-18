// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/components/Home.vue';
import Login from '@/components/Login.vue';
import Register from '@/components/Register.vue';
import Dashboard from '@/components/Dashboard.vue';
import MyPage from '@/components/MyPage.vue';
import Logout from '@/components/Logout.vue';
import PasswordChange from '@/components/PasswordChange.vue';
import DeleteAccount from '@/components/DeleteAccount.vue';
import DeleteComplete from '@/components/DeleteComplete.vue';
import PasswordResetRequest from '@/components/PasswordResetRequest.vue'; 
import PasswordReset from '@/components/PasswordReset.vue';
import Favorites from '@/components/Favorites.vue';
import { useAuthStore } from '@/stores/auth'; // 追加

const routes = [
  { path: '/home', name: 'Home', component: Home },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
  { path: '/mypage', name: 'MyPage', component: MyPage, meta: { requiresAuth: true } },
  { path: '/logout', name: 'Logout', component: Logout },
  { path: '/change-password', name: 'PasswordChange', component: PasswordChange, meta: { requiresAuth: true } },
  { path: '/delete-account', name: 'DeleteAccount', component: DeleteAccount, meta: { requiresAuth: true } },
  { path: '/delete-complete', name: 'DeleteComplete', component: DeleteComplete, meta: { requiresAuth: true } },
  { path: '/password-reset-request', name: 'PasswordResetRequest', component: PasswordResetRequest },
  { path: '/password-reset/:resetKey', name: 'PasswordReset', component: PasswordReset },
  { path: '/favorites', name: 'Favorites', component: Favorites, meta: { requiresAuth: true } },
  { path: '/', redirect: '/home' },
  { path: '/:pathMatch(.*)*', redirect: '/home' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// ナビゲーションガードの設定
router.beforeEach(async (to, from, next) => {
  // 認証ストアから認証状態を取得（認証状態のチェックが完了するまで待つ）
  const authStore = useAuthStore();
  await authStore.checkLoginStatus();

  // 認証が必要なルートの場合
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (authStore.isLoggedIn) {
      next();
    } else {
      next('/login');
    }
  } else {
    // ログインまたは登録画面にアクセスする場合、すでにログインしているならホームへ
    if (to.path === '/login' || to.path === '/register') {
      if (authStore.isLoggedIn) {
        next('/home');
      } else {
        next();
      }
    } else {
      next();
    }
  }
});

export default router;
