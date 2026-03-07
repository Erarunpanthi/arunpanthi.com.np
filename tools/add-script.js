// tools/add-script.js
const fs = require('fs');
const path = require('path');

/**
 * Injects a <script> tag into an HTML file just before </body>
 * @param {string} filePath - Path to the HTML file
 * @param {string} scriptTag - The full <script> tag to inject
 */
function injectJS(filePath, scriptTag) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        if (fileContent.includes(scriptTag)) {
            console.log(`Skipped ${filePath} – already contains the script.`);
            return;
        }
        const updatedContent = fileContent.replace('</body>', `${scriptTag}\n</body>`);
        fs.writeFileSync(filePath, updatedContent, 'utf-8');
        console.log(`✅ Updated ${filePath}`);
    } catch (err) {
        console.error(`❌ Error processing ${filePath}:`, err.message);
    }
}

/**
 * Recursively finds all .html files in a directory
 * @param {string} directory - Directory to search
 * @returns {string[]} Array of file paths
 */
function findHtmlFiles(directory) {
    let htmlFiles = [];
    try {
        const files = fs.readdirSync(directory);
        files.forEach(file => {
            const fullPath = path.join(directory, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                htmlFiles = htmlFiles.concat(findHtmlFiles(fullPath));
            } else if (fullPath.endsWith('.html')) {
                htmlFiles.push(fullPath);
            }
        });
    } catch (err) {
        console.error(`❌ Error reading directory ${directory}:`, err.message);
    }
    return htmlFiles;
}

// Configuration
const scriptTag = '<script src="js/hide-links.js"></script>';
const projectRoot = path.join(__dirname, '..'); // Assumes tools/ is inside project root

// Find all HTML files
const htmlFiles = findHtmlFiles(projectRoot);
console.log(`Found ${htmlFiles.length} HTML file(s).`);

// Inject the script into each file
htmlFiles.forEach(filePath => injectJS(filePath, scriptTag));

console.log('🎉 Done!');
