// watermark.js
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
    wm.style.backgroundImage = "url('" + WATERMARK_LOGO + "')";
    wm.style.backgroundRepeat = "no-repeat";
    wm.style.backgroundPosition = "center";
    wm.style.backgroundSize = "48vh";   // scales logo to 48% of viewport height
    wm.style.opacity = "0.1";
    wm.style.zIndex = "9999";
    document.body.appendChild(wm);

  
  }

  document.addEventListener("DOMContentLoaded", addWatermark);
})();
