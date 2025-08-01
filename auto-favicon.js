// auto-favicon.js
(function() {
    // Your favicon URL
    const faviconUrl = 'https://arunpanthi.com.np/logo.ico';
    
    // Create link element
    const link = document.createElement('link');
    link.rel = 'shortcut icon';
    link.type = 'image/x-icon';
    link.href = faviconUrl;
    
    // Remove any existing favicons
    const existingLinks = document.querySelectorAll('link[rel*="icon"]');
    existingLinks.forEach(el => el.remove());
    
    // Add to head
    document.head.appendChild(link);
    
    // For browsers that don't support dynamic favicon changes
    const fallback = document.createElement('script');
    fallback.innerHTML = `
        var link = document.querySelector('link[rel*="icon"]') || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = '${faviconUrl}';
        document.head.appendChild(link);
    `;
    document.head.appendChild(fallback);
})();
