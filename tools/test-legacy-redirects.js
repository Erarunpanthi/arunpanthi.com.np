#!/usr/bin/env node
/**
 * Unit-test the GitHub Pages redirect map (js/legacy-redirects.js).
 *
 * Every Search Console URL that was reported as "Excluded by 'noindex' tag"
 * must resolve to an indexable page, in one hop. Run: node tools/test-legacy-redirects.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "js/legacy-redirects.js"), "utf8");

function run(url) {
  let replaced = null;
  const location = {
    pathname: new URL(url).pathname,
    search: new URL(url).search,
    hash: new URL(url).hash,
    replace(target) {
      replaced = target;
    },
  };
  vm.runInNewContext(source, { window: { location }, console });
  return replaced;
}

// The exact URLs Search Console listed, plus the folder duplicates.
const CASES = [
  ["/Home.html", "/"],
  ["/Home", "/"],
  ["/Home/past-questions/", "/Resources/Past-Questions"],
  ["/Resources/Past-Questions/Past-Questions/Estimation-Valuation", "/Resources/Past-Questions/"],
  ["/Resources/Past-Questions/Past-Questions/Estimation-Valuation/", "/Resources/Past-Questions/"],
  ["/Resources/Past-Questions/Past-Questions/Irrigation-Engineering", "/Resources/Past-Questions/"],
  ["/Resources/Past-Questions/Past-Questions/Construction-Materials/", "/Resources/Past-Questions/"],
  ["/Resources/Past-Questions/Airport-Engineering/", "/Resources/Past-Questions/"],
  ["/Resources/Past-Questions/Engineering-Hydrology", "/Resources/Past-Questions/"],
  ["/Resources/Syllabus/FU-syllabus", null], // real page: must not redirect
  ["/", null],
];

let failures = 0;

for (const [url, expected] of CASES) {
  const actual = run("https://arunpanthi.com.np" + url);
  const ok = expected === null ? actual === null : actual === expected;
  if (!ok) {
    failures += 1;
    console.error(`FAIL ${url} -> ${actual} (expected ${expected})`);
  }
}

// A redirect target must never itself be a redirect placeholder.
const seen = new Set();
for (const [url] of CASES) {
  const first = run("https://arunpanthi.com.np" + url);
  if (!first || seen.has(first)) continue;
  seen.add(first);
  const second = run("https://arunpanthi.com.np" + first);
  if (second !== null) {
    failures += 1;
    console.error(`FAIL redirect chain: ${url} -> ${first} -> ${second}`);
  }
}

if (failures) {
  console.error(`${failures} failing case(s)`);
  process.exit(1);
}
console.log(`legacy-redirects.js: ${CASES.length} cases OK`);
