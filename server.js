// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
// const mysql = require('mysql'); // ← DB未使用化のためコメントアウトでもOK
const bcrypt = require('bcrypt');
const session = require('express-session');
const axios = require('axios');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');

// ★ ここで db.js を読み込む
const pool = require('./db');

// 環境変数の読み込みを最初に行う
dotenv.config();

const app = express();

// 簡易的にユーザー名/パスワードを決め打ち (Basic認証)
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

// Nodemailerのtransporter設定
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

// セッションミドルウェアの設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // 本番環境では true にし、HTTPSを使用する
}));

/*
// CORSの設定が必要な場合のみ有効化
const corsOptions = {
  origin: 'http://localhost:8080',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
*/

// express で JSON ボディをパース
app.use(express.json());

// ログミドルウェア (最初に置いてもOK)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

/*
  (以前あった「app.get('/') で 'API is running'」を
   '/api' に変更し、トップパス('/') はフロントエンドへ委譲)
*/
app.get('/api', (req, res) => {
  console.log('GET request to /api');
  res.send('API is running');
});

// 認証ミドルウェアの作成（セッション）
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

// テーブル作成用エンドポイント
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

// CREATE (ユーザー追加)
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
  以下は "DB操作コメントアウト" していた既存エンドポイント。
  まだMySQL用コードが残っているが、Postgresに移行するなら順次書き換えを。
*/

// ユーザー登録 (ダミー)
app.post('/api/register', (req, res) => {
  // ...
  res.json({ status: 'success', message: '[DBなし] User registered (dummy response)' });
});

// ログイン (ダミー)
app.post('/api/login', (req, res) => {
  // ...
  res.json({ status: 'success', message: '[DBなし] Login (dummy response)' });
});

// セッション確認 (ダミー)
app.get('/api/checksession', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// ... 他のダミーエンドポイントも同様 ...

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// シングルページアプリ想定で、すべてのパスに対して index.html を返す
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

// サーバ起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
