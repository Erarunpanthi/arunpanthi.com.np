// GENERATED FILE — edit tools/redirects.py and run
// `python3 tools/generate-redirects.py` instead of changing this by hand.
//
// GitHub Pages answers 404 for every retired URL, so 404.html loads this file to
// forward the visitor (and Googlebot) to the page that replaced it. The same map
// is written into .htaccess for Apache hosts.
(function () {
  "use strict";

  var ROUTES = {
    "/Home": "/",
    "/Home.html": "/",
    "/Home/": "/",
    "/Home/Notes": "/NEC-license-preparation/Notes",
    "/Home/Solutions": "/Resources/Solutions",
    "/Home/past-questions": "/Resources/Past-Questions",
    "/NEC-license-preparation/MCQ": "/NEC-license-preparation/Test/",
    "/NEC-license-preparation/Notes/Airport-Engineering": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Building-Construction-and-Drawings": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Concrete-Technology-and-Masonry-Structures": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Construction-Management": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Construction-Materials.html": "/NEC-license-preparation/Notes/Construction-Materials/",
    "/NEC-license-preparation/Notes/Design-of-RCC-Structures": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Design-of-Steel-and-Timber-Structures": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Engineering-Drawing.html": "/NEC-license-preparation/Notes/Engineering-Drawing/",
    "/NEC-license-preparation/Notes/Engineering-Economics": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Engineering-Geology": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Engineering-Hydrology": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Engineering-Professional-Practices": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Estimation-and-Valuation": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Fluid-Mechanics": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Foundation-Engineering": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Hydraulics": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Hydropower-Engineering": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Irrigation-Engineering": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Project-Management": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Sanitation-Engineering": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Soil-Mechanics": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Strength-of-Materials": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Surveying": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Theory-of-Structures": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Transportation-Engineering": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/Notes/Water-Supply-Engineering": "/NEC-license-preparation/Notes/",
    "/NEC-license-preparation/exam-preparation": "/NEC-license-preparation/",
    "/Psc-preparation/Psc-video": "/Psc-video/",
    "/Psc-preparation/Syllabus/ministry-physical-infrastructure-syllabus": "/Psc-preparation/Syllabus/",
    "/Psc-preparation/Syllabus/nea-syllabus": "/Psc-preparation/Syllabus/",
    "/Psc-preparation/Syllabus/nepal-oil-corporation-syllabus": "/Psc-preparation/Syllabus/",
    "/Psc-preparation/Syllabus/nepal-telecom-syllabus": "/Psc-preparation/Syllabus/Nepal-telecom",
    "/Psc-preparation/Syllabus/road-department-syllabus": "/Psc-preparation/Syllabus/",
    "/Resources/Past-Questions/Airport-Engineering": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Building-Construction": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Concrete-Technology": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Construction-Management": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Construction-Materials": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Engineering-Drawing": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Engineering-Economics": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Engineering-Geology": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Engineering-Hydrology": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Estimation-Valuation": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Fluid-Mechanics": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Foundation-Engineering": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Hydraulics": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Hydropower-Engineering": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Irrigation-Engineering": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Professional-Practices": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Project-Management": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/RCC-Design": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Sanitation-Engineering": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Soil-Mechanics": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Steel-Timber-Design": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Strength-of-Materials": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Surveying": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Theory-of-Structures": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Transportation-Engineering": "/Resources/Past-Questions/",
    "/Resources/Past-Questions/Water-Supply": "/Resources/Past-Questions/"
  };

  var PAST_QUESTION_SUBJECTS = ["Airport-Engineering", "Building-Construction", "Concrete-Technology", "Construction-Management", "Construction-Materials", "Engineering-Drawing", "Engineering-Economics", "Engineering-Geology", "Engineering-Hydrology", "Estimation-Valuation", "Fluid-Mechanics", "Foundation-Engineering", "Hydraulics", "Hydropower-Engineering", "Irrigation-Engineering", "Professional-Practices", "Project-Management", "RCC-Design", "Sanitation-Engineering", "Soil-Mechanics", "Steel-Timber-Design", "Strength-of-Materials", "Surveying", "Theory-of-Structures", "Transportation-Engineering", "Water-Supply"];

  var path = window.location.pathname.replace(/\/index\.html$/i, "");
  path = path.replace(/\/+$/, "");
  if (path === "") path = "/";

  var target = ROUTES[path] || ROUTES[path + "/"];

  if (!target) {
    // Any leftover subject route under the collection hub (including the old
    // duplicated /Resources/Past-Questions/Past-Questions/ folder).
    var match = path.match(/^\/Resources\/Past-Questions\/(?:Past-Questions\/)?([^/]+)$/);
    if (match && PAST_QUESTION_SUBJECTS.indexOf(match[1]) !== -1) {
      target = "/Resources/Past-Questions/";
    }
  }

  if (target && target !== path) {
    window.location.replace(target + (window.location.search || "") + (window.location.hash || ""));
  }
})();
