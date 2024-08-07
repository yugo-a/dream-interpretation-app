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
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

app.get('/', (req, res) => {
  console.log('GET request to /');
  res.send('API is running');
});

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
      req.session.user = { id: results.insertId, username, email };
      res.json({ status: 'success', message: 'User registered successfully' });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  console.log('Received login request:', { username, password });

  db.query('SELECT * FROM users WHERE username = ? AND deleted_flag = 0', [username], (err, results) => {
    if (err) {
      console.error('Database query failed:', err);
      res.status(500).json({ status: 'error', message: 'Database query failed' });
      return;
    }

    console.log('Database query results:', results);

    if (results.length > 0) {
      const user = results[0];

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          res.status(500).json({ status: 'error', message: 'Error comparing passwords' });
          return;
        }

        console.log('Password match status:', isMatch);

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
      console.error('Error destroying session:', err);
      res.status(500).json({ status: 'error', message: 'Failed to logout' });
    } else {
      res.clearCookie('connect.sid', { path: '/' });
      res.json({ status: 'success', message: 'Logged out successfully' });
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
    console.error('Error calling OpenAI API:', error.message, error.response ? error.response.data : 'No response data');
    res.status(500).json({ success: false, message: 'Failed to interpret the dream.' });
  }
});

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

    console.log('User updated:', results);
    res.json({ status: 'success', message: 'User updated successfully' });
  });
});

app.get('/api/getUserData', (req, res) => {
  if (!req.session.user) {
    console.log('Unauthorized request: no user session');
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  const userId = req.session.user.id;
  console.log('Fetching data for user ID:', userId);

  const query = 'SELECT username, email, age, gender, stress, dream_theme FROM users WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user data:', err);
      return res.status(500).json({ status: 'error', message: 'Error fetching user data' });
    }

    if (results.length > 0) {
      const user = results[0];
      console.log('User data fetched:', user);
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
      console.log('User not found');
      res.status(404).json({ status: 'error', message: 'User not found' });
    }
  });
});

app.post('/api/changePassword', (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  const userId = req.session.user.id;

  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Database query failed:', err);
      return res.status(500).json({ status: 'error', message: 'Database query failed' });
    }

    if (results.length > 0) {
      const user = results[0];

      bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          return res.status(500).json({ status: 'error', message: 'Error comparing passwords' });
        }

        if (isMatch) {
          if (currentPassword === newPassword) {
            return res.status(400).json({ status: 'error', message: '新しいパスワードが現在のパスワードと同じです。' });
          }

          bcrypt.hash(newPassword, 10, (err, hash) => {
            if (err) {
              console.error('Error hashing new password:', err);
              return res.status(500).json({ status: 'error', message: 'Error hashing new password' });
            }

            db.query('UPDATE users SET password = ? WHERE id = ?', [hash, userId], (err, results) => {
              if (err) {
                console.error('Error updating password:', err);
                return res.status(500).json({ status: 'error', message: 'Error updating password' });
              }

              console.log('Password updated:', results);
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

app.post('/api/deleteAccount', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  const userId = req.session.user.id;

  const query = 'UPDATE users SET deleted_flag = 1 WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).json({ status: 'error', message: 'Error deleting user' });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to delete account' });
      }

      res.clearCookie('connect.sid', { path: '/' });
      console.log('User account deleted and session destroyed:', results);
      res.json({ status: 'success', message: 'Account deleted successfully' });
    });
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
