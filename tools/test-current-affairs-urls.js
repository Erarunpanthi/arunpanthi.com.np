/* No dependencies: node tools/test-current-affairs-urls.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const base = path.join(root, 'Psc-preparation/Current-Affairs');
const read = name => fs.readFileSync(path.join(base, name), 'utf8');
const date = '2083-06-28';
const examPath = '/Psc-preparation/Current-Affairs/exam/date=' + date;

execFileSync(process.execPath, [path.join(root, 'tools/generate-current-affairs-exams.js'), '--check']);

function node(tag) {
  return {
    tag, children: [], style: {}, textContent: '',
    appendChild(child) { this.children.push(child); },
    setAttribute(name, value) { this[name] = value; }
  };
}

// The Wednesday card should link to the dated route, not a query-string URL.
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [2026, 9, 16])); }
}
const nodes = {
  weeklyTestGrid: node('div'), caTodayBs: node('span'),
  caNextTest: node('span'), caTestCount: node('span')
};
const document = {
  readyState: 'complete',
  getElementById(id) { return nodes[id]; },
  createElement: node
};
const indexContext = { window: {}, document, Date: FixedDate };
vm.createContext(indexContext);
for (const file of ['nepali-date.js', 'tests.js', 'current-affairs.js']) {
  vm.runInContext(read(file), indexContext, { filename: file });
}
const kartik = indexContext.window.CA_TESTS['2083-07-04'];
assert.equal(kartik.questions.length, 19);
assert.equal(kartik.revision, 2);
assert.deepEqual(Array.from(kartik.questions, q => q.correct),
  [1, 0, 2, 3, 1, 0, 2, 3, 1, 0, 2, 3, 1, 0, 2, 3, 1, 0, 2]);
assert.ok(kartik.questions.every(q => q.options.length === 4 && q.explanation));
assert.ok(!JSON.stringify(kartik).includes('Report Question'));
assert.ok(!JSON.stringify(kartik).includes('Sahara Education'));
// The supplied questions belong to 11 Kartik 2083, Wednesday 28 Oct 2026.
assert.equal(indexContext.window.NepaliDate.keyOf(
  indexContext.window.NepaliDate.adToBs(new Date(2026, 9, 28))), '2083-07-11');
const nextSet = indexContext.window.CA_TESTS['2083-07-11'];
assert.equal(indexContext.window.CA_TESTS['2083-07-18'], undefined);
assert.equal(nextSet.questions.length, 13);
assert.deepEqual(Array.from(nextSet.questions, q => q.correct),
  [1, 2, 0, 3, 1, 2, 0, 3, 1, 2, 0, 3, 1]);
assert.ok(nextSet.questions.every(q => q.options.length === 4 && q.explanation));
assert.ok(!/Report Question|Sahara Education|\*\*/.test(JSON.stringify(nextSet)));
class ExamWednesday extends Date {
  constructor(...args) { super(...(args.length ? args : [2026, 9, 30])); }
}
const futureNodes = {
  weeklyTestGrid: node('div'), caTodayBs: node('span'),
  caNextTest: node('span'), caTestCount: node('span')
};
const futureContext = {
  window: {}, Date: ExamWednesday,
  document: {
    readyState: 'complete',
    getElementById(id) { return futureNodes[id]; },
    createElement: node
  }
};
vm.createContext(futureContext);
for (const file of ['nepali-date.js', 'tests.js', 'current-affairs.js']) {
  vm.runInContext(read(file), futureContext, { filename: file });
}
assert.equal(futureNodes.weeklyTestGrid.children[0].children.find(child => child.tag === 'a').href,
  '/Psc-preparation/Current-Affairs/exam/date=2083-07-11');
const card = nodes.weeklyTestGrid.children[0];
assert.ok(card, 'The first Wednesday card is rendered');
const examLink = card.children.find(child => child.tag === 'a');
assert.equal(examLink.href, examPath);
assert.equal(examLink.textContent, 'Give Exam →');

// The same exam runs at the new path (with or without a slash) and at old links.
const template = read('exam.html');
const inline = template.match(/<script>\s*(\(function \(\) \{[\s\S]*?\}\)\(\);)\s*<\/script>/);
assert.ok(inline, 'The exam script exists');
function openExam(url) {
  const address = new URL(url, 'https://arunpanthi.com.np');
  const location = { pathname: address.pathname, search: address.search, hash: address.hash };
  const canonical = { href: '' };
  const elements = {};
  let questionSet;
  let replaced = false;
  const window = {
    location, CA_TESTS: indexContext.window.CA_TESTS,
    history: {
      state: null,
      replaceState(state, title, relativeUrl) {
        replaced = true;
        const next = new URL(relativeUrl, 'https://arunpanthi.com.np');
        location.pathname = next.pathname;
        location.search = next.search;
        location.hash = next.hash;
      }
    }
  };
  const context = {
    window, URLSearchParams,
    document: {
      title: '',
      querySelector() { return canonical; },
      getElementById(id) { return elements[id] ||= { style: {}, textContent: '' }; }
    },
    startTest(set) { questionSet = set; }
  };
  vm.runInNewContext(inline[1], context, { filename: 'exam.html' });
  return { location, canonical, elements, questionSet, replaced };
}

for (const url of [examPath, examPath + '/', examPath + '/index.html',
  '/Psc-preparation/Current-Affairs/exam.html?date=' + date,
  '/Psc-preparation/Current-Affairs/exam/?date=' + date]) {
  const result = openExam(url);
  assert.equal(result.questionSet.id, 'ca_20830628', url);
  assert.ok(result.questionSet.questions.length > 0, url);
  assert.equal(result.canonical.href, 'https://arunpanthi.com.np' + examPath, url);
}
const withSlash = openExam(examPath + '/?reset=1#answers');
assert.equal(withSlash.location.pathname, examPath);
assert.equal(withSlash.location.search, '?reset=1');
assert.equal(withSlash.location.hash, '#answers');
assert.ok(withSlash.replaced);
assert.equal(openExam(examPath).replaced, false);
assert.equal(openExam(examPath + '/?date=2083-07-05').questionSet.id, 'ca_20830628');
const revised = openExam('/Psc-preparation/Current-Affairs/exam/date=2083-07-04');
assert.equal(revised.questionSet.id, 'ca_20830704_v2');
assert.equal(revised.questionSet.questions.length, 19);
const nextExam = openExam('/Psc-preparation/Current-Affairs/exam/date=2083-07-11');
assert.equal(nextExam.questionSet.id, 'ca_20830711');
assert.equal(nextExam.questionSet.questions.length, 13);

const missing = openExam('/Psc-preparation/Current-Affairs/exam.html?date=2083-07-05');
assert.equal(missing.questionSet, undefined);
assert.equal(missing.elements['coming-section'].style.display, 'block');
assert.match(missing.elements['coming-title'].textContent, /2083-07-05/);
assert.equal(openExam('/Psc-preparation/Current-Affairs/exam/').questionSet, undefined);

// Completed attempts (including revisits) show plain-text explanations in the review.
const reviewNodes = {};
function reviewNode(tag) {
  return {
    tag, style: {}, children: [], classList: { add() {} },
    appendChild(child) { this.children.push(child); },
    scrollIntoView() {}, textContent: '', innerHTML: ''
  };
}
const reviewSet = revised.questionSet;
const saved = { 'mcq_ca_20830704_v2_status': 'completed', 'mcq_ca_20830704_v2_marks': '1',
  'mcq_ca_20830704_v2_answers': JSON.stringify({ 0: 1 }) };
const reviewContext = {
  window: { location: { href: 'https://arunpanthi.com.np' + examPath }, scrollTo() {} },
  document: {
    getElementsByTagName() { return [{ getAttribute() { return '/js/Mock_Test.js'; } }]; },
    getElementById(id) { return reviewNodes[id] ||= reviewNode('div'); },
    createElement: reviewNode
  },
  localStorage: { getItem(key) { return saved[key] ?? null; } }, URL, console
};
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/Mock_Test.js'), 'utf8'), reviewContext);
reviewContext.window.startTest(reviewSet);
const reviewed = reviewNodes['results-detail'].children;
assert.equal(reviewed.length, 19);
assert.equal(reviewed[0].children[0].textContent, 'Explanation: ' + kartik.questions[0].explanation);
assert.equal(reviewed[18].children[0].textContent, 'Explanation: ' + kartik.questions[18].explanation);

// GitHub Pages routes unknown paths through the existing 404.html. It must
// forward the requested date to the one existing exam template without creating
// per-date folders or pages.
const notFound = fs.readFileSync(path.join(root, '404.html'), 'utf8');
const fallbackScript = notFound.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
assert.ok(fallbackScript, '404 route fallback script exists');
function routeFrom404(pathname, search = '', hash = '') {
  let redirected;
  const window = {
    location: { pathname, search, hash, replace(url) { redirected = url; } }
  };
  const context = {
    window, URLSearchParams,
    document: { getElementById() { return null; }, querySelector() { return null; } },
    setTimeout() { return 0; }, setInterval() { return 0; }, clearInterval() {}
  };
  vm.runInNewContext(fallbackScript[1], context, { filename: '404.html' });
  return redirected;
}
assert.equal(routeFrom404(examPath), '/Psc-preparation/Current-Affairs/exam.html?date=' + date);
assert.equal(routeFrom404(examPath + '/', '?reset=1', '#answers'),
  '/Psc-preparation/Current-Affairs/exam.html?reset=1&date=' + date + '#answers');
assert.equal(routeFrom404('/unknown-route'), undefined);
assert.ok(!fs.existsSync(path.join(base, 'exam', 'date=' + date)), 'No generated dated page/folder is required');
console.log('Current Affairs exam URLs and single-template routing: OK');
