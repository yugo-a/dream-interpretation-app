// src/stores/auth.js
import { defineStore } from 'pinia';
import axios from '@/axios'; // カスタムインスタンスをインポート

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoggedIn: false,
    user: null,
  }),
  actions: {
    /**
     * ログイン状態をサーバーから確認し、ストアを更新します。
     */
    async checkLoginStatus() {
      try {
        // GET http://localhost:3000/api/checksession
        const response = await axios.get('/checksession');
        this.isLoggedIn = response.data.loggedIn;
        this.user = response.data.user || null;
      } catch (error) {
        console.error('ログイン状態確認エラー:', error);
        this.isLoggedIn = false;
        this.user = null;
      }
    },

    /**
     * ログイン処理を行います。
     * @param {String} username - ユーザー名
     * @param {String} password - パスワード
     * @returns {Object} 成功・失敗の結果
     */
    async login(username, password) {
      try {
        // POST http://localhost:3000/api/login
        const response = await axios.post('/login', { username, password });
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
          message: error.response?.data?.message || 'サーバーエラーが発生しました。',
        };
      }
    },

    /**
     * ログアウト処理を行います。
     */
    async logout() {
      try {
        // POST http://localhost:3000/api/logout
        const response = await axios.post('/logout');
        if (response.data.status === 'success') {
          this.isLoggedIn = false;
          this.user = null;
        } else {
          console.error('ログアウトに失敗しました:', response.data.message);
        }
      } catch (error) {
        console.error('ログアウトエラー:', error);
      }
    },

    /**
     * プロフィールを更新する
     * @param {Object} updatedData - 更新されたユーザーデータ
     */
    async updateUserProfile(updatedData) {
      try {
        // POST http://localhost:3000/api/updateUser
        const response = await axios.post('/updateUser', updatedData, {
          headers: { 'Content-Type': 'application/json' },
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
          message: error.response?.data?.message || 'サーバーエラーが発生しました。',
        };
      }
    },
  },
});
