// ============================================
//  /js/layout.js — Complete Clean Version
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
    //  0. TRAILING SLASH FIX (runs immediately)
    //     /BE_CIVIL/  →  /BE_CIVIL
    //     /           →  /  (root untouched)
    // ═════════════════════════════════════════
    function stripTrailingSlash() {
        var path   = location.pathname;
        var search = location.search;
        var hash   = location.hash;

        if (path !== "/" && path.endsWith("/")) {
            var clean = path.slice(0, -1) + search + hash;
            history.replaceState(null, "", clean);
        }
    }

    stripTrailingSlash();   // ← fires instantly, no DOM needed


    // ═════════════════════════════════════════
    //  1. BASE PATH (handles GitHub Pages)
    // ═════════════════════════════════════════
    function getBasePath() {
        var parts = location.pathname.split("/").filter(Boolean);

        // GitHub Pages project site: https://user.github.io/repo-name/…
        if (location.hostname.endsWith("github.io") && parts.length > 0) {
            return "/" + parts[0] + "/";
        }

        // Custom domain (e.g. arunpanthi.com.np)
        return "/";
    }

    // Builds a clean absolute path from base + relative file
    function buildPath(relativePath) {
        var base = getBasePath();
        return (base + relativePath.replace(/^\/+/, "")).replace(/\/+/g, "/");
    }


    // ═════════════════════════════════════════
    //  2. HEAD INJECTIONS
    // ═════════════════════════════════════════

    // ── FAVICON ─────────────────────────────
    function addFavicon() {
        if (document.querySelector("link[rel='icon']")) return;

        var link  = document.createElement("link");
        link.rel  = "icon";
        link.type = "image/x-icon";
        link.href = buildPath(FAVICON_FILE);
        document.head.appendChild(link);
    }

    // ── GLOBAL CSS ──────────────────────────
    function addGlobalCSS() {
        if (document.querySelector("link[data-global-css]")) return;

        var link = document.createElement("link");
        link.rel  = "stylesheet";
        link.href = buildPath(CSS_FILE);
        link.setAttribute("data-global-css", "true");
        document.head.appendChild(link);
    }

    // ── FONT AWESOME ────────────────────────
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
    //  4. NAVBAR: TOGGLE + ACTIVE LINK
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
        var currentPath = location.pathname;

        // Normalize: strip trailing slash for comparison
        if (currentPath !== "/" && currentPath.endsWith("/")) {
            currentPath = currentPath.slice(0, -1);
        }

        var allLinks = document.querySelectorAll(".nav-links a");

        for (var j = 0; j < allLinks.length; j++) {
            var href = allLinks[j].getAttribute("href");
            if (!href) continue;

            // Normalize href too
            if (href !== "/" && href.endsWith("/")) {
                href = href.slice(0, -1);
            }

            var isExact  = (currentPath === href);
            var isParent = (href !== "/" && currentPath.startsWith(href + "/"));

            if (isExact || isParent) {
                allLinks[j].classList.add("active-link");
            }
        }
    }


    // ═════════════════════════════════════════
    //  5. FIX ALL INTERNAL <a> TRAILING SLASHES
    // ═════════════════════════════════════════
    function fixInternalLinks() {
        var links = document.querySelectorAll("a[href]");

        for (var i = 0; i < links.length; i++) {
            var href = links[i].getAttribute("href");

            // Only fix local absolute paths like "/BE_CIVIL/"
            if (href.startsWith("/") && href !== "/" && href.endsWith("/")) {
                links[i].setAttribute("href", href.slice(0, -1));
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

        // Step 3 — Init interactivity (partials are now in the DOM)
        initNavbar();
        initFooter();

        // Step 4 — Clean every <a> href in the full page
        fixInternalLinks();
    });

})();
