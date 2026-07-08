<?php
// Redirect script
$dataFile = 'urls.json';

if (!isset($_GET['c']) || empty($_GET['c'])) {
    header('Location: index.html');
    exit;
}

$shortCode = $_GET['c'];

if (!file_exists($dataFile)) {
    header('Location: index.html');
    exit;
}

$urls = json_decode(file_get_contents($dataFile), true);

if (!isset($urls[$shortCode])) {
    header('Location: index.html');
    exit;
}

// Increment click counter
$urls[$shortCode]['clicks']++;
file_put_contents($dataFile, json_encode($urls, JSON_PRETTY_PRINT));

// Redirect to original URL
$longUrl = $urls[$shortCode]['long_url'];
header('Location: ' . $longUrl);
exit;
?>
