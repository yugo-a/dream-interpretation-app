<template>
  <div class="home">
    <!-- ヘッダー -->
    <header>
      <div class="header-title-container">
        <h1 class="header-title">リアルタイム夢解析チャットボット</h1>
      </div>
      <div class="auth-buttons">
        <!-- 未ログインのときだけ表示 -->
        <button v-if="!isLoggedIn" @click="goToLogin">ログイン</button>
        <button v-if="!isLoggedIn" @click="goToRegister">会員登録</button>

        <!-- ログインのときだけ表示 -->
        <button v-if="isLoggedIn" @click="goToMyPage">マイページ</button>
        <button v-if="isLoggedIn" @click="goToFavorites">お気に入り一覧</button>
      </div>
    </header>

    <!-- チャット本体 -->
    <div class="chat-container">
      <!-- AI処理中のインジケーター -->
      <div v-if="isLoading" class="loading-indicator">
        <div class="spinner"></div>
        <span>AI夢占い中・・・</span>
      </div>

      <!-- チャット履歴 -->
      <div class="chat-history" ref="chatHistoryDiv">
        <div
          v-for="msg in chatHistory"
          :key="msg.id"
          :class="['chat-message', msg.type]"
        >
          <!-- ボットメッセージ -->
          <div v-if="msg.type === 'bot'" v-html="escapeHTML(msg.text)"></div>
          
          <!-- ボット制限メッセージ -->
          <div v-else-if="msg.type === 'bot-restriction'" v-html="msg.html"></div>
          
          <!-- ユーザーメッセージ -->
          <div v-else>{{ msg.text }}</div>
        </div>
      </div>

      <!-- 入力欄＋操作ボタン -->
      <div class="chat-input">
        <input
          type="text"
          v-model="message"
          @keyup.enter="sendMessage"
          placeholder="あなたの夢を教えてください..."
          :disabled="isLoading"
        />
        <button @click="sendMessage" :disabled="isLoading">送信</button>
        <button @click="clearMessages" class="clear-button">メッセージクリア</button>
      </div>

      <!-- 会話全体のお気に入りトグルボタン(登録/解除) -->
      <div class="favorite-conversation" v-if="isLoggedIn">
        <button @click="toggleFavoriteConversation">
          {{ isFavorited ? 'お気に入り登録済み' : 'お気に入り登録' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from '@/axios'; // baseURL: '/api' を設定済みのaxios
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/auth';

/**
 * Home コンポーネント
 * - ブラウザ再読み込み時、onMountedで checkLoginStatus() を呼び出し、
 *   サーバーセッションがあれば isLoggedIn を true にする
 * - 会話全体をお気に入りに登録 or 解除するトグルボタンを実装
 */
export default {
  name: 'Home',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const authStore = useAuthStore();

    // ログイン状態 (Piniaストアから取得)
    const isLoggedIn = computed(() => authStore.isLoggedIn);

    // チャット関連ステート
    const message = ref('');
    const chatHistory = ref([]);
    const isLoading = ref(false);
    const chatHistoryDiv = ref(null);

    // 「会話全体」お気に入り管理
    const isFavorited = ref(false);
    const favoriteId = ref(null); // DBにINSERT後のID

    /**
     * テキストをXSS対策エスケープ
     */
    const escapeHTML = (str) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    /**
     * マウント時にサーバーのセッションをチェック
     */
    onMounted(async () => {
      try {
        await authStore.checkLoginStatus();
      } catch (err) {
        console.error('ログイン状態確認エラー:', err);
      }
    });

    /**
     * メッセージを送信
     */
    const sendMessage = async () => {
      if (!message.value.trim()) return;

      const userMessage = message.value.trim();
      const userMessageId = Date.now();

      // ユーザーのメッセージを追加
      chatHistory.value.push({
        id: userMessageId,
        text: userMessage,
        type: 'user'
      });
      message.value = '';
      isLoading.value = true;

      try {
        const response = await axios.post(
          '/interpret-dream',
          { dream: userMessage },
          { withCredentials: true }
        );

        if (response.data.success) {
          const { interpretation, interactionId } = response.data;
          // AIレスポンスを追加
          chatHistory.value.push({
            id: interactionId,
            text: interpretation,
            type: 'bot'
          });
        } else if (response.data.message === '続きは会員登録が必要です。') {
          const restrictionMessage = '続きは<a href="/register">会員登録</a>が必要です。';
          chatHistory.value.push({
            id: Date.now() + 2,
            html: restrictionMessage,
            type: 'bot-restriction'
          });
          toast.info('続きの会話には会員登録が必要です。');
          router.push('/register');
        } else {
          chatHistory.value.push({
            id: Date.now() + 3,
            text: response.data.message || 'エラーが発生しました。もう一度お試しください。',
            type: 'bot'
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage =
          error.response?.data?.message || 'エラーが発生しました。もう一度お試しください。';
        chatHistory.value.push({
          id: Date.now() + 4,
          text: `エラーが発生しました: ${errorMessage}`,
          type: 'bot'
        });
      } finally {
        isLoading.value = false;
        scrollToBottom();
      }
    };

    /**
     * メッセージ履歴クリア
     * - クリア時にお気に入り状態もリセット
     */
    const clearMessages = () => {
      chatHistory.value = [];
      isFavorited.value = false;
      favoriteId.value = null;
    };

    /**
     * 会話全体のお気に入り登録/解除
     */
    const toggleFavoriteConversation = async () => {
      if (!isLoggedIn.value) {
        toast.info('お気に入り登録にはログインが必要です。');
        return;
      }

      try {
        if (!isFavorited.value) {
          // まだ登録されていない → 新規登録
          const response = await axios.post('/favorites', {
            chatHistory: chatHistory.value
          });
          if (response.data.status === 'success') {
            toast.success('この会話をお気に入りに登録しました！');
            isFavorited.value = true;
            favoriteId.value = response.data.favorite.id;
          } else {
            toast.error(response.data.message || 'お気に入り登録に失敗しました。');
          }
        } else {
          // 登録済み → 削除
          if (!favoriteId.value) {
            toast.error('お気に入りIDが不明のため解除できません。');
            return;
          }
          const response = await axios.delete(`/favorites/${favoriteId.value}`);
          if (response.data.status === 'success') {
            toast.success('お気に入りを解除しました。');
            isFavorited.value = false;
            favoriteId.value = null;
          } else {
            toast.error(response.data.message || 'お気に入り解除に失敗しました。');
          }
        }
      } catch (error) {
        console.error('お気に入り操作エラー:', error);
        toast.error(error.response?.data?.message || 'サーバーエラーが発生しました。');
      }
    };

    /**
     * チャット履歴を下にスクロール
     */
    const scrollToBottom = () => {
      if (chatHistoryDiv.value) {
        chatHistoryDiv.value.scrollTop = chatHistoryDiv.value.scrollHeight;
      }
    };

    /**
     * 画面遷移
     */
    const goToLogin = () => router.push('/login');
    const goToRegister = () => router.push('/register');
    const goToMyPage = () => router.push('/mypage');
    const goToFavorites = () => router.push('/favorites');

    return {
      // State
      message,
      chatHistory,
      isLoading,
      chatHistoryDiv,

      // お気に入り用
      isFavorited,
      favoriteId,

      // Computed
      isLoggedIn,

      // Methods
      escapeHTML,
      sendMessage,
      clearMessages,
      toggleFavoriteConversation,
      goToLogin,
      goToRegister,
      goToMyPage,
      goToFavorites
    };
  }
};
</script>

<style scoped>
.home {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}
* {
  box-sizing: border-box;
}

/* ヘッダー全体 */
header {
  display: flex;
  justify-content: space-between; /* 左：タイトル、右：認証ボタン */
  align-items: center;
  margin-bottom: 20px;
}

/* タイトル部分 */
.header-title-container {
  /* 必要に応じて余白やその他スタイルを追加 */
}
.header-title {
  margin: 0;
  white-space: nowrap;       
  overflow: hidden;          
  text-overflow: ellipsis;   
}

/* 認証ボタン部分 */
.auth-buttons {
  display: flex;
  gap: 10px;
  /* absolute指定は削除し、flexレイアウトで整列 */
}

.auth-buttons button {
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  background-color: #007bff;
  color: #fff;
  font-size: 16px;
  min-width: 120px;
  font-weight: normal; /* ここで太字にならないように指定 */
  white-space: nowrap; /* 長いテキストの改行を防止 */
}

.auth-buttons button:hover {
  background-color: #0056b3;
}

/* チャットコンテナ */
.chat-container {
  border: 1px solid #ccc;
  border-radius: 10px;
  padding: 20px;
  background-color: #f9f9f9;
  margin-top: 20px;
  position: relative;
}

/* AI処理中のインジケーター */
.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(255, 255, 255, 0.9);
  padding: 20px 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* チャット履歴 */
.chat-history {
  height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #fff;
}

.chat-message {
  margin: 10px 0;
  position: relative;
}

.chat-message.user {
  text-align: right;
}

.chat-message.bot {
  text-align: left;
}

.chat-message.bot-restriction {
  text-align: center;
  font-weight: bold;
}

/* 入力欄 */
.chat-input {
  display: flex;
  gap: 10px;
  align-items: center;
}

input[type='text'] {
  flex: 1;
  padding: 15px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

button {
  padding: 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background-color: #ddd;
}

.clear-button {
  background-color: #f0c040;
}

.clear-button:hover {
  background-color: #e0a020;
}

/* お気に入りトグルボタン */
.favorite-conversation {
  margin-top: 10px;
  text-align: center;
}

/* スマホ向け */
@media (max-width: 600px) {
  .home {
    max-width: 100%;
    padding: 10px;
  }
  
  header {
    flex-direction: column;
    align-items: center; /* ヘッダー全体を中央揃え */
    margin-bottom: 10px;
  }
  
  .auth-buttons {
    flex-direction: column;
    gap: 10px;
    align-items: center; /* ボタンを中央揃え */
    margin-top: 10px;
  }
  
  .auth-buttons button,
  .chat-input input[type='text'],
  .chat-input button {
    width: 100%;
  }
  
  .auth-buttons button {
    padding: 8px 10px;
    font-size: 14px;
  }
  
  .chat-container {
    margin-top: 10px;
    padding: 10px;
  }
  
  .chat-history {
    height: 200px;
  }
  
  .chat-input {
    flex-direction: column;
    gap: 10px;
  }
  
  .clear-button {
    width: 100%;
  }
}
</style>
