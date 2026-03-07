const fs = require('fs');
const path = require('path');

// Function to get all HTML files in the repository folder
function getAllHtmlPages(directoryPath) {
    const files = fs.readdirSync(directoryPath); // Read files in the directory
    const htmlFiles = [];

    files.forEach(file => {
        const filePath = path.join(directoryPath, file);
        const fileStat = fs.statSync(filePath); // Get file stats

        // Check if it's an HTML file
        if (fileStat.isFile() && file.endsWith('.html')) {
            htmlFiles.push(file); // Add to the array if it's an HTML file
        }
    });

    return htmlFiles; // Return the list of HTML files
}

// Directory path of the HTML files
const directoryPath = path.join(__dirname, '../'); // Path to your project folder

// Get all HTML pages dynamically
const pages = getAllHtmlPages(directoryPath);

// Path to the hide-links.js script (assumes it's in the 'js' folder)
const scriptTag = '<script src="js/hide-links.js"></script>';

// Function to add the script tag before the closing </body> tag
function addScriptTagToPage(filePath) {
    console.log(`Processing file: ${filePath}`); // Log the files being processed
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const updatedContent = fileContent.replace('</body>', `${scriptTag}\n</body>`); // Inject the script before </body>
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    console.log(`Updated ${filePath}`); // Log the update confirmation
}

// Loop through each page and update it
pages.forEach(page => {
    const pagePath = path.join(directoryPath, page);
    addScriptTagToPage(pagePath);
});
