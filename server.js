// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const axios = require('axios');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// 環境変数の読み込みを最初に行う
dotenv.config();

const app = express();

// Nodemailerのtransporter設定
const transporter = nodemailer.createTransport({
<<<<<<< HEAD
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD
    }
=======
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
>>>>>>> c06c6cf5944d30e43412a7a1a58f775aca3681e2
});

// MySQLデータベース接続の設定
let db;

<<<<<<< HEAD
function handleDisconnect() {
    db = mysql.createConnection({
      host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 8889
    });
  
    db.connect((err) => {
      if (err) {
        console.error('Database connection failed:', err.stack);
        setTimeout(handleDisconnect, 2000);
      } else {
        console.log('Connected to database.');
      }
    });
  
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
=======
if (process.env.JAWSDB_URL) {
  // Heroku環境でのJawsDB MySQL接続設定
  const dbUrl = new URL(process.env.JAWSDB_URL);

  db = mysql.createConnection({
    host: dbUrl.hostname,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.substring(1), // `/`を除外
  });
} else {
  // ローカル環境でのMySQL接続設定
  db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'your_local_db',
    port: process.env.DB_PORT || 3306
  });
}

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to database.');
});
>>>>>>> c06c6cf5944d30e43412a7a1a58f775aca3681e2

// セッションミドルウェアの設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // 本番環境では true に設定し、HTTPSを使用する
}));

// CORSの設定
const corsOptions = {
  origin: 'http://localhost:8080',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

<<<<<<< HEAD
// ボディパーサーの設定
app.use(bodyParser.json());
=======
// bodyParser.json() を express.json() に置き換え
app.use(express.json());
>>>>>>> c06c6cf5944d30e43412a7a1a58f775aca3681e2

// ログミドルウェア
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

// ルートエンドポイント
app.get('/', (req, res) => {
  console.log('GET request to /');
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
  });
});

// ログインエンドポイント
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  console.log('Received login request:', { username, password });

  db.query('SELECT * FROM users WHERE username = ? AND deleted_flag = 0', [username], (err, results) => {
    if (err) {
      console.error('Database query failed:', err);
      res.status(500).json({ status: 'error', message: 'Database query failed' });
      return;
    }

    if (results.length > 0) {
      const user = results[0];

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          res.status(500).json({ status: 'error', message: 'Error comparing passwords' });
          return;
        }

        if (isMatch) {
          req.session.user = user;
          res.json({ status: 'success' });
        } else {
          res.json({ status: 'error', message: 'Invalid credentials' });
        }
      });
    } else {
      res.json({ status: 'error', message: 'Invalid credentials' });
    }
  });
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
      res.json({ status: 'success', message: 'Logged out successfully' });
    }
  });
});

// 夢解析エンドポイント
app.post('/api/interpret-dream', async (req, res) => {
  const { dream } = req.body;

  try {
    // OpenAI APIにリクエストを送信
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4",
      messages: [
        { role: "system", content: "あなたはプロの夢占い師です。ユーザーの夢について日本語で解釈を提供してください。" },
        { role: "user", content: dream }
      ],
      max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const interpretation = response.data.choices[0].message.content;

    // ユーザーのメッセージとAIの解釈をデータベースに保存
    const insertInteractionQuery = 'INSERT INTO interactions (user_message, ai_message) VALUES (?, ?)';
    db.query(insertInteractionQuery, [dream, interpretation], (err, results) => {
      if (err) {
        console.error('Error inserting interaction:', err);
        return res.status(500).json({ success: false, message: 'Failed to store interaction.' });
      }

      const interactionId = results.insertId; // 生成されたinteraction.id

      res.json({ success: true, interpretation, interactionId });
    });
  } catch (error) {
    console.error('Error calling OpenAI API:', error.message, error.response ? error.response.data : 'No response data');
    res.status(500).json({ success: false, message: 'Failed to interpret the dream.' });
  }
});

// ユーザー情報更新エンドポイント
app.post('/api/updateUser', isAuthenticated, (req, res) => {
  const { username, email, age, gender, stress, dreamTheme } = req.body;

  if (!username.trim()) {
    return res.status(400).json({ status: 'error', message: 'ユーザー名を入力してください。' });
  }

  if (!email.trim()) {
    return res.status(400).json({ status: 'error', message: 'メールアドレスを入力してください。' });
  }

  const userId = req.session.user.id;

  const query = 'UPDATE users SET username = ?, email = ?, age = ?, gender = ?, stress = ?, dream_theme = ? WHERE id = ?';
  db.query(query, [username, email, age || null, gender || null, stress || null, dreamTheme || null, userId], (err, results) => {
    if (err) {
      console.error('Error updating user:', err);
      return res.status(500).json({ status: 'error', message: 'Error updating user' });
    }

    res.json({ status: 'success', message: 'User updated successfully' });
  });
});

// ユーザーデータ取得エンドポイント
app.get('/api/getUserData', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;

  const query = 'SELECT username, email, age, gender, stress, dream_theme FROM users WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user data:', err);
      return res.status(500).json({ status: 'error', message: 'Error fetching user data' });
    }

    if (results.length > 0) {
      const user = results[0];
      res.json({
        status: 'success',
        user: {
          name: user.username,
          email: user.email,
          age: user.age,
          gender: user.gender,
          stress: user.stress,
          dreamTheme: user.dream_theme
        }
      });
    } else {
      res.status(404).json({ status: 'error', message: 'User not found' });
    }
  });
});

// パスワード変更エンドポイント
app.post('/api/changePassword', isAuthenticated, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const userId = req.session.user.id;

  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ status: 'error', message: 'Database query failed' });
    }

    if (results.length > 0) {
      const user = results[0];

      bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ status: 'error', message: 'Error comparing passwords' });
        }

        if (isMatch) {
          if (currentPassword === newPassword) {
            return res.status(400).json({ status: 'error', message: '新しいパスワードが現在のパスワードと同じです。' });
          }

          bcrypt.hash(newPassword, 10, (err, hash) => {
            if (err) {
              return res.status(500).json({ status: 'error', message: 'Error hashing new password' });
            }

            db.query('UPDATE users SET password = ? WHERE id = ?', [hash, userId], (err, results) => {
              if (err) {
                return res.status(500).json({ status: 'error', message: 'Error updating password' });
              }

              res.json({ status: 'success', message: 'Password updated successfully' });
            });
          });
        } else {
          res.status(400).json({ status: 'error', message: '現在のパスワードが間違っています。' });
        }
      });
    } else {
      res.status(404).json({ status: 'error', message: 'User not found' });
    }
  });
});

// アカウント削除エンドポイント
app.post('/api/deleteAccount', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;

  const query = 'UPDATE users SET deleted_flag = 1 WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ status: 'error', message: 'Error deleting user' });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ status: 'error', message: 'Failed to delete account' });
      }

      res.clearCookie('connect.sid', { path: '/' });
      res.json({ status: 'success', message: 'Account deleted successfully' });
    });
  });
});

// パスワードリセットリクエストエンドポイント
app.post('/api/request-password-reset', (req, res) => {
  const { email } = req.body;
  console.log('Received password reset request for email:', email);

  const query = 'SELECT * FROM users WHERE email = ? AND deleted_flag = 0';
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Database query failed:', err);
      return res.status(500).json({ status: 'error', message: 'データベースのクエリに失敗しました。' });
    }

    if (results.length > 0) {
      const user = results[0];
      const resetKey = crypto.randomBytes(5).toString('hex');

      const expireTime = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

      console.log(`Calculated expiration time: ${expireTime}`);

      const tokenQuery = 'UPDATE users SET reset_key = ?, reset_key_expiration = ? WHERE id = ?';
      db.query(tokenQuery, [resetKey, expireTime, user.id], (err, updateResults) => {
        if (err) {
          console.error('Error updating reset token:', err);
          return res.status(500).json({ status: 'error', message: 'リセットトークンの更新に失敗しました。' });
        }

        console.log(`Generated reset key: ${resetKey} with expiration time: ${expireTime} for user ID: ${user.id}`);

        const mailOptions = {
          from: process.env.EMAIL,
          to: email,
          subject: 'パスワードリセットリクエスト',
          text: `以下のリンクをクリックしてパスワードをリセットしてください。\n\nhttp://localhost:8080/password-reset/${resetKey}\n\nこのリンクは10分間有効です。`
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.error('Error sending email:', err);
            return res.status(500).json({ status: 'error', message: 'メールの送信に失敗しました。' });
          }

          console.log('Password reset email sent:', info.response);
          res.json({ status: 'success', message: 'パスワードリセット用のメールを送信しました。' });
        });
      });
    } else {
      res.status(404).json({ status: 'error', message: 'メールアドレスが見つかりませんでした。' });
    }
  });
});

// お気に入り関連エンドポイント
app.post('/api/favorites', isAuthenticated, (req, res) => {
  const { messageId } = req.body;

  if (!messageId || typeof messageId !== 'number') {
    return res.status(400).json({ status: 'error', message: '有効なメッセージIDが必要です。' });
  }

  const userId = req.session.user.id;

  const checkItemQuery = 'SELECT * FROM interactions WHERE id = ?';
  db.query(checkItemQuery, [messageId], (err, items) => {
    if (err) {
      console.error('アイテム存在確認エラー:', err);
      return res.status(500).json({ status: 'error', message: 'サーバーエラーが発生しました。' });
    }

    if (items.length === 0) {
      return res.status(404).json({ status: 'error', message: 'メッセージが見つかりません。' });
    }

    const checkFavoriteQuery = 'SELECT * FROM user_favorites WHERE user_id = ? AND message_id = ?';
    db.query(checkFavoriteQuery, [userId, messageId], (err, favorites) => {
      if (err) {
        console.error('お気に入り存在確認エラー:', err);
        return res.status(500).json({ status: 'error', message: 'サーバーエラーが発生しました。' });
      }

      if (favorites.length > 0) {
        return res.status(400).json({ status: 'error', message: '既にお気に入りに登録されています。' });
      }

      const addFavoriteQuery = 'INSERT INTO user_favorites (user_id, message_id) VALUES (?, ?)';
      db.query(addFavoriteQuery, [userId, messageId], (err) => {
        if (err) {
          console.error('お気に入り追加エラー:', err);
          return res.status(500).json({ status: 'error', message: 'サーバーエラーが発生しました。' });
        }

        res.json({ status: 'success', message: 'お気に入りに追加しました。' });
      });
    });
  });
});

app.delete('/api/favorites/:messageId', isAuthenticated, (req, res) => {
  const { messageId } = req.params;
  const parsedMessageId = parseInt(messageId, 10);

  if (isNaN(parsedMessageId)) {
    return res.status(400).json({ status: 'error', message: '有効なメッセージIDが必要です。' });
  }

  const userId = req.session.user.id;

  const removeFavoriteQuery = 'DELETE FROM user_favorites WHERE user_id = ? AND message_id = ?';
  db.query(removeFavoriteQuery, [userId, parsedMessageId], (err, result) => {
    if (err) {
      console.error('お気に入り解除エラー:', err);
      return res.status(500).json({ status: 'error', message: 'サーバーエラーが発生しました。' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'お気に入りが見つかりませんでした。' });
    }

    res.json({ status: 'success', message: 'お気に入りを解除しました。' });
  });
});

app.get('/api/favorites', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;

  const getFavoritesQuery = `
    SELECT interactions.id, interactions.user_message, interactions.ai_message, interactions.created_at AS interaction_created_at, user_favorites.favorited_at
    FROM user_favorites
    JOIN interactions ON user_favorites.message_id = interactions.id
    WHERE user_favorites.user_id = ?
    ORDER BY user_favorites.favorited_at DESC
  `;

  db.query(getFavoritesQuery, [userId], (err, results) => {
    if (err) {
      console.error('お気に入り取得エラー:', err);
      return res.status(500).json({ status: 'error', message: 'サーバーエラーが発生しました。' });
    }

    res.json({ status: 'success', favorites: results });
  });
});

// パスワードリセットエンドポイント
app.post('/api/reset-password', (req, res) => {
  const { key, newPassword } = req.body;

  if (!key || !newPassword) {
    return res.status(400).json({ status: 'error', message: '認証キーまたは新しいパスワードが不足しています。' });
  }

  const query = 'SELECT * FROM users WHERE reset_key = ? AND reset_key_expiration > NOW()';
  db.query(query, [key], (err, results) => {
    if (err) {
      console.error('Database query failed:', err);
      return res.status(500).json({ status: 'error', message: 'データベースのクエリに失敗しました。' });
    }

    if (results.length > 0) {
      const user = results[0];

      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) {
          return res.status(500).json({ status: 'error', message: 'パスワードのハッシュ化に失敗しました。' });
        }

        const updateQuery = 'UPDATE users SET password = ?, reset_key = NULL, reset_key_expiration = NULL WHERE id = ?';
        db.query(updateQuery, [hash, user.id], (err) => {
          if (err) {
            return res.status(500).json({ status: 'error', message: 'パスワードの更新に失敗しました。' });
          }

          res.json({ status: 'success', message: 'パスワードが正常にリセットされました。' });
        });
      });
    } else {
      res.status(400).json({ status: 'error', message: '認証キーが無効か期限切れです。' });
    }
  });
});
app.use((req, res, next) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).send("Sorry can't find that!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
