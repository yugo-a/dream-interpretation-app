<template>
  <div class="favorites">
    <header>
      <h1>お気に入り一覧</h1>
      <button @click="goBack">戻る</button>
    </header>
    <div class="favorites-container">
      <!-- 読み込み中の場合 -->
      <div v-if="isLoading" class="loading-indicator">
        <div class="spinner"></div>
        <span>お気に入りデータを読み込み中...</span>
      </div>

      <!-- お気に入りがない場合 -->
      <div v-else-if="favorites.length === 0" class="no-favorites">
        お気に入りに登録された会話はありません。
      </div>

      <!-- お気に入りがある場合 -->
      <div v-else class="favorites-list">
        <div v-for="fav in favorites" :key="fav.id" class="favorite-card">
          <h3>会話ID: {{ fav.id }}</h3>

          <!-- JSON化された会話をパースして表示 -->
          <div class="conversation">
            <div
              v-for="(msg, idx) in parseConversation(fav.conversation_json)"
              :key="idx"
              :class="['chat-message', msg.type]"
            >
              {{ msg.text }}
            </div>
          </div>

          <button
            class="btn btn-danger"
            @click="removeFavorite(fav.id)"
          >
            お気に入り解除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from '@/axios';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';

export default {
  name: 'Favorites',
  setup() {
    const favorites = ref([]);
    const isLoading = ref(false);
    const router = useRouter();
    const toast = useToast();

    /**
     * お気に入りの一覧を取得
     */
    const fetchFavorites = async () => {
      isLoading.value = true;
      try {
        const response = await axios.get('/favorites', { withCredentials: true });
        if (response.data.status === 'success') {
          favorites.value = response.data.favorites;
        } else {
          toast.error(response.data.message || 'お気に入りの取得に失敗しました。');
        }
      } catch (error) {
        console.error('お気に入り取得エラー:', error);
        toast.error(error.response?.data?.message || 'サーバーエラーが発生しました。');
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * お気に入り解除
     */
    const removeFavorite = async (favoriteId) => {
      try {
        const response = await axios.delete(`/favorites/${favoriteId}`, { withCredentials: true });
        if (response.data.status === 'success') {
          favorites.value = favorites.value.filter(item => item.id !== favoriteId);
          toast.success('お気に入りから解除しました。');
        } else {
          toast.error(response.data.message || 'お気に入り解除に失敗しました。');
        }
      } catch (error) {
        console.error('お気に入り解除エラー:', error);
        toast.error(error.response?.data?.message || 'サーバーエラーが発生しました。');
      }
    };

    /**
     * DBに保存されている conversation_json を parse
     */
    const parseConversation = (jsonString) => {
      try {
        return JSON.parse(jsonString) || [];
      } catch (error) {
        console.error('JSONパースエラー:', error);
        return [];
      }
    };

    /**
     * 戻るボタン：ホームへ
     */
    const goBack = () => {
      router.push('/');
    };

    onMounted(() => {
      fetchFavorites();
    });

    return {
      favorites,
      isLoading,
      removeFavorite,
      parseConversation,
      goBack
    };
  }
};
</script>

<style scoped>
.favorites {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

header h1 {
  margin: 0;
}

header button {
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  background-color: #007bff;
  color: #fff;
  font-size: 16px;
}
header button:hover {
  background-color: #0056b3;
}

.favorites-container {
  border: 1px solid #ccc;
  border-radius: 10px;
  padding: 20px;
  background-color: #f9f9f9;
  position: relative;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
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

.no-favorites {
  text-align: center;
  font-size: 18px;
  color: #555;
}

.favorites-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
}

.favorite-card {
  width: 300px;
  padding: 20px;
  border: 1px solid #bbb;
  border-radius: 10px;
  background-color: #fff;
  box-shadow: 2px 2px 12px rgba(0,0,0,0.1);
}

.conversation {
  margin: 10px 0;
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 5px;
  height: 150px;
  overflow-y: auto;
}

.chat-message {
  margin: 5px 0;
}

.btn-danger {
  display: inline-block;
  margin-top: 10px;
  width: 100%;
  padding: 12px;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  background-color: #dc3545;
  transition: background-color 0.3s ease;
}
.btn-danger:hover {
  background-color: #c82333;
}

@media (max-width: 600px) {
  .favorites-list {
    flex-direction: column;
    align-items: center;
  }
  .favorite-card {
    width: 90%;
  }
  .conversation {
    height: auto;
    max-height: 200px;
  }
}
</style>
