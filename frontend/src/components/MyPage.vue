<template>
  <div class="mypage-container">
    <h2>マイページ</h2>

    <!-- ユーザー名の表示 -->
    <h3 v-if="user && user.username">こんにちは、{{ user.username }}さん！</h3>
    <h3 v-else>こんにちは！</h3>

    <!-- ローディングインジケーター -->
    <div v-if="isLoading" class="loading-spinner">
      データを読み込み中...
    </div>

    <!-- エラーメッセージ -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <!-- コンテンツがロードされ、エラーがない場合に表示 -->
    <div v-if="!isLoading && !errorMessage">
      <!-- プロフィール編集フォームなどをここに配置 -->
      <!-- 例: <p>メールアドレス: {{ email }}</p> -->
      <!-- ... -->
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/auth';
import axios from '@/axios'; // カスタムaxiosインスタンスを利用

export default {
  name: 'MyPage',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const authStore = useAuthStore();

    // Pinia ストアからユーザー情報を取得
    const user = computed(() => authStore.user);

    // ローディングやエラーメッセージ管理
    const isLoading = ref(true);
    const errorMessage = ref('');

    // プロフィール編集用
    const username = ref('');
    const email = ref('');
    const age = ref('');
    const gender = ref('');
    const stress = ref('');
    const dreamTheme = ref('');
    const updateErrorMessage = ref('');
    const successMessage = ref('');
    const isUpdating = ref(false);

    // 退会関連
    const showDeleteConfirmation = ref(false);
    const deleteErrorMessage = ref('');

    /**
     * ユーザーデータを取得する関数
     */
    const fetchUserData = async () => {
      try {
        // GET http://localhost:3000/api/getUserData (src/axios.jsによりbaseURL適用)
        const response = await axios.get('/getUserData');

        if (response.data.status === 'success') {
          const userData = response.data.user;
          username.value = userData.username || '';
          email.value = userData.email || '';
          age.value = userData.age !== null && userData.age !== undefined ? userData.age : '';
          gender.value = userData.gender || '';
          stress.value = userData.stress || '';
          dreamTheme.value = userData.dreamTheme || '';
        } else {
          errorMessage.value = response.data.message || 'ユーザーデータの取得に失敗しました。';
        }
      } catch (error) {
        console.error('ユーザーデータ取得エラー:', error);
        errorMessage.value = error.response?.data?.message || 'サーバーエラーが発生しました。';
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * プロフィール更新
     */
    const handleUpdate = async () => {
      updateErrorMessage.value = '';
      successMessage.value = '';
      isUpdating.value = true;

      // バリデーション（例）
      if (username.value.trim() === '') {
        updateErrorMessage.value = 'ユーザー名は必須です。';
        isUpdating.value = false;
        return;
      }
      if (email.value.trim() === '') {
        updateErrorMessage.value = 'メールアドレスは必須です。';
        isUpdating.value = false;
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value.trim())) {
        updateErrorMessage.value = '有効なメールアドレスを入力してください。';
        isUpdating.value = false;
        return;
      }

      try {
        // POST http://localhost:3000/api/updateUser
        const response = await axios.post('/updateUser', {
          username: username.value.trim(),
          email: email.value.trim(),
          age: age.value ? parseInt(age.value, 10) : null,
          gender: gender.value,
          stress: stress.value,
          dreamTheme: dreamTheme.value,
        });

        if (response.data.status === 'success') {
          successMessage.value = 'プロフィールが更新されました。';
          // 最新データを再取得
          await fetchUserData();
          // Piniaのユーザー情報も更新
          authStore.user = response.data.user;
        } else {
          updateErrorMessage.value =
            response.data.message || 'プロフィールの更新に失敗しました。';
        }
      } catch (error) {
        console.error('プロフィール更新エラー:', error);
        updateErrorMessage.value =
          error.response?.data?.message || 'サーバーエラーが発生しました。';
      } finally {
        isUpdating.value = false;
      }
    };

    /**
     * 退会確認ダイアログを表示
     */
    const confirmDeleteAccount = () => {
      showDeleteConfirmation.value = true;
    };

    /**
     * 退会を実行
     */
    const handleDeleteAccount = async () => {
      deleteErrorMessage.value = '';

      try {
        // DELETE http://localhost:3000/api/deleteAccount
        const response = await axios.delete('/deleteAccount');

        if (response.data.status === 'success') {
          toast.success('アカウントが削除されました。ご利用ありがとうございました。');
          router.push('/'); // ホームへリダイレクト
        } else {
          deleteErrorMessage.value =
            response.data.message || 'アカウントの削除に失敗しました。';
        }
      } catch (error) {
        console.error('アカウント削除エラー:', error);
        deleteErrorMessage.value =
          error.response?.data?.message || 'サーバーエラーが発生しました。';
      } finally {
        showDeleteConfirmation.value = false;
      }
    };

    /**
     * 退会確認ダイアログをキャンセル
     */
    const cancelDeleteAccount = () => {
      showDeleteConfirmation.value = false;
    };

    onMounted(() => {
      fetchUserData();
    });

    return {
      // プロフィール編集用
      username,
      email,
      age,
      gender,
      stress,
      dreamTheme,
      isLoading,
      isUpdating,
      errorMessage,
      updateErrorMessage,
      successMessage,
      handleUpdate,

      // 退会
      showDeleteConfirmation,
      deleteErrorMessage,
      confirmDeleteAccount,
      handleDeleteAccount,
      cancelDeleteAccount,

      // ユーザー情報
      user,
    };
  },
};
</script>

<style scoped>
.mypage-container {
  max-width: 600px;
  margin: 50px auto;
  padding: 30px;
  border: 1px solid #ccc;
  border-radius: 10px;
  background-color: #fafafa;
  font-family: Arial, sans-serif;
}

h2 {
  text-align: center;
  margin-bottom: 30px;
}

h3 {
  text-align: center;
}

/* フォームグループ */
.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

input[type='text'],
input[type='email'],
input[type='number'],
select {
  width: 100%;
  padding: 10px;
  border: 1px solid #bbb;
  border-radius: 5px;
  box-sizing: border-box;
}

/* ボタン */
.btn {
  width: 100%;
  padding: 12px;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  margin-bottom: 10px;
}

.btn-primary {
  background-color: #28a745;
}
.btn-primary:hover {
  background-color: #218838;
}

.btn-danger {
  background-color: #dc3545;
}
.btn-danger:hover {
  background-color: #c82333;
}

.error-message {
  color: red;
  margin-bottom: 15px;
  text-align: center;
}

.success-message {
  color: green;
  margin-bottom: 15px;
  text-align: center;
}

.loading-spinner {
  text-align: center;
  margin-top: 15px;
  color: #555;
}

.confirmation-dialog {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #dc3545;
  border-radius: 10px;
  background-color: #ffe6e6;
  text-align: center;
}

.confirm-button {
  background-color: #dc3545;
  margin-right: 10px;
}
.confirm-button:hover {
  background-color: #c82333;
}

.cancel-button {
  background-color: #6c757d;
}
.cancel-button:hover {
  background-color: #5a6268;
}
</style>
