<!-- frontend/src/components/Home.vue -->

<template>
    <div id="home">
      <h1>リアルタイム夢占いチャットボット</h1>
      <p>夢の内容を入力して、占いをしてみましょう！</p>
      <div class="chat-box">
        <ChatBox />
      </div>
    </div>
  </template>
  
  <script>
  import ChatBox from './ChatBox.vue';
  
  export default {
    name: 'Home',
    components: {
      ChatBox
    }
  };
  </script>
  
  <style scoped>
  #home {
    max-width: 600px;
    margin: 50px auto;
    padding: 20px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    text-align: center;
  }
  
  h1 {
    color: #333;
  }
  
  p {
    color: #666;
    margin-bottom: 20px;
  }
  
  .chat-box {
    margin-top: 30px;
  }
  </style>
  