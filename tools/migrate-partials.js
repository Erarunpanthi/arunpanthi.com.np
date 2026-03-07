const fs = require('fs');
const path = require('path');

// Helper function to inject CSS into the head
function injectCSS(filePath, cssLink) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const updatedContent = fileContent.replace('<head>', `<head>\n    <link rel="stylesheet" href="${cssLink}">`);
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
}

// Helper function to inject partial HTML
function injectPartial(filePath, partialPath, placeholder) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const partialContent = fs.readFileSync(partialPath, 'utf-8');
    
    const updatedContent = fileContent.replace(placeholder, partialContent);
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
}

// List of pages to update
const pages = [
    'index.html',
    'aboutus.html',
    'contactus.html',
    'resources.html',
    // Add more pages as needed
];

// Paths to the partials and CSS file
const navbarPath = path.join(__dirname, '../partials/navbar.html');
const socialPath = path.join(__dirname, '../partials/social.html');
const footerPath = path.join(__dirname, '../partials/footer.html');
const cssLink = 'https://arunpanthi.com.np/styles.css'; // Path to your external CSS file

// Placeholder identifiers to inject the partials
const navbarPlaceholder = '<!-- navbar-placeholder -->';
const socialPlaceholder = '<!-- social-placeholder -->';
const footerPlaceholder = '<!-- footer-placeholder -->';

// Iterate through all the pages and inject the partials and CSS
pages.forEach(page => {
    const pagePath = path.join(__dirname, `../${page}`);
    
    // Inject CSS link into the head
    injectCSS(pagePath, cssLink);
    
    // Inject navbar, social, and footer into the respective placeholders
    injectPartial(pagePath, navbarPath, navbarPlaceholder);
    injectPartial(pagePath, socialPath, socialPlaceholder);
    injectPartial(pagePath, footerPath, footerPlaceholder);

    console.log(`Updated ${page}`);
});

