<!-- src/components/MyPage.vue -->
<template>
  <div class="mypage-container">
    <h2>マイページ</h2>
    
    <!-- ユーザー名の表示 -->
    <h3 v-if="user && user.username">
     こんにちは、{{ user.username }}さん！
    </h3>
    <h3 v-else>
     こんにちは！
    </h3>    
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
      <!-- プロフィール編集フォーム -->
      <!-- （既存のフォームコード） -->
    </div>
  </div>
</template>

<script>
import axios from '@/axios';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'MyPage',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const authStore = useAuthStore();

    // プロフィール編集用のデータ
    const username = ref('');
    const email = ref('');
    const age = ref('');
    const gender = ref('');
    const stress = ref('');
    const dreamTheme = ref('');
    const isLoading = ref(true);
    const isUpdating = ref(false);
    const errorMessage = ref('');
    const updateErrorMessage = ref('');
    const successMessage = ref('');

    // 退会用のデータ
    const showDeleteConfirmation = ref(false);
    const deleteErrorMessage = ref('');

    // Pinia ストアからユーザー情報を取得
    const user = computed(() => authStore.user); // この変数を使用する

    /**
     * ユーザーデータを取得する関数
     */
    const fetchUserData = async () => {
      try {
        const response = await axios.get('/api/getUserData', {
          withCredentials: true, // クッキーを含める
        });

        if (response.data.status === 'success') {
          const userData = response.data.user;
          username.value = userData.username || '';
          email.value = userData.email || '';
          age.value = userData.age !== null && userData.age !== undefined ? userData.age : '';
          gender.value = userData.gender || '';
          stress.value = userData.stress || '';
          dreamTheme.value = userData.dreamTheme || '';
          // 他のフィールドも必要に応じて設定
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
     * プロフィールを更新する関数
     */
    const handleUpdate = async () => {
      updateErrorMessage.value = '';
      successMessage.value = '';
      isUpdating.value = true;

      // バリデーション（簡易）
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
      // メールアドレスの形式チェック（簡易）
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value.trim())) {
        updateErrorMessage.value = '有効なメールアドレスを入力してください。';
        isUpdating.value = false;
        return;
      }

      try {
        const response = await axios.post(
          '/api/updateUser',
          {
            username: username.value.trim(),
            email: email.value.trim(),
            age: age.value ? parseInt(age.value) : null,
            gender: gender.value,
            stress: stress.value,
            dreamTheme: dreamTheme.value,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            withCredentials: true, // クッキーを含める
          }
        );

        if (response.data.status === 'success') {
          successMessage.value = 'プロフィールが更新されました。';
          // 必要に応じて、再度ユーザーデータを取得する
          await fetchUserData();
          // Pinia ストアのユーザー情報を更新
          authStore.user = response.data.user;
        } else {
          updateErrorMessage.value = response.data.message || 'プロフィールの更新に失敗しました。';
        }
      } catch (error) {
        console.error('プロフィール更新エラー:', error);
        updateErrorMessage.value = error.response?.data?.message || 'サーバーエラーが発生しました。';
      } finally {
        isUpdating.value = false;
      }
    };

    /**
     * 退会確認ダイアログを表示する関数
     */
    const confirmDeleteAccount = () => {
      showDeleteConfirmation.value = true;
    };

    /**
     * 退会を処理する関数
     */
    const handleDeleteAccount = async () => {
      deleteErrorMessage.value = '';
      
      try {
        const response = await axios.delete('/api/deleteAccount', {
          withCredentials: true, // クッキーを含める
        });

        if (response.data.status === 'success') {
          toast.success('アカウントが削除されました。ご利用ありがとうございました。');
          router.push('/'); // ホームページにリダイレクト
        } else {
          deleteErrorMessage.value = response.data.message || 'アカウントの削除に失敗しました。';
        }
      } catch (error) {
        console.error('アカウント削除エラー:', error);
        deleteErrorMessage.value = error.response?.data?.message || 'サーバーエラーが発生しました。';
      } finally {
        showDeleteConfirmation.value = false;
      }
    };

    /**
     * 退会確認ダイアログをキャンセルする関数
     */
    const cancelDeleteAccount = () => {
      showDeleteConfirmation.value = false;
    };

    // コンポーネントのマウント時にユーザーデータを取得
    onMounted(() => {
      fetchUserData();
    });

    return {
      // プロフィール編集
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

      // ユーザー情報（テンプレートで使用）
      user,
    };
  },
};
</script>

<style scoped>
/* コンテナのスタイル */
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

/* フォームグループのスタイル */
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

/* 共通ボタンスタイル */
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

/* ボタンの種類別スタイル */
.btn-primary {
  background-color: #28a745; /* プロフィール変更ボタンの色 */
}

.btn-secondary {
  background-color: #17a2b8; /* ホーム・お気に入り・パスワード変更ボタンの色 */
}

.btn-danger {
  background-color: #dc3545; /* 退会ボタンの色 */
}

/* ホバー効果 */
.btn-primary:hover {
  background-color: #218838;
}

.btn-secondary:hover {
  background-color: #117a8b;
}

.btn-danger:hover {
  background-color: #c82333;
}

/* エラーメッセージのスタイル */
.error-message {
  color: red;
  margin-bottom: 15px;
  text-align: center;
}

/* 成功メッセージのスタイル */
.success-message {
  color: green;
  margin-bottom: 15px;
  text-align: center;
}

/* ローディングインジケーターのスタイル */
.loading-spinner {
  text-align: center;
  margin-top: 15px;
  color: #555;
}

/* ナビゲーションリンクセクションのスタイル */
.navigation-links {
  margin-top: 20px;
}

.nav-link {
  text-decoration: none;
}

/* ボタン間のスペースを確保 */
.navigation-links .nav-link + .nav-link {
  margin-top: 10px;
}

/* パスワード変更セクションのスタイル */
.password-change-section {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #ccc;
  text-align: center;
}

.password-change-link {
  text-decoration: none;
}

/* 退会セクションのスタイル */
.account-deletion-section {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #ccc;
}

/* 退会確認ダイアログのスタイル */
.confirmation-dialog {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #dc3545;
  border-radius: 10px;
  background-color: #ffe6e6;
  text-align: center;
}

/* 確認ダイアログ内のボタンスタイル */
.confirm-button {
  background-color: #dc3545;
  margin-right: 10px;
}

.cancel-button {
  background-color: #6c757d;
}

.confirm-button:hover {
  background-color: #c82333;
}

.cancel-button:hover {
  background-color: #5a6268;
}

/* レスポンシブデザイン */
@media (max-width: 600px) {
  .mypage-container {
    padding: 20px;
  }

  button {
    padding: 10px;
    font-size: 14px;
  }

  .confirm-button,
  .cancel-button {
    width: 100%;
    margin: 5px 0;
  }
}
</style>
