<!-- src/components/Login.vue -->
<template>
    <div class="login-container">
      <h2>ログイン</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">ユーザー名</label>
          <input
            type="text"
            id="username"
            v-model="username"
            required
            placeholder="ユーザー名を入力してください"
          />
        </div>
        <div class="form-group">
          <label for="password">パスワード</label>
          <input
            type="password"
            id="password"
            v-model="password"
            required
            placeholder="パスワードを入力してください"
          />
        </div>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        <button type="submit" :disabled="isLoading">
          ログイン
        </button>
        <div v-if="isLoading" class="loading-spinner">
          ログイン中...
        </div>
      </form>
      <p>
        アカウントをお持ちでないですか？
        <router-link to="/register">会員登録はこちら</router-link>
      </p>
    </div>
  </template>
  
  <script>
  import axios from 'axios';
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  
  export default {
    name: 'Login',
    setup() {
      const username = ref('');
      const password = ref('');
      const errorMessage = ref('');
      const isLoading = ref(false);
      const router = useRouter();
  
      const handleLogin = async () => {
        errorMessage.value = '';
        isLoading.value = true;
  
        try {
          const response = await axios.post(
            'http://localhost:3000/api/login',
            {
              username: username.value,
              password: password.value,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              withCredentials: true, // クッキーを含める
            }
          );
  
          if (response.data.status === 'success') {
            // ログイン成功
            alert('ログインに成功しました。');
            router.push('/'); // ホームページにリダイレクト
          } else {
            // ログイン失敗
            errorMessage.value = response.data.message || 'ログインに失敗しました。';
          }
        } catch (error) {
          console.error('ログインエラー:', error);
          errorMessage.value = error.response?.data?.message || 'サーバーエラーが発生しました。';
        } finally {
          isLoading.value = false;
        }
      };
  
      return {
        username,
        password,
        handleLogin,
        errorMessage,
        isLoading,
      };
    },
  };
  </script>
  
  <style scoped>
  .login-container {
    max-width: 400px;
    margin: 50px auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 10px;
    background-color: #fafafa;
  }
  
  h2 {
    text-align: center;
    margin-bottom: 20px;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  
  input[type='text'],
  input[type='password'] {
    width: 100%;
    padding: 10px;
    border: 1px solid #bbb;
    border-radius: 5px;
    box-sizing: border-box;
  }
  
  button {
    width: 100%;
    padding: 10px;
    background-color: #007bff;
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
  }
  
  button:disabled {
    background-color: #a0c4ff;
    cursor: not-allowed;
  }
  
  .error-message {
    color: red;
    margin-bottom: 10px;
    text-align: center;
  }
  
  .loading-spinner {
    text-align: center;
    margin-top: 10px;
    color: #555;
  }
  </style>
  