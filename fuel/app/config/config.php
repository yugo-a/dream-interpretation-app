<?php

return array(
    'base_url' => 'http://localhost:8888/20240605/public/',

    'security' => array(
        'csrf_autoload'    => false,
        'csrf_token_key'   => 'fuel_csrf_token',
        'csrf_expiration'  => 0,
        'uri_filter'       => array('htmlentities'),
        'output_filter'    => array('Security::htmlentities'),
        'whitelisted_classes' => array('Fuel\\Core\\Response', 'Fuel\\Core\\View'),
    ),

    'log_threshold' => Fuel::L_DEBUG,
    'log_path' => APPPATH.'logs/',

    'session' => array(
        'driver' => 'file',
        'cookie_name' => 'fuelfid',
        'path' => '/Applications/MAMP/htdocs/20240605/sessions',
        'cookie_domain' => '',
        'cookie_path' => '/',
        'expire_on_close' => false,
        'expiration_time' => 7200,
        'flash_id' => 'flash',
        'flash_auto_expire' => true,
        'flash_expire_after_get' => true,
        'database' => array(
            'table' => 'sessions',
        ),
    ),
);
