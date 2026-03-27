// ============================================
//  /js/layout.js — Complete Fixed Version
// ============================================

(function () {
    "use strict";

    // ── CONFIG ──────────────────────────────
    var CSS_FILE     = "styles.css";
    var FAVICON_FILE = "logo.ico";
    var FONT_AWESOME = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";

    var PARTIALS = {
        "navbar":         "partials/navbar.html",
        "social-section": "partials/social.html",
        "footer":         "partials/footer.html"
    };


    // ═════════════════════════════════════════
    //  0. CLEAN URL — runs IMMEDIATELY
    // ═════════════════════════════════════════
    //
    //  Handles THREE cases:
    //    A) Normal visit with trailing slash:
    //       /NEC-license-preparation/  →  /NEC-license-preparation
    //    B) 404.html redirect with ?p= param:
    //       /NEC-license-preparation/?p=%2FNEC-license-preparation
    //       →  /NEC-license-preparation  (strips ?p= from URL bar)
    //    C) /index.html or /index in URL:
    //       /NEC-license-preparation/index.html  →  /NEC-license-preparation

    function cleanPath(path) {
        // Remove /index.html or /index from end
        path = path.replace(/\/index\.html$/i, "");
        path = path.replace(/\/index$/i, "");

        // Remove trailing slash (keep root "/")
        if (path !== "/" && path.endsWith("/")) {
            path = path.slice(0, -1);
        }

        return path || "/";
    }

    function cleanURLBar() {
        var path    = location.pathname;
        var search  = location.search;
        var hash    = location.hash;

        // If 404.html redirected us, read the ?p= param
        var params  = new URLSearchParams(search);
        var pParam  = params.get("p");

        if (pParam) {
            // Remove the ?p= param, keep any other params
            params.delete("p");
            var remaining = params.toString();
            var cleanSearch = remaining ? "?" + remaining : "";

            var cleanURL = cleanPath(pParam) + cleanSearch + hash;
            history.replaceState(null, "", cleanURL);
            return;
        }

        // Normal case: just strip trailing slash / index.html
        var cleaned = cleanPath(path);

        if (cleaned !== path) {
            history.replaceState(null, "", cleaned + search + hash);
        }
    }

    cleanURLBar();   // ← fires instantly


    // ═════════════════════════════════════════
    //  1. BASE PATH (handles GitHub Pages)
    // ═════════════════════════════════════════
    function getBasePath() {
        var parts = location.pathname.split("/").filter(Boolean);

        if (location.hostname.endsWith("github.io") && parts.length > 0) {
            return "/" + parts[0] + "/";
        }

        return "/";
    }

    function buildPath(relativePath) {
        var base = getBasePath();
        return (base + relativePath.replace(/^\/+/, "")).replace(/\/+/g, "/");
    }


    // ═════════════════════════════════════════
    //  2. HEAD INJECTIONS
    // ═════════════════════════════════════════
    function addFavicon() {
        if (document.querySelector("link[rel='icon']")) return;
        var link  = document.createElement("link");
        link.rel  = "icon";
        link.type = "image/x-icon";
        link.href = buildPath(FAVICON_FILE);
        document.head.appendChild(link);
    }

    function addGlobalCSS() {
        if (document.querySelector("link[data-global-css]")) return;
        var link = document.createElement("link");
        link.rel  = "stylesheet";
        link.href = buildPath(CSS_FILE);
        link.setAttribute("data-global-css", "true");
        document.head.appendChild(link);
    }

    function addFontAwesome() {
        if (document.querySelector("link[data-font-awesome]")) return;
        var link = document.createElement("link");
        link.rel  = "stylesheet";
        link.href = FONT_AWESOME;
        link.setAttribute("data-font-awesome", "true");
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
    }


    // ═════════════════════════════════════════
    //  3. PARTIAL LOADER
    // ═════════════════════════════════════════
    async function loadSection(placeholderId, filePath) {
        var el = document.getElementById(placeholderId);
        if (!el) {
            console.warn("Placeholder not found: #" + placeholderId);
            return;
        }

        try {
            var resp = await fetch(buildPath(filePath));
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            el.innerHTML = await resp.text();
        } catch (err) {
            console.error("Failed to load partial '" + filePath + "':", err);
        }
    }


    // ═════════════════════════════════════════
    //  4. FIX ALL <a> LINKS
    //     - Relative → absolute
    //     - Strip /index.html, /index, trailing /
    //     - Works from ANY page depth
    // ═════════════════════════════════════════
    function fixAllLinks() {
        var basePath = getBasePath();
        var links    = document.querySelectorAll("a[href]");

        for (var i = 0; i < links.length; i++) {
            var raw = links[i].getAttribute("href");
            if (!raw) continue;

            // Skip external, anchors, special protocols
            if (raw.startsWith("http"))        continue;
            if (raw.startsWith("//"))          continue;
            if (raw.startsWith("#"))           continue;
            if (raw.startsWith("mailto:"))     continue;
            if (raw.startsWith("tel:"))        continue;
            if (raw.startsWith("javascript:")) continue;

            var cleaned;

            if (raw.startsWith("/")) {
                // Already absolute
                cleaned = cleanPath(raw);
            } else {
                // Relative → make absolute from base
                cleaned = cleanPath(basePath + raw);
            }

            links[i].setAttribute("href", cleaned);
        }
    }


    // ═════════════════════════════════════════
    //  5. NAVBAR: TOGGLE + ACTIVE LINK
    // ═════════════════════════════════════════
    function initNavbar() {

        var toggler = document.querySelector(".menu-toggle");
        var navMenu = document.querySelector(".nav-links");

        if (toggler && navMenu) {
            toggler.addEventListener("click", function () {
                navMenu.classList.toggle("show");
            });
        }

        // Active link detection
        var currentPath = cleanPath(location.pathname);
        var allLinks    = document.querySelectorAll(".nav-links a");

        for (var j = 0; j < allLinks.length; j++) {
            var href = allLinks[j].getAttribute("href");
            if (!href) continue;

            href = cleanPath(href);

            var isExact  = (currentPath === href);
            var isParent = (href !== "/" && currentPath.startsWith(href + "/"));

            if (isExact || isParent) {
                allLinks[j].classList.add("active-link");
            }
        }
    }


    // ═════════════════════════════════════════
    //  6. FOOTER YEAR
    // ═════════════════════════════════════════
    function initFooter() {
        var yearEl = document.getElementById("year");
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }
    }


    // ═════════════════════════════════════════
    //  7. MAIN INITIALIZATION
    // ═════════════════════════════════════════
    document.addEventListener("DOMContentLoaded", async function () {

        // Step 1 — Head resources
        addFavicon();
        addGlobalCSS();
        addFontAwesome();

        // Step 2 — Load partials in parallel
        var keys     = Object.keys(PARTIALS);
        var promises = [];
        for (var i = 0; i < keys.length; i++) {
            promises.push(loadSection(keys[i], PARTIALS[keys[i]]));
        }
        await Promise.all(promises);

        // Step 3 — Fix all links (partials now in DOM)
        fixAllLinks();

        // Step 4 — Init interactivity
        initNavbar();
        initFooter();
    });

})();
