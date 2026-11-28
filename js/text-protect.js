/* =======================================================================
   CS-SHIELD — Best-effort content protection
   -----------------------------------------------------------------------
   Blocks: right-click, text selection, copy/cut/paste, drag/drop,
           printing, and common keyboard shortcuts (Ctrl+C, Ctrl+U, F12…).
   Cannot block: browser menu actions, OS screenshots, extensions,
                 DevTools already open, or a determined user.
   ======================================================================= */
(function () {
  "use strict";

  /* Never install twice */
  if (window.__csShield) return;
  window.__csShield = true;

  /* ------------------------------------------------------------------
     0 · CONFIG
     ------------------------------------------------------------------ */
  const CFG = {
    protectFormFields : true,   // keep inputs / textareas usable
    silenceConsole    : true,
    devToolsOverlay   : true,   // show a blank overlay when DevTools open
    devToolsStrikes   : 2       // consecutive detections before acting
  };

  /* ------------------------------------------------------------------
     1 · HELPERS
     ------------------------------------------------------------------ */
  const run = (fn) => { try { fn(); } catch (_) {} };

  const kill = (e) => {
    if (!e) return false;
    try { e.preventDefault(); } catch (_) {}
    try { e.stopPropagation(); } catch (_) {}
    try { e.stopImmediatePropagation(); } catch (_) {}
    return false;
  };

  const bind = (type, handler, target, opts) => {
    const t = target || document;
    try { t.addEventListener(type, handler, opts || true); }
    catch (_) {}
  };

  const isField = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const t = el.tagName;
    return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" ||
           el.isContentEditable === true;
  };

  const body = () => document.body || document.documentElement;

  /* Native refs captured before patching anything */
  const nativeLog   = (console && console.log)   ? console.log.bind(console)   : function () {};
  const nativeClear = (console && console.clear) ? console.clear.bind(console) : null;
  const nativeExec  = document.execCommand ? document.execCommand.bind(document) : null;

  /* ------------------------------------------------------------------
     2 · CSS
     ------------------------------------------------------------------ */
  const injectCSS = () => {
    if (document.getElementById("cs-shield-css")) return;

    const s = document.createElement("style");
    s.id = "cs-shield-css";
    s.textContent = `
      body, body * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-user-drag: none !important;
      }
      input, textarea, select,
      [contenteditable]:not([contenteditable="false"]) {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      img { -webkit-user-drag: none !important; }
      #cs-shield-blank {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        background: #ffffff !important;
      }
      @media print {
        html, body { display: none !important; visibility: hidden !important; }
        #cs-shield-blank { display: none !important; }
      }
    `;
    (document.head || document.documentElement).appendChild(s);
  };

  /* ------------------------------------------------------------------
     3 · RIGHT-CLICK
     ------------------------------------------------------------------ */
  const blockRightClick = () => {
    bind("contextmenu", kill);
  };

  /* ------------------------------------------------------------------
     4 · TEXT SELECTION
     ------------------------------------------------------------------ */
  const blockSelection = () => {
    bind("selectstart", (e) => {
      if (CFG.protectFormFields && isField(e.target)) return;
      kill(e);
    });

    bind("mousedown", (e) => {
      if (!e.shiftKey) return;
      if (CFG.protectFormFields && isField(e.target)) return;
      kill(e);
    });

    /* Fallback: kill stray selections outside form fields */
    setInterval(() => {
      try {
        const sel = window.getSelection && window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
        const node = sel.anchorNode;
        const el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
        if (CFG.protectFormFields && isField(el)) return;
        sel.removeAllRanges();
      } catch (_) {}
    }, 700);
  };

  /* ------------------------------------------------------------------
     5 · CLIPBOARD EVENTS
     ------------------------------------------------------------------ */
  const blockClipboard = () => {
    ["copy", "cut", "paste"].forEach((type) => {
      bind(type, (e) => {
        if (CFG.protectFormFields && isField(e.target)) return;
        try {
          if (e.clipboardData) {
            e.clipboardData.setData("text/plain", "");
            e.clipboardData.setData("text/html", "");
          }
        } catch (_) {}
        kill(e);
      });
    });
  };

  /* ------------------------------------------------------------------
     6 · KEYBOARD SHORTCUTS
     ------------------------------------------------------------------ */
  const blockKeyboard = () => {
    const BLOCKED = new Set([
      "mod+c","mod+x","mod+v","mod+a",
      "mod+s","mod+p","mod+u","mod+j",
      "mod+g","mod+f","mod+h",
      "mod+shift+s","mod+shift+i","mod+shift+j",
      "mod+shift+c","mod+shift+k","mod+shift+e",
      "mod+shift+m","mod+shift+q",
      "f12","f7","printscreen"
    ]);

    const TEXT_OK = new Set(["mod+c","mod+x","mod+v","mod+a"]);

    const combo = (e) => {
      const p = [];
      if (e.ctrlKey || e.metaKey) p.push("mod");
      if (e.shiftKey) p.push("shift");
      if (e.altKey) p.push("alt");
      p.push(String(e.key || "").toLowerCase());
      return p.join("+");
    };

    bind("keydown", (e) => {
      const c = combo(e);

      if (c === "printscreen" || c === "alt+printscreen") {
        kill(e);
        handlePrintScreen();
        return;
      }

      if (!BLOCKED.has(c)) return;

      if (CFG.protectFormFields && TEXT_OK.has(c) && isField(e.target)) return;

      kill(e);
    });

    bind("keyup", (e) => {
      if (String(e.key || "").toLowerCase() === "printscreen") {
        kill(e);
        handlePrintScreen();
      }
    });
  };

  /* ------------------------------------------------------------------
     7 · SCREENSHOT COUNTER-MEASURES
     ------------------------------------------------------------------ */
  let flashing = null;

  const flashScreen = () => {
    if (flashing) return;
    flashing = document.createElement("div");
    flashing.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:#fff;" +
      "opacity:1;pointer-events:none;transition:opacity .25s linear;";
    body().appendChild(flashing);

    requestAnimationFrame(() => {
      if (!flashing) return;
      flashing.style.opacity = "0";
      setTimeout(() => {
        if (flashing && flashing.parentNode) flashing.parentNode.removeChild(flashing);
        flashing = null;
      }, 320);
    });
  };

  const clearClipboard = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("").catch(() => {});
      }
    } catch (_) {}

    if (!nativeExec) return;
    try {
      const ta = document.createElement("textarea");
      ta.value = " ";
      ta.setAttribute("aria-hidden", "true");
      ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
      body().appendChild(ta);
      ta.select();
      nativeExec("copy");
      ta.remove();
    } catch (_) {}
  };

  const handlePrintScreen = () => {
    clearClipboard();
    flashScreen();
  };

  /* ------------------------------------------------------------------
     8 · DRAG & DROP
     ------------------------------------------------------------------ */
  const blockDragDrop = () => {
    ["dragstart","drag","dragend","dragenter",
     "dragover","dragleave","drop"].forEach((type) => {
      bind(type, (e) => {
        if (type === "drop" && CFG.protectFormFields && isField(e.target)) return;
        kill(e);
      });
    });

    run(() => {
      document.querySelectorAll("img").forEach((img) => {
        if (img.getAttribute("draggable") !== "false") {
          img.setAttribute("draggable", "false");
        }
      });
    });
  };

  /* ------------------------------------------------------------------
     9 · PRINT
     ------------------------------------------------------------------ */
  const blockPrint = () => {
    try { window.print = function () { return false; }; } catch (_) {}
    bind("beforeprint", kill, window);
  };

  /* ------------------------------------------------------------------
     10 · DEVTOOLS DETECTION
     ------------------------------------------------------------------ */
  const DevTools = (() => {
    let open    = false;
    let strikes = 0;
    let overlay = null;

    const isTouch = (() => {
      try { return window.matchMedia("(pointer: coarse)").matches; }
      catch (_) { return "ontouchstart" in window; }
    })();

    const show = () => {
      if (!CFG.devToolsOverlay || overlay) return;
      overlay = document.createElement("div");
      overlay.id = "cs-shield-blank";
      overlay.setAttribute("aria-hidden", "true");
      body().appendChild(overlay);
    };

    const hide = () => {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
    };

    const set = (next) => {
      if (next === open) return;
      open = next;
      next ? show() : hide();
    };

    /* size delta (desktop only — mobile URL bars cause false positives) */
    const sizeSignal = () => {
      if (isTouch) return false;
      const ow = window.outerWidth, oh = window.outerHeight;
      if (!ow || !oh) return false;
      return (ow - window.innerWidth) > 200 || (oh - window.innerHeight) > 200;
    };

    /* console object inspection */
    let consoleSignal = false;

    const installConsoleProbe = () => {
      const probe = new Image();
      try {
        Object.defineProperty(probe, "id", {
          configurable: true,
          get() { consoleSignal = true; return ""; }
        });
      } catch (_) { return; }

      setInterval(() => {
        try { nativeLog("%c", probe); } catch (_) {}
        setTimeout(() => { try { if (nativeClear) nativeClear(); } catch (_) {} }, 60);
      }, 2000);
    };

    const tick = () => {
      const strong = consoleSignal;
      const weak   = sizeSignal();

      if (strong)     strikes = CFG.devToolsStrikes + 1;
      else if (weak)  strikes = Math.min(strikes + 1, CFG.devToolsStrikes + 1);
      else            strikes = 0;

      set(strikes >= CFG.devToolsStrikes);
      consoleSignal = false;
    };

    const start = () => {
      installConsoleProbe();
      setInterval(tick, 1000);
      tick();
    };

    return { start };
  })();

  /* ------------------------------------------------------------------
     11 · SOURCE / FRAME PROTECTION
     ------------------------------------------------------------------ */
  const sourceProtection = () => {
    /* frame-busting (only when browser allows) */
    run(() => {
      if (window.self !== window.top) {
        try { window.top.location = window.self.location; }
        catch (_) {}
      }
    });

    /* lock designMode */
    run(() => {
      Object.defineProperty(document, "designMode", {
        configurable: true,
        get: () => "off",
        set: () => {}
      });
    });
  };

  /* ------------------------------------------------------------------
     12 · READER-MODE DECOY
     ------------------------------------------------------------------ */
  const blockReaderMode = () => {
    const decoy = document.createElement("div");
    decoy.setAttribute("aria-hidden", "true");
    decoy.style.cssText =
      "position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;";

    let html = "";
    for (let i = 0; i < 12; i++) {
      html += "<article><p>" + "\u200B".repeat(40) + "</p></article>";
    }
    decoy.innerHTML = html;
    body().appendChild(decoy);
  };

  /* ------------------------------------------------------------------
     13 · CONSOLE LOCKDOWN
     ------------------------------------------------------------------ */
  const consoleLockdown = () => {
    if (nativeClear) {
      setInterval(() => { try { nativeClear(); } catch (_) {} }, 2000);
    }

    if (!CFG.silenceConsole) return;

    const noop = function () {};
    [
      "log","debug","info","warn","error","trace",
      "dir","dirxml","table","group","groupCollapsed",
      "groupEnd","count","assert","time","timeEnd",
      "timeStamp","profile","profileEnd"
    ].forEach((m) => {
      try { console[m] = noop; } catch (_) {}
    });
  };

  /* ------------------------------------------------------------------
     14 · INIT
     ------------------------------------------------------------------ */
  const init = () => {
    run(injectCSS);
    run(blockRightClick);
    run(blockSelection);
    run(blockClipboard);
    run(blockKeyboard);
    run(blockDragDrop);
    run(blockPrint);
    run(sourceProtection);
    run(blockReaderMode);
    run(DevTools.start);
    run(consoleLockdown);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();