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
    //     Strips: trailing "/", "/index.html", "/index"
    //
    //     /NEC-license-preparation/           →  /NEC-license-preparation
    //     /NEC-license-preparation/index.html →  /NEC-license-preparation
    //     /NEC-license-preparation/index      →  /NEC-license-preparation
    //     /BE_CIVIL/semester-1/index.html     →  /BE_CIVIL/semester-1
    //     /                                   →  /  (root untouched)
    // ═════════════════════════════════════════

    function cleanPath(path) {
        // Remove /index.html or /index from the end
        path = path.replace(/\/index\.html$/i, "");
        path = path.replace(/\/index$/i, "");

        // Remove trailing slash (but keep root "/")
        if (path !== "/" && path.endsWith("/")) {
            path = path.slice(0, -1);
        }

        // If we stripped everything, it's root
        return path || "/";
    }

    function cleanURLBar() {
        var cleaned = cleanPath(location.pathname);

        // Only update if something actually changed
        if (cleaned !== location.pathname) {
            var newURL = cleaned + location.search + location.hash;
            history.replaceState(null, "", newURL);
        }
    }

    cleanURLBar();   // ← fires instantly, before DOM


    // ═════════════════════════════════════════
    //  1. BASE PATH (handles GitHub Pages)
    // ═════════════════════════════════════════
    function getBasePath() {
        var parts = location.pathname.split("/").filter(Boolean);

        // GitHub Pages project site: https://user.github.io/repo-name/
        if (location.hostname.endsWith("github.io") && parts.length > 0) {
            return "/" + parts[0] + "/";
        }

        // Custom domain (e.g. arunpanthi.com.np)
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
    //  4. FIX ALL <a> LINKS IN THE PAGE
    //     - Makes relative links absolute (from root)
    //     - Strips /index.html, /index, trailing /
    //     - navbar links become UNIVERSAL
    // ═════════════════════════════════════════
    function fixAllLinks() {
        var basePath = getBasePath();
        var links    = document.querySelectorAll("a[href]");

        for (var i = 0; i < links.length; i++) {
            var raw  = links[i].getAttribute("href");

            // Skip external links, anchors, mailto, tel, javascript
            if (!raw) continue;
            if (raw.startsWith("http"))        continue;
            if (raw.startsWith("//"))          continue;
            if (raw.startsWith("#"))           continue;
            if (raw.startsWith("mailto:"))     continue;
            if (raw.startsWith("tel:"))        continue;
            if (raw.startsWith("javascript:")) continue;

            var cleaned;

            if (raw.startsWith("/")) {
                // ── Already absolute: just clean it ──
                //    "/BE_CIVIL/index.html"  →  "/BE_CIVIL"
                //    "/BE_CIVIL/"            →  "/BE_CIVIL"
                cleaned = cleanPath(raw);
            } else {
                // ── Relative link: make it absolute from base ──
                //    "resources"       →  "/resources"
                //    "semester-1/"     →  "/semester-1"
                //    "index.html"      →  "/"  (or base path)
                cleaned = cleanPath(basePath + raw);
            }

            links[i].setAttribute("href", cleaned);
        }
    }


    // ═════════════════════════════════════════
    //  5. NAVBAR: TOGGLE + ACTIVE LINK
    // ═════════════════════════════════════════
    function initNavbar() {

        // ── Mobile hamburger toggle ─────────
        var toggler = document.querySelector(".menu-toggle");
        var navMenu = document.querySelector(".nav-links");

        if (toggler && navMenu) {
            toggler.addEventListener("click", function () {
                navMenu.classList.toggle("show");
            });
        }

        // ── Highlight current page link ─────
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

        // Step 1 — Inject <head> resources
        addFavicon();
        addGlobalCSS();
        addFontAwesome();

        // Step 2 — Load all partials in parallel
        var keys     = Object.keys(PARTIALS);
        var promises = [];
        for (var i = 0; i < keys.length; i++) {
            promises.push(loadSection(keys[i], PARTIALS[keys[i]]));
        }
        await Promise.all(promises);

        // Step 3 — Fix ALL links (partials are now in DOM)
        fixAllLinks();

        // Step 4 — Init interactivity
        initNavbar();
        initFooter();
    });

})();
