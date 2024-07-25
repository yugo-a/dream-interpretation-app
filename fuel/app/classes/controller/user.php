<?php
// fuel/app/classes/controller/user.php
class Controller_User extends Controller_Rest
{
    protected $format = 'json';

    public function post_register()
    {
        $username = Input::post('username');
        $password = Input::post('password');
        $hashed_password = password_hash($password, PASSWORD_BCRYPT);

        try {
            $user = Model_User::forge(array(
                'username' => $username,
                'password' => $hashed_password,
            ));
            $user->save();
            return $this->response(array('status' => 'success', 'message' => 'User registered successfully'));
        } catch (Exception $e) {
            return $this->response(array('status' => 'error', 'message' => 'Error registering user'), 500);
        }
    }

    public function post_login()
    {
        $username = Input::post('username');
        $password = Input::post('password');

        $user = Model_User::find('first', array(
            'where' => array('username' => $username)
        ));

        if ($user && password_verify($password, $user->password)) {
            Session::set('user', $user);
            return $this->response(array('status' => 'success'));
        } else {
            return $this->response(array('status' => 'error', 'message' => 'Invalid credentials'));
        }
    }

    public function get_checksession()
    {
        if (Session::get('user')) {
            return $this->response(array('loggedIn' => true, 'user' => Session::get('user')));
        } else {
            return $this->response(array('loggedIn' => false));
        }
    }

    public function post_logout()
    {
        Session::destroy();
        return $this->response(array('status' => 'success', 'message' => 'Logged out successfully'));
    }

    public function post_update()
    {
        if (!$user = Session::get('user')) {
            return $this->response(array('status' => 'error', 'message' => 'Unauthorized'), 401);
        }

        $user->age = Input::post('age');
        $user->gender = Input::post('gender');
        $user->stress = Input::post('stress');
        $user->dream_theme = Input::post('dreamTheme');

        try {
            $user->save();
            return $this->response(array('status' => 'success', 'message' => 'User updated successfully'));
        } catch (Exception $e) {
            return $this->response(array('status' => 'error', 'message' => 'Error updating user'), 500);
        }
    }
}
