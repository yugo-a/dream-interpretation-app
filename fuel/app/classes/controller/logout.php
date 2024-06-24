<?php

class Controller_Logout extends Controller_Rest
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

    public function post_index()
    {
        // セッションデータを削除してログアウト
        $session = Session::instance();
        $session->destroy();
        $response = ['status' => 'success', 'message' => 'Logout successful'];
        Log::debug('User logged out.');
        return $this->response($response, 200);
    }
}
