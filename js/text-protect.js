/**
 * =====================================================
 *  CONTENT SHIELD v3.0
 *  Ultimate Text & Source Protection System
 *  Drop-in script — works on any webpage
 * =====================================================
 *  PROTECTIONS:
 *  ✔ Right-Click Disabled
 *  ✔ Text Selection Disabled
 *  ✔ Copy / Cut / Paste Disabled
 *  ✔ Developer Tools Blocked (F12, Ctrl+Shift+I/J/C/U)
 *  ✔ View-Source Blocked (Ctrl+U)
 *  ✔ Save-As Blocked (Ctrl+S)
 *  ✔ Print Blocked (Ctrl+P / window.print)
 *  ✔ Screenshot Key Blocked (PrintScreen)
 *  ✔ Drag & Drop Disabled
 *  ✔ DevTools Open Detection (size-based + debugger)
 *  ✔ Source Extensions Countermeasures
 *  ✔ Overlay Warning Messages with Animations
 * =====================================================
 */

(function () {
  "use strict";

  /* ══════════════════════════════════════════════
     §1. INJECT PROTECTION STYLES
  ══════════════════════════════════════════════ */
  const injectStyles = () => {
    const css = document.createElement("style");
    css.id = "content-shield-styles";
    css.textContent = `

      /* ---- Disable Text Selection Globally ---- */
      .cs-protected,
      .cs-protected * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }

      /* ---- Hide Content When DevTools Detected ---- */
      body.cs-devtools-open .cs-protected {
        filter: blur(15px) !important;
        pointer-events: none !important;
        transition: filter 0.3s ease;
      }

      /* ---- Warning Toast ---- */
      #cs-toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }

      .cs-toast {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: #fff;
        padding: 16px 24px;
        border-radius: 12px;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        max-width: 380px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3),
                    0 0 0 1px rgba(255,255,255,0.05),
                    inset 0 1px 0 rgba(255,255,255,0.1);
        display: flex;
        align-items: flex-start;
        gap: 12px;
        transform: translateX(120%);
        animation: cs-slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        pointer-events: auto;
        backdrop-filter: blur(20px);
        border-left: 3px solid #e74c3c;
      }

      .cs-toast.cs-toast-exit {
        animation: cs-slideOut 0.4s cubic-bezier(0.55, 0, 1, 0.45) forwards;
      }

      .cs-toast-icon {
        font-size: 22px;
        flex-shrink: 0;
        margin-top: 1px;
        animation: cs-pulse 2s infinite;
      }

      .cs-toast-body {
        flex: 1;
      }

      .cs-toast-title {
        font-weight: 700;
        font-size: 15px;
        margin-bottom: 4px;
        color: #e74c3c;
        letter-spacing: 0.3px;
      }

      .cs-toast-msg {
        opacity: 0.85;
        font-size: 13px;
        line-height: 1.6;
      }

      .cs-toast-close {
        background: rgba(255,255,255,0.1);
        border: none;
        color: #fff;
        cursor: pointer;
        font-size: 16px;
        padding: 2px 8px;
        border-radius: 6px;
        flex-shrink: 0;
        transition: background 0.2s;
      }
      .cs-toast-close:hover {
        background: rgba(255,255,255,0.2);
      }

      @keyframes cs-slideIn {
        from { transform: translateX(120%); opacity: 0; }
        to   { transform: translateX(0); opacity: 1; }
      }
      @keyframes cs-slideOut {
        from { transform: translateX(0); opacity: 1; }
        to   { transform: translateX(120%); opacity: 0; }
      }
      @keyframes cs-pulse {
        0%, 100% { transform: scale(1); }
        50%      { transform: scale(1.15); }
      }

      /* ---- Full-Screen Warning Overlay ---- */
      #cs-overlay-warning {
        position: fixed;
        inset: 0;
        background: rgba(10, 10, 30, 0.97);
        z-index: 2147483646;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        opacity: 0;
        visibility: hidden;
        transition: all 0.4s ease;
        backdrop-filter: blur(30px);
      }
      #cs-overlay-warning.active {
        opacity: 1;
        visibility: visible;
      }
      #cs-overlay-warning .cs-ow-icon {
        font-size: 72px;
        margin-bottom: 20px;
        animation: cs-shake 0.6s ease-in-out infinite alternate;
      }
      #cs-overlay-warning .cs-ow-title {
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 28px;
        font-weight: 800;
        color: #e74c3c;
        margin-bottom: 12px;
        letter-spacing: 1px;
      }
      #cs-overlay-warning .cs-ow-text {
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 16px;
        color: rgba(255,255,255,0.7);
        text-align: center;
        max-width: 500px;
        line-height: 1.8;
      }
      @keyframes cs-shake {
        0%   { transform: rotate(-5deg) scale(1); }
        100% { transform: rotate(5deg) scale(1.05); }
      }

      /* ---- Print Blocking ---- */
      @media print {
        html, body {
          display: none !important;
          visibility: hidden !important;
        }
        body::after {
          content: "⚠ Printing is disabled for this content.";
          display: block !important;
          visibility: visible !important;
          font-size: 30px;
          text-align: center;
          padding: 100px;
          color: #e74c3c;
        }
      }
    `;
    document.head.appendChild(css);
  };

  /* ══════════════════════════════════════════════
     §2. CREATE UI ELEMENTS
  ══════════════════════════════════════════════ */

  // Toast Container
  const createToastContainer = () => {
    const container = document.createElement("div");
    container.id = "cs-toast-container";
    document.body.appendChild(container);
    return container;
  };

  // Full-Screen Overlay Warning
  const createOverlay = () => {
    const overlay = document.createElement("div");
    overlay.id = "cs-overlay-warning";
    overlay.innerHTML = `
      <div class="cs-ow-icon">🛡️</div>
      <div class="cs-ow-title">CONTENT PROTECTED</div>
      <div class="cs-ow-text">
        Developer tools have been detected.<br>
        This content is protected intellectual property.<br>
        Please close developer tools to continue viewing.
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  };

  /* ══════════════════════════════════════════════
     §3. TOAST NOTIFICATION SYSTEM
  ══════════════════════════════════════════════ */
  let toastContainer;
  const activeToasts = new Map();
  const TOAST_COOLDOWN = 2500; // Prevent toast spam

  const MESSAGES = {
    rightClick: {
      icon: "🚫",
      title: "Right-Click Disabled",
      msg: "Right-click is disabled to protect this original content. Thank you for respecting the author's work.",
    },
    copy: {
      icon: "📋",
      title: "Copy Blocked",
      msg: "Copying text is not permitted. This content was handcrafted over 12 days and is protected.",
    },
    devtools: {
      icon: "🔧",
      title: "Developer Tools Detected",
      msg: "DevTools access is restricted on this page. Source code inspection is disabled to protect original content.",
    },
    print: {
      icon: "🖨️",
      title: "Printing Disabled",
      msg: "Printing this page is not allowed. This material is protected intellectual property.",
    },
    screenshot: {
      icon: "📸",
      title: "Screenshot Blocked",
      msg: "Screenshots are not permitted on this page. Please respect the content creator's rights.",
    },
    viewSource: {
      icon: "👁️",
      title: "View Source Blocked",
      msg: "Viewing page source is restricted. This content is protected from extraction.",
    },
    dragDrop: {
      icon: "🖱️",
      title: "Drag Disabled",
      msg: "Dragging content is not allowed on this protected page.",
    },
    saveAs: {
      icon: "💾",
      title: "Save Blocked",
      msg: "Saving this page is not permitted. Content is protected intellectual property.",
    },
    selection: {
      icon: "✋",
      title: "Selection Disabled",
      msg: "Text selection is disabled to protect this carefully authored content.",
    },
  };

  const showToast = (type) => {
    // Cooldown: prevent duplicate toasts
    if (activeToasts.has(type)) return;
    activeToasts.set(type, true);
    setTimeout(() => activeToasts.delete(type), TOAST_COOLDOWN);

    const data = MESSAGES[type];
    if (!data || !toastContainer) return;

    const toast = document.createElement("div");
    toast.className = "cs-toast";
    toast.innerHTML = `
      <span class="cs-toast-icon">${data.icon}</span>
      <div class="cs-toast-body">
        <div class="cs-toast-title">${data.title}</div>
        <div class="cs-toast-msg">${data.msg}</div>
      </div>
      <button class="cs-toast-close" aria-label="Close">&times;</button>
    `;

    // Close button
    toast.querySelector(".cs-toast-close").addEventListener("click", () => {
      dismissToast(toast);
    });

    toastContainer.appendChild(toast);

    // Auto-dismiss after 5 seconds
    setTimeout(() => dismissToast(toast), 5000);
  };

  const dismissToast = (toast) => {
    if (!toast || toast.classList.contains("cs-toast-exit")) return;
    toast.classList.add("cs-toast-exit");
    setTimeout(() => toast.remove(), 400);
  };

  /* ══════════════════════════════════════════════
     §4. PROTECTION HANDLERS
  ══════════════════════════════════════════════ */

  // ── 4a. Disable Right-Click ──
  const blockRightClick = () => {
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showToast("rightClick");
      return false;
    }, true);
  };

  // ── 4b. Disable Text Selection ──
  const blockSelection = () => {
    document.body.classList.add("cs-protected");

    document.addEventListener("selectstart", (e) => {
      e.preventDefault();
      showToast("selection");
      return false;
    }, true);

    document.addEventListener("mousedown", (e) => {
      // Block shift+click selection
      if (e.shiftKey) {
        e.preventDefault();
        return false;
      }
    }, true);
  };

  // ── 4c. Disable Copy / Cut / Paste ──
  const blockClipboard = () => {
    ["copy", "cut", "paste"].forEach((evt) => {
      document.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        showToast("copy");
        return false;
      }, true);
    });
  };

  // ── 4d. Disable Keyboard Shortcuts ──
  const blockKeyboardShortcuts = () => {
    document.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // ── F12: DevTools ──
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        showToast("devtools");
        return false;
      }

      // ── Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C: DevTools ──
      if (ctrl && shift && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        showToast("devtools");
        return false;
      }

      // ── Ctrl+U: View Source ──
      if (ctrl && key === "u") {
        e.preventDefault();
        e.stopPropagation();
        showToast("viewSource");
        return false;
      }

      // ── Ctrl+S: Save As ──
      if (ctrl && key === "s") {
        e.preventDefault();
        e.stopPropagation();
        showToast("saveAs");
        return false;
      }

      // ── Ctrl+P: Print ──
      if (ctrl && key === "p") {
        e.preventDefault();
        e.stopPropagation();
        showToast("print");
        return false;
      }

      // ── Ctrl+C / Ctrl+X / Ctrl+A: Copy / Cut / Select All ──
      if (ctrl && ["c", "x", "a"].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        showToast("copy");
        return false;
      }

      // ── PrintScreen: Screenshot ──
      if (e.key === "PrintScreen") {
        e.preventDefault();
        e.stopPropagation();

        // Attempt to clear clipboard
        try {
          navigator.clipboard.writeText("").catch(() => {});
        } catch (_) {}

        showToast("screenshot");

        // Flash screen to disrupt screenshot
        flashScreen();
        return false;
      }

      // ── Ctrl+Shift+S: Screenshot (some browsers) ──
      if (ctrl && shift && key === "s") {
        e.preventDefault();
        e.stopPropagation();
        showToast("screenshot");
        flashScreen();
        return false;
      }

      // ── F7 Caret browsing (can be used to select text) ──
      if (e.key === "F7") {
        e.preventDefault();
        return false;
      }

    }, true);

    // Also capture keyup for PrintScreen
    document.addEventListener("keyup", (e) => {
      if (e.key === "PrintScreen") {
        try {
          navigator.clipboard.writeText("").catch(() => {});
        } catch (_) {}
        flashScreen();
        showToast("screenshot");
      }
    }, true);
  };

  // ── 4e. Flash Screen (Screenshot Disruption) ──
  const flashScreen = () => {
    const flash = document.createElement("div");
    Object.assign(flash.style, {
      position: "fixed",
      inset: "0",
      background: "#fff",
      zIndex: "2147483647",
      opacity: "1",
      transition: "opacity 0.3s ease",
      pointerEvents: "none",
    });
    document.body.appendChild(flash);
    requestAnimationFrame(() => {
      flash.style.opacity = "0";
      setTimeout(() => flash.remove(), 350);
    });
  };

  // ── 4f. Disable Drag & Drop ──
  const blockDragDrop = () => {
    ["dragstart", "drag", "drop"].forEach((evt) => {
      document.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (evt === "dragstart") showToast("dragDrop");
        return false;
      }, true);
    });

    // Disable image dragging
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll("img").forEach((img) => {
        img.setAttribute("draggable", "false");
      });
    });
  };

  // ── 4g. Block Print ──
  const blockPrint = () => {
    // Override window.print
    window.print = function () {
      showToast("print");
      return false;
    };

    // Listen for before/after print events
    window.addEventListener("beforeprint", (e) => {
      e.preventDefault();
      showToast("print");
      document.body.style.display = "none";
    });

    window.addEventListener("afterprint", () => {
      document.body.style.display = "";
    });

    // Also handle media query change for print
    if (window.matchMedia) {
      window.matchMedia("print").addEventListener("change", (mq) => {
        if (mq.matches) {
          document.body.style.display = "none";
          showToast("print");
        } else {
          document.body.style.display = "";
        }
      });
    }
  };

  /* ══════════════════════════════════════════════
     §5. DEVTOOLS DETECTION ENGINE
  ══════════════════════════════════════════════ */
  let devtoolsOpen = false;
  let overlay;

  const setDevToolsState = (isOpen) => {
    if (isOpen === devtoolsOpen) return;
    devtoolsOpen = isOpen;

    if (isOpen) {
      document.body.classList.add("cs-devtools-open");
      if (overlay) overlay.classList.add("active");
      showToast("devtools");
    } else {
      document.body.classList.remove("cs-devtools-open");
      if (overlay) overlay.classList.remove("active");
    }
  };

  // ── Method 1: Window Size Differential ──
  const detectBySize = () => {
    const threshold = 160;
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;

    if (widthDiff > threshold || heightDiff > threshold) {
      setDevToolsState(true);
    } else {
      setDevToolsState(false);
    }
  };

  // ── Method 2: Debugger Timing ──
  const detectByDebugger = () => {
    const start = performance.now();
    // debugger statement slows execution when DevTools is open
    (function () {}).constructor("debugger")();
    const duration = performance.now() - start;
    if (duration > 100) {
      setDevToolsState(true);
    }
  };

  // ── Method 3: Console.log Override Detection ──
  const detectByConsole = () => {
    const element = new Image();
    let consoleOpen = false;

    Object.defineProperty(element, "id", {
      get: function () {
        consoleOpen = true;
        setDevToolsState(true);
      },
    });

    // Periodically check
    setInterval(() => {
      consoleOpen = false;
      console.log("%c", element);
      if (!consoleOpen) {
        // Only reset if other methods agree
        detectBySize();
      }
    }, 2000);
  };

  // ── Method 4: toString Detection ──
  const detectByToString = () => {
    const checkObject = /./;
    let devOpen = false;
    checkObject.toString = function () {
      devOpen = true;
      setDevToolsState(true);
      return "";
    };

    setInterval(() => {
      devOpen = false;
      console.log(checkObject);
    }, 2000);
  };

  const startDevToolsDetection = () => {
    // Run size detection periodically
    setInterval(detectBySize, 1000);

    // Use console-based detection
    detectByConsole();

    // Use toString detection
    detectByToString();

    // Initial check
    detectBySize();
  };

  /* ══════════════════════════════════════════════
     §6. EXTENSION & SOURCE COUNTERMEASURES
  ══════════════════════════════════════════════ */
  const extensionCountermeasures = () => {

    // ── Block "view-source:" protocol ──
    if (window.location.protocol === "view-source:") {
      document.documentElement.innerHTML = `
        <body style="display:flex;align-items:center;justify-content:center;
                     height:100vh;background:#1a1a2e;color:#e74c3c;
                     font-family:system-ui;font-size:24px;">
          🛡️ Source code viewing is disabled for this protected content.
        </body>`;
    }

    // ── Disable iframes embedding (clickjacking protection) ──
    if (window.self !== window.top) {
      try {
        window.top.location = window.self.location;
      } catch (_) {
        document.body.innerHTML = `
          <div style="padding:40px;text-align:center;font-family:system-ui;color:#e74c3c;">
            🛡️ This content cannot be embedded in frames.
          </div>`;
      }
    }

    // ── Clear sensitive content from memory on page hide ──
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        // Clear any selections
        window.getSelection()?.removeAllRanges();
      }
    });

    // ── Block Fetch/XHR on the same page (self-scraping) ──
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const url = args[0]?.toString() || "";
      if (url === window.location.href || url === "") {
        console.warn("[ContentShield] Self-fetch blocked.");
        return Promise.reject(new Error("Blocked by ContentShield"));
      }
      return originalFetch.apply(this, args);
    };

    // ── Disable document.body.innerText / innerHTML extraction ──
    const warnOnAccess = (obj, prop) => {
      const original = Object.getOwnPropertyDescriptor(
        obj.prototype || Object.getPrototypeOf(obj),
        prop
      );
      if (original && original.get) {
        Object.defineProperty(obj.prototype || obj, prop, {
          get() {
            if (devtoolsOpen) {
              console.warn(`[ContentShield] Access to ${prop} denied.`);
              return "[Protected Content]";
            }
            return original.get.call(this);
          },
          configurable: true,
        });
      }
    };

    try {
      warnOnAccess(Element, "innerHTML");
      warnOnAccess(Element, "innerText");
      warnOnAccess(Element, "textContent");
    } catch (_) {}
  };

  /* ══════════════════════════════════════════════
     §7. INITIALIZE EVERYTHING
  ══════════════════════════════════════════════ */
  const init = () => {
    injectStyles();
    toastContainer = createToastContainer();
    overlay = createOverlay();

    // Activate all protections
    blockRightClick();
    blockSelection();
    blockClipboard();
    blockKeyboardShortcuts();
    blockDragDrop();
    blockPrint();
    startDevToolsDetection();
    extensionCountermeasures();

    // Console warning message
    console.log(
      "%c⚠️ STOP!",
      "color: #e74c3c; font-size: 52px; font-weight: bold; text-shadow: 2px 2px #000;"
    );
    console.log(
      "%cThis page contains protected intellectual property.\nUnauthorized access, copying, or extraction of content is prohibited.\nAll activity is monitored.",
      "color: #fff; background: #1a1a2e; font-size: 16px; padding: 12px 20px; border-radius: 8px; border-left: 4px solid #e74c3c;"
    );
    console.log(
      "%c🛡️ ContentShield v3.0 Active — All protections enabled.",
      "color: #4f46e5; font-weight: bold; font-size: 12px;"
    );
  };

  /* ── Start ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
