<?php 
return array(
    'csrf_autoload'    => false,
    'csrf_token_key'   => 'fuel_csrf_token',
    'csrf_expiration'  => 0,
    'uri_filter'       => array('htmlentities'),
    'output_filter'    => array('Security::htmlentities'),
    'whitelisted_classes' => array('Fuel\\Core\\Response', 'Fuel\\Core\\View'),
);
