#!/bin/bash

# ================================================================
#   🔧 HTML PAGE MANAGER — AUTO CREATE & CLEAR MISSING PAGES
#   Just double-click run.bat (Windows) or run.sh (Mac/Linux)
# ================================================================

ROOT_DIR="$(pwd)"
REPORT_FILE="$ROOT_DIR/report.html"

# ── Counters ────────────────────────────────────────────────────
total_links=0
created_count=0
cleared_count=0
skipped_count=0
already_ok=0

# ── Storage arrays for report ───────────────────────────────────
declare -a CREATED_LIST
declare -a CLEARED_LIST
declare -a SKIPPED_LIST
declare -a OK_LIST

# ── Track seen links ────────────────────────────────────────────
declare -A seen_links

echo ""
echo "=============================================="
echo "   🔍 SCANNING WEBSITE FOR MISSING PAGES"
echo "=============================================="
echo "📂 Root: $ROOT_DIR"
echo ""

# ================================================================
#   🔧 FUNCTION: Check if HTML file is blank/empty/placeholder
# ================================================================
is_blank_html() {
    local file="$1"

    # File doesn't exist
    [[ ! -f "$file" ]] && return 0

    # File is 0 bytes
    [[ ! -s "$file" ]] && return 0

    # File has less than 30 characters (basically empty)
    local size
    size=$(wc -c < "$file" 2>/dev/null)
    [[ "$size" -lt 30 ]] && return 0

    # File has no <html> or <!DOCTYPE tag
    if ! grep -qiE '<!DOCTYPE|<html' "$file" 2>/dev/null; then
        return 0
    fi

    return 1
}

# ================================================================
#   🏗️ FUNCTION: Create a proper HTML page
# ================================================================
create_html_page() {
    local file_path="$1"
    local page_name="$2"

    cat > "$file_path" << HTMLEOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page_name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            color: white;
        }
        .card {
            text-align: center;
            padding: 60px 50px;
            background: rgba(255,255,255,0.05);
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.15);
            backdrop-filter: blur(12px);
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
            max-width: 500px;
        }
        .icon { font-size: 4rem; margin-bottom: 20px; }
        h1 {
            font-size: 2.2rem;
            margin-bottom: 12px;
            background: linear-gradient(90deg, #f093fb, #f5576c);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p { font-size: 1rem; color: #a8b2d8; margin-bottom: 30px; line-height: 1.6; }
        a {
            display: inline-block;
            padding: 12px 35px;
            background: linear-gradient(90deg, #f093fb, #f5576c);
            color: white;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            font-size: 0.95rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        a:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(245,87,108,0.4);
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🚧</div>
        <h1>${page_name}</h1>
        <p>This page is currently under construction.<br>We're working hard to bring it to you soon!</p>
        <a href="/">⬅ Back to Home</a>
    </div>
</body>
</html>
HTMLEOF
}

# ================================================================
#   🔍 MAIN SCAN LOOP — Find all HTML files & Extract links
# ================================================================
while IFS= read -r html_file; do

    echo "📄 Scanning: ${html_file#$ROOT_DIR/}"

    # Extract all href links
    links=$(grep -oP 'href=["'"'"']\K[^"'"'"']+' "$html_file" 2>/dev/null)

    while IFS= read -r link; do

        # ── Skip externals, anchors, special links ──────────────
        [[ "$link" == http*    ]] && continue
        [[ "$link" == "#"*     ]] && continue
        [[ "$link" == "mailto:"* ]] && continue
        [[ "$link" == "tel:"*  ]] && continue
        [[ "$link" == "javascript:"* ]] && continue
        [[ -z "$link"          ]] && continue

        # ── Clean query strings & hash fragments ─────────────────
        clean_link="${link%%\?*}"
        clean_link="${clean_link%%#*}"

        # ── Skip already-processed links ─────────────────────────
        [[ -n "${seen_links[$clean_link]}" ]] && continue
        seen_links["$clean_link"]=1
        total_links=$((total_links + 1))

        # ── Build full file path ──────────────────────────────────
        if [[ "$clean_link" == /* ]]; then
            full_path="$ROOT_DIR$clean_link"
        else
            file_dir=$(dirname "$html_file")
            full_path="$file_dir/$clean_link"
        fi

        full_path=$(realpath -m "$full_path" 2>/dev/null || echo "$full_path")

        # ── Security: skip paths outside root ────────────────────
        if [[ "$full_path" != "$ROOT_DIR"* ]]; then
            SKIPPED_LIST+=("$clean_link")
            skipped_count=$((skipped_count + 1))
            continue
        fi

        # ── Skip non-HTML file types ─────────────────────────────
        if [[ "$clean_link" == *.css ]] || \
           [[ "$clean_link" == *.js  ]] || \
           [[ "$clean_link" == *.png ]] || \
           [[ "$clean_link" == *.jpg ]] || \
           [[ "$clean_link" == *.pdf ]] || \
           [[ "$clean_link" == *.xml ]]; then
            SKIPPED_LIST+=("$clean_link")
            skipped_count=$((skipped_count + 1))
            continue
        fi

        # ==============================================================
        #   CASE 1 — Link ends with .html or .htm
        # ==============================================================
        if [[ "$full_path" == *.html ]] || [[ "$full_path" == *.htm ]]; then

            page_name=$(basename "$full_path" .html)
            page_name="${page_name^}"

            # ── File does not exist → CREATE ──────────────────────
            if [[ ! -f "$full_path" ]]; then
                mkdir -p "$(dirname "$full_path")"
                create_html_page "$full_path" "$page_name"
                echo "   ✅ CREATED → $clean_link"
                CREATED_LIST+=("$clean_link")
                created_count=$((created_count + 1))

            # ── File is blank/empty → CLEAR & RECREATE ────────────
            elif is_blank_html "$full_path"; then
                create_html_page "$full_path" "$page_name"
                echo "   🔄 CLEARED & FIXED → $clean_link"
                CLEARED_LIST+=("$clean_link")
                cleared_count=$((cleared_count + 1))

            # ── File exists and is fine ────────────────────────────
            else
                echo "   ✔️  OK → $clean_link"
                OK_LIST+=("$clean_link")
                already_ok=$((already_ok + 1))
            fi

        # ==============================================================
        #   CASE 2 — No extension = folder-based page
        # ==============================================================
        elif [[ "$clean_link" != *.* ]]; then

            index_file="$full_path/index.html"
            page_name=$(basename "$full_path")
            page_name="${page_name^}"

            # ── index.html missing → CREATE folder + file ─────────
            if [[ ! -f "$index_file" ]]; then
                mkdir -p "$full_path"
                create_html_page "$index_file" "$page_name"
                echo "   ✅ CREATED FOLDER → $clean_link/index.html"
                CREATED_LIST+=("$clean_link/index.html")
                created_count=$((created_count + 1))

            # ── index.html is blank → CLEAR & RECREATE ────────────
            elif is_blank_html "$index_file"; then
                create_html_page "$index_file" "$page_name"
                echo "   🔄 CLEARED & FIXED → $clean_link/index.html"
                CLEARED_LIST+=("$clean_link/index.html")
                cleared_count=$((cleared_count + 1))

            # ── Folder and index.html are fine ────────────────────
            else
                echo "   ✔️  OK → $clean_link/"
                OK_LIST+=("$clean_link/")
                already_ok=$((already_ok + 1))
            fi

        # ==============================================================
        #   CASE 3 — Other file type → skip
        # ==============================================================
        else
            SKIPPED_LIST+=("$clean_link")
            skipped_count=$((skipped_count + 1))
        fi

    done <<< "$links"

done < <(find "$ROOT_DIR" \( -name "*.html" -o -name "*.htm" \) \
         ! -name "report.html" 2>/dev/null)


# ================================================================
#   📊 GENERATE HTML REPORT — Opens automatically in browser
# ================================================================
echo ""
echo "📊 Generating HTML Report..."

# Build list items for report
build_list_items() {
    local -n arr=$1
    local color=$2
    local icon=$3
    for item in "${arr[@]}"; do
        echo "<li><span class='icon'>$icon</span><code>$item</code></li>"
    done
}

CREATED_ITEMS=$(build_list_items CREATED_LIST "#4ade80" "✅")
CLEARED_ITEMS=$(build_list_items CLEARED_LIST "#fb923c" "🔄")
SKIPPED_ITEMS=$(build_list_items SKIPPED_LIST "#94a3b8" "⚠️")
OK_ITEMS=$(build_list_items OK_LIST "#60a5fa" "✔️")

cat > "$REPORT_FILE" << REPORTEOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔧 HTML Page Manager Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Segoe UI', sans-serif;
            background: #0d1117;
            color: #e6edf3;
            min-height: 100vh;
        }

        header {
            background: linear-gradient(135deg, #161b22, #21262d);
            padding: 40px 30px;
            text-align: center;
            border-bottom: 1px solid #30363d;
        }

        header h1 { font-size: 2.4rem; margin-bottom: 8px; }
        header p  { color: #8b949e; font-size: 1rem; }

        .stats {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
            padding: 40px 30px 20px;
            max-width: 1100px;
            margin: 0 auto;
        }

        .stat-card {
            flex: 1;
            min-width: 180px;
            background: #161b22;
            border-radius: 16px;
            padding: 28px 20px;
            text-align: center;
            border: 1px solid #30363d;
            transition: transform 0.2s;
        }

        .stat-card:hover { transform: translateY(-5px); }

        .stat-card .number {
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 8px;
        }

        .stat-card .label {
            font-size: 0.9rem;
            color: #8b949e;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .green  { color: #4ade80; border-color: #4ade8044; }
        .orange { color: #fb923c; border-color: #fb923c44; }
        .blue   { color: #60a5fa; border-color: #60a5fa44; }
        .gray   { color: #94a3b8; border-color: #94a3b844; }
        .purple { color: #c084fc; border-color: #c084fc44; }

        .sections {
            max-width: 1100px;
            margin: 20px auto 60px;
            padding: 0 30px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
            gap: 24px;
        }

        .section {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 16px;
            overflow: hidden;
        }

        .section-header {
            padding: 18px 24px;
            font-size: 1rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid #30363d;
        }

        .section-body {
            padding: 16px 24px;
            max-height: 350px;
            overflow-y: auto;
        }

        .section-body::-webkit-scrollbar { width: 5px; }
        .section-body::-webkit-scrollbar-thumb { background: #30363d; border-radius: 10px; }

        .section-body ul { list-style: none; }

        .section-body li {
            padding: 8px 0;
            border-bottom: 1px solid #21262d;
            font-size: 0.88rem;
            display: flex;
            align-items: center;
            gap: 10px;
            word-break: break-all;
        }

        .section-body li:last-child { border-bottom: none; }

        code {
            font-family: 'Courier New', monospace;
            background: #21262d;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 0.82rem;
        }

        .icon { font-size: 1rem; flex-shrink: 0; }

        .empty-msg {
            color: #8b949e;
            font-style: italic;
            font-size: 0.9rem;
            padding: 10px 0;
        }

        .hdr-green  { background: #4ade8015; color: #4ade80; }
        .hdr-orange { background: #fb923c15; color: #fb923c; }
        .hdr-blue   { background: #60a5fa15; color: #60a5fa; }
        .hdr-gray   { background: #94a3b815; color: #94a3b8; }

        footer {
            text-align: center;
            padding: 30px;
            color: #8b949e;
            font-size: 0.85rem;
            border-top: 1px solid #30363d;
        }

        .run-again {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 35px;
            background: linear-gradient(90deg, #f093fb, #f5576c);
            color: white;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            cursor: pointer;
            border: none;
            font-size: 1rem;
        }

        .timestamp {
            color: #8b949e;
            font-size: 0.8rem;
            margin-top: 8px;
        }
    </style>
</head>
<body>

<header>
    <h1>🔧 HTML Page Manager Report</h1>
    <p>Automatic scan, create & fix of all linked HTML pages</p>
    <p class="timestamp">📅 Generated: $(date '+%Y-%m-%d %H:%M:%S')</p>
    <p class="timestamp">📂 Root: $ROOT_DIR</p>
</header>

<!-- ── STATS CARDS ── -->
<div class="stats">
    <div class="stat-card purple">
        <div class="number">$total_links</div>
        <div class="label">Total Links Scanned</div>
    </div>
    <div class="stat-card green">
        <div class="number">$created_count</div>
        <div class="label">New Files Created</div>
    </div>
    <div class="stat-card orange">
        <div class="number">$cleared_count</div>
        <div class="label">Blank Files Fixed</div>
    </div>
    <div class="stat-card blue">
        <div class="number">$already_ok</div>
        <div class="label">Already OK</div>
    </div>
    <div class="stat-card gray">
        <div class="number">$skipped_count</div>
        <div class="label">Skipped</div>
    </div>
</div>

<!-- ── SECTIONS ── -->
<div class="sections">

    <!-- Created -->
    <div class="section">
        <div class="section-header hdr-green">✅ Newly Created Files ($created_count)</div>
        <div class="section-body">
            <ul>
                ${CREATED_ITEMS:-<p class='empty-msg'>No new files were created.</p>}
            </ul>
        </div>
    </div>

    <!-- Cleared & Fixed -->
    <div class="section">
        <div class="section-header hdr-orange">🔄 Blank Files Cleared & Fixed ($cleared_count)</div>
        <div class="section-body">
            <ul>
                ${CLEARED_ITEMS:-<p class='empty-msg'>No blank files were found.</p>}
            </ul>
        </div>
    </div>

    <!-- Already OK -->
    <div class="section">
        <div class="section-header hdr-blue">✔️ Already Existing & OK ($already_ok)</div>
        <div class="section-body">
            <ul>
                ${OK_ITEMS:-<p class='empty-msg'>No pre-existing files found.</p>}
            </ul>
        </div>
    </div>

    <!-- Skipped -->
    <div class="section">
        <div class="section-header hdr-gray">⚠️ Skipped Links ($skipped_count)</div>
        <div class="section-body">
            <ul>
                ${SKIPPED_ITEMS:-<p class='empty-msg'>Nothing was skipped.</p>}
            </ul>
        </div>
    </div>

</div>

<footer>
    <p>🔧 HTML Page Manager — All tasks completed successfully</p>
    <br>
    <p>📂 Root Directory: <code>$ROOT_DIR</code></p>
</footer>

</body>
</html>
REPORTEOF

# ================================================================
#   📋 TERMINAL SUMMARY
# ================================================================
echo ""
echo "=============================================="
echo "          📊 FINAL SUMMARY"
echo "=============================================="
echo "📌 Total Links Scanned  : $total_links"
echo "✅ New Files Created    : $created_count"
echo "🔄 Blank Files Fixed    : $cleared_count"
echo "✔️  Already OK           : $already_ok"
echo "⚠️  Skipped              : $skipped_count"
echo "=============================================="
echo "📄 Report saved → report.html"
echo "✅ All Done!"
echo ""