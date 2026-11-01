(function () {
  "use strict";

  // Resolve the watermark image robustly relative to this script's own location.
  // Photos/ is always a sibling of the js/ directory at the site root, so we go
  // up one level from the script (…/js/logo.js → …/) and then into Photos/.
  // Resolving against the script's own URL preserves the origin, host, port and
  // any GitHub Pages sub-path automatically, so this works for the domain root,
  // project sub-paths, local files and any other server configuration — without
  // fragile string-munging of the URL.
  function resolveWatermarkUrl() {
    var src = document.currentScript && document.currentScript.src
      ? document.currentScript.src
      : "";

    if (src) {
      try {
        return new URL("../Photos/watermark.png", src).href;
      } catch (err) {
        // Fall through to the root-relative default below.
      }
    }

    // Fallback when the script's URL isn't available (e.g. inlined or older
    // browsers without document.currentScript). Root-relative matches the
    // standard deployment layout.
    return "/Photos/watermark.png";
  }

  var WATERMARK_LOGO = resolveWatermarkUrl();

  var attached = false;

  function addWatermark() {
    // Never inject twice (some pages load this script more than once).
    if (attached) return;
    attached = true;

    var host = document.body || document.documentElement;
    if (!host) return;

    var wm = document.createElement("div");
    wm.className = "watermark no-lazy";
    wm.setAttribute("aria-hidden", "true");
    wm.setAttribute("data-no-lazy", "true");

    // Full-page, non-interactive watermark layer: shows ONE single, bigger
    // logo instead of tiling many small copies across the page. Stays fixed
    // while scrolling and never blocks clicks or text selection.
    wm.style.position = "fixed";
    wm.style.top = "0";
    wm.style.left = "0";
    wm.style.width = "100%";
    wm.style.height = "100%";
    wm.style.pointerEvents = "none";
    wm.style.userSelect = "none";
    wm.style.backgroundImage = "url('" + WATERMARK_LOGO + "')";
    wm.style.backgroundRepeat = "no-repeat";   // single logo, not tiled
    wm.style.backgroundPosition = "center center";
    wm.style.backgroundSize = "min(420px, 70vmin)"; // bigger single logo
    wm.style.opacity = "0.10"; // visible, but keeps page content readable
    wm.style.zIndex = "9999";

    // Attach the layer straight away. The browser loads the background image
    // on its own, so a slow network or a 404 won't silently hide the watermark
    // forever — it simply paints blank until (or unless) the image arrives.
    host.appendChild(wm);
  }

  // Cover both cases: script in <head>/defer (DOM still loading) and script
  // executed after the page is already interactive.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addWatermark);
  } else {
    addWatermark();
  }
})();
