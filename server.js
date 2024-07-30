const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const axios = require('axios');

dotenv.config();

const app = express();

// MySQLデータベース接続の設定
let db;

function handleDisconnect() {
  db = mysql.createConnection({
    host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 8889 // DBポートを8889に設定
  });

  db.connect((err) => {
    if (err) {
      console.error('データベース接続失敗:', err.stack);
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log('データベースに接続しました。');
    }
  });

  db.on('error', (err) => {
    console.error('データベースエラー:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key', // 環境変数からシークレットを取得
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
  console.log('リクエストヘッダー:', req.headers);
  console.log('リクエストボディ:', req.body);
  next();
});

app.get('/', (req, res) => {
  console.log('GETリクエストを受信しました。');
  res.send('APIは稼働中です');
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  console.log('登録リクエストを受信しました:', { username, password });

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error('パスワードのハッシュ化エラー:', err);
      res.status(500).json({ status: 'error', message: 'パスワードのハッシュ化に失敗しました' });
      return;
    }

    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.query(query, [username, hash], (err, results) => {
      if (err) {
        console.error('ユーザーの挿入エラー:', err);
        res.status(500).json({ status: 'error', message: 'ユーザーの挿入に失敗しました' });
        return;
      }

      console.log('ユーザーが挿入されました:', results);
      res.json({ status: 'success', message: 'ユーザーが正常に登録されました' });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  console.log('ログインリクエストを受信しました:', { username, password });

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) {
      console.error('データベースクエリエラー:', err);
      res.status(500).json({ status: 'error', message: 'データベースクエリに失敗しました' });
      return;
    }

    console.log('データベースクエリ結果:', results);

    if (results.length > 0) {
      const user = results[0];

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error('パスワード比較エラー:', err);
          res.status(500).json({ status: 'error', message: 'パスワード比較に失敗しました' });
          return;
        }

        console.log('パスワード一致ステータス:', isMatch);

        if (isMatch) {
          req.session.user = user;
          res.json({ status: 'success' });
        } else {
          res.json({ status: 'error', message: '認証情報が無効です' });
        }
      });
    } else {
      res.json({ status: 'error', message: '認証情報が無効です' });
    }
  });
});

app.get('/api/checksession', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('セッション破棄エラー:', err);
      res.status(500).json({ status: 'error', message: 'ログアウトに失敗しました' });
    } else {
      res.clearCookie('connect.sid', { path: '/' });
      res.json({ status: 'success', message: 'ログアウトが成功しました' });
    }
  });
});

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
    console.error('OpenAI API呼び出しエラー:', error.message, error.response ? error.response.data : 'レスポンスデータなし');
    res.status(500).json({ success: false, message: '夢の解釈に失敗しました。' });
  }
});

app.post('/api/updateUser', (req, res) => {
  const { username, age, gender, stress, dreamTheme } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ status: 'error', message: '認証されていません' });
  }

  if (!username.trim()) {
    return res.status(400).json({ status: 'error', message: 'ユーザー名を入力してください。' });
  }

  const userId = req.session.user.id;

  const query = 'UPDATE users SET age = ?, gender = ?, stress = ?, dream_theme = ? WHERE id = ?';
  db.query(query, [age || null, gender || null, stress || null, dreamTheme || null, userId], (err, results) => {
    if (err) {
      console.error('ユーザー更新エラー:', err);
      return res.status(500).json({ status: 'error', message: 'ユーザー更新に失敗しました' });
    }

    console.log('ユーザーが更新されました:', results);
    res.json({ status: 'success', message: 'ユーザーが正常に更新されました' });
  });
});

app.get('/api/getUserData', (req, res) => {
  if (!req.session.user) {
    console.log('未認証リクエスト: ユーザーセッションがありません');
    return res.status(401).json({ status: 'error', message: '認証されていません' });
  }

  const userId = req.session.user.id;
  console.log('ユーザーIDのデータを取得中:', userId);

  const query = 'SELECT username, age, gender, stress, dream_theme FROM users WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('ユーザーデータ取得エラー:', err);
      return res.status(500).json({ status: 'error', message: 'ユーザーデータ取得に失敗しました' });
    }

    if (results.length > 0) {
      const user = results[0];
      console.log('ユーザーデータを取得しました:', user);
      res.json({
        status: 'success',
        user: {
          name: user.username,
          age: user.age,
          gender: user.gender,
          stress: user.stress,
          dreamTheme: user.dream_theme
        }
      });
    } else {
      console.log('ユーザーが見つかりません');
      res.status(404).json({ status: 'error', message: 'ユーザーが見つかりません' });
    }
  });
});

app.post('/api/changePassword', (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ status: 'error', message: '認証されていません' });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ status: 'error', message: '現在のパスワードと新しいパスワードが同じです' });
  }

  const userId = req.session.user.id;

  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('データベースクエリエラー:', err);
      return res.status(500).json({ status: 'error', message: 'データベースクエリに失敗しました' });
    }

    if (results.length > 0) {
      const user = results[0];

      bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
        if (err) {
          console.error('パスワード比較エラー:', err);
          return res.status(500).json({ status: 'error', message: 'パスワード比較に失敗しました' });
        }

        if (isMatch) {
          bcrypt.hash(newPassword, 10, (err, hash) => {
            if (err) {
              console.error('新しいパスワードのハッシュ化エラー:', err);
              return res.status(500).json({ status: 'error', message: '新しいパスワードのハッシュ化に失敗しました' });
            }

            db.query('UPDATE users SET password = ? WHERE id = ?', [hash, userId], (err, results) => {
              if (err) {
                console.error('パスワード更新エラー:', err);
                return res.status(500).json({ status: 'error', message: 'パスワード更新に失敗しました' });
              }

              console.log('パスワードが更新されました:', results);
              res.json({ status: 'success', message: 'パスワードが正常に更新されました' });
            });
          });
        } else {
          res.status(400).json({ status: 'error', message: '現在のパスワードが正しくありません' });
        }
      });
    } else {
      res.status(404).json({ status: 'error', message: 'ユーザーが見つかりません' });
    }
  });
});

app.use((req, res, next) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).send("お探しのページは見つかりません");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で稼働中です`);
});
