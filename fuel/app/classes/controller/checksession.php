<?php

class Controller_Checksession extends Controller_Rest
{
    protected $format = 'json';

    public function before()
    {
        parent::before();
        // CORSヘッダーの設定
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
        if ($origin === 'http://localhost:8080') {
            $this->response->set_header('Access-Control-Allow-Origin', $origin);
            $this->response->set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
            $this->response->set_header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            $this->response->set_header('Access-Control-Allow-Credentials', 'true');
        }
        Log::debug('CORS headers set.');
    }

    public function options_index()
    {
        // CORSプリフライトリクエストの対応
        $this->response->set_header('Access-Control-Allow-Origin', 'http://localhost:8080');
        $this->response->set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        $this->response->set_header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        $this->response->set_header('Access-Control-Allow-Credentials', 'true');
        $this->response->set_status(204); // No Content
        Log::debug('OPTIONS request handled.');
        return $this->response();
    }

    public function get_index()
    {
        // セッションデータを取得してログイン状態をチェック
        $session = Session::instance();
        if ($user = $session->get('user', null)) {
            $response = ['status' => 'success', 'message' => 'User is logged in', 'user' => $user];
            Log::debug('User is logged in: ' . $user);
        } else {
            $response = ['status' => 'error', 'message' => 'Not logged in'];
            Log::debug('No user is logged in.');
        }
        return $this->response($response, 200);
    }
}
