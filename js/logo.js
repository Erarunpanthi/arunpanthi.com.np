(function () {
  "use strict";

  // Capture this script's URL at parse time (document.currentScript only
  // exists while the script evaluates) and resolve the watermark path
  // relative to it. That way the logo loads on production, GitHub Pages
  // previews, sub-path mirrors and local files — not only when the site
  // is served from the domain root.
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";
  var WATERMARK_LOGO = SCRIPT_SRC
    ? SCRIPT_SRC.replace(/\/js\/[^\/?]*(\?.*)?$/, "/Photos/watermark.png")
    : "/Photos/watermark.png";

  var injected = false;

  function addWatermark() {
    // Never inject twice (some pages load this script more than once).
    if (injected) return;
    injected = true;

    var host = document.body || document.documentElement;
    if (!host) return;

    var wm = document.createElement("div");
    wm.className = "watermark";
    wm.setAttribute("aria-hidden", "true");

    // Responsive tiled watermark: small tiles that fit phones and desktops
    // alike instead of one fixed 600px image that got cropped on mobile.
    // Fixed + pointer-events:none so it stays on screen while scrolling
    // without ever blocking clicks.
    wm.style.position = "fixed";
    wm.style.top = "0";
    wm.style.left = "0";
    wm.style.width = "100%";
    wm.style.height = "100%";
    wm.style.pointerEvents = "none";
    wm.style.backgroundImage = "url(\"" + WATERMARK_LOGO + "\")";
    wm.style.backgroundRepeat = "repeat";
    wm.style.backgroundPosition = "center center";
    wm.style.backgroundSize = "min(200px, 42vmin)"; // shrinks on small screens
    wm.style.opacity = "0.07"; // visible, but keeps notes readable
    wm.style.zIndex = "9999";

    // Preload first: only attach the overlay once the PNG is confirmed to
    // load, so a 404 or slow network never leaves a broken layer behind.
    var probe = new Image();
    probe.onload = function () {
      if (!wm.parentNode) host.appendChild(wm);
    };
    probe.src = WATERMARK_LOGO;
  }

  // Cover both cases: script in <head>/defer (DOM still loading) and
  // script injected after the page already became interactive.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addWatermark);
  } else {
    addWatermark();
  }
})();
