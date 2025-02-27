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
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  cookie: {
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use(express.json());

// CORS設定（必要に応じて調整）
app.use(cors({
  origin: isProduction
    ? 'https://immense-woodland-88214-41c7bcb5f709.herokuapp.com' // 本番URLに置き換え
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

  // メールアドレス形式のチェック
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ status: 'error', message: '無効なメールアドレス形式です。' });
  }

  // 既に登録済みのメールアドレスがないかチェック
  try {
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rowCount > 0) {
      return res.status(400).json({ status: 'error', message: '登録済みです。' });
    }
  } catch (error) {
    console.error('Error checking email:', error);
    return res.status(500).json({ status: 'error', message: 'サーバーエラーが発生しました。' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // role カラムは存在しないため、RETURNING句から除外
    const result = await pool.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, age, gender, stress, "dreamTheme", created_at;`,
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
  // ①セッション情報をコンソールで出力
  console.log('=== /api/checksession ===');
  console.log('Current session object:', req.session);

  // ②キャッシュ無効化（既に書いてあるならOK）
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.removeHeader('ETag');

  // ③返却ロジック
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

/**
 * パスワード変更エンドポイント
 */
app.post('/api/changePassword', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const { currentPassword, newPassword } = req.body;

  try {
    // ユーザーの現在のパスワードを取得
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'ユーザーが見つかりません。' });
    }
    const user = result.rows[0];

    // 現在のパスワードが正しいか確認
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 'error', message: '現在のパスワードが正しくありません。' });
    }

    // 新しいパスワードのハッシュを作成して更新
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

    res.json({ status: 'success', message: 'パスワードが変更されました。' });
  } catch (error) {
    console.error('パスワード変更エラー:', error);
    res.status(500).json({ status: 'error', message: 'パスワード変更中にエラーが発生しました。' });
  }
});

app.post('/api/passwordResetRequest', async (req, res) => {
  const { username, email } = req.body;
  try {
    // ユーザー情報を確認
    const userResult = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND email = $2',
      [username, email]
    );
    if (userResult.rowCount === 0) {
      return res.status(400).json({ status: 'error', message: 'ユーザー名とメールアドレスの組み合わせが正しくありません。' });
    }
    const userId = userResult.rows[0].id;

    // パスワード再設定トークンの生成
    const token = crypto.randomBytes(32).toString('hex');
    // 有効期限を現在時刻の10分後に設定
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // トークンを password_resets テーブルに保存
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    // パスワード再設定リンクの生成
    const resetLink = `https://immense-woodland-88214-41c7bcb5f709.herokuapp.com/password-reset/${token}`;
    console.log(`パスワード再設定リンク: ${resetLink}`);

    // 送信メールのオプションを設定
    const mailOptions = {
      from: process.env.EMAIL,         // 送信元（環境変数 EMAIL に設定されたアドレス）
      to: email,                       // ユーザーが入力したメールアドレス
      subject: '【パスワード再設定】ご案内',
      text: `以下のリンクをクリックしてパスワードを再設定してください。\n\nリンクの有効期限は10分です。\n\n${resetLink}`
      // HTML形式の場合は html プロパティも利用可能
    };

    // 送信前のデバッグログ（必要に応じて）
    console.log('送信元:', process.env.EMAIL);
    console.log('送信先:', email);
    console.log('件名:', mailOptions.subject);
    console.log('本文:', mailOptions.text);

    // nodemailer を利用してメール送信
    await transporter.sendMail(mailOptions);
    console.log('メール送信成功');

    res.json({ status: 'success', message: 'パスワード再設定用リンクを送信しました。' });
  } catch (error) {
    console.error('パスワード再設定リクエストエラー:', error);
    res.status(500).json({ status: 'error', message: 'パスワード再設定リクエスト中にエラーが発生しました。' });
  }
});

app.post('/api/passwordReset/:resetKey', async (req, res) => {
  const { resetKey } = req.params;
  const { newPassword } = req.body;

  try {
    // トークン情報を取得
    const tokenResult = await pool.query(
      'SELECT user_id, expires_at FROM password_resets WHERE token = $1',
      [resetKey]
    );
    if (tokenResult.rowCount === 0) {
      return res.status(400).json({ status: 'error', message: '無効なトークンです。' });
    }
    const { user_id, expires_at } = tokenResult.rows[0];
    // 有効期限チェック
    if (new Date() > expires_at) {
      return res.status(400).json({ status: 'error', message: 'トークンの有効期限が切れています。' });
    }

    // 新しいパスワードのハッシュを生成
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // ユーザーのパスワードを更新
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user_id]);
    // 使用済みトークンは削除
    await pool.query('DELETE FROM password_resets WHERE token = $1', [resetKey]);

    res.json({ status: 'success', message: 'パスワードが再設定されました。' });
  } catch (error) {
    console.error('パスワード再設定エラー:', error);
    res.status(500).json({ status: 'error', message: 'パスワード再設定中にエラーが発生しました。' });
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
app.use(express.static(path.join(__dirname, 'frontend/dist'), {
  maxAge: 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// ルートをフロントに任せる
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

