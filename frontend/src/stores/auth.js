import { defineStore } from 'pinia';
import axios from '@/axios'; // baseURL: '/api' を設定済みのaxios

/**
 * 認証系ストア
 * - checkLoginStatus() でサーバーセッションを確認
 * - login() / logout() でAPIを呼ぶ
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoggedIn: false,
    user: null,
  }),

  actions: {
    /**
     * サーバーから現在のセッション状態を確認し、isLoggedIn / user を更新。
     */
    async checkLoginStatus() {
      try {
        // /api/checksession にアクセスして { loggedIn: boolean, user: {...} } を取得
        const res = await axios.get('/checksession', { withCredentials: true });

        if (res.data.loggedIn) {
          this.isLoggedIn = true;
          this.user = res.data.user;
        } else {
          this.isLoggedIn = false;
          this.user = null;
        }
      } catch (error) {
        console.error('ログイン状態確認エラー:', error);
        this.isLoggedIn = false;
        this.user = null;
      }
    },

    /**
     * ログイン (サンプル)
     */
    async login(username, password) {
      try {
        const response = await axios.post('/login', { username, password }, { withCredentials: true });
        if (response.data.status === 'success') {
          this.isLoggedIn = true;
          this.user = response.data.user;
          return { success: true };
        } else {
          return { success: false, message: response.data.message };
        }
      } catch (error) {
        console.error('ログインエラー:', error);
        return {
          success: false,
          message: error.response?.data?.message || 'サーバーエラーが発生しました。'
        };
      }
    },

    /**
     * ログアウト
     */
    async logout() {
      try {
        const response = await axios.post('/logout', {}, { withCredentials: true });
        if (response.data.status === 'success') {
          this.isLoggedIn = false;
          this.user = null;
        } else {
          console.error('ログアウトに失敗:', response.data.message);
        }
      } catch (error) {
        console.error('ログアウトエラー:', error);
      }
    },

    /**
     * ユーザープロフィール更新 (例)
     */
    async updateUserProfile(updatedData) {
      try {
        const response = await axios.post('/updateUser', updatedData, {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        });
        if (response.data.status === 'success') {
          this.user = response.data.user;
          return { success: true };
        } else {
          return { success: false, message: response.data.message };
        }
      } catch (error) {
        console.error('プロフィール更新エラー:', error);
        return {
          success: false,
          message: error.response?.data?.message || 'サーバーエラーが発生しました。'
        };
      }
    },
  },
});
