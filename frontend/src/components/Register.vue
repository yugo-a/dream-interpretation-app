<!-- src/components/Register.vue -->
<template>
    <div class="register-container">
      <h2>会員登録</h2>
      <form @submit.prevent="handleRegister">
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
          <label for="email">メールアドレス</label>
          <input
            type="email"
            id="email"
            v-model="email"
            required
            placeholder="メールアドレスを入力してください"
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
        <div class="form-group">
          <label for="confirmPassword">パスワード確認</label>
          <input
            type="password"
            id="confirmPassword"
            v-model="confirmPassword"
            required
            placeholder="パスワードを再度入力してください"
          />
        </div>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        <button type="submit" :disabled="isLoading">
          会員登録
        </button>
        <div v-if="isLoading" class="loading-spinner">
          会員登録中...
        </div>
      </form>
      <p>
        すでにアカウントをお持ちですか？
        <router-link to="/login">ログインはこちら</router-link>
      </p>
    </div>
  </template>
  
  <script>
  import axios from 'axios';
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  
  export default {
    name: 'Register',
    setup() {
      const username = ref('');
      const email = ref('');
      const password = ref('');
      const confirmPassword = ref('');
      const errorMessage = ref('');
      const isLoading = ref(false);
      const router = useRouter();
  
      const handleRegister = async () => {
        errorMessage.value = '';
  
        // フロントエンドでのパスワード確認
        if (password.value !== confirmPassword.value) {
          errorMessage.value = 'パスワードが一致しません。';
          return;
        }
  
        isLoading.value = true;
  
        try {
          // 会員登録リクエスト
          const registerResponse = await axios.post(
            '/api/register',
            {
              username: username.value,
              email: email.value,
              password: password.value,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              withCredentials: true, // クッキーを含める
            }
          );
  
          if (registerResponse.data.status === 'success') {
            // 会員登録成功
            // 自動ログインリクエスト
            const loginResponse = await axios.post(
              '/api/login',
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
  
            if (loginResponse.data.status === 'success') {
              // ログイン成功
              alert('会員登録とログインに成功しました。ホームページに移動します。');
              router.push('/'); // ホームページにリダイレクト
            } else {
              // ログイン失敗（稀）
              errorMessage.value = loginResponse.data.message || 'ログインに失敗しました。';
            }
          } else {
            // 会員登録失敗
            errorMessage.value = registerResponse.data.message || '会員登録に失敗しました。';
          }
        } catch (error) {
          console.error('会員登録エラー:', error);
          errorMessage.value = error.response?.data?.message || 'サーバーエラーが発生しました。';
        } finally {
          isLoading.value = false;
        }
      };
  
      return {
        username,
        email,
        password,
        confirmPassword,
        handleRegister,
        errorMessage,
        isLoading,
      };
    },
  };
  </script>
  
  <style scoped>
  .register-container {
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
  input[type='email'],
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
    background-color: #28a745;
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
  }
  
  button:disabled {
    background-color: #a8d5a1;
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
  