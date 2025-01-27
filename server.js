/***********************************************
 * server.js
 ***********************************************/

// ESM形式のモジュール読み込み
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import session from 'express-session';
import axios from 'axios';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import pool from './db.js';

dotenv.config();

const app = express();

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

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: false, // 初期化されていないセッションは保存しない
  cookie: { secure: false } // HTTPS を使用する場合は true に設定
}));

app.use(express.json());

// CORS設定（必要に応じて調整）
app.use(cors({
  origin: 'http://localhost:8080', // フロントエンドのURLに置き換えてください
  credentials: true, // クッキーを含める
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
    res.send('Table "users" created (if not exists).');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating table');
  }
});

// 既存のCRUDエンドポイント（必要に応じて）

/* =============================
   ▼▼▼ ここまでPostgres CRUD ▼▼▼
============================= */

/**
 * 会員登録エンドポイント
 */
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);  // パスワードをハッシュ化
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
    // ユーザー名に一致するユーザーをデータベースから取得
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rowCount === 0) {
      // ユーザーが見つからない場合
      return res.status(401).json({ status: 'error', message: 'ユーザー名またはパスワードが正しくありません。' });
    }
    
    const user = result.rows[0];
    
    // データベースに保存されているハッシュ化されたパスワードと比較
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // パスワードが一致しない場合
      return res.status(401).json({ status: 'error', message: 'ユーザー名またはパスワードが正しくありません。' });
    }
    
    // ログイン成功時にセッションを設定
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role || 'user'  // 管理者機能等を扱う場合、roleも含める
    };
    
    // 成功レスポンスを返す
    res.json({ status: 'success', message: 'ログインに成功しました。', user: { id: user.id, username: user.username, email: user.email, age: user.age, gender: user.gender, stress: user.stress, dreamTheme: user.dreamTheme, role: user.role, created_at: user.created_at } });
    
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
 */
app.get('/api/checksession', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

/**
 * ユーザーデータ取得エンドポイント
 */
app.get('/api/getUserData', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const result = await pool.query('SELECT username, email, age, gender, stress, "dreamTheme" FROM users WHERE id = $1', [userId]);

    if (result.rowCount === 1) {
      const userData = result.rows[0];
      res.json({ status: 'success', user: userData });
    } else {
      res.status(404).json({ status: 'error', message: 'ユーザーデータが見つかりません。' });
    }
  } catch (err) {
    console.error('ユーザーデータ取得エラー:', err);
    res.status(500).json({ status: 'error', message: 'サーバーエラーが発生しました。' });
  }
});

/**
 * ユーザーデータ更新エンドポイント
 */
app.post('/api/updateUser', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const { username, email, age, gender, stress, dreamTheme } = req.body;

  try {
    // 必要に応じてバリデーションを追加
    const result = await pool.query(
      `UPDATE users
       SET username = $1, email = $2, age = $3, gender = $4, stress = $5, "dreamTheme" = $6
       WHERE id = $7
       RETURNING username, email, age, gender, stress, "dreamTheme";`,
      [username, email, age, gender, stress, dreamTheme, userId]
    );

    if (result.rowCount === 1) {
      const updatedUser = result.rows[0];
      res.json({ status: 'success', user: updatedUser });
    } else {
      res.status(404).json({ status: 'error', message: 'ユーザーデータの更新に失敗しました。' });
    }
  } catch (err) {
    console.error('ユーザーデータ更新エラー:', err);
    res.status(500).json({ status: 'error', message: 'サーバーエラーが発生しました。' });
  }
});

/**
 * アカウント削除エンドポイント
 */
app.delete('/api/deleteAccount', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;

  try {
    // トランザクションを開始
    await pool.query('BEGIN');

    // ユーザー関連のデータを削除（必要に応じて他のテーブルも削除）
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    // トランザクションをコミット
    await pool.query('COMMIT');

    // セッションを破棄
    req.session.destroy(err => {
      if (err) {
        console.error('セッション破棄エラー:', err);
        return res.status(500).json({ status: 'error', message: 'アカウント削除後のセッション破棄に失敗しました。' });
      }
      res.clearCookie('connect.sid'); // セッションIDクッキーのクリア
      res.json({ status: 'success', message: 'アカウントが正常に削除されました。' });
    });
  } catch (err) {
    // エラーが発生した場合はロールバック
    await pool.query('ROLLBACK');
    console.error('アカウント削除エラー:', err);
    res.status(500).json({ status: 'error', message: 'アカウント削除中にエラーが発生しました。' });
  }
});

// ======== ここからAI解析の実装 ========

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
      temperature: 0.7,
    });

    const interpretation = aiResponse.data.choices[0].message.content.trim();

    return res.json({
      success: true,
      interpretation,
      interactionId: Date.now(),
    });
  } catch (error) {
    console.error('Error in /interpret-dream:', error);
    return res.status(500).json({
      success: false,
      message: 'AI解釈中にエラーが発生しました。',
    });
  }
});

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'frontend/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
