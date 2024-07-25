<?php

class Filter_Cors
{
    public static function add_headers()
    {
        \Response::forge()
            ->set_header('Access-Control-Allow-Origin', '*')
            ->set_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            ->set_header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
}
