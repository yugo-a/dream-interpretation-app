const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();  // .envファイルの内容を読み込む

const app = express();

// CORSの設定を追加
const corsOptions = {
  origin: 'http://localhost:8080', // フロントエンドのURL
  credentials: true,
  optionsSuccessStatus: 200 // 一部のブラウザでの問題を回避するための設定
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // すべてのルートに対してプレフライトリクエストを許可

app.use(bodyParser.json());

// ログミドルウェアの追加
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

// ルートパスへのGETリクエストを処理するルート
app.get('/', (req, res) => {
  console.log('GET request to /');
  res.send('API is running');
});

const openaiApiKey = process.env.OPENAI_API_KEY; // 環境変数からAPIキーを取得

app.post('/api/interpret-dream', async (req, res) => {
    const dreamDescription = req.body.dream;

    try {
        console.log('Received request for dream interpretation:', dreamDescription); // デバッグ用
        console.log('Using OpenAI API Key:', openaiApiKey); // APIキーの確認用

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo", // 使用するモデル
            messages: [
                { role: "system", content: "あなたはプロの夢占い師です。ユーザーの夢について日本語で解釈を提供してください。" },
                { role: "user", content: dreamDescription }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const interpretation = response.data.choices[0].message.content;
        console.log('API Response:', JSON.stringify(response.data, null, 2)); // デバッグ用
        res.json({ success: true, interpretation: interpretation });
    } catch (error) {
        console.error('Error calling OpenAI API:', error.message, error.response ? error.response.data : 'No response data'); // エラーログ
        res.status(500).json({ success: false, error: 'Failed to interpret the dream.' });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    console.log('Received login request:', { username, password }); // デバッグ用

    // 認証ロジックを追加
    // 例:
    let response;
    if (username === 'testuser' && password === 'password123') {
        response = { status: 'success' };
    } else {
        response = { status: 'error', message: 'Invalid credentials' };
    }

    console.log('Login response:', response); // レスポンスのログ
    res.json(response);
});

// Catch-allルートの追加（404エラー対策）
app.use((req, res, next) => {
    console.log(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).send("Sorry can't find that!");
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
