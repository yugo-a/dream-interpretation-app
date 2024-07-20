<?php

class Controller_UpdateUser extends Controller_Rest
{
    protected $format = 'json';

    public function post_index()
    {
        \Log::info('updateUser endpoint reached');

        try {
            // リクエストからデータを取得
            $user_id = Auth::get_user_id()[1]; // 現在のログインユーザーのIDを取得
            \Log::info('User ID: ' . $user_id);

            $age = Input::post('age');
            $gender = Input::post('gender');
            $stress = Input::post('stress');
            $dream_theme = Input::post('dreamTheme');

            // データのログ出力
            \Log::info('Received data: Age=' . $age . ', Gender=' . $gender . ', Stress=' . $stress . ', DreamTheme=' . $dream_theme);

            // ユーザー情報を更新
            $user = Model_User::find($user_id);
            if ($user) {
                $user->age = $age;
                $user->gender = $gender;
                $user->stress = $stress;
                $user->dream_theme = $dream_theme;
                $user->save();

                \Log::info('User information updated successfully');

                return $this->response(array(
                    'success' => true,
                    'message' => 'ユーザー情報が更新されました'
                ));
            } else {
                \Log::error('User not found');
                return $this->response(array(
                    'success' => false,
                    'message' => 'ユーザーが見つかりません'
                ));
            }
        } catch (Exception $e) {
            \Log::error('Error in updateUser endpoint: ' . $e->getMessage());
            return $this->response(array(
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage()
            ));
        }
    }
}
