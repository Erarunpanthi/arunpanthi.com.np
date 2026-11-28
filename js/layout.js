(function () {
  "use strict";

  var ASSET_VERSION = "?v=20260924";
  var CSS_FILE = "css/styles.css" + ASSET_VERSION;
  var FAVICON_FILE = "favicon.ico";
  var FONT_AWESOME = "assets/fontawesome/css/all.min.css" + ASSET_VERSION;

  var PARTIALS = {
    "navbar": "partials/navbar.html",
    "social-section": "partials/social.html",
    "footer": "partials/footer.html"
  };

  var LAZY_CONFIG = { rootMargin: "200px 0px", threshold: 0.01 };

  function cleanPath(path) {
    path = path.replace(/\/index\.html$/i, "");
    path = path.replace(/\/index$/i, "");
    if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1);
    return path || "/";
  }

  function cleanURLBar() {
    var path = location.pathname;
    var search = location.search;
    var hash = location.hash;
    var params = new URLSearchParams(search);
    var pParam = params.get("p");
    if (pParam) {
      params.delete("p");
      var remaining = params.toString();
      history.replaceState(null, "", cleanPath(pParam) + (remaining ? "?" + remaining : "") + hash);
      return;
    }
    var cleaned = cleanPath(path);
    if (cleaned !== path) history.replaceState(null, "", cleaned + search + hash);
  }

  cleanURLBar();

  function getBasePath() {
    var parts = location.pathname.split("/").filter(Boolean);
    if (location.hostname.endsWith("github.io") && parts.length > 0) return "/" + parts[0] + "/";
    return "/";
  }

  function buildPath(relativePath) {
    return (getBasePath() + relativePath.replace(/^\/+/, "")).replace(/\/+/g, "/");
  }

  // Keep the five required page assets available on every current and future HTML
  // page under the four PSC resource sections, without duplicating existing tags.
  function ensurePscPageAssets() {
    var path = cleanPath(location.pathname);
    var prefixes = [
      "/Psc-preparation/Syllabus",
      "/Psc-preparation/first-paper-notes",
      "/Psc-preparation/Subjective-Note",
      "/Psc-preparation/MCQ"
    ];
    if (!prefixes.some(function (prefix) { return path === prefix || path.indexOf(prefix + "/") === 0; })) return;

    var assets = [
      "/js/lazy-load.js",
      "/js/text-protect.js",
      "/js/layout.js?v=20260924",
      "/js/logo.js?v=20261101",
      "/js/note-pen.js?v=20261109-4"
    ];
    var scripts = Array.prototype.slice.call(document.querySelectorAll("script[src]"));
    assets.forEach(function (src) {
      var wanted = new URL(src, location.href).pathname;
      var exists = scripts.some(function (script) {
        try { return new URL(script.src, location.href).pathname === wanted; }
        catch (_) { return false; }
      });
      if (exists) return;
      var script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.async = false;
      document.body.appendChild(script);
      scripts.push(script);
    });
  }

  function addFavicon() {
    if (document.querySelector("link[rel='icon']")) return;
    var link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/x-icon";
    link.href = buildPath(FAVICON_FILE);
    document.head.appendChild(link);
  }

  function addGlobalCSS() {
    if (document.documentElement.hasAttribute("data-standalone")) return;
    if (document.querySelector("link[data-global-css], link[href*='styles.css']")) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = buildPath(CSS_FILE);
    link.setAttribute("data-global-css", "true");
    document.head.appendChild(link);
  }

  function addFontAwesome() {
    if (document.querySelector("link[data-font-awesome], link[href*='font-awesome'], link[href*='fontawesome'], link[href*='all.min.css']")) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = buildPath(FONT_AWESOME);
    link.setAttribute("data-font-awesome", "true");
    document.head.appendChild(link);
  }

  async function loadSection(placeholderId, filePath) {
    var el = document.getElementById(placeholderId);
    if (!el) return;
    try {
      var resp = await fetch(buildPath(filePath));
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      el.innerHTML = await resp.text();
      el.classList.add("global-partial");
    } catch (err) {
      console.error("Failed to load partial '" + filePath + "':", err);
      el.classList.add("global-partial");
    }
  }

  function fixAllLinks() {
    var basePath = getBasePath();
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var raw = links[i].getAttribute("href");
      if (!raw || /^(https?:|\/\/|#|mailto:|tel:|javascript:)/i.test(raw)) continue;
      links[i].setAttribute("href", cleanPath(raw.startsWith("/") ? raw : basePath + raw));
    }
  }

  function initNavbar() {
    var toggler = document.querySelector(".menu-toggle");
    var navMenu = document.querySelector(".nav-links");
    if (toggler && navMenu) toggler.addEventListener("click", function () { navMenu.classList.toggle("show"); });
    var currentPath = cleanPath(location.pathname);
    var allLinks = document.querySelectorAll(".nav-links a, .navbar a");
    for (var j = 0; j < allLinks.length; j++) {
      var href = allLinks[j].getAttribute("href");
      if (!href) continue;
      href = cleanPath(href);
      if (currentPath === href || (href !== "/" && currentPath.startsWith(href + "/"))) {
        allLinks[j].classList.add("active-link", "active");
      }
    }
  }

  function initFooter() {
    var yearEl = document.getElementById("year");
    if (!yearEl) {
      var host = document.getElementById("footer");
      if (host && !host.querySelector(".footer")) {
        host.classList.add("global-partial", "footer");
        host.innerHTML = '<p>©<span id="year"></span> CivPrepMaster. All rights reserved.<br>' +
          '<a href="' + buildPath("PrivacyPolicy") + '">Privacy Policy</a> | ' +
          '<a href="' + buildPath("TermsofService") + '">Terms of Service</a></p>';
      }
      yearEl = document.getElementById("year");
      if (!yearEl) return;
    }
    yearEl.textContent = new Date().getFullYear();
  }

  function getPreviousMonthEndDates(now) {
    var lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    var mm = String(lastDay.getMonth() + 1).padStart(2, "0");
    var dd = String(lastDay.getDate()).padStart(2, "0");
    return {
      iso: lastDay.getFullYear() + "-" + mm + "-" + dd,
      long: lastDay.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    };
  }

  function initAutoLastUpdated() {
    var dates;
    try { dates = getPreviousMonthEndDates(new Date()); } catch (_) { return; }
    document.querySelectorAll('time[data-auto-date="previous-month-end"]').forEach(function (time) {
      time.setAttribute("datetime", dates.iso);
      time.textContent = dates.long;
    });
    var schemaEl = document.getElementById("page-schema");
    if (schemaEl) {
      try {
        var data = JSON.parse(schemaEl.textContent);
        data.dateModified = dates.iso;
        schemaEl.textContent = JSON.stringify(data);
      } catch (_) { /* keep static fallback JSON-LD */ }
    }
  }

  function fallbackLoadAll(mediaEls, sectionEls, bgEls) {
    mediaEls.forEach(function (el) {
      if (el.dataset.src) el.src = el.dataset.src;
      if (el.dataset.srcset) el.srcset = el.dataset.srcset;
      el.classList.add("loaded");
    });
    sectionEls.forEach(function (section) {
      if (!section.dataset.page) return;
      fetch(buildPath(section.dataset.page)).then(function (resp) { return resp.text(); }).then(function (html) {
        section.innerHTML = html;
        section.classList.add("loaded");
      });
    });
    bgEls.forEach(function (el) {
      if (el.dataset.bg) {
        el.style.backgroundImage = "url('" + el.dataset.bg + "')";
        el.classList.add("loaded");
      }
    });
  }

  function initLazyLoading() {
    var mediaElements = document.querySelectorAll("img.lazy, iframe.lazy, video.lazy");
    var sectionElements = document.querySelectorAll(".lazy-section[data-page]");
    var bgElements = document.querySelectorAll(".lazy-bg[data-bg]");
    if (!("IntersectionObserver" in window)) {
      fallbackLoadAll(mediaElements, sectionElements, bgElements);
      return;
    }
    if (mediaElements.length) {
      var mediaObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          if (el.dataset.src) { el.src = el.dataset.src; el.removeAttribute("data-src"); }
          if (el.dataset.srcset) { el.srcset = el.dataset.srcset; el.removeAttribute("data-srcset"); }
          el.addEventListener("load", function () { el.classList.add("loaded"); }, { once: true });
          observer.unobserve(el);
        });
      }, LAZY_CONFIG);
      mediaElements.forEach(function (el) { mediaObserver.observe(el); });
    }
    if (sectionElements.length) {
      var sectionObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var section = entry.target;
          if (section.dataset.page) {
            fetch(buildPath(section.dataset.page)).then(function (resp) {
              if (!resp.ok) throw new Error("HTTP " + resp.status);
              return resp.text();
            }).then(function (html) {
              section.innerHTML = html;
              section.classList.add("loaded");
              fixAllLinks();
            }).catch(function () { section.innerHTML = "<p>Content unavailable.</p>"; });
          }
          observer.unobserve(section);
        });
      }, LAZY_CONFIG);
      sectionElements.forEach(function (el) { sectionObserver.observe(el); });
    }
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

  document.addEventListener("DOMContentLoaded", async function () {
    ensurePscPageAssets();
    addFavicon();
    addGlobalCSS();
    addFontAwesome();
    var keys = Object.keys(PARTIALS);
    await Promise.all(keys.map(function (key) { return loadSection(key, PARTIALS[key]); }));
    fixAllLinks();
    initNavbar();
    initFooter();
    initAutoLastUpdated();
    initLazyLoading();
  });
})();
