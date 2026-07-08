async function shortenUrl() {
    const longUrl = document.getElementById('longUrl').value.trim();
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const shortenBtn = document.getElementById('shortenBtn');

    // Hide previous results
    resultDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');

    // Validate URL
    if (!longUrl) {
        showError('Please enter a URL');
        return;
    }

    if (!isValidUrl(longUrl)) {
        showError('Please enter a valid URL');
        return;
    }

    if (!isImageUrl(longUrl)) {
        showError('Please enter a valid image URL (jpg, jpeg, png, gif, webp)');
        return;
    }

    // Show loading state
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    shortenBtn.disabled = true;

    try {
        const response = await fetch('shorten.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: longUrl })
        });

        const data = await response.json();

        if (data.success) {
            displayResult(data.shortUrl, longUrl);
        } else {
            showError(data.error || 'Failed to shorten URL');
        }
    } catch (error) {
        showError('An error occurred. Please try again.');
        console.error('Error:', error);
    } finally {
        // Reset button state
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        shortenBtn.disabled = false;
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function isImageUrl(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.includes(ext)) || 
           url.includes('image') || 
           url.includes('img') ||
           url.includes('photo');
}

function displayResult(shortUrl, longUrl) {
    const resultDiv = document.getElementById('result');
    const shortUrlInput = document.getElementById('shortUrl');
    const previewImg = document.getElementById('previewImg');

    shortUrlInput.value = shortUrl;
    previewImg.src = longUrl;
    
    resultDiv.classList.remove('hidden');
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function copyUrl() {
    const shortUrlInput = document.getElementById('shortUrl');
    const copyBtn = document.querySelector('.copy-btn');
    const copyText = document.getElementById('copyText');

    shortUrlInput.select();
    shortUrlInput.setSelectionRange(0, 99999); // For mobile devices

    navigator.clipboard.writeText(shortUrlInput.value).then(() => {
        copyText.textContent = 'Copied!';
        copyBtn.classList.add('copied');

        setTimeout(() => {
            copyText.textContent = 'Copy';
            copyBtn.classList.remove('copied');
        }, 2000);
    });
}

// Allow Enter key to submit
document.getElementById('longUrl').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        shortenUrl();
    }
});
