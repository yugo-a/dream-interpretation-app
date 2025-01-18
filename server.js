/***********************************************
 * server.js
 ***********************************************/
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const session = require('express-session');
const axios = require('axios');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');

// ★ ここで db.js を読み込む (PostgreSQL Pool)
const pool = require('./db');

// .envファイルの読み込み
dotenv.config();

const app = express();

/*
// もしBasic認証が不要ならこの部分はコメントアウト
const USERNAME = process.env.BASIC_USER || 'user';
const PASSWORD = process.env.BASIC_PASS || 'secret';
function basicAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const base64Credentials = authHeader.split(' ')[1] || '';
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (username === USERNAME && password === PASSWORD) {
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Restricted"');
  return res.status(401).send('Authentication required.');
}

// 全ルートにかける場合は use() で先に書く
app.use(basicAuthMiddleware);
*/

// Nodemailerのtransporter設定
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,          // Gmailアドレス
    pass: process.env.EMAIL_PASSWORD  // Gmailパスワード(またはアプリパスワード)
  }
});

// セッションの設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // HTTPSを使う場合はtrueに
}));

/*
// CORS設定（必要な場合のみ）
const corsOptions = {
  origin: 'http://localhost:8080',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
*/

// JSONボディパーサー
app.use(express.json());

// ログミドルウェア
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

// -------------------------------------------------
// ヘルスチェック用 or 動作確認用
// -------------------------------------------------
app.get('/api', (req, res) => {
  console.log('GET request to /api');
  res.send('API is running');
});

// 認証チェック用ミドルウェア（セッション版）
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
// テーブル作成用
app.get('/init', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    res.send('Table "users" created (if not exists).');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating table');
  }
});

// CREATE (ユーザー新規登録)
app.post('/users', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [username, email, password]
    );
    res.json({ status: 'success', user: result.rows[0] });
  } catch (err) {
    console.error('Error inserting user:', err);
    res.status(500).json({ status: 'error', message: 'DB insert error' });
  }
});

// READ (ユーザー一覧)
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users;');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ status: 'error', message: 'DB fetch error' });
  }
});

// UPDATE (ユーザー情報更新)
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, email } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users
       SET username = $1, email = $2
       WHERE id = $3
       RETURNING *;`,
      [username, email, id]
    );
    res.json({ status: 'success', user: result.rows[0] });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ status: 'error', message: 'DB update error' });
  }
});

// DELETE (ユーザー削除)
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM users WHERE id = $1;`, [id]);
    res.json({ status: 'success', message: `User ${id} deleted.` });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ status: 'error', message: 'DB delete error' });
  }
});

/* =============================
   ▼▼▼ ここまでPostgres CRUD ▼▼▼
============================= */

/*
  以下はダミー版のAPIエンドポイント。
  まだ実際のDB操作がない／あるいは簡易実装だけの場合
  とりあえず用意している例。必要に応じて修正/削除OK。
*/

// ユーザー登録(ダミー)
app.post('/api/register', (req, res) => {
  res.json({ status: 'success', message: '[DBなし] User registered (dummy response)' });
});

// ログイン(ダミー)
app.post('/api/login', (req, res) => {
  res.json({ status: 'success', message: '[DBなし] Login (dummy response)' });
});

// セッション確認(ダミー)
app.get('/api/checksession', (req, res) => {
  // 実際は req.session.user をチェックする
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});


/********************************************************************
 *  ここが重要: フロントエンドが呼び出している 「/interpret-dream」 の実装
 *  
 *  Home.vue から:
 *    axios.post('/interpret-dream', { dream: userMessage })
 *  のリクエストを受けて、夢の解釈（AI処理 or ダミー応答）を行ってレスポンス
 ********************************************************************/
app.post('/interpret-dream', async (req, res) => {
  try {
    const { dream } = req.body;
    // ここでAI APIを呼び出すなどの処理を入れる
    // 今はダミーの解釈結果を返す例
    const interpretation = `あなたの夢の内容は: "${dream}". 特徴：... (ダミー解釈)`;

    return res.json({
      success: true,
      interpretation,        // フロントで msg.text として表示
      interactionId: Date.now(), // メッセージのIDに使うなど
    });
  } catch (error) {
    console.error('Error in /interpret-dream:', error);
    return res.status(500).json({
      success: false,
      message: '解釈処理中にエラーが発生しました',
    });
  }
});

app.post('/api/interpret-dream', (req, res) => {
  const { dream } = req.body;
  // 解析やAI呼び出し等の処理
  return res.json({
    success: true,
    interpretation: `AI解析結果: ${dream}`,
    interactionId: Date.now()
  });
});

// 静的ファイル(ビルド済みVue)の提供
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// シングルページアプリのエントリポイント
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

// サーバ起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
