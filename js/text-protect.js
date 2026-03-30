

(function () {
  "use strict";

  /* ┌─────────────────────────────────────────┐
     │      §1. INJECT PROTECTION CSS           │
     └─────────────────────────────────────────┘ */
  const injectStyles = () => {
    const css = document.createElement("style");
    css.id = "cs-shield-styles";
    css.textContent = `

      /* ── Disable All Text Selection ── */
      body, body * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }

      /* ── Disable Drag on All Elements ── */
      body * {
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
      }

      /* ── Disable Image Pointer Events for Saving ── */
      img {
        pointer-events: none;
      }

      /* ── Blur Content When DevTools Detected ── */
      body.cs-dt-open * {
        visibility: hidden !important;
      }
      body.cs-dt-open::after {
        content: "";
        position: fixed;
        inset: 0;
        background: #fff;
        z-index: 2147483647;
        visibility: visible !important;
      }

      /* ── Kill Print Entirely ── */
      @media print {
        html, body, body * {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        html::after, body::after {
          display: none !important;
        }
        @page {
          size: 0 0;
          margin: 0;
        }
      }
    `;
    document.head.appendChild(css);
  };

  /* ┌─────────────────────────────────────────┐
     │    §2. BLOCK RIGHT-CLICK (SILENT)        │
     └─────────────────────────────────────────┘ */
  const blockRightClick = () => {
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }, true);
  };

  /* ┌─────────────────────────────────────────┐
     │    §3. BLOCK TEXT SELECTION (SILENT)      │
     └─────────────────────────────────────────┘ */
  const blockSelection = () => {
    document.addEventListener("selectstart", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }, true);

    // Block shift+click range selection
    document.addEventListener("mousedown", (e) => {
      if (e.shiftKey) {
        e.preventDefault();
        return false;
      }
    }, true);

    // Continuously clear any selection that sneaks through
    setInterval(() => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.toString().length > 0) {
        sel.removeAllRanges();
      }
    }, 300);
  };

  /* ┌─────────────────────────────────────────┐
     │    §4. BLOCK CLIPBOARD (SILENT)          │
     └─────────────────────────────────────────┘ */
  const blockClipboard = () => {
    ["copy", "cut", "paste"].forEach((evt) => {
      document.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Overwrite clipboard with empty string
        if (e.clipboardData) {
          e.clipboardData.setData("text/plain", "");
          e.clipboardData.setData("text/html", "");
        }
        return false;
      }, true);
    });

    // Also override clipboard API
    if (navigator.clipboard) {
      const origWrite = navigator.clipboard.writeText;
      const origRead = navigator.clipboard.readText;

      navigator.clipboard.writeText = function () {
        return Promise.resolve();
      };
      navigator.clipboard.readText = function () {
        return Promise.resolve("");
      };
      navigator.clipboard.write = function () {
        return Promise.resolve();
      };
      navigator.clipboard.read = function () {
        return Promise.resolve([]);
      };
    }
  };

  /* ┌─────────────────────────────────────────┐
     │    §5. BLOCK KEYBOARD SHORTCUTS          │
     └─────────────────────────────────────────┘ */
  const blockKeyboard = () => {
    document.addEventListener("keydown", (e) => {
      const key = e.key ? e.key.toLowerCase() : "";
      const code = e.code || "";
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // ═══ F12: DevTools ═══
      if (code === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+Shift+I : Inspector ═══
      if (ctrl && shift && (key === "i" || e.keyCode === 73)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+Shift+J : Console ═══
      if (ctrl && shift && (key === "j" || e.keyCode === 74)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+Shift+C : Element Picker ═══
      if (ctrl && shift && (key === "c" || e.keyCode === 67)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+Shift+K : Console (Firefox) ═══
      if (ctrl && shift && (key === "k" || e.keyCode === 75)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+Shift+M : Responsive Mode ═══
      if (ctrl && shift && (key === "m" || e.keyCode === 77)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+Shift+S : Screenshot (some browsers) ═══
      if (ctrl && shift && (key === "s" || e.keyCode === 83)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        flashScreen();
        return false;
      }

      // ═══ Ctrl+U : View Source ═══
      if (ctrl && (key === "u" || e.keyCode === 85) && !shift) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+S : Save As ═══
      if (ctrl && (key === "s" || e.keyCode === 83) && !shift) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+P : Print ═══
      if (ctrl && (key === "p" || e.keyCode === 80)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+C : Copy ═══
      if (ctrl && (key === "c" || e.keyCode === 67) && !shift) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+X : Cut ═══
      if (ctrl && (key === "x" || e.keyCode === 88)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+A : Select All ═══
      if (ctrl && (key === "a" || e.keyCode === 65)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+V : Paste ═══
      if (ctrl && (key === "v" || e.keyCode === 86)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+Shift+E : Network Tab (Firefox) ═══
      if (ctrl && shift && (key === "e" || e.keyCode === 69)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+Shift+Q : Browser Quit (Firefox old) ═══
      if (ctrl && shift && (key === "q" || e.keyCode === 81)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ F7 : Caret Browsing ═══
      if (code === "F7" || e.keyCode === 118) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ F5 / Ctrl+F5 : Allow refresh (don't block) ═══

      // ═══ PrintScreen ═══
      if (code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopImmediatePropagation();
        nukeClipboard();
        flashScreen();
        return false;
      }

      // ═══ Alt+PrintScreen ═══
      if (alt && (code === "PrintScreen" || e.keyCode === 44)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        nukeClipboard();
        flashScreen();
        return false;
      }

      // ═══ Win+Shift+S : Windows Snip Tool ═══
      if (e.metaKey && shift && (key === "s" || e.keyCode === 83)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        flashScreen();
        return false;
      }

      // ═══ Ctrl+J : Downloads (some browsers) ═══
      if (ctrl && (key === "j" || e.keyCode === 74) && !shift) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+G / Ctrl+F : Find ═══
      if (ctrl && ((key === "g" || e.keyCode === 71) || (key === "f" || e.keyCode === 70))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // ═══ Ctrl+H : History ═══
      if (ctrl && (key === "h" || e.keyCode === 72)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

    }, true);

    // ═══ KeyUp: Catch PrintScreen release ═══
    document.addEventListener("keyup", (e) => {
      if (e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopImmediatePropagation();
        nukeClipboard();
        flashScreen();
      }
    }, true);
  };

  /* ┌─────────────────────────────────────────┐
     │    §6. SCREENSHOT COUNTERMEASURES        │
     └─────────────────────────────────────────┘ */

  // Nuke clipboard silently
  const nukeClipboard = () => {
    try {
      navigator.clipboard.writeText("").catch(() => {});
    } catch (_) {}

    // Fallback: textarea method
    try {
      const ta = document.createElement("textarea");
      ta.value = " ";
      ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    } catch (_) {}
  };

  // Flash white screen to corrupt any in-progress screenshot
  const flashScreen = () => {
    const flash = document.createElement("div");
    flash.style.cssText = `
      position:fixed; inset:0; z-index:2147483647;
      background:#fff; opacity:1; pointer-events:none;
      transition: opacity 0.25s ease;
    `;
    document.body.appendChild(flash);
    requestAnimationFrame(() => {
      flash.style.opacity = "0";
      setTimeout(() => flash.remove(), 300);
    });
  };

  // Visibility change: flash on tab switch (disrupts Alt+Tab screenshot)
  const blockVisibilityScreenshot = () => {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        // Clear any selection
        window.getSelection()?.removeAllRanges();
        nukeClipboard();
      }
    });
  };

  /* ┌─────────────────────────────────────────┐
     │    §7. BLOCK DRAG & DROP (SILENT)        │
     └─────────────────────────────────────────┘ */
  const blockDragDrop = () => {
    ["dragstart", "drag", "dragend", "dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
      document.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }, true);
    });

    // Mark all images as non-draggable
    const disableImgDrag = () => {
      document.querySelectorAll("img").forEach((img) => {
        img.setAttribute("draggable", "false");
        img.addEventListener("mousedown", (e) => e.preventDefault(), true);
      });
    };

    disableImgDrag();

    // Watch for new images
    new MutationObserver(() => disableImgDrag())
      .observe(document.body, { childList: true, subtree: true });
  };

  /* ┌─────────────────────────────────────────┐
     │    §8. BLOCK PRINT (SILENT)              │
     └─────────────────────────────────────────┘ */
  const blockPrint = () => {
    // Override window.print
    window.print = function () { return false; };

    // Block beforeprint
    window.addEventListener("beforeprint", (e) => {
      e.preventDefault();
      document.body.style.display = "none";
    });

    window.addEventListener("afterprint", () => {
      document.body.style.display = "";
    });

    // Media query listener
    if (window.matchMedia) {
      window.matchMedia("print").addEventListener("change", (mq) => {
        document.body.style.display = mq.matches ? "none" : "";
      });
    }
  };

  /* ┌─────────────────────────────────────────┐
     │    §9. DEVTOOLS DETECTION (SILENT)       │
     └─────────────────────────────────────────┘ */
  let devtoolsOpen = false;

  const setDevToolsState = (isOpen) => {
    if (isOpen === devtoolsOpen) return;
    devtoolsOpen = isOpen;
    if (isOpen) {
      document.body.classList.add("cs-dt-open");
    } else {
      document.body.classList.remove("cs-dt-open");
    }
  };

  // ── Method 1: Window Size Difference ──
  const detectBySize = () => {
    const threshold = 160;
    const wDiff = window.outerWidth - window.innerWidth;
    const hDiff = window.outerHeight - window.innerHeight;
    setDevToolsState(wDiff > threshold || hDiff > threshold);
  };

  // ── Method 2: Console Object Getter ──
  const detectByConsole = () => {
    const probe = new Image();
    Object.defineProperty(probe, "id", {
      get: () => { setDevToolsState(true); }
    });

    setInterval(() => {
      console.log("%c", probe);
      console.clear();
    }, 2000);
  };

  // ── Method 3: Regex toString ──
  const detectByToString = () => {
    const check = /./;
    check.toString = function () {
      setDevToolsState(true);
      return "";
    };

    setInterval(() => {
      console.log(check);
      console.clear();
    }, 2000);
  };

  // ── Method 4: Debugger Timing ──
  const detectByDebugger = () => {
    setInterval(() => {
      const t1 = performance.now();
      (function () {}).constructor("debugger")();
      if (performance.now() - t1 > 100) {
        setDevToolsState(true);
      }
    }, 3000);
  };

  const startDevToolsDetection = () => {
    setInterval(detectBySize, 800);
    detectByConsole();
    detectByToString();
    detectByDebugger();
    detectBySize();
  };

  /* ┌─────────────────────────────────────────┐
     │    §10. SOURCE & EXTENSION PROTECTION    │
     └─────────────────────────────────────────┘ */
  const sourceProtection = () => {

    // ── Block view-source protocol ──
    if (window.location.protocol === "view-source:") {
      document.documentElement.innerHTML = "";
    }

    // ── Block framing (anti-clickjacking) ──
    if (window.self !== window.top) {
      try {
        window.top.location = window.self.location;
      } catch (_) {
        document.body.innerHTML = "";
      }
    }

    // ── Block self-fetch scraping ──
    const origFetch = window.fetch;
    window.fetch = function (...args) {
      const url = (args[0] || "").toString();
      if (url === "" || url === window.location.href || url === window.location.pathname) {
        return Promise.reject(new Error("Blocked"));
      }
      return origFetch.apply(this, args);
    };

    // ── Block XMLHttpRequest self-scraping ──
    const OrigXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function () {
      const xhr = new OrigXHR();
      const origOpen = xhr.open;
      xhr.open = function (method, url, ...rest) {
        const resolved = new URL(url, window.location.href).href;
        if (resolved === window.location.href) {
          return; // Silently block
        }
        return origOpen.call(this, method, url, ...rest);
      };
      return xhr;
    };

    // ── Guard DOM text extraction when DevTools open ──
    const guardProperty = (proto, prop) => {
      const desc = Object.getOwnPropertyDescriptor(proto, prop);
      if (desc && desc.get) {
        Object.defineProperty(proto, prop, {
          get() {
            if (devtoolsOpen) return "";
            return desc.get.call(this);
          },
          configurable: true,
        });
      }
    };

    try {
      guardProperty(HTMLElement.prototype, "innerText");
      guardProperty(HTMLElement.prototype, "innerHTML");
      guardProperty(Node.prototype, "textContent");
    } catch (_) {}
  };

  /* ┌─────────────────────────────────────────┐
     │    §11. DISABLE READER MODE              │
     └─────────────────────────────────────────┘ */
  const blockReaderMode = () => {
    // Reader mode typically looks for <article> structure
    // Injecting invisible counter-elements confuses parsers
    const decoy = document.createElement("div");
    decoy.setAttribute("aria-hidden", "true");
    decoy.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;";
    decoy.innerHTML = Array(20).fill(0).map((_, i) =>
      `<article><p>${String.fromCharCode(8203).repeat(50)}</p></article>`
    ).join("");
    document.body.appendChild(decoy);
  };

  /* ┌─────────────────────────────────────────┐
     │    §12. DISABLE DOCUMENT INTERACTIONS    │
     └─────────────────────────────────────────┘ */
  const blockMiscInteractions = () => {

    // ── Disable document.designMode ──
    Object.defineProperty(document, "designMode", {
      get: () => "off",
      set: () => {},
    });

    // ── Disable contentEditable override ──
    Object.defineProperty(document.body, "contentEditable", {
      get: () => "false",
      set: () => {},
    });

    // ── Block execCommand('copy') ──
    const origExec = document.execCommand;
    document.execCommand = function (cmd, ...args) {
      const blocked = ["copy", "cut", "selectAll"];
      if (blocked.includes(cmd)) return false;
      return origExec.call(this, cmd, ...args);
    };

    // ── Disable getSelection().toString() override ──
    const origGetSel = window.getSelection;
    window.getSelection = function () {
      const sel = origGetSel.call(this);
      if (sel) {
        try {
          const origToStr = sel.toString;
          sel.toString = function () { return ""; };
        } catch (_) {}
      }
      return sel;
    };

    // ── Disable right-click "Inspect" on touch devices ──
    document.addEventListener("touchstart", (e) => {
      if (e.touches.length > 1) {
        e.preventDefault(); // Block multi-touch (pinch can open menus)
      }
    }, { passive: false, capture: true });

    let touchTimer;
    document.addEventListener("touchstart", () => {
      touchTimer = setTimeout(() => {
        // Long-press triggers context menu — already blocked
      }, 500);
    }, true);

    document.addEventListener("touchend", () => {
      clearTimeout(touchTimer);
    }, true);

    document.addEventListener("touchmove", () => {
      clearTimeout(touchTimer);
    }, true);
  };

  /* ┌─────────────────────────────────────────┐
     │    §13. CONSOLE WARFARE                  │
     └─────────────────────────────────────────┘ */
  const consoleLockdown = () => {
    // Periodically clear console
    setInterval(() => {
      try { console.clear(); } catch (_) {}
    }, 1500);

    // Override console methods to suppress output
    const noop = () => {};
    const methods = [
      "log", "debug", "info", "warn", "error",
      "table", "trace", "dir", "dirxml",
      "group", "groupCollapsed", "groupEnd",
      "profile", "profileEnd", "time", "timeEnd",
      "timeStamp", "count", "assert"
    ];

    // Delay this so our own init logs still work
    setTimeout(() => {
      methods.forEach((m) => {
        try { console[m] = noop; } catch (_) {}
      });
    }, 3000);
  };

  /* ┌─────────────────────────────────────────┐
     │    §14. MUTATION GUARD                   │
     └─────────────────────────────────────────┘
     Watches for injected scripts/iframes that
     might try to extract content
  */
  const mutationGuard = () => {
    new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;

          // Block injected scripts from unknown sources
          if (node.tagName === "SCRIPT") {
            const src = node.getAttribute("src") || "";
            // Allow same-origin scripts only
            if (src && !src.startsWith("/") && !src.startsWith(window.location.origin)) {
              node.remove();
            }
          }

          // Block injected iframes
          if (node.tagName === "IFRAME") {
            const src = node.getAttribute("src") || "";
            if (!src.startsWith(window.location.origin) && !src.startsWith("/")) {
              node.remove();
            }
          }
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  };

  /* ┌─────────────────────────────────────────┐
     │       🚀 INITIALIZATION                  │
     └─────────────────────────────────────────┘ */
  const init = () => {
    injectStyles();

    // ── Activate Every Protection Layer ──
    blockRightClick();
    blockSelection();
    blockClipboard();
    blockKeyboard();
    blockDragDrop();
    blockPrint();
    blockVisibilityScreenshot();
    startDevToolsDetection();
    sourceProtection();
    blockReaderMode();
    blockMiscInteractions();
    consoleLockdown();
    mutationGuard();
  };

  /* ── Start on DOM Ready ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
