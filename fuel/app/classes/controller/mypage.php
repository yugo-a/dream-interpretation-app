<?php

class Controller_Mypage extends Controller
{
    public function before()
    {
        parent::before();

        // プリフライトリクエストに対してCORSヘッダーを設定
        if (\Input::method() === 'OPTIONS') {
            \Response::forge()
                ->set_header('Access-Control-Allow-Origin', '*')
                ->set_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                ->set_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                ->send(true);
            exit;
        }
    }

    public function action_update()
    {
        // FuelPHPのセッションを使用してユーザー情報を取得
        if (!\Session::get('user')) {
            return \Response::forge(json_encode(array(
                'status' => 'error',
                'message' => 'Unauthorized'
            )), 401);
        }

        $userId = \Session::get('user.id');
        $age = \Input::post('age');
        $gender = \Input::post('gender');
        $stress = \Input::post('stress');
        $dreamTheme = \Input::post('dreamTheme');

        // バリデーションの設定
        $val = \Validation::forge();
        $val->add_field('age', 'Age', 'required|valid_string[numeric]|numeric_between[1,100]');
        $val->add_field('gender', 'Gender', 'required|max_length[10]');
        $val->add_field('stress', 'Stress', 'required|max_length[255]');
        $val->add_field('dreamTheme', 'Dream Theme', 'required|max_length[255]');

        if ($val->run())
        {
            $user = Model_User::find($userId);
            if ($user) {
                $user->age = $age;
                $user->gender = $gender;
                $user->stress = $stress;
                $user->dream_theme = $dreamTheme;
                $user->save();

                return \Response::forge(json_encode(array(
                    'status' => 'success',
                    'message' => 'User updated successfully'
                )));
            } else {
                return \Response::forge(json_encode(array(
                    'status' => 'error',
                    'message' => 'User not found'
                )), 404);
            }
        }
        else
        {
            $errors = $val->error();
            $error_messages = array();
            foreach ($errors as $field => $error) {
                $error_messages[$field] = $error->get_message();
            }

            return \Response::forge(json_encode(array(
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $error_messages
            )), 400);
        }
    }
}
