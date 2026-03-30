
;(function () {
    "use strict";

    /* ==========  CONFIGURATION  ========== */
    const CFG = {
        /* ---- Toast messages ---- */
        msgRightClick   : "🔒  Right-click is disabled to protect this content.",
        msgCopy         : "🔒  Copying is not allowed on this page.",
        msgDevTools     : "🔒  Developer tools access is restricted.",
        msgPrint        : "🔒  Printing this page is disabled.",
        msgScreenshot   : "🔒  Content hidden — screenshots are not allowed.",
        msgDragDrop     : "🔒  Dragging content is not permitted.",
        msgViewSource   : "🔒  Viewing page source is not allowed.",
        msgGeneric      : "🔒  This content is protected. Unauthorized access is prohibited.",
        /* ---- Timing ---- */
        toastDuration   : 3200,      // ms the toast stays visible
        devToolsPollMs  : 800        // ms between DevTools-open checks
    };

    /* ==========  INJECT STYLES  ========== */
    const css = document.createElement("style");
    css.textContent = `
        /* ---- Disable selection site-wide ---- */
        body.tp-protected,
        body.tp-protected * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
        }

        /* ---- Toast notification ---- */
        #tp-toast {
            position: fixed;
            bottom: 32px;
            left: 50%;
            transform: translateX(-50%) translateY(120px);
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            padding: 14px 30px;
            border-radius: 12px;
            font: 600 15px/1.4 system-ui, -apple-system, sans-serif;
            letter-spacing: .2px;
            box-shadow: 0 8px 32px rgba(0,0,0,.38);
            z-index: 2147483647;
            pointer-events: none;
            opacity: 0;
            transition: transform .45s cubic-bezier(.22,1,.36,1),
                        opacity   .45s ease;
            max-width: 92vw;
            text-align: center;
            border: 1px solid rgba(255,255,255,.08);
        }
        #tp-toast.tp-show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }

        /* ---- Full-screen overlay (DevTools / blur) ---- */
        #tp-overlay {
            position: fixed;
            inset: 0;
            background: rgba(10,10,18,.97);
            z-index: 2147483646;
            display: none;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 16px;
            text-align: center;
            padding: 2rem;
        }
        #tp-overlay.tp-active { display: flex; }
        #tp-overlay .tp-shield { font-size: 54px; }
        #tp-overlay .tp-title {
            color: #fff;
            font: 700 22px/1.3 system-ui, -apple-system, sans-serif;
        }
        #tp-overlay .tp-sub {
            color: #aaa;
            font: 400 15px/1.5 system-ui, -apple-system, sans-serif;
            max-width: 440px;
        }

        /* ---- Hide everything when printing ---- */
        @media print {
            html, body { display: none !important; visibility: hidden !important; }
            * { display: none !important; }
        }
    `;
    document.head.appendChild(css);

    /* ==========  BUILD DOM ELEMENTS  ========== */
    // Toast
    const toast = document.createElement("div");
    toast.id = "tp-toast";
    document.body.appendChild(toast);

    // Overlay
    const overlay = document.createElement("div");
    overlay.id = "tp-overlay";
    overlay.innerHTML = `
        <div class="tp-shield">🛡️</div>
        <div class="tp-title">Content Protected</div>
        <div class="tp-sub">This content is protected by the author.<br>
             Please close developer tools or return to the page to continue reading.</div>
    `;
    document.body.appendChild(overlay);

    /* Apply protected class */
    document.body.classList.add("tp-protected");

    /* ==========  TOAST SYSTEM  ========== */
    let toastTimer = null;
    function showToast(msg) {
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.add("tp-show");
        toastTimer = setTimeout(() => toast.classList.remove("tp-show"), CFG.toastDuration);
    }

    /* ==========  OVERLAY SYSTEM  ========== */
    function showOverlay(msg) {
        overlay.querySelector(".tp-sub").innerHTML = msg;
        overlay.classList.add("tp-active");
    }
    function hideOverlay() {
        overlay.classList.remove("tp-active");
    }

    /* ==========  1. BLOCK RIGHT-CLICK  ========== */
    document.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        showToast(CFG.msgRightClick);
        return false;
    }, true);

    /* ==========  2. BLOCK TEXT SELECTION & COPY  ========== */
    document.addEventListener("copy", function (e) {
        e.preventDefault();
        showToast(CFG.msgCopy);
        return false;
    }, true);

    document.addEventListener("cut", function (e) {
        e.preventDefault();
        showToast(CFG.msgCopy);
        return false;
    }, true);

    document.addEventListener("selectstart", function (e) {
        e.preventDefault();
        return false;
    }, true);

    /* ==========  3. BLOCK DRAG & DROP  ========== */
    document.addEventListener("dragstart", function (e) {
        e.preventDefault();
        showToast(CFG.msgDragDrop);
        return false;
    }, true);

    document.addEventListener("drop", function (e) {
        e.preventDefault();
        return false;
    }, true);

    /* ==========  4. BLOCK KEYBOARD SHORTCUTS  ========== */
    const BLOCKED_COMBOS = [
        /* Copy / Cut / Paste source */
        { ctrl: true,  shift: false, code: "KeyC"     },  // Ctrl+C
        { ctrl: true,  shift: false, code: "KeyX"     },  // Ctrl+X
        { ctrl: true,  shift: false, code: "KeyA"     },  // Ctrl+A

        /* View Source / Save / Print */
        { ctrl: true,  shift: false, code: "KeyU"     },  // Ctrl+U  (view source)
        { ctrl: true,  shift: false, code: "KeyS"     },  // Ctrl+S  (save page)
        { ctrl: true,  shift: false, code: "KeyP"     },  // Ctrl+P  (print)

        /* Developer Tools */
        { ctrl: true,  shift: true,  code: "KeyI"     },  // Ctrl+Shift+I
        { ctrl: true,  shift: true,  code: "KeyJ"     },  // Ctrl+Shift+J
        { ctrl: true,  shift: true,  code: "KeyC"     },  // Ctrl+Shift+C
        { ctrl: true,  shift: true,  code: "KeyK"     },  // Ctrl+Shift+K (Firefox)
        { ctrl: true,  shift: false, code: "F12"      },  // Ctrl+F12

        /* F12 alone */
        { ctrl: false, shift: false, code: "F12"      },

        /* Ctrl+Shift+U  (some browsers source) */
        { ctrl: true,  shift: true,  code: "KeyU"     },

        /* PrintScreen (limited but worth catching) */
        { ctrl: false, shift: false, code: "PrintScreen" },
        { ctrl: true,  shift: false, code: "PrintScreen" },
    ];

    document.addEventListener("keydown", function (e) {
        const ctrl  = e.ctrlKey || e.metaKey;   // metaKey for Mac Cmd
        const shift = e.shiftKey;

        for (const combo of BLOCKED_COMBOS) {
            if (combo.ctrl === ctrl && combo.shift === shift && e.code === combo.code) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                /* Choose the right message */
                if (["KeyC", "KeyX", "KeyA"].includes(e.code) && !shift) {
                    showToast(CFG.msgCopy);
                } else if (e.code === "KeyU") {
                    showToast(CFG.msgViewSource);
                } else if (e.code === "KeyP") {
                    showToast(CFG.msgPrint);
                } else if (e.code === "PrintScreen") {
                    showToast(CFG.msgScreenshot);
                    /* Flash overlay briefly for screenshot block */
                    showOverlay(CFG.msgScreenshot);
                    setTimeout(hideOverlay, 1200);
                } else if (e.code === "KeyS") {
                    showToast(CFG.msgViewSource);
                } else {
                    showToast(CFG.msgDevTools);
                }
                return false;
            }
        }
    }, true);

    /* ==========  5. BLOCK PRINTING VIA JS  ========== */
    // Override window.print
    window.print = function () {
        showToast(CFG.msgPrint);
    };

    // Intercept beforeprint event
    window.addEventListener("beforeprint", function (e) {
        e.preventDefault && e.preventDefault();
        showToast(CFG.msgPrint);
        // Blank the body briefly during print attempt
        document.body.style.display = "none";
        requestAnimationFrame(() => { document.body.style.display = ""; });
    });

    /* ==========  6. DEVTOOLS OPEN DETECTION  ========== */
    // --- Method A: Window size differential ---
    let devToolsOpen = false;

    function checkDevToolsBySize() {
        const widthThreshold  = window.outerWidth  - window.innerWidth > 200;
        const heightThreshold = window.outerHeight - window.innerHeight > 300;
        return widthThreshold || heightThreshold;
    }

    // --- Method B: debugger statement timing ---
    function checkDevToolsByDebugger() {
        const start = performance.now();
        // This line pauses only when DevTools is open
        (function(){}).constructor("debugger")();
        return performance.now() - start > 80;
    }

    // --- Method C: console.log toString detection ---
    function checkDevToolsByConsole() {
        let opened = false;
        const el = new Image();
        Object.defineProperty(el, "id", {
            get: function () { opened = true; }
        });
        console.log("%c", el);  // DevTools reads .id when open
        return opened;
    }

    function pollDevTools() {
        const isOpen = checkDevToolsBySize() || checkDevToolsByConsole();

        if (isOpen && !devToolsOpen) {
            devToolsOpen = true;
            showOverlay(
                "🔒 <b>Developer Tools Detected</b><br><br>" +
                "This content is protected. Please close Developer Tools to continue reading.<br><br>" +
                "<small style='color:#e74c3c;'>All content on this page is original work created over 12 days.<br>" +
                "Unauthorized extraction or copying is strictly prohibited.</small>"
            );
            showToast(CFG.msgDevTools);
        } else if (!isOpen && devToolsOpen) {
            devToolsOpen = false;
            hideOverlay();
        }
    }

    setInterval(pollDevTools, CFG.devToolsPollMs);

    /* ==========  7. VISIBILITY / BLUR DETECTION (Screenshot Guard)  ========== */
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            // Page not visible — user may be taking screenshot
            showOverlay(CFG.msgScreenshot +
                "<br><br><small>Content is hidden while the tab is not in focus.</small>");
        } else {
            if (!devToolsOpen) hideOverlay();
        }
    });

    // Also catch window blur (Alt-Tab to screenshot tool)
    window.addEventListener("blur", function () {
        showOverlay(CFG.msgScreenshot +
            "<br><br><small>Content is hidden while the window is not in focus.</small>");
    });
    window.addEventListener("focus", function () {
        if (!devToolsOpen) hideOverlay();
    });

    /* ==========  8. BLOCK view-source: PREFIX  ========== */
    // If the page is opened with view-source: redirect away
    if (window.location.href.indexOf("view-source:") !== -1) {
        window.location.href = "about:blank";
    }

    /* ==========  9. DISABLE CONSOLE METHODS  ========== */
    // Neuter the console so logged DOM content can't be inspected easily
    const noop = function () {};
    const consoleMethods = [
        "log","debug","info","warn","error","table","dir","dirxml",
        "trace","group","groupCollapsed","groupEnd","clear","count",
        "assert","profile","profileEnd","time","timeEnd","timeStamp"
    ];
    consoleMethods.forEach(function (method) {
        try { console[method] = noop; } catch (_) {}
    });

    // Leave a single warning in the console (before we nuke it)
    // We do this via a raw console call saved before override
    (function () {
        const w = console.warn || noop;
        try {
            w.call(console,
                "%c⚠️  This page is protected. Content extraction is not permitted.",
                "color:#e74c3c;font-size:16px;font-weight:bold;padding:8px;"
            );
        } catch (_) {}
    })();

    /* ==========  10. NOSCRIPT / IFRAME GUARD  ========== */
    // If loaded inside an iframe (content scraper), break out
    if (window.self !== window.top) {
        try { window.top.location.href = window.self.location.href; }
        catch (_) { document.body.innerHTML = "<h2>🔒 Access Denied</h2>"; }
    }

    /* ==========  INITIALIZATION COMPLETE  ========== */
    console.clear && console.clear();

})();
