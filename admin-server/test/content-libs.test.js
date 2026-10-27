import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import {
  adToBs,
  bsToAd,
  keyOf,
  parseKey,
  formatBsEn,
  isWednesday,
  bsMonthLength
} from '../../admin/js/lib/bs-date.js';
import {
  parseCaTests,
  serializeCaTests,
  validateCaTests,
  parseQuestionImport,
  emptyQuestion
} from '../../admin/js/lib/ca-tests.js';
import {
  parsePracticeTest,
  buildPracticeTest,
  addTestToIndex,
  listTopics,
  createPracticeTestFromTemplate
} from '../../admin/js/lib/practice-test.js';
import {
  extractTextNodes,
  applyTextChanges,
  groupTextNodes,
  decodeEntities,
  encodeText
} from '../../admin/js/lib/html-text.js';
import { parseSeo, setSeoField, validateSeo } from '../../admin/js/lib/seo.js';
import { parseNavbar, serializeNavbar, parseSocial, serializeSocial, parseFooter, serializeFooter } from '../../admin/js/lib/navigation.js';
import { parseSitemap, generateSitemap, extractCanonical } from '../../admin/js/lib/sitemap.js';
import { bumpAssetVersions, findAssetVersions } from '../../admin/js/lib/asset-version.js';
import { diffLines, diffStats, compactDiff } from '../../admin/js/lib/diff.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relative) => fs.readFile(path.join(root, relative), 'utf8');

test('BS conversion matches the site calendar in both directions', async () => {
  const original = await read('Psc-preparation/Current-Affairs/nepali-date.js');
  const sandbox = { window: {} };
  vm.runInNewContext(original, sandbox);
  const ND = sandbox.window.NepaliDate;
  assert.ok(ND);

  for (let time = Date.UTC(2024, 0, 1); time <= Date.UTC(2030, 11, 31); time += 86400000) {
    const utc = new Date(time);
    const ad = new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
    const ours = adToBs(ad);
    const theirs = ND.adToBs(ad);
    assert.ok(ours && theirs, 'conversion available for ' + ad.toISOString().slice(0, 10));
    assert.equal(keyOf(ours), ND.keyOf(theirs), 'AD→BS mismatch for ' + ad.toDateString());
    const back = bsToAd(ours);
    assert.equal(back.getFullYear(), ad.getFullYear());
    assert.equal(back.getMonth(), ad.getMonth());
    assert.equal(back.getDate(), ad.getDate());
  }

  const sample = bsToAd({ year: 2083, month: 6, day: 28 });
  assert.equal(sample.getFullYear(), 2026);
  assert.equal(sample.getMonth(), 9);
  assert.equal(sample.getDate(), 14);
  assert.equal(isWednesday(sample), true);
  assert.equal(formatBsEn({ year: 2083, month: 6, day: 28 }), '28 Ashwin 2083 BS');
  assert.deepEqual(parseKey('2083-06-28'), { year: 2083, month: 6, day: 28 });
  assert.equal(bsMonthLength(2083, 6), 31);
  assert.equal(bsToAd({ year: 2083, month: 6, day: 32 }), null);
  assert.equal(bsToAd({ year: 2095, month: 1, day: 1 }), null);
});

test('weekly current-affairs tests parse, validate and round-trip', async () => {
  const source = await read('Psc-preparation/Current-Affairs/tests.js');
  const parsed = parseCaTests(source);
  assert.ok(parsed.order.length >= 2);
  assert.ok(parsed.header.includes('WEEKLY CURRENT AFFAIRS'));
  assert.equal(parsed.issues.filter((issue) => issue.level === 'error').length, 0);

  const firstKey = parsed.order[0];
  const first = parsed.tests[firstKey];
  assert.ok(first.questions.length > 5);
  assert.ok(first.questions.every((question) => Array.isArray(question.options)));

  const serialized = serializeCaTests(parsed.tests, { header: parsed.header });
  assert.ok(serialized.startsWith('/*'));
  assert.match(serialized, /window\.CA_TESTS = \{/);
  const reparsed = parseCaTests(serialized);
  assert.deepEqual(reparsed.tests, parsed.tests);
  assert.equal(reparsed.issues.filter((issue) => issue.level === 'error').length, 0);

  const added = { ...parsed.tests, '2083-07-11': { name: 'Test', details: 'x', questions: [emptyQuestion()] } };
  const issues = validateCaTests(added);
  assert.ok(issues.some((issue) => issue.message.includes('question text is empty')));
  assert.ok(serializeCaTests(added, { header: parsed.header }).includes('"2083-07-11"'));
});

test('question imports accept JSON and CSV', () => {
  const fromJson = parseQuestionImport(
    JSON.stringify([{ question: '2+2?', options: ['3', '4'], correct: 1, explanation: 'because' }])
  );
  assert.equal(fromJson.length, 1);
  assert.equal(fromJson[0].correct, 1);
  assert.equal(fromJson[0].explanation, 'because');

  const csv = 'question,a,b,c,d,correct,explanation\nCapital of Nepal?,Pokhara,Kathmandu,Biratnagar,Dharan,b,It is Kathmandu';
  const fromCsv = parseQuestionImport(csv);
  assert.equal(fromCsv[0].question, 'Capital of Nepal?');
  assert.equal(fromCsv[0].correct, 1);
  assert.equal(fromCsv[0].options[1], 'Kathmandu');

  assert.throws(() => parseQuestionImport('not a question'), /CSV needs/);
});

test('practice test HTML parses, validates and regenerates', async () => {
  const html = await read('Psc-preparation/Test/1.1-1.html');
  const parsed = parsePracticeTest(html);
  assert.ok(parsed.data.questions.length > 20);
  assert.ok(parsed.title.length > 5);
  assert.ok(parsed.literal.indent.length >= 0);

  const next = structuredClone(parsed.data);
  next.name = 'Renamed set';
  next.questions = next.questions.slice(0, 2);
  next.questions[1].question = 'Updated question?';
  const rebuilt = buildPracticeTest(parsed, { data: next, title: 'Renamed set | Practice' });
  const reparsed = parsePracticeTest(rebuilt);
  assert.equal(reparsed.data.name, 'Renamed set');
  assert.equal(reparsed.data.questions.length, 2);
  assert.equal(reparsed.data.questions[1].question, 'Updated question?');
  assert.equal(reparsed.title, 'Renamed set | Practice');
  assert.ok(rebuilt.includes('/js/Mock_Test.js'), 'page shell kept');

  const created = createPracticeTestFromTemplate(html, {
    title: 'New set',
    name: 'New set',
    details: 'details',
    questions: [emptyQuestion()],
    canonical: 'https://arunpanthi.com.np/Psc-preparation/Test/9.9-1'
  });
  assert.match(created, /canonical" href="https:\/\/arunpanthi\.com\.np\/Psc-preparation\/Test\/9\.9-1/);
});

test('practice test index gains a link and a new counter value', async () => {
  const index = await read('Psc-preparation/Test/index.html');
  const before = (index.match(/<li>/g) || []).length;
  const topics = listTopics(index);
  assert.ok(topics.some((topic) => topic.number === '1.1'));

  const result = addTestToIndex(index, {
    topicNumber: '1.1',
    href: '/Psc-preparation/Test/1.1-5',
    title: 'New geography set'
  });
  assert.equal(result.count, 5);
  assert.ok(result.html.includes('/Psc-preparation/Test/1.1-5'));
  assert.ok(result.html.includes('New geography set'));
  assert.ok(result.html.includes('(5)</span>'));
  assert.equal((result.html.match(/<li>/g) || []).length, before + 1);

  assert.throws(() => addTestToIndex(index, { topicNumber: '99.9', href: 'x', title: 'y' }), /was not found/);
});

test('HTML text extraction preserves exact offsets and leaves markup alone', async () => {
  const html = `<body>
  <h2>Heading &amp; more</h2>
  <p>Hello <strong>world</strong> &mdash; ok</p>
  <script>var x = "<p>not editable</p>";</script>
  <pre>code block</pre>
  <footer>© 2026</footer>
</body>`;

  const nodes = extractTextNodes(html);
  const texts = nodes.map((node) => node.text.trim());
  assert.ok(texts.includes('Heading & more'));
  assert.ok(texts.includes('Hello'));
  assert.ok(texts.includes('world'));
  assert.ok(texts.includes('— ok'));
  assert.ok(texts.includes('© 2026'));
  assert.ok(!texts.some((text) => text.includes('not editable')));
  assert.ok(!texts.some((text) => text.includes('code block')));
  for (const node of nodes) {
    assert.equal(html.slice(node.start, node.end), node.raw);
  }

  const headingIndex = nodes.findIndex((node) => node.text.includes('Heading'));
  const changed = applyTextChanges(html, nodes, { [headingIndex]: 'New heading & <tag>' });
  assert.ok(changed.includes('<h2>New heading &amp; &lt;tag&gt;</h2>'));
  assert.ok(changed.includes('<script>var x = "<p>not editable</p>";</script>'));
  assert.equal(applyTextChanges(html, nodes, {}), html);

  const about = await read('aboutus.html');
  const aboutNodes = extractTextNodes(about);
  assert.ok(aboutNodes.length > 20);
  assert.equal(applyTextChanges(about, aboutNodes, {}), about);
  const groups = groupTextNodes(aboutNodes);
  assert.ok(groups.length >= 2);

  assert.equal(decodeEntities('&amp;&lt;&#39;&#x41;&nbsp;'), '&<\'A\u00a0');
  assert.equal(encodeText('a & b < c'), 'a &amp; b &lt; c');
});

test('SEO fields parse and patch without touching other tags', async () => {
  const html = await read('index.html');
  const seo = parseSeo(html);
  assert.match(seo.title, /Civil Engineering Resources Nepal/);
  assert.match(seo.description, /Free civil engineering notes/);
  assert.match(seo.canonical, /^https:\/\/arunpanthi\.com\.np\//);
  assert.ok(seo.ogImage);

  const updated = setSeoField(html, 'description', 'A brand new description for testing.');
  assert.ok(updated.includes('content="A brand new description for testing."'));
  assert.ok(updated.includes(seo.ogTitle), 'og:title untouched');
  assert.equal(parseSeo(updated).description, 'A brand new description for testing.');

  const titleUpdated = setSeoField(updated, 'title', 'New title & more');
  assert.ok(titleUpdated.includes('<title>New title &amp; more</title>'));
  assert.equal(parseSeo(titleUpdated).title, 'New title & more');

  const removed = setSeoField(updated, 'description', '');
  assert.equal(parseSeo(removed).description, '');
  const reAdded = setSeoField(removed, 'description', 'Back again');
  assert.equal(parseSeo(reAdded).description, 'Back again');

  const issues = validateSeo(parseSeo(html));
  assert.ok(Array.isArray(issues));
  const bad = validateSeo({ title: '', description: '', canonical: 'not-a-url' });
  assert.ok(bad.some((issue) => issue.level === 'error' && issue.field === 'title'));
  assert.ok(bad.some((issue) => issue.level === 'error' && issue.field === 'canonical'));
});

test('navbar, social and footer partials round-trip', async () => {
  const navbar = await read('partials/navbar.html');
  const navItems = parseNavbar(navbar);
  assert.equal(navItems.length, 6);
  assert.equal(navItems[0].label, 'Home');
  assert.equal(navItems[0].icon, 'fas fa-home');
  const navHtml = serializeNavbar(navItems);
  assert.deepEqual(parseNavbar(navHtml), navItems);

  const social = await read('partials/social.html');
  const socialData = parseSocial(social);
  assert.ok(socialData.links.length >= 3);
  assert.ok(socialData.links.some((link) => link.href.includes('facebook')));
  assert.deepEqual(parseSocial(serializeSocial(socialData)), socialData);

  const footer = await read('partials/footer.html');
  const footerData = parseFooter(footer);
  assert.equal(footerData.links.length, 2);
  assert.match(footerData.copyrightText, /CivPrepMaster/);
  assert.deepEqual(parseFooter(serializeFooter(footerData)), footerData);
});

test('sitemap parsing and regeneration remain stable', async () => {
  const xml = await read('sitemap.xml');
  const entries = parseSitemap(xml);
  assert.ok(entries.length > 30);
  assert.ok(entries.some((entry) => entry.loc === 'https://arunpanthi.com.np/'));

  const pages = entries.map((entry) => ({ path: entry.loc.replace(/^https:\/\/arunpanthi\.com\.np\//, ''), canonical: entry.loc }));
  const rebuilt = generateSitemap(pages, xml);
  assert.equal(rebuilt.total, entries.length);
  assert.equal(rebuilt.added.length, 0);
  assert.equal(rebuilt.removed.length, 0);
  assert.equal(parseSitemap(rebuilt.xml).length, entries.length);

  const grown = generateSitemap(
    [...pages, { path: 'brand-new.html', canonical: 'https://arunpanthi.com.np/brand-new' }],
    xml
  );
  assert.deepEqual(grown.added, ['https://arunpanthi.com.np/brand-new']);

  assert.equal(extractCanonical('<link rel="canonical" href="https://x.test/a" />'), 'https://x.test/a');
});

test('asset version bump only changes ?v= stamps', async () => {
  const html = await read('index.html');
  const versions = findAssetVersions(html);
  assert.ok(versions.length >= 1);
  const bumped = bumpAssetVersions(html, '20300101');
  assert.ok(bumped.count >= 1);
  assert.ok(bumped.html.includes('?v=20300101'));
  assert.equal(findAssetVersions(bumped.html).includes('20300101'), true);
  assert.ok(!bumped.html.includes('?v=20260924'));
});

test('line diff reports additions, removals and context', () => {
  const a = 'one\ntwo\nthree\nfour\n';
  const b = 'one\ntwo changed\nthree\nfour\nfive\n';
  const ops = diffLines(a, b);
  const stats = diffStats(ops);
  assert.equal(stats.added, 2);
  assert.equal(stats.removed, 1);
  assert.equal(ops[0].type, 'same');
  const compact = compactDiff(ops);
  assert.ok(compact.some((op) => op.type === 'add' && op.text === 'five'));

  const huge = Array.from({ length: 1200 }, (_, i) => `line ${i}`).join('\n');
  const huge2 = huge.split('\n').reverse().join('\n');
  const bigOps = diffLines(huge, huge2, { maxLines: 500 });
  assert.ok(bigOps.length > 0);
});
