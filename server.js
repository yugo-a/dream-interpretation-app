const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();  // .envファイルの内容を読み込む

const app = express();

app.use(cors());
app.use(bodyParser.json());

const openaiApiKey = process.env.OPENAI_API_KEY; // 環境変数からAPIキーを取得

app.post('/api/interpret-dream', async (req, res) => {
    const dreamDescription = req.body.dream;

    try {
        console.log('Received request:', dreamDescription); // デバッグ用
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
