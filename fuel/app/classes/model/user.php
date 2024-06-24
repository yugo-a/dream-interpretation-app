// fuel/app/classes/model/user.php
<?php

use Orm\Model;

class Model_User extends Model
{
    protected static $_properties = array(
        'id',
        'username',
        'password',
        'created_at',
    );

    protected static $_observers = array(
        'Orm\Observer_CreatedAt' => array(
            'events' => array('before_insert'),
            'mysql_timestamp' => false,
        ),
    );

    protected static $_table_name = 'users';
}
