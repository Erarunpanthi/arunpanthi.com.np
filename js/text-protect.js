(function () {
  "use strict";

  // Minimal styles - only for warning overlay
  const injectStyles = () => {
    // No global protection styles - normal page behavior preserved
  };

  let devtoolsOpen = false;
  let warningShown = false;
  let redirectAttempted = false;

  const showWarningAndClose = () => {
    if (warningShown) return;
    warningShown = true;
    
    // Show full-screen warning overlay
    const existingWarning = document.getElementById('cs-devtools-warning');
    if (existingWarning) return;
    
    const warning = document.createElement("div");
    warning.id = 'cs-devtools-warning';
    warning.style.cssText = `
      position:fixed; inset:0; z-index:2147483647;
      background:#000; color:#fff; display:flex;
      align-items:center; justify-content:center;
      flex-direction:column; font-family:Arial,sans-serif;
    `;
    warning.innerHTML = `
      <h1 style="color:#f00; font-size:48px; margin-bottom:20px;">⚠️ WARNING</h1>
      <p style="font-size:24px; margin-bottom:30px;">Developer Tools Detected!</p>
      <p style="font-size:18px; color:#aaa;">Closing this tab immediately...</p>
    `;
    
    // Clear everything and show warning
    document.body.innerHTML = "";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.appendChild(warning);
    
    // Immediate redirect to blank page - multiple attempts
    if (!redirectAttempted) {
      redirectAttempted = true;
      
      // Method 1: Replace location with about:blank (most reliable)
      try { window.location.replace("about:blank"); } catch(e) {}
      
      // Method 2: Try to close (works only if opened by script)
      setTimeout(() => { try { window.close(); } catch(e) {} }, 50);
      
      // Method 3: Navigate back in history
      setTimeout(() => { 
        try { window.history.go(-2); } catch(e) {}
      }, 100);
      
      // Method 4: Final redirect to about:blank
      setTimeout(() => {
        try { window.location.href = "about:blank"; } catch(e) {}
      }, 150);
      
      // Method 5: Keep trying to ensure redirect happens
      let attempts = 0;
      const forceRedirect = setInterval(() => {
        attempts++;
        try {
          if (window.location.href !== "about:blank" && !window.closed) {
            window.location.replace("about:blank");
          }
        } catch(e) {}
        if (attempts >= 10) clearInterval(forceRedirect);
      }, 200);
    }
  };

  const setDevToolsState = (isOpen) => {
    if (isOpen === devtoolsOpen) return;
    devtoolsOpen = isOpen;
    if (isOpen) {
      showWarningAndClose();
    }
  };

  // Detect DevTools by window size difference
  const detectBySize = () => {
    const threshold = 160;
    const wDiff = window.outerWidth - window.innerWidth;
    const hDiff = window.outerHeight - window.innerHeight;
    setDevToolsState(wDiff > threshold || hDiff > threshold);
  };

  // Detect DevTools by console.log side effects
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

  // Detect DevTools by toString override
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

  // Detect DevTools by debugger timing
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
    // Run size detection periodically
    setInterval(detectBySize, 800);
    // Start all detection methods
    detectByConsole();
    detectByToString();
    detectByDebugger();
    // Initial size check
    detectBySize();
  };

  const init = () => {
    injectStyles();
    // ONLY DevTools detection - no other protections
    startDevToolsDetection();
  };

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
