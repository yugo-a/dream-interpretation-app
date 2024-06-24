<?php

class Controller_Login extends Controller_Rest
{
    protected $format = 'json';

    public function before()
    {
        parent::before();
        $origin = Input::server('HTTP_ORIGIN');
        if ($origin === 'http://localhost:8080') {
            $this->response->set_header('Access-Control-Allow-Origin', $origin);
            $this->response->set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
            $this->response->set_header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            $this->response->set_header('Access-Control-Allow-Credentials', 'true');
        }
    }

    public function post_index()
    {
        $data = json_decode(Input::body(), true);
        $username = $data['username'];
        $password = $data['password'];

        $user = DB::select()->from('users')->where('username', $username)->execute()->current();
        if ($user && password_verify($password, $user['password'])) {
            Session::set('user', $username);
            Session::instance()->write();
            return $this->response(['status' => 'success', 'message' => 'Login successful'], 200);
        } else {
            return $this->response(['status' => 'error', 'message' => 'Invalid username or password'], 401);
        }
    }

    public function options_index()
    {
        $this->response->set_header('Access-Control-Allow-Origin', 'http://localhost:8080');
        $this->response->set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        $this->response->set_header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        $this->response->set_header('Access-Control-Allow-Credentials', 'true');
        $this->response->set_status(204);
    }
}
