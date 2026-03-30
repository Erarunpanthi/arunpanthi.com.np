/*!
 * Auto Lazy Loader
 * Drop-in: <script src="/js/lazy-load.js" defer></script>
 * No extra HTML/JS required.
 */

(function () {
  "use strict";

  // ---------- CONFIG ----------
  const CONFIG = {
    rootMargin: "120px 0px",          // start loading a bit before visible
    threshold: 0.12,
    animationDuration: 0.55,          // seconds
    animationEasing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
    minElementSize: 12,               // ignore tiny elements
    lazyMediaOffset: 100,             // how far below viewport to lazy media
  };

  const SKIP_TAGS = new Set([
    "HTML", "HEAD", "BODY",
    "SCRIPT", "STYLE", "LINK", "META", "TITLE",
    "BR", "HR", "WBR", "NOSCRIPT", "TEMPLATE"
  ]);

  // Main "content-like" tags to lazy
  const CONTENT_TAGS = new Set([
    "SECTION", "ARTICLE", "MAIN", "ASIDE",
    "HEADER", "FOOTER", "NAV",
    "DIV", "P", "SPAN",
    "H1", "H2", "H3", "H4", "H5", "H6",
    "UL", "OL", "LI",
    "FIGURE", "FIGCAPTION",
    "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH",
    "FORM", "FIELDSET",
    "IMG", "PICTURE", "CANVAS",
    "IFRAME", "VIDEO"
  ]);

  let observer;
  const processed = new WeakSet();

  // ---------- STYLE INJECTION ----------
  function injectStyles() {
    if (document.getElementById("auto-lazy-styles")) return;

    const style = document.createElement("style");
    style.id = "auto-lazy-styles";
    style.textContent = `
      .ll-lazy {
        opacity: 0;
        transform: translateY(18px);
        will-change: opacity, transform;
      }
      .ll-visible {
        opacity: 1 !important;
        transform: none !important;
        transition:
          opacity ${CONFIG.animationDuration}s ${CONFIG.animationEasing},
          transform ${CONFIG.animationDuration}s ${CONFIG.animationEasing};
      }
      /* simple shimmer for deferred images */
      .ll-shimmer-wrap {
        position: relative;
        overflow: hidden;
        background: #f0f0f0;
      }
      .ll-shimmer-wrap::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          rgba(255,255,255,0),
          rgba(255,255,255,0.5),
          rgba(255,255,255,0)
        );
        transform: translateX(-100%);
        animation: ll-shimmer 1.4s infinite;
      }
      @keyframes ll-shimmer {
        100% { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- HELPERS ----------
  function inInitialViewport(rect) {
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    return rect.top < vh + 20 && rect.bottom > -20;
  }

  function isBelowInitialViewport(rect) {
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    return rect.top > vh + CONFIG.lazyMediaOffset;
  }

  function isCandidateElement(el) {
    if (el.nodeType !== 1) return false;
    if (processed.has(el)) return false;
    if (SKIP_TAGS.has(el.tagName)) return false;
    if (!CONTENT_TAGS.has(el.tagName)) return false;
    if (el.closest(".no-lazy,[data-no-lazy]")) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < CONFIG.minElementSize && rect.height < CONFIG.minElementSize) return false;
    return true;
  }

  // ---------- MEDIA DEFERRING ----------
  function makeImageLazy(img, rect) {
    if (img.dataset.llSrc || img.dataset.llSrcset) return;
    const src = img.getAttribute("src");
    const srcset = img.getAttribute("srcset");
    if (!src && !srcset) return;
    if (!isBelowInitialViewport(rect)) return; // only defer if below first screen

    if (src) {
      img.dataset.llSrc = src;
      img.removeAttribute("src");
    }
    if (srcset) {
      img.dataset.llSrcset = srcset;
      img.removeAttribute("srcset");
    }

    // tiny transparent placeholder so layout keeps size
    img.src =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E";

    // simple shimmer wrapper
    if (!img.parentElement.classList.contains("ll-shimmer-wrap")) {
      const w = img.getAttribute("width") || img.style.width || "100%";
      const h = img.getAttribute("height") || img.style.height || "200";
      const wrap = document.createElement("div");
      wrap.className = "ll-shimmer-wrap";
      wrap.style.width = isNaN(w) ? w : w + "px";
      wrap.style.height = isNaN(h) ? h : h + "px";
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);
    }
  }

  function restoreImage(img) {
    const src = img.dataset.llSrc;
    const srcset = img.dataset.llSrcset;
    if (src) {
      img.src = src;
      delete img.dataset.llSrc;
    }
    if (srcset) {
      img.srcset = srcset;
      delete img.dataset.llSrcset;
    }
    const wrap = img.parentElement;
    if (wrap && wrap.classList.contains("ll-shimmer-wrap")) {
      wrap.parentNode.insertBefore(img, wrap);
      wrap.remove();
    }
  }

  function makeIframeLazy(iframe, rect) {
    if (iframe.dataset.llSrc) return;
    const src = iframe.getAttribute("src");
    if (!src) return;
    if (!isBelowInitialViewport(rect)) return;
    iframe.dataset.llSrc = src;
    iframe.removeAttribute("src");
  }

  function restoreIframe(iframe) {
    const src = iframe.dataset.llSrc;
    if (!src) return;
    iframe.src = src;
    delete iframe.dataset.llSrc;
  }

  function makeVideoLazy(video, rect) {
    if (video.dataset.llSrc || video.querySelector("source[data-ll-src]")) return;
    const src = video.getAttribute("src");
    if (!src && !video.querySelector("source[src]")) return;
    if (!isBelowInitialViewport(rect)) return;

    if (src) {
      video.dataset.llSrc = src;
      video.removeAttribute("src");
    }
    video.querySelectorAll("source[src]").forEach((s) => {
      s.dataset.llSrc = s.getAttribute("src");
      s.removeAttribute("src");
    });
    video.preload = "none";
  }

  function restoreVideo(video) {
    const src = video.dataset.llSrc;
    if (src) {
      video.src = src;
      delete video.dataset.llSrc;
    }
    video.querySelectorAll("source[data-ll-src]").forEach((s) => {
      s.src = s.dataset.llSrc;
      delete s.dataset.llSrc;
    });
    try { video.load(); } catch (e) {}
  }

  function makeBackgroundLazy(el, rect) {
    if (el.dataset.llBg) return;
    const inlineBg = el.style.backgroundImage;
    if (!inlineBg || inlineBg === "none") return;
    if (!isBelowInitialViewport(rect)) return;
    el.dataset.llBg = inlineBg;
    el.style.backgroundImage = "none";
  }

  function restoreBackground(el) {
    if (!el.dataset.llBg) return;
    el.style.backgroundImage = el.dataset.llBg;
    delete el.dataset.llBg;
  }

  function makeMediaLazy(el, rect) {
    const tag = el.tagName;
    if (tag === "IMG") {
      makeImageLazy(el, rect);
    } else if (tag === "IFRAME") {
      makeIframeLazy(el, rect);
    } else if (tag === "VIDEO") {
      makeVideoLazy(el, rect);
    }
    makeBackgroundLazy(el, rect);
  }

  function restoreMedia(el) {
    const tag = el.tagName;
    if (tag === "IMG") restoreImage(el);
    else if (tag === "IFRAME") restoreIframe(el);
    else if (tag === "VIDEO") restoreVideo(el);
    restoreBackground(el);

    // Also restore any lazy media inside this element
    el.querySelectorAll("img[data-ll-src], iframe[data-ll-src], video[data-ll-src]").forEach(restoreMedia);
    el.querySelectorAll("[data-ll-bg]").forEach(restoreBackground);
  }

  // ---------- ELEMENT PREP / REVEAL ----------
  function prepareElement(el, rect) {
    if (processed.has(el)) return;
    processed.add(el);

    // store original inline styles in case they exist
    if (!el.dataset.llOrigOpacity) el.dataset.llOrigOpacity = el.style.opacity || "";
    if (!el.dataset.llOrigTransform) el.dataset.llOrigTransform = el.style.transform || "";

    el.classList.add("ll-lazy");

    // set up lazy media ONLY for elements starting below first screen
    if (isBelowInitialViewport(rect)) {
      makeMediaLazy(el, rect);
      observer.observe(el);
    } else {
      // already in viewport at load -> reveal shortly (no network delay)
      requestAnimationFrame(() => revealElement(el));
    }
  }

  function revealElement(el) {
    if (el.classList.contains("ll-visible")) return;

    // restore any deferred media
    restoreMedia(el);

    // trigger CSS animation by toggling classes
    el.classList.add("ll-visible");
    el.classList.remove("ll-lazy");

    // optional: cleanup after animation
    const t = (CONFIG.animationDuration + 0.1) * 1000;
    setTimeout(() => {
      // restore original inline styles if any
      if (el.dataset.llOrigOpacity !== undefined) {
        el.style.opacity = el.dataset.llOrigOpacity;
        delete el.dataset.llOrigOpacity;
      }
      if (el.dataset.llOrigTransform !== undefined) {
        el.style.transform = el.dataset.llOrigTransform;
        delete el.dataset.llOrigTransform;
      }
      el.style.willChange = "";
    }, t);
  }

  // ---------- SCANNING ----------
  function scan(root = document.body) {
    if (!root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      if (!isCandidateElement(node)) continue;

      const rect = node.getBoundingClientRect();
      if (!rect || (rect.width < CONFIG.minElementSize && rect.height < CONFIG.minElementSize)) {
        continue;
      }
      prepareElement(node, rect);
    }
  }

  // ---------- OBSERVERS ----------
  function createIntersectionObserver() {
    if (!("IntersectionObserver" in window)) {
      // fallback: show everything & restore media
      document.querySelectorAll(".ll-lazy").forEach((el) => revealElement(el));
      return null;
    }

    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          revealElement(el);
          observer.unobserve(el);
        });
      },
      {
        rootMargin: CONFIG.rootMargin,
        threshold: CONFIG.threshold
      }
    );
  }

  function watchDOMChanges() {
    if (!("MutationObserver" in window)) return;

    const mo = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          if (SKIP_TAGS.has(n.tagName)) return;
          // scan the new subtree
          scan(n);
        });
      });
    });

    mo.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ---------- PUBLIC API ----------
  window.AutoLazy = {
    refresh() {
      scan(document.body);
    },
    revealAll() {
      document.querySelectorAll(".ll-lazy").forEach((el) => revealElement(el));
    }
  };

  // ---------- INIT ----------
  function init() {
    injectStyles();
    observer = createIntersectionObserver();
    scan(document.body);
    watchDOMChanges();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
