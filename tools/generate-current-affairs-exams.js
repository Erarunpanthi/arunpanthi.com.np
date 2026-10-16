#!/usr/bin/env node
/* Validate Current Affairs test data. Dated routes use exam.html and the
 * existing host rewrites; no generated page/folder is needed. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const base = path.join(root, 'Psc-preparation/Current-Affairs');
const check = process.argv.slice(2);
if (check.length && (check.length !== 1 || check[0] !== '--check')) {
  throw new Error('Usage: node tools/generate-current-affairs-exams.js [--check]');
}

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(base, 'tests.js'), 'utf8'), context,
  { filename: 'tests.js', timeout: 1000 });
const tests = context.window.CA_TESTS || {};
const dates = Object.keys(tests);
if (!dates.length) throw new Error('No Current Affairs tests found in tests.js');

for (const date of dates) {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[0-2])$/.test(date)) {
    throw new Error('Invalid BS date key in tests.js: ' + date);
  }
  const set = tests[date];
  if (!set || !set.name || !Array.isArray(set.questions) || !set.questions.length) {
    throw new Error('Test ' + date + ' needs a name and at least one question');
  }
  for (const [index, question] of set.questions.entries()) {
    if (!question.question || !Array.isArray(question.options) || question.options.length < 2 ||
        !Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options.length) {
      throw new Error('Invalid question ' + (index + 1) + ' in test ' + date);
    }
  }
}

const exam = fs.readFileSync(path.join(base, 'exam.html'), 'utf8');
const notFound = fs.readFileSync(path.join(root, '404.html'), 'utf8');
if (!exam.includes("/Psc-preparation/Current-Affairs/exam/date=' + key") ||
    !notFound.includes('/Psc-preparation/Current-Affairs/exam.html?')) {
  throw new Error('Dated exam routing is missing from exam.html or the existing 404.html fallback');
}
console.log('Validated ' + dates.length + ' Current Affairs test set(s); no generated pages required.');
