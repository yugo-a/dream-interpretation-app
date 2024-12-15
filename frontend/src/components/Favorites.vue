<!-- src/components/Favorites.vue -->
<template>
  <div class="favorites">
    <header>
      <h1>お気に入り一覧</h1>
      <button @click="goBack">戻る</button>
    </header>
    <div class="favorites-container">
      <div v-if="isLoading" class="loading-indicator">
        <div class="spinner"></div>
        <span>お気に入りデータを読み込み中...</span>
      </div>
      
      <div v-if="!isLoading && favorites.length === 0" class="no-favorites">
        お気に入りに登録されたインタラクションがありません。
      </div>
      
      <div v-else class="favorites-list">
        <div v-for="item in favorites" :key="item.id" class="favorite-card">
          <h3>対話 #{{ item.id }}</h3>
          <p><strong>ユーザー:</strong> {{ item.user_message }}</p>
          <p><strong>AI:</strong> {{ item.ai_message }}</p>
          <button
            :class="['btn', 'btn-danger']"
            @click="removeFavorite(item.id)"
            aria-label="お気に入りを解除する"
          >
            お気に入り解除
          </button>
        </div>
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
  name: 'Favorites',
  setup() {
    const favorites = ref([]);
    const isLoading = ref(false);
    const router = useRouter();
    const toast = useToast();

    /**
     * ユーザーのお気に入りアイテムを取得する関数
     */
    const fetchFavorites = async () => {
      isLoading.value = true;
      try {
        const response = await axios.get('http://localhost:3000/api/favorites', { withCredentials: true });
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
     * お気に入りを解除する関数
     * @param {Number} messageId 
     */
    const removeFavorite = async (messageId) => {
      try {
        const response = await axios.delete(`http://localhost:3000/api/favorites/${messageId}`, { withCredentials: true });
        if (response.data.status === 'success') {
          favorites.value = favorites.value.filter(item => item.id !== messageId);
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
     * 戻るボタンの機能
     */
    const goBack = () => {
      router.push('/'); // ホーム画面に戻る
    };

    onMounted(() => {
      fetchFavorites();
    });

    return {
      favorites,
      isLoading,
      removeFavorite,
      goBack,
    };
  },
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
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.favorite-card h3 {
  margin-bottom: 10px;
}

.favorite-card p {
  margin-bottom: 10px;
}

/* ボタンのスタイル */
.btn {
  width: 100%;
  padding: 12px;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  margin: 10px 0; /* 上下の余白を統一 */
  transition: background-color 0.3s ease;
}

.btn-danger {
  background-color: #dc3545; /* お気に入り解除ボタンの色 */
}

.btn-danger:hover {
  background-color: #c82333;
}

/* レスポンシブデザイン */
@media (max-width: 600px) {
  .favorites-list {
    flex-direction: column;
    align-items: center;
  }

  .favorite-card {
    width: 90%;
  }
}
</style>
