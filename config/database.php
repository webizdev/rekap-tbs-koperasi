<?php
$host = 'db';
$dbname = 'tbs_sawit';
// Default user/pass for MySQL. 
// We are using user 'admin' and password 'adminkop' for the LOGIN mechanism as requested, not necessarily for DB connection, unless the user meant the DB connection. But typical DB connection is root. I'll use standard root, but add a comment.
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Koneksi gagal: " . $e->getMessage());
}
?>
