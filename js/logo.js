
(function () {
  "use strict";

  var WATERMARK_LOGO = "https://arunpanthi.com.np/Photos/watermark.png";

  function addWatermark() {
    var wm = document.createElement("div");
    wm.className = "watermark";
    wm.style.position = "fixed";
    wm.style.top = 0;
    wm.style.left = 0;
    wm.style.width = "100%";
    wm.style.height = "100%";
    wm.style.pointerEvents = "none";
    wm.style.background = "url('" + WATERMARK_LOGO + "') center center no-repeat";
    wm.style.backgroundSize = "200px";
    wm.style.opacity = "0.5";
    wm.style.zIndex = "9999";
    document.body.appendChild(wm);
  }

  document.addEventListener("DOMContentLoaded", addWatermark);
})();
