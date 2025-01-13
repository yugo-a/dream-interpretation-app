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

// 環境変数の読み込みを最初に行う
dotenv.config();

const app = express();

// Nodemailerのtransporter設定
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

/* ================================
   ▼▼▼ DB接続部分をコメントアウト ▼▼▼
===================================

// MySQLデータベース接続の設定
let db;

function handleDisconnect() {
  let dbConfig;

  if (process.env.JAWSDB_URL) {
    // Heroku環境でのJawsDB MySQL接続設定
    const dbUrl = new URL(process.env.JAWSDB_URL);

    dbConfig = {
      host: dbUrl.hostname,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.substring(1), // `/`を除外
    };
  } else {
    // ローカル環境でのMySQL接続設定
    dbConfig = {
      host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    };
  }

  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error('Database connection failed:', err.stack);
      // 接続に失敗した場合、2秒後に再試行
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log('Connected to database.');
    }
  });

  // 接続が切れた場合に再接続を試みる
  db.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();
===================================
   ▲▲▲ DB接続部分をコメントアウト ▲▲▲ */

// セッションミドルウェアの設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // 本番環境では true に設定し、HTTPSを使用する
}));

/*
// CORSの設定
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

// ログミドルウェア
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

/* 
  以前あった「app.get('/') で 'API is running'」を
  '/api' に変更し、トップパス('/') はフロントエンドへ委譲
*/

// API ルート例
app.get('/api', (req, res) => {
  console.log('GET request to /api');
  res.send('API is running');
});

// 認証ミドルウェアの作成
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
}

/* =====================================
   ▼▼▼ 以下、DB操作がある箇所を無効化 ▼▼▼
   例: db.query(...) をコメントアウトし、
   代わりにダミーのレスポンスを返す形にします。
======================================*/

// ユーザー登録エンドポイント
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  console.log('Received registration request:', { username, email, password });

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      res.status(500).json({ status: 'error', message: 'Error hashing password' });
      return;
    }

    /*
    // DB操作コメントアウト
    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    db.query(query, [username, email, hash], (err, results) => {
      if (err) {
        console.error('Error inserting user:', err);
        res.status(500).json({ status: 'error', message: 'Error inserting user' });
        return;
      }

      console.log('User inserted:', results);
      res.json({ status: 'success', message: 'User registered successfully' });
    });
    */

    // ダミー応答
    res.json({ status: 'success', message: '[DBなし] User registered (dummy response)' });
  });
});

// ログインエンドポイント
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Received login request:', { username, password });

  /*
  db.query('SELECT * FROM users WHERE username = ? AND deleted_flag = 0', [username], (err, results) => {
    ...
  });
  */

  // ダミー応答
  res.json({ status: 'success', message: '[DBなし] Login (dummy response)' });
});

// セッション確認エンドポイント
app.get('/api/checksession', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// ログアウトエンドポイント
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).json({ status: 'error', message: 'Failed to logout' });
    } else {
      res.clearCookie('connect.sid', { path: '/' });
      res.json({ status: 'success', message: '[DBなし] Logged out (dummy response)' });
    }
  });
});

// 夢解析エンドポイント
app.post('/api/interpret-dream', async (req, res) => {
  const { dream } = req.body;

  try {
    // OpenAI APIにリクエストを送信
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'あなたはプロの夢占い師です。ユーザーの夢について日本語で解釈を提供してください。' },
          { role: 'user', content: dream }
        ],
        max_tokens: 2000
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const interpretation = response.data.choices[0].message.content;

    /*
    // DB操作コメントアウト
    const insertInteractionQuery = 'INSERT INTO interactions (user_message, ai_message) VALUES (?, ?)';
    db.query(insertInteractionQuery, [dream, interpretation], (err, results) => {
      ...
    });
    */

    // ダミー応答
    return res.json({
      success: true,
      interpretation,
      interactionId: '[DBなし] dummy_interaction_id'
    });

  } catch (error) {
    console.error(
      'Error calling OpenAI API:',
      error.message,
      error.response ? error.response.data : 'No response data'
    );
    res.status(500).json({ success: false, message: 'Failed to interpret the dream.' });
  }
});

// ユーザー情報更新エンドポイント
app.post('/api/updateUser', isAuthenticated, (req, res) => {
  /*
  const { username, email, age, gender, stress, dreamTheme } = req.body;
  ...
  db.query(...);
  */
  res.json({ status: 'success', message: '[DBなし] User update (dummy response)' });
});

// ユーザーデータ取得エンドポイント
app.get('/api/getUserData', isAuthenticated, (req, res) => {
  /*
  const userId = req.session.user.id;
  db.query(...);
  */
  res.json({
    status: 'success',
    user: {
      name: '[DBなし] dummy_username',
      email: 'dummy@example.com',
      age: null,
      gender: null,
      stress: null,
      dreamTheme: null
    }
  });
});

// パスワード変更エンドポイント
app.post('/api/changePassword', isAuthenticated, (req, res) => {
  /*
  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    ...
  });
  */
  res.json({ status: 'success', message: '[DBなし] Password updated (dummy response)' });
});

// アカウント削除エンドポイント
app.post('/api/deleteAccount', isAuthenticated, (req, res) => {
  /*
  const userId = req.session.user.id;
  db.query(...);
  req.session.destroy(...);
  */
  res.json({ status: 'success', message: '[DBなし] Account deleted (dummy response)' });
});

// パスワードリセットリクエストエンドポイント
app.post('/api/request-password-reset', (req, res) => {
  /*
  db.query(...);
  transporter.sendMail(...);
  */
  res.json({ status: 'success', message: '[DBなし] Password reset email (dummy response)' });
});

// お気に入り関連エンドポイント (追加/解除/取得)
app.post('/api/favorites', isAuthenticated, (req, res) => {
  /*
  db.query(...);
  */
  res.json({ status: 'success', message: '[DBなし] Favorite added (dummy response)' });
});

app.delete('/api/favorites/:messageId', isAuthenticated, (req, res) => {
  /*
  db.query(...);
  */
  res.json({ status: 'success', message: '[DBなし] Favorite removed (dummy response)' });
});

app.get('/api/favorites', isAuthenticated, (req, res) => {
  /*
  db.query(...);
  */
  res.json({
    status: 'success',
    favorites: []
  });
});

// パスワードリセットエンドポイント
app.post('/api/reset-password', (req, res) => {
  /*
  db.query(...);
  */
  res.json({ status: 'success', message: '[DBなし] Password reset (dummy response)' });
});

/* =====================================
   ▲▲▲ DB関連の操作を一時的に無効化 ▲▲▲
====================================== */

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// シングルページアプリ想定で、すべてのパスに対して index.html を返す
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
