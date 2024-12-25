<!-- src/components/Home.vue -->
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
        <button v-if="isLoggedIn" @click="logout">ログアウト</button>
        <button v-if="isLoggedIn" @click="goToMyPage">マイページ</button>
        <!-- 「お気に入り一覧」ボタンを追加する場合は以下のコメントを外してください -->
        <!-- <button v-if="isLoggedIn" @click="goToFavorites">お気に入り一覧</button> -->
      </div>
    </header>

    <!-- チャットセクション -->
    <div class="chat-container">
      <!-- AI処理中のインジケーター -->
      <div v-if="isLoading" class="loading-indicator">
        <div class="spinner"></div>
        <span>AI夢占い中・・・</span>
      </div>
      <div class="chat-history" ref="chatHistoryDiv">
        <div
          v-for="msg in chatHistory"
          :key="msg.id"
          :class="['chat-message', msg.type]"
        >
          <!-- ボットメッセージのレンダリング -->
          <div v-if="msg.type === 'bot'" v-html="escapeHTML(msg.text)"></div>
          
          <!-- ボット制限メッセージのレンダリング -->
          <div v-else-if="msg.type === 'bot-restriction'" v-html="msg.html"></div>
          
          <!-- ユーザーメッセージのレンダリング -->
          <div v-else>{{ msg.text }}</div>

          <!-- お気に入りボタン（ボットメッセージのみ表示、ログイン時のみ） -->
          <button
            v-if="msg.type === 'bot' && isLoggedIn"
            @click="toggleFavorite(msg.id)"
            :class="['favorite-button', msg.isFavorite ? 'favorited' : '']"
            :aria-label="msg.isFavorite ? 'お気に入りを解除する' : 'お気に入りに追加する'"
          >
            <!-- お気に入りアイコン（ハートマーク） -->
            <span v-if="msg.isFavorite">❤️</span>
            <span v-else>🤍</span>
          </button>
        </div>
      </div>
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
    </div>
  </div>
</template>

<script>
import axios from 'axios'; // 標準のaxiosを使用
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';

export default {
  name: 'Home',
  setup() {
    const message = ref('');
    const chatHistory = ref([]);
    const isLoggedIn = ref(false);
    const isLoading = ref(false);
    const chatHistoryDiv = ref(null);
    const router = useRouter();
    const toast = useToast();

    /**
     * テキストをエスケープする関数（XSS対策）
     */
    const escapeHTML = (str) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    /**
     * ログイン状態を確認する関数
     */
    const checkLoginStatus = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/checksession', { withCredentials: true });
        isLoggedIn.value = response.data.loggedIn;
        if (isLoggedIn.value) {
          await fetchFavorites();
        }
      } catch (error) {
        console.error('ログイン状態確認エラー:', error);
      }
    };

    /**
     * ユーザーのお気に入りアイテムを取得する関数
     */
    const fetchFavorites = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/favorites', { withCredentials: true });
        if (response.data.status === 'success') {
          const favoriteIds = response.data.favorites.map(fav => fav.message_id);
          // チャット履歴の各メッセージにお気に入り状態を設定
          chatHistory.value.forEach(msg => {
            if (msg.type === 'bot') {
              msg.isFavorite = favoriteIds.includes(msg.id);
            }
          });
        } else {
          toast.error(response.data.message || 'お気に入りの取得に失敗しました。');
        }
      } catch (error) {
        console.error('お気に入り取得エラー:', error);
        toast.error('サーバーエラーが発生しました。');
      }
    };

    /**
     * お気に入りを追加・解除する関数
     * @param {Number} messageId 
     */
    const toggleFavorite = async (messageId) => {
      if (!isLoggedIn.value) {
        toast.info('お気に入り機能を使用するにはログインが必要です。');
        return;
      }

      const messageItem = chatHistory.value.find(msg => msg.id === messageId);
      if (!messageItem) return;

      try {
        if (messageItem.isFavorite) {
          // お気に入り解除
          const response = await axios.delete(`http://localhost:3000/api/favorites/${messageId}`, { withCredentials: true });
          if (response.data.status === 'success') {
            messageItem.isFavorite = false;
            toast.success('お気に入りから解除しました。');
          } else {
            toast.error(response.data.message || 'お気に入り解除に失敗しました。');
          }
        } else {
          // お気に入り追加
          const response = await axios.post('http://localhost:3000/api/favorites', { messageId }, { withCredentials: true });
          if (response.data.status === 'success') {
            messageItem.isFavorite = true;
            toast.success('お気に入りに追加しました。');
          } else {
            toast.error(response.data.message || 'お気に入り追加に失敗しました。');
          }
        }
      } catch (error) {
        console.error('お気に入り操作エラー:', error);
        toast.error(error.response?.data?.message || 'サーバーエラーが発生しました。');
      }
    };

    /**
     * メッセージを送信する関数
     */
    const sendMessage = async () => {
      if (!message.value.trim()) return;
      const userMessage = message.value.trim();
      const userMessageId = Date.now(); // ユーザーのメッセージID（クライアント生成）
      chatHistory.value.push({ id: userMessageId, text: userMessage, type: 'user', isFavorite: false });
      message.value = '';
      isLoading.value = true;

      try {
        const response = await axios.post(
          'http://localhost:3000/api/interpret-dream',
          { dream: userMessage },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            withCredentials: true
          }
        );

        if (response.data.success) {
          const { interpretation, interactionId } = response.data; // interactionIdを取得
          chatHistory.value.push({ id: interactionId, text: interpretation, type: 'bot', isFavorite: false });
          // お気に入り状態を反映
          if (isLoggedIn.value) {
            await fetchFavorites();
          }
        } else if (response.data.message === '続きは会員登録が必要です。') {
          const restrictionMessage = '続きは<a href="/register">会員登録</a>が必要です。';
          chatHistory.value.push({ id: Date.now() + 2, html: restrictionMessage, type: 'bot-restriction', isFavorite: false });
          toast.info('続きの会話には会員登録が必要です。会員登録ページに移動します。');
          router.push('/register');
        } else {
          chatHistory.value.push({
            id: Date.now() + 3,
            text: response.data.message || 'エラーが発生しました。もう一度お試しください。',
            type: 'bot',
            isFavorite: false,
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage = error.response && error.response.data && error.response.data.message
          ? error.response.data.message
          : 'エラーが発生しました。もう一度お試しください。';
        chatHistory.value.push({
          id: Date.now() + 4,
          text: `エラーが発生しました: ${errorMessage}`,
          type: 'bot',
          isFavorite: false,
        });
      } finally {
        isLoading.value = false;
        scrollToBottom();
      }
    };

    /**
     * メッセージ履歴をクリアする関数
     */
    const clearMessages = () => {
      chatHistory.value = [];
      // 必要に応じて他のリセットロジックを追加
    };

    /**
     * チャット履歴を下にスクロールする関数
     */
    const scrollToBottom = () => {
      if (chatHistoryDiv.value) {
        chatHistoryDiv.value.scrollTop = chatHistoryDiv.value.scrollHeight;
      }
    };

    /**
     * ログインページに遷移する関数
     */
    const goToLogin = () => router.push('/login');

    /**
     * 会員登録ページに遷移する関数
     */
    const goToRegister = () => router.push('/register');

    /**
     * マイページに遷移する関数
     */
    const goToMyPage = () => router.push('/mypage');

    /**
     * ログアウトする関数
     */
    const logout = async () => {
      try {
        const response = await axios.post('http://localhost:3000/api/logout', {}, { withCredentials: true });
        if (response.data.status === 'success') {
          isLoggedIn.value = false;
          toast.success('ログアウトしました。');
          clearMessages();
          router.push('/');
        } else {
          toast.error('ログアウトに失敗しました。');
        }
      } catch (error) {
        console.error('Error logging out:', error);
        toast.error('ログアウト中にエラーが発生しました。');
      }
    };

    onMounted(() => {
      checkLoginStatus();
    });

    return {
      message,
      chatHistory,
      isLoggedIn,
      isLoading,
      sendMessage,
      clearMessages,
      goToLogin,
      goToRegister,
      goToMyPage,
      logout,
      escapeHTML,
      chatHistoryDiv,
      toggleFavorite, // お気に入り関数を返す
    };
  },
};
</script>

<style scoped>
.home {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
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

/* お気に入りボタンのスタイル */
.favorite-button {
  position: absolute;
  top: 10px;
  right: -40px; /* メッセージボックスの右外側に配置 */
  background: none;
  border: none;
  cursor: pointer;
  font-size: 24px;
  transition: transform 0.2s;
}

.favorite-button:hover {
  transform: scale(1.2);
}

.favorite-button.favorited {
  color: #e74c3c; /* お気に入り登録済みの色（赤） */
}

.favorite-button:not(.favorited) {
  color: #ccc; /* 未登録の色（グレー） */
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

/* AI処理中のインジケーターのスタイル */
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

/* スピナーのスタイル */
.spinner {
  border: 4px solid #f3f3f3; /* Light grey */
  border-top: 4px solid #3498db; /* Blue */
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
