<!-- src/components/MyPage.vue -->
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
      <!-- プロフィール編集フォーム -->
      <div class="form-group">
        <label for="username">ユーザー名</label>
        <input
          type="text"
          id="username"
          v-model="username"
          placeholder="ユーザー名を入力"
        />
      </div>

      <div class="form-group">
        <label for="email">メールアドレス</label>
        <input
          type="email"
          id="email"
          v-model="email"
          placeholder="メールアドレスを入力"
        />
      </div>

      <div class="form-group">
        <label for="age">年齢</label>
        <input
          type="number"
          id="age"
          v-model="age"
          placeholder="年齢を入力"
        />
      </div>

      <div class="form-group">
        <label for="gender">性別</label>
        <select id="gender" v-model="gender">
          <option value="">選択してください</option>
          <option value="male">男性</option>
          <option value="female">女性</option>
          <option value="other">その他</option>
        </select>
      </div>

      <div class="form-group">
        <label for="stress">ストレス</label>
        <input
          type="text"
          id="stress"
          v-model="stress"
          placeholder="ストレスの状態など"
        />
      </div>

      <div class="form-group">
        <label for="dreamTheme">夢テーマ</label>
        <input
          type="text"
          id="dreamTheme"
          v-model="dreamTheme"
          placeholder="夢のテーマ"
        />
      </div>

      <!-- プロフィール更新ボタン -->
      <div v-if="updateErrorMessage" class="error-message">
        {{ updateErrorMessage }}
      </div>
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
      <button
        class="btn btn-primary"
        @click="handleUpdate"
        :disabled="isUpdating"
      >
        プロフィールを更新
      </button>

      <!-- 退会ボタン -->
      <button class="btn btn-danger" @click="confirmDeleteAccount">
        退会する
      </button>
      <div v-if="showDeleteConfirmation" class="confirmation-dialog">
        <p>本当に退会しますか？</p>
        <div v-if="deleteErrorMessage" class="error-message">
          {{ deleteErrorMessage }}
        </div>
        <button class="btn confirm-button" @click="handleDeleteAccount">
          退会する
        </button>
        <button class="btn cancel-button" @click="cancelDeleteAccount">
          キャンセル
        </button>
      </div>
    </div>

    <!-- ▼ 追加: ナビゲーション（ホームへ戻る・お気に入り一覧・ログアウト） -->
    <div class="navigation-links">
      <!-- ホーム画面へのリンク -->
      <router-link class="btn btn-secondary nav-link" to="/">ホームへ戻る</router-link>
      <!-- お気に入り一覧へのリンク -->
      <router-link class="btn btn-secondary nav-link" to="/favorites">お気に入り一覧</router-link>
      <!-- ログアウトボタン -->
      <button class="btn btn-danger nav-link" @click="handleLogout">ログアウト</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/auth';
import axios from '@/axios';

export default {
  name: 'MyPage',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const authStore = useAuthStore();

    // Pinia ストアからユーザー情報を参照
    const user = computed(() => authStore.user);

    const isLoading = ref(true);
    const errorMessage = ref('');

    // プロフィール編集用の各値
    const username = ref('');
    const email = ref('');
    const age = ref('');
    const gender = ref('');
    const stress = ref('');
    const dreamTheme = ref('');
    const updateErrorMessage = ref('');
    const successMessage = ref('');
    const isUpdating = ref(false);

    // 退会用
    const showDeleteConfirmation = ref(false);
    const deleteErrorMessage = ref('');

    // --- ユーザーデータ取得 ---
    const fetchUserData = async () => {
      try {
        // baseURL が "/api" として設定されている場合、先頭の "/api" は不要
        const response = await axios.get('/getUserData', { withCredentials: true });
        if (response.data.status === 'success') {
          const userData = response.data.user;
          username.value = userData.username || '';
          email.value = userData.email || '';
          age.value = userData.age ?? '';
          gender.value = userData.gender || '';
          stress.value = userData.stress || '';
          dreamTheme.value = userData.dreamTheme || '';
        } else {
          errorMessage.value =
            response.data.message || 'ユーザーデータの取得に失敗しました。';
        }
      } catch (error) {
        console.error('ユーザーデータ取得エラー:', error);
        errorMessage.value =
          error.response?.data?.message || 'サーバーエラーが発生しました。';
      } finally {
        isLoading.value = false;
      }
    };

    // --- プロフィール更新 ---
    const handleUpdate = async () => {
      updateErrorMessage.value = '';
      successMessage.value = '';
      isUpdating.value = true;

      // 簡易バリデーション
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
        // エンドポイントの先頭 "/api" を削除
        const response = await axios.post(
          '/updateUser',
          {
            username: username.value.trim(),
            email: email.value.trim(),
            age: age.value ? parseInt(age.value, 10) : null,
            gender: gender.value,
            stress: stress.value,
            dreamTheme: dreamTheme.value,
          },
          { withCredentials: true }
        );

        if (response.data.status === 'success') {
          successMessage.value = 'プロフィールが更新されました。';
          // 最新データを再取得
          await fetchUserData();
          // Pinia ストアのユーザー情報も更新
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

    // --- 退会 ---
    const confirmDeleteAccount = () => {
      showDeleteConfirmation.value = true;
    };
    const cancelDeleteAccount = () => {
      showDeleteConfirmation.value = false;
    };
    const handleDeleteAccount = async () => {
      deleteErrorMessage.value = '';
      try {
        // エンドポイントの先頭 "/api" を削除
        const response = await axios.delete('/deleteAccount', { withCredentials: true });
        if (response.data.status === 'success') {
          toast.success('アカウントが削除されました。ご利用ありがとうございました。');
          router.push('/'); // ホーム画面へ
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

    // --- ログアウト ---
    const handleLogout = async () => {
      try {
        await authStore.logout();
        router.push('/');
      } catch (err) {
        console.error('ログアウトに失敗:', err);
      }
    };

    onMounted(() => {
      fetchUserData();
    });

    return {
      user,
      isLoading,
      errorMessage,

      // プロフィール
      username,
      email,
      age,
      gender,
      stress,
      dreamTheme,
      updateErrorMessage,
      successMessage,
      isUpdating,
      handleUpdate,

      // 退会
      showDeleteConfirmation,
      deleteErrorMessage,
      confirmDeleteAccount,
      handleDeleteAccount,
      cancelDeleteAccount,

      // ログアウト
      handleLogout,
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

/* ボタン共通 */
.btn {
  width: 100%;
  padding: 12px;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  margin-bottom: 10px;
  text-align: center;
  display: inline-block;
  box-sizing: border-box;
  font-weight: normal; /* すべて同じ太さに */
}

/* ボタン色 */
.btn-primary {
  background-color: #28a745; /* プロフィール更新用 */
}
.btn-primary:hover {
  background-color: #218838;
}
.btn-secondary {
  background-color: #17a2b8; /* ナビゲーション用 */
}
.btn-secondary:hover {
  background-color: #117a8b;
}
.btn-danger {
  background-color: #dc3545; /* 退会・ログアウト用 */
}
.btn-danger:hover {
  background-color: #c82333;
}

/* エラーや成功メッセージ */
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

/* 退会ダイアログ */
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

/* ナビゲーションリンク（ホーム・お気に入り・ログアウト）のコンテナ */
.navigation-links {
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ナビゲーションリンク内のボタン（router-link や button）をすべてブロック表示にして統一 */
.navigation-links .btn {
  display: block;
  width: 100%;
  padding: 12px;
  font-size: 16px;
  margin-bottom: 10px;
  box-sizing: border-box;
  text-align: center;
}

/* レスポンシブ */
@media (max-width: 600px) {
  .mypage-container {
    width: 90%;
    padding: 20px;
  }
  .btn {
    padding: 10px;
    font-size: 14px;
  }
  .navigation-links {
    gap: 5px;
  }
}
</style>
