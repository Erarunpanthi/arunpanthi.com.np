const fs = require('fs');
const path = require('path');

// Configuration
const FAVICON_LOADER = '<script src="/favicon-loader.js"></script>';
const FAVICON_LOADER_JS = `
// favicon-loader.js
(function() {
    const faviconUrl = 'https://arunpanthi.com.np/logo.ico';
    
    function setFavicon() {
        const existingLinks = document.querySelectorAll("link[rel*='icon']");
        existingLinks.forEach(link => link.remove());
        
        const link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = faviconUrl;
        document.head.appendChild(link);
    }
    
    if (document.readyState === 'complete') {
        setFavicon();
    } else {
        document.addEventListener('DOMContentLoaded', setFavicon);
        window.addEventListener('load', setFavicon);
    }
})();
`;

// Process all HTML files in directory and subdirectories
function processDirectory(directory) {
    fs.readdirSync(directory).forEach(file => {
        const fullPath = path.join(directory, file);
        
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.html')) {
            processHtmlFile(fullPath);
        }
    });
}

function processHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already has favicon loader
    if (content.includes('favicon-loader.js')) {
        console.log(`Skipping ${filePath} - already has favicon loader`);
        return;
    }
    
    // Insert before closing head tag
    if (content.includes('</head>')) {
        content = content.replace('</head>', `${FAVICON_LOADER}\n</head>`);
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`Could not find </head> in ${filePath}`);
    }
}

// Create the loader file
fs.writeFileSync(path.join(__dirname, 'favicon-loader.js'), FAVICON_LOADER_JS);

// Start processing from current directory
processDirectory(__dirname);
console.log('Favicon injection complete!');
