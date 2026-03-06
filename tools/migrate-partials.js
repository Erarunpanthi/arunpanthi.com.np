const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

function walk(dir, files = []) {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (
            item.name === ".git" ||
            item.name === "node_modules" ||
            item.name === "partials" ||
            item.name === "js" ||
            item.name === "tools"
        ) {
            continue;
        }

        if (item.isDirectory()) {
            walk(fullPath, files);
        } else if (item.isFile() && item.name.toLowerCase().endsWith(".html")) {
            files.push(fullPath);
        }
    }

    return files;
}

function ensureLayoutScript(html) {
    if (html.includes('src="js/layout.js"')) {
        return html;
    }

    return html.replace(
        /<\/body>/i,
        '    <script src="js/layout.js"></script>\n</body>'
    );
}

function replaceNavbar(html) {
    return html.replace(
        /<div class="navbar">[\s\S]*?<\/div>/i,
        '<div id="navbar"></div>'
    );
}

function replaceSocial(html) {
    return html.replace(
        /<div class="social-media">[\s\S]*?<div class="icons">[\s\S]*?<\/div>\s*<\/div>/i,
        '<div id="social-section"></div>'
    );
}

function replaceFooter(html) {
    return html.replace(
        /<footer>[\s\S]*?<\/footer>/i,
        '<div id="footer"></div>'
    );
}

function fixAdContainer(html) {
    const adDiv = '<div id="container-d950250f5a43c6c3f4942d50c5cb9461"></div>';

    html = html.replace(
        /<head>([\s\S]*?)<div id="container-d950250f5a43c6c3f4942d50c5cb9461"><\/div>([\s\S]*?)<\/head>/i,
        (match, before, after) => `<head>${before}${after}</head>`
    );

    if (!html.includes(adDiv)) {
        html = html.replace(/<body[^>]*>/i, match => `${match}\n    ${adDiv}`);
    }

    return html;
}

function processFile(filePath) {
    let html = fs.readFileSync(filePath, "utf8");
    const original = html;

    html = replaceNavbar(html);
    html = replaceSocial(html);
    html = replaceFooter(html);
    html = fixAdContainer(html);
    html = ensureLayoutScript(html);

    if (html !== original) {
        fs.writeFileSync(filePath, html, "utf8");
        console.log(`Updated: ${path.relative(rootDir, filePath)}`);
    } else {
        console.log(`No change: ${path.relative(rootDir, filePath)}`);
    }
}

const htmlFiles = walk(rootDir);

for (const file of htmlFiles) {
    processFile(file);
}

console.log("Done.");
