<?php

class Model_User extends \Orm\Model
{
    protected static $_properties = array(
        'id',
        'username',
        'password',
        'created_at',
        'age',
        'gender',
        'stress',
        'dream_theme'
    );

    protected static $_table_name = 'users'; // テーブル名が 'users' であることを確認

    // created_at および updated_at フィールドを自動的に管理
    protected static $_observers = array(
        'Orm\\Observer_CreatedAt' => array(
            'events' => array('before_insert'),
            'mysql_timestamp' => false,
        ),
        'Orm\\Observer_UpdatedAt' => array(
            'events' => array('before_update'),
            'mysql_timestamp' => false,
        ),
    );
}
