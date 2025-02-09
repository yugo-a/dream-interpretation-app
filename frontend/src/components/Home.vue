<template>
  <div class="home">
    <!-- ヘッダー -->
    <header>
      <div class="header-title-container">
        <h1 class="header-title">リアルタイム夢解析チャットボット</h1>
      </div>
      <div class="auth-buttons">
        <button v-if="!isLoggedIn" @click="goToLogin">ログイン</button>
        <button v-if="!isLoggedIn" @click="goToRegister">会員登録</button>
        <button v-if="isLoggedIn" @click="goToMyPage">マイページ</button>
        <button v-if="isLoggedIn" @click="goToFavorites">お気に入り一覧</button>
      </div>
    </header>

    <!-- チャットセクション -->
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

      <!-- 会話全体のお気に入り登録ボタン -->
      <div class="favorite-conversation" v-if="isLoggedIn && !isFavorited">
        <button @click="favoriteWholeConversation">この会話をお気に入り登録</button>
      </div>
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
  name: 'Home',
  setup() {
    const message = ref('');
    const chatHistory = ref([]);
    const isLoading = ref(false);
    const chatHistoryDiv = ref(null);

    const router = useRouter();
    const toast = useToast();
    const authStore = useAuthStore();

    // ログインしているかどうか
    const isLoggedIn = computed(() => authStore.isLoggedIn);

    // この会話が既にお気に入り登録済みかどうかをフラグで管理
    const isFavorited = ref(false);

    /**
     * テキストをエスケープ（XSS対策）
     */
    const escapeHTML = (str) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    /**
     * ログイン状態を確認
     */
    const checkLoginStatus = async () => {
      try {
        await authStore.checkLoginStatus();
        // ここでは「既にお気に入り登録済みかどうか」を調べるロジックは任意
        // 必要に応じてサーバーから取得して判定するなど可能
      } catch (error) {
        console.error('ログイン状態確認エラー:', error);
      }
    };

    /**
     * 会話全体をお気に入り登録する
     * - 何度も登録しないよう、一度成功したらボタンを非表示にする
     */
    const favoriteWholeConversation = async () => {
      if (!isLoggedIn.value) {
        toast.info('お気に入り登録にはログインが必要です。');
        return;
      }
      try {
        const response = await axios.post('/favorites', {
          chatHistory: chatHistory.value // 今ある全メッセージ
        });
        if (response.data.status === 'success') {
          toast.success('この会話をお気に入りに登録しました！');
          isFavorited.value = true; // 登録完了 → ボタン非表示
        } else {
          toast.error(response.data.message || 'お気に入り登録に失敗しました。');
        }
      } catch (err) {
        console.error('お気に入り追加エラー:', err);
        toast.error('サーバーエラーが発生しました。');
      }
    };

    /**
     * メッセージ送信
     */
    const sendMessage = async () => {
      if (!message.value.trim()) return;

      const userMessage = message.value.trim();
      const userMessageId = Date.now(); // クライアント生成ID
      // ユーザーメッセージを履歴に追加
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
          // AIレスポンスを履歴に追加
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
          toast.info('続きの会話には会員登録が必要です。会員登録ページに移動します。');
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
     * チャット履歴をクリア
     */
    const clearMessages = () => {
      chatHistory.value = [];
      // クリアしたら再び "お気に入り登録" を可能にするなら
      // isFavorited.value = false;
    };

    /**
     * チャット表示を一番下にスクロール
     */
    const scrollToBottom = () => {
      if (chatHistoryDiv.value) {
        chatHistoryDiv.value.scrollTop = chatHistoryDiv.value.scrollHeight;
      }
    };

    /**
     * ページ遷移系
     */
    const goToLogin = () => router.push('/login');
    const goToRegister = () => router.push('/register');
    const goToMyPage = () => router.push('/mypage');
    const goToFavorites = () => router.push('/favorites');

    onMounted(() => {
      checkLoginStatus();
    });

    return {
      message,
      chatHistory,
      isLoggedIn,
      isLoading,
      isFavorited,

      escapeHTML,
      sendMessage,
      clearMessages,
      favoriteWholeConversation,

      goToLogin,
      goToRegister,
      goToMyPage,
      goToFavorites,

      chatHistoryDiv
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
header {
  text-align: left;
  margin-bottom: 20px;
  position: relative;
}

.header-title-container {
  margin-bottom: 20px;
}

.header-title {
  margin-left: 10px;
  margin-top: 20px;
}

.auth-buttons {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 10px;
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
}
.auth-buttons button:hover {
  background-color: #0056b3;
}

.chat-container {
  border: 1px solid #ccc;
  border-radius: 10px;
  padding: 20px;
  background-color: #f9f9f9;
  margin-top: 20px;
  position: relative;
}

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

/* 全体をお気に入り登録するボタン */
.favorite-conversation {
  margin-top: 10px;
  text-align: center;
}

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

/* スマホ向け */
@media (max-width: 600px) {
  .home {
    max-width: 100%;
    padding: 10px;
  }
  header {
    margin-bottom: 10px;
  }
  .auth-buttons {
    position: static;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  .auth-buttons button,
  .chat-input input[type='text'],
  .chat-input button {
    width: 100%;
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
