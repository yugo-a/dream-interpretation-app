// src/axios.js
import axios from 'axios';

const instance = axios.create({
  baseURL: '/api', // バックエンドのベースURLを設定
  withCredentials: true, // クッキーを送信するために必要
});

export default instance;
