const fs = require('fs');
const path = require('path');

// Helper function to inject JavaScript code before the closing </body> tag
function injectJS(filePath, scriptTag) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const updatedContent = fileContent.replace('</body>', `${scriptTag}\n</body>`);
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
}

// Path to your hide-links.js file
const scriptTag = '<script src="js/hide-links.js"></script>';

// Function to recursively find all HTML files in a directory
function findHtmlFiles(directory) {
    let htmlFiles = [];
    const files = fs.readdirSync(directory);

    files.forEach(file => {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            htmlFiles = htmlFiles.concat(findHtmlFiles(fullPath)); // Recursively add HTML files
        } else if (fullPath.endsWith('.html')) {
            htmlFiles.push(fullPath); // Add HTML files to the array
        }
    });

    return htmlFiles;
}

// Get all HTML files in the project
const htmlFiles = findHtmlFiles(path.join(__dirname, '../')); // Assuming your project root is one level up

// Loop through all the HTML files and inject the JavaScript code
htmlFiles.forEach(filePath => {
    injectJS(filePath, scriptTag);
    console.log(`Updated ${filePath}`);
});
