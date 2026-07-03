const fs = require('fs');
const path = require('path');

function injectCSS(filePath, cssLink) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const updatedContent = fileContent.replace(
        '<head>',
        `<head>\n    <link rel="stylesheet" href="${cssLink}">`
    );
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
}

function injectPartial(filePath, partialPath, placeholder) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const partialContent = fs.readFileSync(partialPath, 'utf-8');
    const updatedContent = fileContent.replace(placeholder, partialContent);
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
}

const pages = [
    'index.html',
    'aboutus.html',
    'contactus.html',
    'resources.html'
];

const navbarPath = path.join(__dirname, '../partials/navbar.html');
const socialPath = path.join(__dirname, '../partials/social.html');
const footerPath = path.join(__dirname, '../partials/footer.html');
const cssLink = 'https://arunpanthi.com.np/styles.css';

const navbarPlaceholder = '<!-- navbar-placeholder -->';
const socialPlaceholder = '<!-- social-placeholder -->';
const footerPlaceholder = '<!-- footer-placeholder -->';

pages.forEach(page => {
    const pagePath = path.join(__dirname, `../${page}`);
    injectCSS(pagePath, cssLink);
    injectPartial(pagePath, navbarPath, navbarPlaceholder);
    injectPartial(pagePath, socialPath, socialPlaceholder);
    injectPartial(pagePath, footerPath, footerPlaceholder);
});
