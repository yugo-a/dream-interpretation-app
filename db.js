// db.js
const { Pool } = require('pg');
require('dotenv').config(); // .envを読み込む (Herokuでもprocess.env.* は参照できる)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Heroku PostgresでSSL接続を許可する
  },
});

module.exports = pool;
