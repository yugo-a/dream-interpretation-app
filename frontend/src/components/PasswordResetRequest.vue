<template>
  <div class="password-reset-request-container">
    <h2>パスワード再設定リクエスト</h2>
    <form @submit.prevent="handlePasswordResetRequest">
      <div class="form-group">
        <label for="username">ユーザー名</label>
        <input type="text" id="username" v-model="username" required placeholder="ユーザー名を入力してください" />
      </div>
      <div class="form-group">
        <label for="email">メールアドレス</label>
        <input type="email" id="email" v-model="email" required placeholder="メールアドレスを入力してください" />
      </div>
      <div v-if="message" class="message" :class="{'error-message': isError, 'success-message': !isError}">
        {{ message }}
      </div>
      <button type="submit" :disabled="isLoading">送信</button>
      <div v-if="isLoading" class="loading-spinner">送信中...</div>
    </form>
  </div>
</template>

<script>
import axios from '@/axios';
import { ref } from 'vue';

export default {
  name: 'PasswordResetRequest',
  setup() {
    const username = ref('');
    const email = ref('');
    const message = ref('');
    const isError = ref(false);
    const isLoading = ref(false);

    const handlePasswordResetRequest = async () => {
      message.value = '';
      isError.value = false;
      isLoading.value = true;
      try {
        const response = await axios.post(
          '/passwordResetRequest',
          { username: username.value, email: email.value },
          { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
        );
        if (response.data.status === 'success') {
          message.value = 'パスワード再設定用のリンクを送信しました。メールを確認してください。';
        } else {
          isError.value = true;
          message.value = response.data.message || 'リクエストに失敗しました。';
        }
      } catch (error) {
        isError.value = true;
        message.value = error.response?.data?.message || 'サーバーエラーが発生しました。';
      } finally {
        isLoading.value = false;
      }
    };

    return { username, email, message, isError, isLoading, handlePasswordResetRequest };
  },
};
</script>

<style scoped>
.password-reset-request-container {
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
input[type='email'] {
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
  background-color: #a8d5ff;
  cursor: not-allowed;
}

.error-message {
  color: red;
  text-align: center;
  margin-bottom: 10px;
}

.success-message {
  color: green;
  text-align: center;
  margin-bottom: 10px;
}

.loading-spinner {
  text-align: center;
  margin-top: 10px;
  color: #555;
}
</style>
