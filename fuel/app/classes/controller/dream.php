<?php
// fuel/app/classes/controller/dream.php
class Controller_Dream extends Controller_Rest
{
    protected $format = 'json';

    public function post_interpret()
    {
        $dream = Input::post('dream');

        try {
            $response = Request::forge('http://localhost:3000/api/interpret-dream', 'curl')
                ->set_method('post')
                ->set_params(array('dream' => $dream))
                ->execute()
                ->response();

            return $this->response(json_decode($response->body));
        } catch (Exception $e) {
            return $this->response(array('success' => false, 'message' => 'Failed to interpret the dream.'), 500);
        }
    }
}
