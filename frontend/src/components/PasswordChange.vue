<!-- src/components/PasswordChange.vue -->
<template>
    <div class="password-change-container">
      <h2>パスワード変更</h2>
      <form @submit.prevent="handleChangePassword">
        
        <!-- 1. 現在のパスワードフィールドを再追加 -->
        <div class="form-group">
          <label for="currentPassword">現在のパスワード</label>
          <input
            type="password"
            id="currentPassword"
            v-model="currentPassword"
            placeholder="現在のパスワードを入力してください"
            required
          />
        </div>
  
        <!-- 2. 新しいパスワードフィールド -->
        <div class="form-group">
          <label for="newPassword">新しいパスワード</label>
          <input
            type="password"
            id="newPassword"
            v-model="newPassword"
            placeholder="新しいパスワードを入力してください"
            required
          />
        </div>
        
        <!-- 3. 新しいパスワード確認フィールド -->
        <div class="form-group">
          <label for="confirmNewPassword">新しいパスワード確認</label>
          <input
            type="password"
            id="confirmNewPassword"
            v-model="confirmNewPassword"
            placeholder="新しいパスワードを再度入力してください"
            required
          />
        </div>
        
        <!-- 4. エラーメッセージ -->
        <div v-if="passwordErrorMessage" class="error-message">
          {{ passwordErrorMessage }}
        </div>
        
        <!-- 5. 成功メッセージ -->
        <div v-if="passwordSuccessMessage" class="success-message">
          {{ passwordSuccessMessage }}
        </div>
        
        <!-- 6. 送信ボタン -->
        <button type="submit" :disabled="isChangingPassword">
          パスワード変更
        </button>
        
        <!-- 7. ローディングインジケーター -->
        <div v-if="isChangingPassword" class="loading-spinner">
          変更中...
        </div>
      </form>
    </div>
  </template>
  
  <script>
  import axios from '@/axios';
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  
  export default {
    name: 'PasswordChange',
    setup() {
      const router = useRouter();
      
      // 1. 現在のパスワードのデータバインディング
      const currentPassword = ref('');
      
      // 2. 新しいパスワードのデータバインディング
      const newPassword = ref('');
      
      // 3. 新しいパスワード確認のデータバインディング
      const confirmNewPassword = ref('');
      
      // 4. ローディング状態の管理
      const isChangingPassword = ref(false);
      
      // 5. エラーメッセージの管理
      const passwordErrorMessage = ref('');
      
      // 6. 成功メッセージの管理
      const passwordSuccessMessage = ref('');
  
      // 7. パスワード変更を処理する関数
      const handleChangePassword = async () => {
        // メッセージの初期化
        passwordErrorMessage.value = '';
        passwordSuccessMessage.value = '';
  
        // バリデーション: 新しいパスワードと確認パスワードが一致すること
        if (newPassword.value !== confirmNewPassword.value) {
          passwordErrorMessage.value = '新しいパスワードが一致しません。';
          return;
        }
  
        // ローディング状態を開始
        isChangingPassword.value = true;
  
        try {
          // 8. バックエンドにリクエストを送信
          const response = await axios.post(
            '/changePassword',
            {
              currentPassword: currentPassword.value, // 現在のパスワード
              newPassword: newPassword.value,         // 新しいパスワード
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              withCredentials: true, // クッキーを含める
            }
          );
  
          // 9. レスポンスの処理
          if (response.data.status === 'success') {
            passwordSuccessMessage.value = 'パスワードが変更されました。';
            // フォームのリセット
            currentPassword.value = '';
            newPassword.value = '';
            confirmNewPassword.value = '';
            // マイページにリダイレクト
            router.push('/mypage');
          } else {
            passwordErrorMessage.value = response.data.message || 'パスワードの変更に失敗しました。';
          }
        } catch (error) {
          console.error('パスワード変更エラー:', error);
          passwordErrorMessage.value = error.response?.data?.message || 'サーバーエラーが発生しました。';
        } finally {
          // ローディング状態を終了
          isChangingPassword.value = false;
        }
      };
  
      return {
        currentPassword,
        newPassword,
        confirmNewPassword,
        isChangingPassword,
        passwordErrorMessage,
        passwordSuccessMessage,
        handleChangePassword,
      };
    },
  };
  </script>
  
  <style scoped>
  .password-change-container {
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
  
  .form-group {
    margin-bottom: 20px;
  }
  
  label {
    display: block;
    margin-bottom: 8px;
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
    padding: 12px;
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
  
  /* レスポンシブデザイン */
  @media (max-width: 600px) {
    .password-change-container {
      padding: 20px;
    }
  
    button {
      padding: 10px;
      font-size: 14px;
    }
  }
  </style>
  