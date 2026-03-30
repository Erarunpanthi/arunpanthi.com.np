/**
 * ============================================
 *  ULTIMATE LAZY LOADER v2.0
 *  Intersection Observer-based Lazy Loading
 *  Drop-in script for any webpage
 * ============================================
 */

(function () {
  "use strict";

  /* ── Configuration ── */
  const CONFIG = {
    rootMargin: "200px 0px",   // Start loading 200px before element is visible
    threshold: [0, 0.25, 0.5, 0.75, 1],
    animationDuration: "0.6s",
    animationEasing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    placeholderColor: "#f0f0f0",
    retryAttempts: 3,
    retryDelay: 1500,
  };

  /* ── Inject Required CSS ── */
  const injectStyles = () => {
    const style = document.createElement("style");
    style.id = "lazy-loader-styles";
    style.textContent = `
      /* ---- Lazy Element Base ---- */
      [data-lazy] {
        opacity: 0;
        transition: opacity ${CONFIG.animationDuration} ${CONFIG.animationEasing},
                    transform ${CONFIG.animationDuration} ${CONFIG.animationEasing};
      }
      [data-lazy].lazy-loaded {
        opacity: 1 !important;
        transform: none !important;
      }

      /* ---- Animation Variants ---- */
      [data-lazy="fade"] { opacity: 0; }
      [data-lazy="fade-up"] { opacity: 0; transform: translateY(50px); }
      [data-lazy="fade-down"] { opacity: 0; transform: translateY(-50px); }
      [data-lazy="fade-left"] { opacity: 0; transform: translateX(50px); }
      [data-lazy="fade-right"] { opacity: 0; transform: translateX(-50px); }
      [data-lazy="zoom-in"] { opacity: 0; transform: scale(0.85); }
      [data-lazy="zoom-out"] { opacity: 0; transform: scale(1.15); }
      [data-lazy="flip-up"] { opacity: 0; transform: perspective(600px) rotateX(15deg); }
      [data-lazy="slide-up"] { opacity: 0; transform: translateY(100px); }

      /* ---- Image / Media Placeholder ---- */
      .lazy-img-wrapper {
        background: ${CONFIG.placeholderColor};
        overflow: hidden;
        position: relative;
      }
      .lazy-img-wrapper::before {
        content: "";
        position: absolute;
        top: 0; left: -150%;
        width: 150%; height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255,255,255,0.4),
          transparent
        );
        animation: shimmer 1.5s infinite;
      }
      @keyframes shimmer {
        100% { left: 150%; }
      }

      /* ---- Lazy Skeleton Blocks ---- */
      .lazy-skeleton {
        background: linear-gradient(90deg, #eee 25%, #e0e0e0 50%, #eee 75%);
        background-size: 200% 100%;
        animation: skeleton-pulse 1.5s ease-in-out infinite;
        border-radius: 6px;
        min-height: 20px;
      }
      @keyframes skeleton-pulse {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* ---- Staggered Children ---- */
      [data-lazy-stagger] > * {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.5s ease, transform 0.5s ease;
      }
      [data-lazy-stagger].lazy-loaded > * {
        opacity: 1;
        transform: none;
      }

      /* ---- Progress Indicator ---- */
      #lazy-progress-bar {
        position: fixed;
        top: 0; left: 0;
        height: 3px;
        background: linear-gradient(90deg, #4f46e5, #06b6d4);
        z-index: 99999;
        transition: width 0.4s ease;
        border-radius: 0 2px 2px 0;
        box-shadow: 0 0 8px rgba(79,70,229,0.4);
      }
    `;
    document.head.appendChild(style);
  };

  /* ── Progress Bar ── */
  const ProgressBar = {
    bar: null,
    total: 0,
    loaded: 0,
    init(total) {
      this.total = total;
      this.loaded = 0;
      this.bar = document.createElement("div");
      this.bar.id = "lazy-progress-bar";
      this.bar.style.width = "0%";
      document.body.appendChild(this.bar);
    },
    update() {
      this.loaded++;
      const pct = Math.min((this.loaded / this.total) * 100, 100);
      if (this.bar) {
        this.bar.style.width = pct + "%";
        if (pct >= 100) {
          setTimeout(() => {
            this.bar.style.opacity = "0";
            setTimeout(() => this.bar.remove(), 400);
          }, 600);
        }
      }
    },
  };

  /* ── Utility: Load image with retry ── */
  const loadImageWithRetry = (src, attempts = CONFIG.retryAttempts) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => {
        if (attempts > 0) {
          setTimeout(() => {
            loadImageWithRetry(src, attempts - 1).then(resolve).catch(reject);
          }, CONFIG.retryDelay);
        } else {
          reject(new Error(`Failed to load: ${src}`));
        }
      };
      img.src = src;
    });
  };

  /* ── Handle: Images (img[data-src]) ── */
  const handleImage = async (el) => {
    const src = el.getAttribute("data-src");
    const srcset = el.getAttribute("data-srcset");
    const sizes = el.getAttribute("data-sizes");

    if (src) {
      try {
        await loadImageWithRetry(src);
        el.src = src;
        if (srcset) el.srcset = srcset;
        if (sizes) el.sizes = sizes;
        el.removeAttribute("data-src");
        el.removeAttribute("data-srcset");
        el.removeAttribute("data-sizes");
        el.classList.add("lazy-loaded");
      } catch (err) {
        console.warn("[LazyLoader]", err.message);
        el.alt = "Image failed to load";
      }
    }
  };

  /* ── Handle: Background Images (data-bg) ── */
  const handleBackground = async (el) => {
    const bg = el.getAttribute("data-bg");
    if (bg) {
      try {
        await loadImageWithRetry(bg);
        el.style.backgroundImage = `url('${bg}')`;
        el.removeAttribute("data-bg");
        el.classList.add("lazy-loaded");
      } catch (err) {
        console.warn("[LazyLoader] BG failed:", err.message);
      }
    }
  };

  /* ── Handle: Video (video[data-src]) ── */
  const handleVideo = (el) => {
    const src = el.getAttribute("data-src");
    const poster = el.getAttribute("data-poster");
    if (poster) el.poster = poster;

    if (src) {
      el.src = src;
      el.removeAttribute("data-src");
    }

    // Handle <source> children
    el.querySelectorAll("source[data-src]").forEach((source) => {
      source.src = source.getAttribute("data-src");
      source.removeAttribute("data-src");
    });

    el.load();
    el.classList.add("lazy-loaded");
  };

  /* ── Handle: Iframe (iframe[data-src]) ── */
  const handleIframe = (el) => {
    const src = el.getAttribute("data-src");
    if (src) {
      el.src = src;
      el.removeAttribute("data-src");
      el.classList.add("lazy-loaded");
    }
  };

  /* ── Handle: Generic Sections ([data-lazy]) ── */
  const handleSection = (el) => {
    el.classList.add("lazy-loaded");
  };

  /* ── Handle: Staggered Children ([data-lazy-stagger]) ── */
  const handleStagger = (el) => {
    const delay = parseInt(el.getAttribute("data-lazy-stagger")) || 100;
    el.classList.add("lazy-loaded");
    Array.from(el.children).forEach((child, i) => {
      child.style.transitionDelay = `${i * delay}ms`;
    });
  };

  /* ── Handle: HTML Injection ([data-lazy-html]) ── */
  const handleHTMLInjection = async (el) => {
    const url = el.getAttribute("data-lazy-html");
    if (url) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        el.innerHTML = html;
        el.removeAttribute("data-lazy-html");
        el.classList.add("lazy-loaded");

        // Re-scan injected content for nested lazy elements
        scanElement(el);
      } catch (err) {
        console.warn("[LazyLoader] HTML inject failed:", err.message);
        el.innerHTML = `<p style="color:red;">Content failed to load.</p>`;
      }
    }
  };

  /* ── Handle: Script Loading ([data-lazy-script]) ── */
  const handleScript = (el) => {
    const src = el.getAttribute("data-lazy-script");
    if (src && !document.querySelector(`script[src="${src}"]`)) {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
      el.removeAttribute("data-lazy-script");
    }
    el.classList.add("lazy-loaded");
  };

  /* ── Master Intersection Callback ── */
  const onIntersect = (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const el = entry.target;

      // Apply custom delay if specified
      const delay = parseInt(el.getAttribute("data-lazy-delay")) || 0;

      setTimeout(() => {
        const tag = el.tagName.toLowerCase();

        // Route to correct handler
        if (el.hasAttribute("data-lazy-html")) {
          handleHTMLInjection(el);
        } else if (el.hasAttribute("data-lazy-script")) {
          handleScript(el);
        } else if (el.hasAttribute("data-lazy-stagger")) {
          handleStagger(el);
        } else if (tag === "img" && el.hasAttribute("data-src")) {
          handleImage(el);
        } else if (tag === "video") {
          handleVideo(el);
        } else if (tag === "iframe" && el.hasAttribute("data-src")) {
          handleIframe(el);
        } else if (el.hasAttribute("data-bg")) {
          handleBackground(el);
        } else {
          handleSection(el);
        }

        ProgressBar.update();
      }, delay);

      observer.unobserve(el);
    });
  };

  /* ── Create Observer ── */
  const createObserver = () => {
    return new IntersectionObserver(onIntersect, {
      rootMargin: CONFIG.rootMargin,
      threshold: CONFIG.threshold,
    });
  };

  /* ── Scan & Observe Elements ── */
  let observer;

  const scanElement = (root = document) => {
    const selectors = [
      "[data-lazy]",
      "img[data-src]",
      "video[data-src]",
      "iframe[data-src]",
      "[data-bg]",
      "[data-lazy-html]",
      "[data-lazy-script]",
      "[data-lazy-stagger]",
    ];

    const elements = root.querySelectorAll(selectors.join(","));
    elements.forEach((el) => {
      if (!el.classList.contains("lazy-loaded")) {
        observer.observe(el);
      }
    });
    return elements.length;
  };

  /* ── Mutation Observer for Dynamic Content ── */
  const watchDOM = () => {
    const mutationObs = new MutationObserver((mutations) => {
      let hasNew = false;
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (
              node.hasAttribute("data-lazy") ||
              node.hasAttribute("data-src") ||
              node.hasAttribute("data-bg") ||
              node.hasAttribute("data-lazy-html")
            ) {
              observer.observe(node);
              hasNew = true;
            }
            // Also scan children of added node
            const count = scanElement(node);
            if (count > 0) hasNew = true;
          }
        });
      });
    });

    mutationObs.observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  /* ── Initialization ── */
  const init = () => {
    // Check for Intersection Observer support
    if (!("IntersectionObserver" in window)) {
      console.warn("[LazyLoader] IntersectionObserver not supported. Loading all content immediately.");
      document.querySelectorAll("[data-src]").forEach((el) => {
        el.src = el.getAttribute("data-src");
      });
      document.querySelectorAll("[data-lazy]").forEach((el) => {
        el.classList.add("lazy-loaded");
      });
      return;
    }

    injectStyles();
    observer = createObserver();
    const totalElements = scanElement(document);
    if (totalElements > 0) {
      ProgressBar.init(totalElements);
    }
    watchDOM();

    console.log(
      `%c[LazyLoader] ✅ Initialized — Tracking ${totalElements} elements`,
      "color: #4f46e5; font-weight: bold;"
    );
  };

  /* ── Public API ── */
  window.LazyLoader = {
    refresh: () => scanElement(document),
    config: CONFIG,
  };

  /* ── Start on DOM Ready ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
