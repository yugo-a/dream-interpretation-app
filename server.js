const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const axios = require('axios');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

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

// MySQLデータベース接続の設定
let db;

function handleDisconnect() {
  db = mysql.createConnection({
    host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
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

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

const corsOptions = {
  origin: 'http://localhost:8080',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

app.get('/', (req, res) => {
  console.log('GET request to /');
  res.send('API is running');
});

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
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "あなたはプロの夢占い師です。ユーザーの夢について日本語で解釈を提供してください。" },
        { role: "user", content: dream }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const interpretation = response.data.choices[0].message.content;
    res.json({ success: true, interpretation });
  } catch (error) {
    console.error('Error calling OpenAI API:', error.message, error.response ? error.response.data : 'No response data');
    res.status(500).json({ success: false, message: 'Failed to interpret the dream.' });
  }
});

// ユーザー情報更新エンドポイント
app.post('/api/updateUser', (req, res) => {
  const { username, email, age, gender, stress, dreamTheme } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

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
app.get('/api/getUserData', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

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
app.post('/api/changePassword', (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

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
app.post('/api/deleteAccount', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

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

    console.log('Query results:', results);

    if (results.length > 0) {
      const user = results[0];
      console.log('Valid reset key found for user:', user.id);

      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) {
          console.error('Error hashing password:', err);
          return res.status(500).json({ status: 'error', message: 'パスワードのハッシュ化に失敗しました。' });
        }

        const updateQuery = 'UPDATE users SET password = ?, reset_key = NULL, reset_key_expiration = NULL WHERE id = ?';
        db.query(updateQuery, [hash, user.id], (err, updateResults) => {
          if (err) {
            console.error('Error updating password:', err);
            return res.status(500).json({ status: 'error', message: 'パスワードの更新に失敗しました。' });
          }

          req.session.user = user;
          console.log('Password updated successfully for user:', user.id);
          res.json({ status: 'success', message: 'パスワードが正常にリセットされました。' });
        });
      });
    } else {
      console.log('Invalid or expired reset key.');
      res.status(400).json({ status: 'error', message: '認証キーが無効か期限切れです。' });
    }
  });
});

// お気に入り一括追加エンドポイント（新規追加）
app.post('/api/addAllFavorites', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  const userId = req.session.user.id;
  const interactions = req.body.interactions;

  if (!interactions || !Array.isArray(interactions) || interactions.length === 0) {
    return res.status(400).json({ status: 'error', message: '有効なインタラクションがありません。' });
  }

  const values = interactions.map(interaction => [userId, interaction.userMessage, interaction.aiMessage]);

  const query = 'INSERT INTO favorites (user_id, user_message, ai_message) VALUES ?';
  db.query(query, [values], (err, results) => {
    if (err) {
      console.error('お気に入りの一括追加に失敗しました:', err);
      return res.status(500).json({ status: 'error', message: 'お気に入りの一括追加に失敗しました。' });
    }
    res.json({ status: 'success', message: 'すべてのお気に入りを追加しました。' });
  });
});

// 個別のお気に入り追加エンドポイント（必要に応じて）
app.post('/api/addFavorite', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  const userId = req.session.user.id;
  const { userMessage, aiMessage } = req.body.interaction;

  if (!userMessage || !aiMessage) {
    return res.status(400).json({ status: 'error', message: '有効なメッセージがありません。' });
  }

  const query = 'INSERT INTO favorites (user_id, user_message, ai_message) VALUES (?, ?, ?)';
  db.query(query, [userId, userMessage, aiMessage], (err, results) => {
    if (err) {
      console.error('お気に入りの追加に失敗しました:', err);
      return res.status(500).json({ status: 'error', message: 'お気に入りの追加に失敗しました。' });
    }
    res.json({ status: 'success', message: 'お気に入りを追加しました。' });
  });
});

// お気に入り取得エンドポイント
app.get('/api/getFavorites', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  const userId = req.session.user.id;

  const query = 'SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('お気に入りの取得に失敗しました:', err);
      return res.status(500).json({ status: 'error', message: 'お気に入りの取得に失敗しました。' });
    }
    res.json({ status: 'success', favorites: results });
  });
});

// お気に入り削除エンドポイント
app.post('/api/deleteFavorite', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  const userId = req.session.user.id;
  const favoriteId = req.body.id;

  const query = 'DELETE FROM favorites WHERE id = ? AND user_id = ?';
  db.query(query, [favoriteId, userId], (err, results) => {
    if (err) {
      console.error('お気に入りの削除に失敗しました:', err);
      return res.status(500).json({ status: 'error', message: 'お気に入りの削除に失敗しました。' });
    }
    res.json({ status: 'success', message: 'お気に入りを削除しました。' });
  });
});

app.use((req, res, next) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).send("Sorry can't find that!");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
