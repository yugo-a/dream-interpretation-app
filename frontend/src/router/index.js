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
import axios from '../axios';

const routes = [
  {
    path: '/home',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/mypage',
    name: 'MyPage',
    component: MyPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/logout',
    name: 'Logout',
    component: Logout
  },
  {
    path: '/change-password',
    name: 'PasswordChange',
    component: PasswordChange,
    meta: { requiresAuth: true }
  },
  {
    path: '/delete-account',
    name: 'DeleteAccount',
    component: DeleteAccount,
    meta: { requiresAuth: true }
  },
  {
    path: '/delete-complete',
    name: 'DeleteComplete',
    component: DeleteComplete,
    meta: { requiresAuth: true }
  },
  {
    path: '/password-reset-request',
    name: 'PasswordResetRequest',
    component: PasswordResetRequest
  },
  {
    path: '/password-reset/:resetKey',
    name: 'PasswordReset',
    component: PasswordReset
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: Favorites,
    meta: { requiresAuth: true }
  },
  {
    path: '/',
    redirect: '/home' // ルートパスを /home にリダイレクト
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home' // 存在しないパスも /home にリダイレクト
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// ナビゲーションガードの設定
router.beforeEach(async (to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    try {
      const response = await axios.get('http://localhost:3000/api/checksession', { withCredentials: true });
      if (response.data.loggedIn) {
        next();
      } else {
        next('/login');
      }
    } catch (error) {
      console.error('セッションチェックエラー:', error);
      next('/login');
    }
  } else {
    if (to.path === '/login' || to.path === '/register') {
      try {
        const response = await axios.get('http://localhost:3000/api/checksession', { withCredentials: true });
        if (response.data.loggedIn) {
          next('/home');
        } else {
          next();
        }
      } catch (error) {
        next();
      }
    } else {
      next();
    }
  }
});

export default router;
