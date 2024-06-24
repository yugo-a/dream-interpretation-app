<?php

class Controller_Api extends Controller_Rest
{
    protected $format = 'json';

    public function before()
    {
        parent::before();
        $origin = $this->request->get_header('Origin');
        if ($origin === 'http://localhost:8080') {
            $this->response->set_header('Access-Control-Allow-Origin', $origin);
            $this->response->set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
            $this->response->set_header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            $this->response->set_header('Access-Control-Allow-Credentials', 'true');
        }
    }

    public function post_interpret_dream()
    {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);

            // 夢の解釈処理をここに実装
            $dream = isset($data['dream']) ? $data['dream'] : '';
            $interpretation = $this->interpret_dream($dream);

            return $this->response(['success' => true, 'interpretation' => $interpretation], 200);
        } catch (Exception $e) {
            return $this->response(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function interpret_dream($dream)
    {
        // ここにAIによる夢の解釈ロジックを実装
        // 例えば、OpenAI APIを使って夢の解釈を取得するコードなど
        return 'この夢は...'; // 仮の解釈
    }
}
