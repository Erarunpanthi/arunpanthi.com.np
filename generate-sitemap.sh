#!/bin/bash

# ===== CONFIGURATION (edit for your site) =====
# If you use a custom domain, change this to your domain (no trailing slash)
BASE_URL="https://arunpanthi.com.np"

# Directory to scan (current folder = repo root)
SCAN_DIR="."

# Output file
OUTPUT_FILE="sitemap.xml"

# Directories to ignore (Git, node_modules, etc.)
IGNORE_DIRS=("node_modules" ".git" ".github" "dist" "build" "assets")

# ===== FUNCTIONS =====
should_ignore() {
    local dirname=$(basename "$1")
    for ignore in "${IGNORE_DIRS[@]}"; do
        if [[ "$dirname" == "$ignore" ]]; then
            return 0
        fi
    done
    return 1
}

file_to_url_path() {
    local file="$1"
    local relative="${file#$SCAN_DIR/}"
    relative="${relative#./}"
    
    if [[ "$relative" == "index.html" ]]; then
        echo "/"
    elif [[ "$relative" == *"/index.html" ]]; then
        echo "/${relative%/index.html}/"
    else
        echo "/${relative%.html}"
    fi
}

get_lastmod() {
    local file="$1"
    # Git Bash on Windows: use date -r (same as stat)
    date -r "$file" +%Y-%m-%d 2>/dev/null || stat -c %y "$file" | cut -d' ' -f1
}

xml_escape() {
    local s="$1"
    s="${s//&/&amp;}"
    s="${s//</&lt;}"
    s="${s//>/&gt;}"
    s="${s//\"/&quot;}"
    s="${s//\'/&apos;}"
    echo "$s"
}

# ===== MAIN =====
echo "🔍 Scanning for .html files in $SCAN_DIR ..."
echo "Created By Er.Arun panthi"

# Find all .html files while skipping ignored directories
html_files=()
while IFS= read -r -d '' file; do
    dir_part=$(dirname "$file")
    if should_ignore "$dir_part"; then
        continue
    fi
    html_files+=("$file")
done < <(find "$SCAN_DIR" -type f -name "*.html" -print0)

if [ ${#html_files[@]} -eq 0 ]; then
    echo "❌ No HTML files found. Check SCAN_DIR and IGNORE_DIRS."
    exit 1
fi

# Write XML header
echo '<?xml version="1.0" encoding="UTF-8"?>' > "$OUTPUT_FILE"
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' >> "$OUTPUT_FILE"

for file in "${html_files[@]}"; do
    url_path=$(file_to_url_path "$file")
    full_url="$BASE_URL$url_path"
    lastmod=$(get_lastmod "$file")
    
    # Simple priority logic
    if [[ "$url_path" == "/" ]]; then
        priority="1.0"
    elif [[ "$url_path" == */ ]]; then
        priority="0.8"
    else
        depth=$(echo "$url_path" | tr -cd '/' | wc -c)
        priority=$(echo "scale=1; 0.6 - $depth * 0.1" | bc)
        if (( $(echo "$priority < 0.1" | bc -l) )); then priority="0.1"; fi
        if (( $(echo "$priority > 0.9" | bc -l) )); then priority="0.9"; fi
    fi

    cat >> "$OUTPUT_FILE" << EOF
  <url>
    <loc>$(xml_escape "$full_url")</loc>
    <lastmod>$lastmod</lastmod>
    <priority>$priority</priority>
  </url>
EOF
done

echo '</urlset>' >> "$OUTPUT_FILE"
echo "✅ Sitemap generated with ${#html_files[@]} URLs: $OUTPUT_FILE"