

const JSONBIN_CONFIG = {
    apiKey: '$2a$10$LvIsdjR2wQQMRq28tc2rh.yR1nccP5HIYYrKCSFMRoYMTIrqjRwM6',
    binId: '6a4e14eeda38895dfe3f6860'
};
let currentOriginalUrl = '';
let urlDatabase = {};
let isLoading = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadDatabaseFromCloud();
    checkForRedirect();
});

function checkForRedirect() {
    const hash = window.location.hash.substring(1);
    
    if (hash && /^[a-zA-Z0-9]{6}$/.test(hash)) {
        redirectToOriginal(hash);
    }
}

async function loadDatabaseFromCloud() {
    try {
        showLoadingOverlay('Loading URLs...');
        
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.binId}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_CONFIG.apiKey
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            urlDatabase = data.record || {};
            console.log('✅ Database loaded:', Object.keys(urlDatabase).length, 'URLs');
        } else {
            console.log('⚠️ Database empty, starting fresh');
            urlDatabase = {};
        }
        
        loadHistory();
        updateStats();
        hideLoadingOverlay();
    } catch (error) {
        console.error('❌ Error loading database:', error);
        urlDatabase = {};
        hideLoadingOverlay();
    }
}

async function saveDatabaseToCloud() {
    try {
        showLoadingOverlay('Saving URL...');
        
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.binId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_CONFIG.apiKey
            },
            body: JSON.stringify(urlDatabase)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save to cloud');
        }
        
        console.log('✅ Database saved successfully');
        hideLoadingOverlay();
        return true;
    } catch (error) {
        console.error('❌ Error saving database:', error);
        showError('Failed to save URL. Please try again.');
        hideLoadingOverlay();
        return false;
    }
}

function redirectToOriginal(code) {
    if (urlDatabase[code]) {
        // Increment clicks
        urlDatabase[code].clicks = (urlDatabase[code].clicks || 0) + 1;
        saveDatabaseToCloud(); // Save click count
        
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="background: white; padding: 50px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px; animation: fadeIn 0.5s ease;">
                    <div style="font-size: 60px; margin-bottom: 20px; animation: bounce 1s infinite;">🚀</div>
                    <h2 style="color: #333; margin-bottom: 15px;">Redirecting...</h2>
                    <p style="color: #666; margin-bottom: 25px;">Taking you to your destination</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 10px; word-break: break-all; font-size: 14px; color: #667eea; margin-bottom: 20px; border-left: 4px solid #667eea;">${escapeHtml(urlDatabase[code].longUrl)}</div>
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                </div>
            </div>
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            </style>
        `;
        
        setTimeout(() => {
            window.location.href = urlDatabase[code].longUrl;
        }, 1200);
    } else {
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="background: white; padding: 50px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px;">
                    <div style="font-size: 60px; margin-bottom: 20px; animation: shake 0.5s ease;">❌</div>
                    <h2 style="color: #f44336; margin-bottom: 15px;">Link Not Found</h2>
                    <p style="color: #666; margin-bottom: 25px;">This short URL doesn't exist or has been deleted.</p>
                    <button onclick="window.location.href='${window.location.origin}/url-shortener/'" style="padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 600;">Create Your Own</button>
                </div>
            </div>
            <style>@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }</style>
        `;
    }
}

function getShortUrl(code) {
    return window.location.origin + '/s#' + code;
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
    if (isLoading) return;
    
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

    isLoading = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    shortenBtn.disabled = true;

    try {
        // Reload database to get latest data
        await loadDatabaseFromCloud();
        
        // Check if URL already exists
        for (let code in urlDatabase) {
            if (urlDatabase[code].longUrl === longUrl) {
                displayResult(code, longUrl, urlDatabase[code].created, urlDatabase[code].clicks || 0);
                isLoading = false;
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
        } while (urlDatabase[shortCode]);
        
        // Save URL mapping
        urlDatabase[shortCode] = {
            longUrl: longUrl,
            created: new Date().toISOString(),
            clicks: 0,
            creator: 'user'
        };
        
        // Save to cloud
        const saved = await saveDatabaseToCloud();
        
        if (saved) {
            displayResult(shortCode, longUrl, urlDatabase[shortCode].created, 0);
            loadHistory();
            updateStats();
            document.getElementById('longUrl').value = '';
            
            // Show success notification
            showNotification('✅ Short URL created successfully!', 'success');
        }
        
    } catch (error) {
        showError('An error occurred. Please try again.');
        console.error('Error:', error);
    } finally {
        isLoading = false;
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
    
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

function showLoadingOverlay(message) {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        overlay.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; text-align: center;">
                <div style="border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p style="color: #333; font-weight: 600;">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : '#f44336'};
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
    }, 3000);
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
    const totalUrls = Object.keys(urlDatabase).length;
    let totalClicks = 0;
    let totalCharsSaved = 0;
    
    for (let code in urlDatabase) {
        totalClicks += urlDatabase[code].clicks || 0;
        const shortUrl = getShortUrl(code);
        const charsSaved = urlDatabase[code].longUrl.length - shortUrl.length;
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
    const sortBy = document.getElementById('sortHistory').value;
    
    historyList.innerHTML = '';
    
    let entries = Object.entries(urlDatabase);
    
    if (sortBy === 'newest') {
        entries.sort((a, b) => new Date(b[1].created) - new Date(a[1].created));
    } else if (sortBy === 'oldest') {
        entries.sort((a, b) => new Date(a[1].created) - new Date(b[1].created));
    } else if (sortBy === 'mostClicks') {
        entries.sort((a, b) => (b[1].clicks || 0) - (a[1].clicks || 0));
    }
    
    if (entries.length === 0) {
        historyList.innerHTML = '<div class="empty-history">📭 No URLs shortened yet.<br>Be the first to create a short URL!</div>';
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
        showNotification('✓ Short URL copied to clipboard!', 'success');
    });
}

function clearAllHistory() {
    alert('⚠️ This feature is disabled to protect all users\' URLs.\n\nThis is a public URL shortener - all links are shared globally!');
}

document.getElementById('longUrl').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        shortenUrl();
    }
});
