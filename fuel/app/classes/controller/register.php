<?php

class Controller_Register extends Controller_Rest
{
    protected $format = 'json';

    public function before()
    {
        parent::before();

        // CORSヘッダーの追加
        $this->response->set_header('Access-Control-Allow-Origin', '*');
        $this->response->set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        $this->response->set_header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    public function options_index()
    {
        // CORSプリフライトリクエストの対応
        $this->response->set_header('Access-Control-Allow-Origin', '*');
        $this->response->set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        $this->response->set_header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        $this->response->set_status(200);
        return $this->response();
    }

    // fuel/app/classes/controller/register.php

    public function post_index()
    {
        // JSONリクエストデータの取得
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        $username = isset($data['username']) ? $data['username'] : null;
        $password = isset($data['password']) ? $data['password'] : null;

        Log::debug('Received data: ' . print_r($data, true));

        if (empty($username) || empty($password)) {
            $response = ['status' => 'error', 'message' => 'Username or password cannot be empty.'];
            Log::debug('Response data: ' . json_encode($response));
            return $this->response($response, 400);
        }

        // パスワードのハッシュ化
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        Log::debug('Generated hash: ' . $hashed_password);  // ハッシュ値をログに出力

        try {
            DB::query("SELECT 1")->execute();
            Log::debug('Database connection successful.');

            // ユーザー情報をデータベースに保存
            $result = DB::insert('users')->set(array(
                'username' => $username,
                'password' => $hashed_password,
            ))->execute();

            Log::debug('Inserted user with hash: ' . $hashed_password);  // データベースに保存されたハッシュ値をログに出力

            $response = ['status' => 'success', 'message' => 'User registered successfully'];
            Log::debug('Response data: ' . json_encode($response));
            return $this->response($response, 200);
        } catch (Exception $e) {
            $response = ['status' => 'error', 'message' => 'Database connection failed'];
            Log::debug('Response data: ' . json_encode($response));
            return $this->response($response, 500);
        }
    }
}
