/***********************************************
 * server.js
 ***********************************************/

// ESM形式のモジュール読み込み
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple'; // ← 重要: PostgreSQLセッションストア
import axios from 'axios';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import pool from './db.js';

dotenv.config();

const app = express();

// PostgreSQLセッションストアを初期化
const PgSession = connectPgSimple(session);

// Production判定（Herokuでデプロイ時）
const isProduction = process.env.NODE_ENV === 'production';

// リバースプロキシを信用 (Heroku の https対応)
if (isProduction) {
  app.set('trust proxy', 1);
}

// __dirname と __filename の代替を設定（ESMではこれらは未定義）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CommonJS モジュールを require で読み込むための準備
const require = createRequire(import.meta.url);
// OpenAI ライブラリを CommonJS スタイルでインポート
const { Configuration, OpenAIApi } = require('openai');

// Nodemailer設定
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * セッション設定
 * - connect-pg-simple を使用して Postgres 上にセッションを永続化
 * - cookie: { secure, sameSite } を本番環境と開発環境で切り替え
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  store: new PgSession({
    pool,                 // 既存の pg Pool を使う
    tableName: 'session'  // セッション用テーブル名（任意）
  }),
  cookie: {
    secure: isProduction,  // 本番: HTTPS のみクッキー送信
    sameSite: 'none',      // クロスサイトでもクッキーを送る場合
    maxAge: 1000 * 60 * 60 * 24 // セッション有効期限(例:24h)
  }
}));

app.use(express.json());

// CORS設定（必要に応じて調整）
app.use(cors({
  origin: isProduction
    ? 'https://YOUR_HEROKU_APP_NAME.herokuapp.com' // 本番URLに置き換え
    : 'http://localhost:8080',                    // 開発URL
  credentials: true,
}));

// ログミドルウェア (任意)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

// API動作確認用
app.get('/api', (req, res) => {
  console.log('GET request to /api');
  res.send('API is running');
});

// 認証チェックミドルウェア
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
}

/* =======================
   ▼▼▼ Postgres CRUD ▼▼▼
======================= */

app.get('/init', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        stress TEXT,
        "dreamTheme" TEXT,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ▼もし favorites テーブルも init で作りたい場合
    // await pool.query(`
    //   CREATE TABLE IF NOT EXISTS favorites (
    //     id SERIAL PRIMARY KEY,
    //     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    //     conversation_json TEXT,
    //     created_at TIMESTAMP DEFAULT NOW()
    //   );
    // `);

    res.send('Table "users" (and maybe "favorites") created (if not exists).');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating table');
  }
});

/* =============================
   ▼▼▼ ここまでPostgres CRUD ▼▼▼
============================= */

/**
 * 会員登録エンドポイント
 */
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, age, gender, stress, "dreamTheme", role, created_at;`,
      [username, email, hashedPassword]
    );
    res.json({ status: 'success', user: result.rows[0] });
  } catch (err) {
    console.error('Error inserting user:', err);
    res.status(500).json({ status: 'error', message: 'DB insert error' });
  }
});

/**
 * ログインエンドポイント
 */
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ status: 'error', message: 'ユーザー名またはパスワードが正しくありません。' });
    }
    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ status: 'error', message: 'ユーザー名またはパスワードが正しくありません。' });
    }
    // セッションにユーザー情報を保存
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role || 'user'
    };
    res.json({
      status: 'success',
      message: 'ログインに成功しました。',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        age: user.age,
        gender: user.gender,
        stress: user.stress,
        dreamTheme: user.dreamTheme,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('ログインエラー:', err);
    res.status(500).json({ status: 'error', message: 'サーバーエラーが発生しました。' });
  }
});

/**
 * ログアウトエンドポイント
 */
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('セッション破棄エラー:', err);
      return res.status(500).json({ status: 'error', message: 'ログアウトに失敗しました。' });
    }
    res.clearCookie('connect.sid'); // セッションIDクッキーのクリア
    res.json({ status: 'success', message: 'ログアウトしました。' });
  });
});

/**
 * セッション確認エンドポイント
 * - キャッシュ無効化
 */
app.get('/api/checksession', (req, res) => {
  // キャッシュをさせない (304 回避)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.removeHeader('ETag');

  if (req.session.user) {
    return res.status(200).json({ loggedIn: true, user: req.session.user });
  } else {
    return res.status(200).json({ loggedIn: false });
  }
});

/**
 * ユーザーデータ取得
 */
app.get('/api/getUserData', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const result = await pool.query(
      'SELECT username, email, age, gender, stress, "dreamTheme" FROM users WHERE id = $1',
      [userId]
    );
    if (result.rowCount === 1) {
      res.json({ status: 'success', user: result.rows[0] });
    } else {
      res.status(404).json({ status: 'error', message: 'ユーザーデータが見つかりません。' });
    }
  } catch (err) {
    console.error('ユーザーデータ取得エラー:', err);
    res.status(500).json({ status: 'error', message: 'サーバーエラーが発生しました。' });
  }
});

/**
 * ユーザーデータ更新
 */
app.post('/api/updateUser', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const { username, email, age, gender, stress, dreamTheme } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users
       SET username = $1, email = $2, age = $3, gender = $4, stress = $5, "dreamTheme" = $6
       WHERE id = $7
       RETURNING username, email, age, gender, stress, "dreamTheme";`,
      [username, email, age, gender, stress, dreamTheme, userId]
    );
    if (result.rowCount === 1) {
      res.json({ status: 'success', user: result.rows[0] });
    } else {
      res.status(404).json({ status: 'error', message: 'ユーザーデータの更新に失敗しました。' });
    }
  } catch (err) {
    console.error('ユーザーデータ更新エラー:', err);
    res.status(500).json({ status: 'error', message: 'サーバーエラーが発生しました。' });
  }
});

/**
 * アカウント削除
 */
app.delete('/api/deleteAccount', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('COMMIT');
    req.session.destroy(err => {
      if (err) {
        console.error('セッション破棄エラー:', err);
        return res.status(500).json({ status: 'error', message: 'アカウント削除後のセッション破棄に失敗しました。' });
      }
      res.clearCookie('connect.sid');
      res.json({ status: 'success', message: 'アカウントが正常に削除されました。' });
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('アカウント削除エラー:', err);
    res.status(500).json({ status: 'error', message: 'アカウント削除中にエラーが発生しました。' });
  }
});

// ======== AI解析の実装 ========

// OpenAI 初期化
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post('/api/interpret-dream', async (req, res) => {
  try {
    const { dream } = req.body;
    if (!dream) {
      return res.status(400).json({
        success: false,
        message: '夢の内容 (dream) がありません。',
      });
    }

    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'あなたは夢を解釈するアシスタントです。ユーザーの夢の内容に対して簡潔に意味を説明してください。'
        },
        {
          role: 'user',
          content: `ユーザーの夢内容:\n${dream}\nこの夢の意味を教えて。`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const interpretation = aiResponse.data.choices[0].message.content.trim();
    return res.json({
      success: true,
      interpretation,
      interactionId: Date.now()
    });
  } catch (error) {
    console.error('Error in /interpret-dream:', error);
    return res
      .status(500)
      .json({ success: false, message: 'AI解釈中にエラーが発生しました。' });
  }
});

// お気に入り一覧取得
app.get('/api/favorites', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    // conversation_json カラムを含めて取得
    const result = await pool.query(
      `SELECT id, conversation_json, created_at
       FROM favorites
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ status: 'success', favorites: result.rows });
  } catch (err) {
    console.error('お気に入り取得エラー:', err);
    res.status(500).json({ status: 'error', message: 'お気に入りの取得に失敗しました。' });
  }
});

// お気に入り追加（会話全体をJSONで）
app.post('/api/favorites', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { chatHistory } = req.body;

    // 会話全体を JSON 文字列化してINSERT
    const result = await pool.query(
      `INSERT INTO favorites (user_id, conversation_json)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, JSON.stringify(chatHistory)]
    );

    res.json({ status: 'success', favorite: result.rows[0] });
  } catch (err) {
    console.error('お気に入り追加エラー:', err);
    res
      .status(500)
      .json({ status: 'error', message: 'お気に入り追加に失敗しました。' });
  }
});

// お気に入り解除
app.delete('/api/favorites/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const favoriteId = req.params.id;
    const result = await pool.query(
      'DELETE FROM favorites WHERE id = $1 AND user_id = $2 RETURNING id',
      [favoriteId, userId]
    );
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ status: 'error', message: 'お気に入りが見つかりません。' });
    }
    res.json({ status: 'success', message: 'お気に入りから解除しました。' });
  } catch (err) {
    console.error('お気に入り解除エラー:', err);
    res
      .status(500)
      .json({ status: 'error', message: 'お気に入り解除に失敗しました。' });
  }
});

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// ルートをフロントに任せる
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
