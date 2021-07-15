<?php
    error_reporting(E_ALL);
    $data = $_POST['games'];
    if (!empty($data)) {
        echo 'Successfully Received Data!';
    }
    $f = fopen('data.json', 'w+');
    fwrite($f, iconv("UTF-8", "UTF-16", $data));
    fclose($f);
?>