<?php
header('Content-Type: application/json');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);

function generateShortCode($length = 6) {
    $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $shortCode = '';
    for ($i = 0; $i < $length; $i++) {
        $shortCode .= $characters[rand(0, strlen($characters) - 1)];
    }
    return $shortCode;
}

function isValidImageUrl($url) {
    $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    $urlLower = strtolower($url);
    
    foreach ($imageExtensions as $ext) {
        if (strpos($urlLower, '.' . $ext) !== false) {
            return true;
        }
    }
    
    return (strpos($urlLower, 'image') !== false || 
            strpos($urlLower, 'img') !== false || 
            strpos($urlLower, 'photo') !== false);
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['url']) || empty($input['url'])) {
        throw new Exception('URL is required');
    }
    
    $longUrl = filter_var($input['url'], FILTER_SANITIZE_URL);
    
    // Validate URL
    if (!filter_var($longUrl, FILTER_VALIDATE_URL)) {
        throw new Exception('Invalid URL format');
    }
    
    // Check if it's an image URL
    if (!isValidImageUrl($longUrl)) {
        throw new Exception('URL must be an image');
    }
    
    // Load existing URLs
    $dataFile = 'urls.json';
    $urls = [];
    
    if (file_exists($dataFile)) {
        $jsonData = file_get_contents($dataFile);
        $urls = json_decode($jsonData, true) ?? [];
    }
    
    // Check if URL already exists
    foreach ($urls as $code => $data) {
        if ($data['long_url'] === $longUrl) {
            $shortUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") 
                      . "://" . $_SERVER['HTTP_HOST'] 
                      . dirname($_SERVER['PHP_SELF']) 
                      . "/r.php?c=" . $code;
            
            echo json_encode([
                'success' => true,
                'shortUrl' => $shortUrl,
                'message' => 'URL already shortened'
            ]);
            exit;
        }
    }
    
    // Generate unique short code
    do {
        $shortCode = generateShortCode();
    } while (isset($urls[$shortCode]));
    
    // Save URL mapping
    $urls[$shortCode] = [
        'long_url' => $longUrl,
        'created_at' => date('Y-m-d H:i:s'),
        'clicks' => 0
    ];
    
    file_put_contents($dataFile, json_encode($urls, JSON_PRETTY_PRINT));
    
    // Create short URL
    $shortUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") 
              . "://" . $_SERVER['HTTP_HOST'] 
              . dirname($_SERVER['PHP_SELF']) 
              . "/r.php?c=" . $shortCode;
    
    echo json_encode([
        'success' => true,
        'shortUrl' => $shortUrl
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
