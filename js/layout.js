// ============================================
//  /js/layout.js — Complete Fixed Version
// ============================================

(function () {

    // ── CONFIG ──────────────────────────────
    const CSS_FILE     = "styles.css";
    const FAVICON_FILE = "logo.ico";
    const FONT_AWESOME = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";
    const PARTIALS     = {
        "navbar":         "partials/navbar.html",
        "social-section": "partials/social.html",
        "footer":         "partials/footer.html"
    };


    // ── BASE PATH (handles GitHub Pages) ────
    function getBasePath() {
        var parts = location.pathname.split("/").filter(Boolean);

        // GitHub Pages project site: https://user.github.io/repo-name/
        // First segment is the repo name — must be preserved
        if (location.hostname.endsWith("github.io") && parts.length > 0) {
            return "/" + parts[0] + "/";
        }

        // Custom domain (e.g., arunpanthi.com.np) or root GitHub Pages
        return "/";
    }


    // Builds a clean absolute path from base + relative file
    function buildPath(relativePath) {
        var base = getBasePath();
        return (base + relativePath.replace(/^\/+/, "")).replace(/\/+/g, "/");
    }


    // ── FAVICON ─────────────────────────────
    function addFavicon() {
        // Don't add if one already exists
        var existing = document.querySelector("link[rel='icon']");
        if (existing) return;

        var link  = document.createElement("link");
        link.rel  = "icon";
        link.href = buildPath(FAVICON_FILE);
        link.type = "image/x-icon";
        document.head.appendChild(link);
    }


    // ── GLOBAL CSS ──────────────────────────
    function addGlobalCSS() {
        // Don't add if already injected
        if (document.querySelector("link[data-global-css='true']")) return;

        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = buildPath(CSS_FILE);
        link.setAttribute("data-global-css", "true");
        document.head.appendChild(link);
    }


    // ── FONT AWESOME ────────────────────────
    function addFontAwesome() {
        // Don't add if already present
        var existing = document.querySelector("link[href*='font-awesome']");
        if (existing) return;

        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = FONT_AWESOME;
        document.head.appendChild(link);
    }


    // ── LOAD A SINGLE PARTIAL ───────────────
    async function loadSection(id, relativePath) {
        var element = document.getElementById(id);
        if (!element) return;

        try {
            var url      = buildPath(relativePath);
            var response = await fetch(url);

            if (!response.ok) {
                throw new Error("Failed to load " + url + " (" + response.status + ")");
            }

            element.innerHTML = await response.text();

        } catch (error) {
            console.error("Error loading section '" + id + "':", error);
        }
    }


    // ── NAVBAR INTERACTIVITY ────────────────
    function initNavbar() {
        // Hamburger menu toggle
        var hamburger = document.getElementById("hamburger");
        var navLinks  = document.getElementById("navLinks");

        if (hamburger && navLinks) {
            hamburger.addEventListener("click", function () {
                navLinks.classList.toggle("active");
                hamburger.classList.toggle("active");
            });

            // Close menu when a link is clicked (better mobile UX)
            var links = navLinks.querySelectorAll("a");
            for (var i = 0; i < links.length; i++) {
                links[i].addEventListener("click", function () {
                    navLinks.classList.remove("active");
                    hamburger.classList.remove("active");
                });
            }
        }

        // Highlight current page link
        var currentPath = location.pathname;
        var allLinks    = document.querySelectorAll(".nav-links a");

        for (var j = 0; j < allLinks.length; j++) {
            var href = allLinks[j].getAttribute("href");
            if (!href) continue;

            var isExact  = (currentPath === href);
            var isParent = (href !== "/" && currentPath.startsWith(href));

            if (isExact || isParent) {
                allLinks[j].classList.add("active-link");
            }
        }
    }


    // ── FOOTER YEAR ─────────────────────────
    function initFooter() {
        var yearEl = document.getElementById("year");
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }
    }


    // ── MAIN INITIALIZATION ─────────────────
    document.addEventListener("DOMContentLoaded", async function () {

        // Step 1: Inject head resources immediately
        addFavicon();
        addGlobalCSS();
        addFontAwesome();

        // Step 2: Load all partials in parallel
        var keys     = Object.keys(PARTIALS);
        var promises = [];

        for (var i = 0; i < keys.length; i++) {
            promises.push(loadSection(keys[i], PARTIALS[keys[i]]));
        }

        await Promise.all(promises);

        // Step 3: Initialize interactivity AFTER HTML is injected
        initNavbar();
        initFooter();
    });

})();
