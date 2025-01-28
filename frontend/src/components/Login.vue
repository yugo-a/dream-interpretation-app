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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'Login',
  setup() {
    const username = ref('');
    const password = ref('');
    const errorMessage = ref('');
    const isLoading = ref(false);
    const router = useRouter();
    const authStore = useAuthStore();

    /**
     * ログイン処理を行う関数
     */
    const handleLogin = async () => {
      errorMessage.value = '';
      isLoading.value = true;

      // Pinia ストアの login() を呼び出す
      const result = await authStore.login(username.value, password.value);

      isLoading.value = false;

      if (result.success) {
        alert('ログインに成功しました。');
        router.push('/'); // ホームページにリダイレクト
      } else {
        errorMessage.value = result.message;
      }
    };

    return { username, password, errorMessage, isLoading, handleLogin };
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
