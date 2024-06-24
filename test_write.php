<?php
$test_file = '/Applications/MAMP/htdocs/20240605/sessions/test_file.txt';
$test_content = 'This is a test file to check write permissions.';

if (file_put_contents($test_file, $test_content) !== false) {
    echo 'Write test successful.';
} else {
    echo 'Write test failed.';
}
?>
