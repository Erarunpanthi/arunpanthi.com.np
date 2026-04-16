// layout.js

(function () {
  "use strict";

  // Configuration
  var CSS_FILE     = "styles.css";
  var FAVICON_FILE = "logo.ico";
  var FONT_AWESOME = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";

  var PARTIALS = {
    "navbar":         "partials/navbar.html",
    "social-section": "partials/social.html",
    "footer":         "partials/footer.html"
  };

  var LAZY_CONFIG = {
    rootMargin: "200px 0px",
    threshold:  0.01
  };


  // Clean URL — runs immediately
  // Handles trailing slashes, ?p= redirects from 404.html, and /index.html

  function cleanPath(path) {
    path = path.replace(/\/index\.html$/i, "");
    path = path.replace(/\/index$/i, "");
    if (path !== "/" && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return path || "/";
  }

  function cleanURLBar() {
    var path   = location.pathname;
    var search = location.search;
    var hash   = location.hash;
    var params = new URLSearchParams(search);
    var pParam = params.get("p");

    if (pParam) {
      params.delete("p");
      var remaining   = params.toString();
      var cleanSearch = remaining ? "?" + remaining : "";
      history.replaceState(null, "", cleanPath(pParam) + cleanSearch + hash);
      return;
    }

    var cleaned = cleanPath(path);
    if (cleaned !== path) {
      history.replaceState(null, "", cleaned + search + hash);
    }
  }

  cleanURLBar();


  // Base path resolution (GitHub Pages aware)

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


  // Head injections

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
    var link  = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = buildPath(CSS_FILE);
    link.setAttribute("data-global-css", "true");
    document.head.appendChild(link);
  }

  function addFontAwesome() {
    if (document.querySelector("link[data-font-awesome]")) return;
    var link  = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = FONT_AWESOME;
    link.setAttribute("data-font-awesome", "true");
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }


  // Partial loader

  async function loadSection(placeholderId, filePath) {
    var el = document.getElementById(placeholderId);
    if (!el) return;

    try {
      var resp = await fetch(buildPath(filePath));
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      el.innerHTML = await resp.text();
    } catch (err) {
      console.error("Failed to load partial '" + filePath + "':", err);
    }
  }


  // Link normalization
  // Converts relative hrefs to absolute, strips /index.html and trailing slashes

  function fixAllLinks() {
    var basePath = getBasePath();
    var links    = document.querySelectorAll("a[href]");

    for (var i = 0; i < links.length; i++) {
      var raw = links[i].getAttribute("href");
      if (!raw) continue;

      if (/^(https?:|\/\/|#|mailto:|tel:|javascript:)/i.test(raw)) continue;

      var cleaned = raw.startsWith("/")
        ? cleanPath(raw)
        : cleanPath(basePath + raw);

      links[i].setAttribute("href", cleaned);
    }
  }


  // Navbar toggle and active-link highlighting

  function initNavbar() {
    var toggler = document.querySelector(".menu-toggle");
    var navMenu = document.querySelector(".nav-links");

    if (toggler && navMenu) {
      toggler.addEventListener("click", function () {
        navMenu.classList.toggle("show");
      });
    }

    var currentPath = cleanPath(location.pathname);
    var allLinks    = document.querySelectorAll(".nav-links a");

    for (var j = 0; j < allLinks.length; j++) {
      var href = allLinks[j].getAttribute("href");
      if (!href) continue;

      href = cleanPath(href);

      if (currentPath === href || (href !== "/" && currentPath.startsWith(href + "/"))) {
        allLinks[j].classList.add("active-link");
      }
    }
  }


  // Footer year

  function initFooter() {
    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }


  // Lazy loading — images, iframes, videos, background images, and HTML sections
  // Uses IntersectionObserver with a graceful fallback for older browsers

  function initLazyLoading() {

    var mediaElements   = document.querySelectorAll("img.lazy, iframe.lazy, video.lazy");
    var sectionElements = document.querySelectorAll(".lazy-section[data-page]");
    var bgElements      = document.querySelectorAll(".lazy-bg[data-bg]");

    if (!("IntersectionObserver" in window)) {
      fallbackLoadAll(mediaElements, sectionElements, bgElements);
      return;
    }

    // Media observer (images, iframes, videos)
    if (mediaElements.length) {
      var mediaObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;

          if (el.dataset.src)    { el.src    = el.dataset.src;    el.removeAttribute("data-src");    }
          if (el.dataset.srcset) { el.srcset = el.dataset.srcset; el.removeAttribute("data-srcset"); }

          el.addEventListener("load", function () { el.classList.add("loaded"); }, { once: true });
          observer.unobserve(el);
        });
      }, LAZY_CONFIG);

      mediaElements.forEach(function (el) { mediaObserver.observe(el); });
    }

    // Section observer (fetch external HTML into a container)
    if (sectionElements.length) {
      var sectionObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var section = entry.target;
          var pageURL = section.dataset.page;

          if (pageURL) {
            fetch(buildPath(pageURL))
              .then(function (resp) {
                if (!resp.ok) throw new Error("HTTP " + resp.status);
                return resp.text();
              })
              .then(function (html) {
                section.innerHTML = html;
                section.classList.add("loaded");
                fixAllLinks();
              })
              .catch(function () {
                section.innerHTML = "<p>Content unavailable.</p>";
              });
          }

          observer.unobserve(section);
        });
      }, LAZY_CONFIG);

      sectionElements.forEach(function (el) { sectionObserver.observe(el); });
    }

    // Background-image observer
    if (bgElements.length) {
      var bgObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;

          if (el.dataset.bg) {
            el.style.backgroundImage = "url('" + el.dataset.bg + "')";
            el.removeAttribute("data-bg");
            el.classList.add("loaded");
          }

          observer.unobserve(el);
        });
      }, LAZY_CONFIG);

      bgElements.forEach(function (el) { bgObserver.observe(el); });
    }
  }

  // Fallback for browsers without IntersectionObserver

  function fallbackLoadAll(mediaEls, sectionEls, bgEls) {
    mediaEls.forEach(function (el) {
      if (el.dataset.src)    el.src    = el.dataset.src;
      if (el.dataset.srcset) el.srcset = el.dataset.srcset;
      el.classList.add("loaded");
    });

    sectionEls.forEach(function (section) {
      var pageURL = section.dataset.page;
      if (pageURL) {
        fetch(buildPath(pageURL))
          .then(function (resp) { return resp.text(); })
          .then(function (html) {
            section.innerHTML = html;
            section.classList.add("loaded");
          });
      }
    });

    bgEls.forEach(function (el) {
      if (el.dataset.bg) {
        el.style.backgroundImage = "url('" + el.dataset.bg + "')";
        el.classList.add("loaded");
      }
    });
  }
// layout.js
(function () {
  "use strict";

  var WATERMARK_LOGO = "https://arunpanthi.com.np/Photos/logo.png";

  function addWatermark() {
    var wm = document.createElement("div");
    wm.className = "watermark";
    wm.style.position = "fixed";
    wm.style.top = 0;
    wm.style.left = 0;
    wm.style.width = "100%";
    wm.style.height = "100%";
    wm.style.pointerEvents = "none";
    wm.style.background = "url('" + WATERMARK_LOGO + "') center center no-repeat";
    wm.style.backgroundSize = "200px";
    wm.style.opacity = "0.1";
    wm.style.zIndex = "9999";
    document.body.appendChild(wm);
  }

  document.addEventListener("DOMContentLoaded", addWatermark);
})();


  // Initialization

  document.addEventListener("DOMContentLoaded", async function () {
    addFavicon();
    addGlobalCSS();
    addFontAwesome();

    var keys     = Object.keys(PARTIALS);
    var promises = [];
    for (var i = 0; i < keys.length; i++) {
      promises.push(loadSection(keys[i], PARTIALS[keys[i]]));
    }
    await Promise.all(promises);

    fixAllLinks();
    initNavbar();
    initFooter();
    initLazyLoading();
  });

})();
