// This version creates short URLs like: arunpanthi.com.np/#abc123
// Works perfectly on GitHub Pages

let currentOriginalUrl = '';

document.addEventListener('DOMContentLoaded', function() {
    loadHistory();
    checkForRedirect();
    updateStats();
});

function checkForRedirect() {
    const hash = window.location.hash.substring(1); // Remove the # symbol
    
    if (hash && /^[a-zA-Z0-9]{6}$/.test(hash)) {
        redirectToOriginal(hash);
    }
}

function redirectToOriginal(code) {
    const urls = JSON.parse(localStorage.getItem('urlShortener') || '{}');
    
    if (urls[code]) {
        urls[code].clicks = (urls[code].clicks || 0) + 1;
        localStorage.setItem('urlShortener', JSON.stringify(urls));
        
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="background: white; padding: 50px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px;">
                    <div style="font-size: 60px; margin-bottom: 20px;">🚀</div>
                    <h2 style="color: #333; margin-bottom: 15px;">Redirecting...</h2>
                    <p style="color: #666; margin-bottom: 25px;">Taking you to your destination</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 10px; word-break: break-all; font-size: 14px; color: #667eea; margin-bottom: 20px;">${escapeHtml(urls[code].longUrl)}</div>
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                </div>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;
        
        setTimeout(() => {
            window.location.href = urls[code].longUrl;
        }, 1000);
    } else {
        // Code not found
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="background: white; padding: 50px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px;">
                    <div style="font-size: 60px; margin-bottom: 20px;">❌</div>
                    <h2 style="color: #f44336; margin-bottom: 15px;">Link Not Found</h2>
                    <p style="color: #666; margin-bottom: 25px;">This short URL doesn't exist or has been deleted.</p>
                    <button onclick="window.location.href='${window.location.origin}/url-shortener/'" style="padding: 15px 30px; background: #667eea; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 600;">Go to URL Shortener</button>
                </div>
            </div>
        `;
    }
}

function getShortUrl(code) {
    // Create short URL without the /url-shortener/ path
    return window.location.origin + '/#' + code;
}

function generateShortCode(length = 6) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

async function shortenUrl() {
    const longUrl = document.getElementById('longUrl').value.trim();
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const shortenBtn = document.getElementById('shortenBtn');

    resultDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');

    if (!longUrl) {
        showError('Please enter a URL');
        return;
    }

    if (!isValidUrl(longUrl)) {
        showError('Please enter a valid URL (must start with http:// or https://)');
        return;
    }

    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    shortenBtn.disabled = true;

    await new Promise(resolve => setTimeout(resolve, 400));

    try {
        let urls = JSON.parse(localStorage.getItem('urlShortener') || '{}');
        
        // Check if URL already exists
        for (let code in urls) {
            if (urls[code].longUrl === longUrl) {
                displayResult(code, longUrl, urls[code].created, urls[code].clicks || 0);
                updateStats();
                btnText.classList.remove('hidden');
                btnLoader.classList.add('hidden');
                shortenBtn.disabled = false;
                return;
            }
        }
        
        // Generate unique short code
        let shortCode;
        do {
            shortCode = generateShortCode();
        } while (urls[shortCode]);
        
        // Save URL mapping
        urls[shortCode] = {
            longUrl: longUrl,
            created: new Date().toISOString(),
            clicks: 0
        };
        
        localStorage.setItem('urlShortener', JSON.stringify(urls));
        
        displayResult(shortCode, longUrl, urls[shortCode].created, 0);
        loadHistory();
        updateStats();
        
        document.getElementById('longUrl').value = '';
        
    } catch (error) {
        showError('An error occurred. Please try again.');
        console.error('Error:', error);
    } finally {
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        shortenBtn.disabled = false;
    }
}

function displayResult(shortCode, longUrl, created, clicks) {
    const resultDiv = document.getElementById('result');
    const shortUrlInput = document.getElementById('shortUrl');
    const displayCode = document.getElementById('displayCode');
    const displayDate = document.getElementById('displayDate');
    const displayClicks = document.getElementById('displayClicks');
    const originalUrl = document.getElementById('originalUrl');
    
    currentOriginalUrl = longUrl;
    
    const shortUrl = getShortUrl(shortCode);
    
    shortUrlInput.value = shortUrl;
    displayCode.textContent = shortCode;
    displayDate.textContent = new Date(created).toLocaleString();
    displayClicks.textContent = clicks;
    originalUrl.textContent = longUrl;
    
    resultDiv.classList.remove('hidden');
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = '❌ ' + message;
    errorDiv.classList.remove('hidden');
}

function copyUrl() {
    const shortUrlInput = document.getElementById('shortUrl');
    const copyBtn = document.querySelector('.copy-btn');
    const copyText = document.getElementById('copyText');

    shortUrlInput.select();
    shortUrlInput.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(shortUrlInput.value).then(() => {
        copyText.textContent = '✓ Copied!';
        copyBtn.classList.add('copied');

        setTimeout(() => {
            copyText.textContent = '📋 Copy';
            copyBtn.classList.remove('copied');
        }, 2000);
    });
}

function openOriginal() {
    if (currentOriginalUrl) {
        window.open(currentOriginalUrl, '_blank');
    }
}

function updateStats() {
    const urls = JSON.parse(localStorage.getItem('urlShortener') || '{}');
    const totalUrls = Object.keys(urls).length;
    let totalClicks = 0;
    let totalCharsSaved = 0;
    
    for (let code in urls) {
        totalClicks += urls[code].clicks || 0;
        const shortUrl = getShortUrl(code);
        const charsSaved = urls[code].longUrl.length - shortUrl.length;
        if (charsSaved > 0) {
            totalCharsSaved += charsSaved;
        }
    }
    
    document.getElementById('totalUrls').textContent = totalUrls;
    document.getElementById('totalClicks').textContent = totalClicks;
    document.getElementById('savedChars').textContent = totalCharsSaved.toLocaleString();
}

function loadHistory() {
    const historyList = document.getElementById('historyList');
    const urls = JSON.parse(localStorage.getItem('urlShortener') || '{}');
    const sortBy = document.getElementById('sortHistory').value;
    
    historyList.innerHTML = '';
    
    let entries = Object.entries(urls);
    
    // Sort entries
    if (sortBy === 'newest') {
        entries.sort((a, b) => new Date(b[1].created) - new Date(a[1].created));
    } else if (sortBy === 'oldest') {
        entries.sort((a, b) => new Date(a[1].created) - new Date(b[1].created));
    } else if (sortBy === 'mostClicks') {
        entries.sort((a, b) => (b[1].clicks || 0) - (a[1].clicks || 0));
    }
    
    if (entries.length === 0) {
        historyList.innerHTML = '<div class="empty-history">📭 No URLs shortened yet.<br>Start by shortening your first URL above!</div>';
        return;
    }
    
    entries.forEach(([code, data]) => {
        const shortUrl = getShortUrl(code);
        
        const item = document.createElement('div');
        item.className = 'history-item';
        item.setAttribute('data-url', data.longUrl.toLowerCase());
        item.innerHTML = `
            <div class="history-info">
                <div class="short-code">🔗 ${shortUrl}</div>
                <div class="long-url">${escapeHtml(data.longUrl)}</div>
                <div class="date">
                    📅 ${new Date(data.created).toLocaleString()}
                    <span class="clicks">👆 ${data.clicks || 0} clicks</span>
                </div>
            </div>
            <div class="history-actions">
                <button class="history-btn open-btn" onclick="openUrl('${escapeHtml(data.longUrl)}')">🔗 Open</button>
                <button class="history-btn copy-history-btn" onclick="copyHistoryUrl('${escapeHtml(shortUrl)}')">📋 Copy</button>
                <button class="history-btn delete-btn" onclick="deleteUrl('${code}')">🗑️ Delete</button>
            </div>
        `;
        historyList.appendChild(item);
    });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function filterHistory() {
    const searchTerm = document.getElementById('searchHistory').value.toLowerCase();
    const items = document.querySelectorAll('.history-item');
    
    items.forEach(item => {
        const url = item.getAttribute('data-url');
        if (url.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function openUrl(url) {
    window.open(url, '_blank');
}

function copyHistoryUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.textContent = '✓ Short URL copied!';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(400px)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    });
}

function deleteUrl(code) {
    if (confirm('🗑️ Are you sure you want to delete this shortened URL?')) {
        let urls = JSON.parse(localStorage.getItem('urlShortener') || '{}');
        delete urls[code];
        localStorage.setItem('urlShortener', JSON.stringify(urls));
        loadHistory();
        updateStats();
        
        // Hide result if it's the deleted URL
        const displayCode = document.getElementById('displayCode');
        if (displayCode && displayCode.textContent === code) {
            document.getElementById('result').classList.add('hidden');
        }
    }
}

function clearAllHistory() {
    if (confirm('🗑️ Are you sure you want to delete ALL shortened URLs?\n\nThis action cannot be undone!')) {
        localStorage.removeItem('urlShortener');
        loadHistory();
        updateStats();
        document.getElementById('result').classList.add('hidden');
        
        // Show success notification
        const notification = document.createElement('div');
        notification.textContent = '✓ All URLs have been deleted!';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// Allow Enter key to submit
document.getElementById('longUrl').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        shortenUrl();
    }
});
