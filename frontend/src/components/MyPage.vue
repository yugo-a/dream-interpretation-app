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
  import axios from 'axios';
  import { ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  
  export default {
    name: 'MyPage',
    setup() {
      const router = useRouter();
      
      // プロフィール編集用のデータ
      const username = ref('');
      const email = ref('');
      const age = ref('');
      const gender = ref('');
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
          const response = await axios.get('http://localhost:3000/api/getUserData', {
            withCredentials: true, // クッキーを含める
          });
  
          if (response.data.status === 'success') {
            const user = response.data.user;
            username.value = user.name || ''; // user.name を username にマッピング
            email.value = user.email || '';
            age.value = user.age !== null && user.age !== undefined ? user.age : '';
            gender.value = user.gender || '';
            // 他のフィールド（stress, dreamTheme）も必要に応じて設定
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
            'http://localhost:3000/api/updateUser',
            {
              username: username.value.trim(),
              email: email.value.trim(),
              age: age.value ? parseInt(age.value) : null,
              gender: gender.value,
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
          const response = await axios.delete('http://localhost:3000/api/deleteAccount', {
            withCredentials: true, // クッキーを含める
          });
  
          if (response.data.status === 'success') {
            alert('アカウントが削除されました。ご利用ありがとうございました。');
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
  