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

// ★ PostgreSQL Pool
const pool = require('./db');

// OpenAI用
const { Configuration, OpenAIApi } = require('openai');

dotenv.config();

const app = express();

/*
// Basic認証を使わないならこの部分はコメントアウトのまま
const USERNAME = process.env.BASIC_USER || 'user';
const PASSWORD = process.env.BASIC_PASS || 'secret';
function basicAuthMiddleware(req, res, next) {
  // ...
}
app.use(basicAuthMiddleware);
*/

// Nodemailer設定
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,          // Gmailアドレス
    pass: process.env.EMAIL_PASSWORD  // Gmailパスワード(またはアプリパスワード)
  }
});

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
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

app.use(express.json());

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

// 認証チェックミドルウェア例
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

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users;');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ status: 'error', message: 'DB fetch error' });
  }
});

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

// ダミーAPI例 (必要に応じて残すor削除)
app.post('/api/register', (req, res) => {
  res.json({ status: 'success', message: '[DBなし] User registered (dummy response)' });
});
app.post('/api/login', (req, res) => {
  res.json({ status: 'success', message: '[DBなし] Login (dummy response)' });
});
app.get('/api/checksession', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// ======== ここからAI解析の実装 ========

// OpenAI 初期化
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,  // .envにセットしたAPIキー
});
const openai = new OpenAIApi(configuration);

/**
 * フロント: axios.post('/interpret-dream', { dream: '...' })
 */
app.post('/interpret-dream', async (req, res) => {
  try {
    const { dream } = req.body;
    if (!dream) {
      return res.status(400).json({
        success: false,
        message: '夢の内容 (dream) がありません。',
      });
    }

    // ChatGPTなどで解析する例
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
      interpretation,        // フロントでmsg.textとして表示
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

/* 
   app.post('/api/interpret-dream', ...) 
   ↑ 不要なら削除してください
   もしフロントが '/api/interpret-dream' にアクセスするなら 
   下記のように同じ処理を書く or ルートを統一する
*/
// app.post('/api/interpret-dream', async (req, res) => {
//   // 同じ内容をここに書くか、上のエンドポイントを使うか決める
// });

// 静的ファイルの提供 (Vueビルド済み)
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// SPA用 catch-allルート
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

// サーバ起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
