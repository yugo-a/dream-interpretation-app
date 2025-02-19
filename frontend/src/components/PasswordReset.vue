<template>
  <div class="password-reset-container">
    <h2>パスワード再設定</h2>
    <form @submit.prevent="handlePasswordReset">
      <div class="form-group">
        <label for="newPassword">新しいパスワード</label>
        <input type="password" id="newPassword" v-model="newPassword" required placeholder="新しいパスワードを入力してください" />
      </div>
      <div class="form-group">
        <label for="confirmNewPassword">新しいパスワード確認</label>
        <input type="password" id="confirmNewPassword" v-model="confirmNewPassword" required placeholder="新しいパスワードを再度入力してください" />
      </div>
      <div v-if="message" class="message" :class="{'error-message': isError, 'success-message': !isError}">
        {{ message }}
      </div>
      <button type="submit" :disabled="isLoading">パスワード再設定</button>
      <div v-if="isLoading" class="loading-spinner">処理中...</div>
    </form>
  </div>
</template>

<script>
import axios from '@/axios';
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

export default {
  name: 'PasswordReset',
  setup() {
    const newPassword = ref('');
    const confirmNewPassword = ref('');
    const message = ref('');
    const isError = ref(false);
    const isLoading = ref(false);
    const router = useRouter();
    const route = useRoute();

    // URLパラメータからリセットトークンを取得
    const resetKey = route.params.resetKey;

    const handlePasswordReset = async () => {
      message.value = '';
      isError.value = false;

      // パスワード確認チェック
      if (newPassword.value !== confirmNewPassword.value) {
        message.value = 'パスワードが一致しません。';
        isError.value = true;
        return;
      }

      isLoading.value = true;
      try {
        const response = await axios.post(
          `/passwordReset/${resetKey}`,
          { newPassword: newPassword.value },
          { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
        );
        if (response.data.status === 'success') {
          message.value = 'パスワードが再設定されました。';
          // 数秒後にホーム画面へ遷移
          setTimeout(() => {
            router.push('/home');
          }, 2000);
        } else {
          isError.value = true;
          message.value = response.data.message || 'パスワード再設定に失敗しました。';
        }
      } catch (error) {
        isError.value = true;
        message.value = error.response?.data?.message || 'サーバーエラーが発生しました。';
      } finally {
        isLoading.value = false;
      }
    };

    return { newPassword, confirmNewPassword, message, isError, isLoading, handlePasswordReset };
  },
};
</script>

<style scoped>
.password-reset-container {
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
