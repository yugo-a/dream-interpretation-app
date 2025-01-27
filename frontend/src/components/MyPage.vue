<!-- src/components/MyPage.vue -->
<template>
  <div class="mypage-container">
    <h2>マイページ</h2>
    
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
      <form @submit.prevent="handleUpdate">
        <div class="form-group">
          <label for="username">ユーザー名</label>
          <input
            type="text"
            id="username"
            v-model="username"
            placeholder="ユーザー名を入力してください"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input
            type="email"
            id="email"
            v-model="email"
            placeholder="メールアドレスを入力してください"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="age">年齢</label>
          <input
            type="number"
            id="age"
            v-model="age"
            placeholder="年齢を入力してください"
            min="0"
          />
        </div>
        
        <div class="form-group">
          <label for="gender">性別</label>
          <select id="gender" v-model="gender" required>
            <option disabled value="">選択してください</option>
            <option value="男性">男性</option>
            <option value="女性">女性</option>
            <option value="その他">その他</option>
          </select>
        </div>
        
        <!-- 他のプロフィール項目（例: ストレスレベル、夢のテーマなど） -->
        <div class="form-group">
          <label for="stress">ストレスレベル</label>
          <select id="stress" v-model="stress">
            <option disabled value="">選択してください</option>
            <option value="低">低</option>
            <option value="中">中</option>
            <option value="高">高</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="dreamTheme">夢のテーマ</label>
          <input
            type="text"
            id="dreamTheme"
            v-model="dreamTheme"
            placeholder="夢のテーマを入力してください"
          />
        </div>
        
        <!-- 更新エラーメッセージ -->
        <div v-if="updateErrorMessage" class="error-message">
          {{ updateErrorMessage }}
        </div>
        
        <!-- プロフィール更新ボタン -->
        <button type="submit" class="btn btn-primary" :disabled="isUpdating">
          プロフィール変更
        </button>
        
        <!-- プロフィール更新中のローディングインジケーター -->
        <div v-if="isUpdating" class="loading-spinner">
          更新中...
        </div>
      </form>
      
      <!-- ナビゲーションリンク（ホーム、お気に入り） -->
      <div class="navigation-links">
        <router-link to="/home" class="nav-link">
          <button class="btn btn-secondary">ホームへ戻る</button>
        </router-link>
        
        <router-link to="/favorites" class="nav-link">
          <button class="btn btn-secondary">お気に入り一覧</button>
        </router-link>
      </div>
      
      <!-- パスワード変更へのリンクボタン -->
      <div class="password-change-section">
        <router-link to="/change-password" class="nav-link">
          <button class="btn btn-secondary">パスワード変更</button>
        </router-link>
      </div>
      
      <!-- 退会ボタン -->
      <div class="account-deletion-section">
        <h3>アカウント削除</h3>
        <button @click="confirmDeleteAccount" class="btn btn-danger">
          退会
        </button>
        
        <!-- 退会確認ダイアログ -->
        <div v-if="showDeleteConfirmation" class="confirmation-dialog">
          <p>本当にアカウントを削除しますか？この操作は取り消せません。</p>
          <button @click="handleDeleteAccount" class="btn btn-danger confirm-button">はい、削除します</button>
          <button @click="cancelDeleteAccount" class="btn btn-secondary cancel-button">キャンセル</button>
        </div>
        
        <!-- 退会エラーメッセージ -->
        <div v-if="deleteErrorMessage" class="error-message">
          {{ deleteErrorMessage }}
        </div>
      </div>
      
      <!-- 成功メッセージ -->
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
      
    </div>
  </div>
</template>

<script>
import axios from '@/axios';
import { ref, onMounted } from 'vue'; // 'computed' を削除
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
    };
  },
};
</script>

<style scoped>
/* （既存のスタイルコード） */
</style>
