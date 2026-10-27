/* Parse and serialise Psc-preparation/Current-Affairs/tests.js.
 * The file is real JavaScript (`window.CA_TESTS = {...};`), so it is parsed by
 * evaluating it inside a tiny sandboxed function — never by regex. */

const DEFAULT_HEADER = `/* ============================================================
   WEEKLY CURRENT AFFAIRS — QUESTION BANK
   ------------------------------------------------------------
   Published from the admin panel. Each key is the Wednesday's
   Nepali (BS) date in YYYY-MM-DD form. correct = option index (0-3).
   ============================================================ */

`;

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[0-2])$/;

export class TestDataError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'TestDataError';
    this.details = details;
  }
}

function markerIndex(source) {
  const patterns = [/window\.CA_TESTS\s*=/, /globalThis\.CA_TESTS\s*=/, /var\s+CA_TESTS\s*=/, /const\s+CA_TESTS\s*=/, /let\s+CA_TESTS\s*=/];
  let best = -1;
  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (match && (best === -1 || match.index < best)) best = match.index;
  }
  return best;
}

/** Returns { tests, header, order } from tests.js source. */
export function parseCaTests(source) {
  if (typeof source !== 'string' || !source.trim()) {
    throw new TestDataError('tests.js is empty');
  }
  const index = markerIndex(source);
  if (index < 0) throw new TestDataError('Could not find `window.CA_TESTS = { ... }` in tests.js');

  // Evaluate only the assignment; the sandbox has no access to the page.
  let tests;
  try {
    const body = source.slice(index);
    const factory = new Function('window', 'globalThis', '"use strict";\n' + body + '\nreturn window.CA_TESTS || globalThis.CA_TESTS;');
    const sandbox = {};
    tests = factory(sandbox, sandbox);
  } catch (error) {
    throw new TestDataError('tests.js contains a JavaScript error: ' + error.message);
  }
  if (!tests || typeof tests !== 'object' || Array.isArray(tests)) {
    throw new TestDataError('window.CA_TESTS must be an object keyed by BS date');
  }

  const issues = validateCaTests(tests);
  return {
    tests,
    order: Object.keys(tests),
    header: source.slice(0, index),
    issues
  };
}

/** Returns a list of { level, message, date?, question? }. */
export function validateCaTests(tests) {
  const issues = [];
  const dates = Object.keys(tests);
  if (!dates.length) issues.push({ level: 'error', message: 'There are no test sets yet' });

  for (const date of dates) {
    if (!DATE_PATTERN.test(date)) {
      issues.push({ level: 'error', date, message: `Invalid date key "${date}" — use YYYY-MM-DD (BS)` });
    }
    const set = tests[date];
    if (!set || typeof set !== 'object') {
      issues.push({ level: 'error', date, message: 'The test set is empty' });
      continue;
    }
    if (!set.name || !String(set.name).trim()) {
      issues.push({ level: 'error', date, message: 'Add a test name' });
    }
    if (!Array.isArray(set.questions) || set.questions.length === 0) {
      issues.push({ level: 'error', date, message: 'Add at least one question' });
      continue;
    }
    set.questions.forEach((question, index) => {
      const label = `Q${index + 1}`;
      if (!question || typeof question !== 'object') {
        issues.push({ level: 'error', date, question: index, message: `${label}: invalid question object` });
        return;
      }
      if (!question.question || !String(question.question).trim()) {
        issues.push({ level: 'error', date, question: index, message: `${label}: question text is empty` });
      }
      if (!Array.isArray(question.options) || question.options.length < 2) {
        issues.push({ level: 'error', date, question: index, message: `${label}: needs at least two options` });
        return;
      }
      if (question.options.some((option) => option === null || option === undefined || !String(option).trim())) {
        issues.push({ level: 'error', date, question: index, message: `${label}: every option needs text` });
      }
      if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options.length) {
        issues.push({ level: 'error', date, question: index, message: `${label}: choose the correct option` });
      }
      if (question.explanation !== undefined && typeof question.explanation !== 'string') {
        issues.push({ level: 'warn', date, question: index, message: `${label}: explanation should be text` });
      }
    });
  }
  return issues;
}

export function hasErrors(issues) {
  return issues.some((issue) => issue.level === 'error');
}

function json(value) {
  return JSON.stringify(value);
}

/** Serialises a CA_TESTS object back into readable tests.js source. */
export function serializeCaTests(tests, { header } = {}) {
  const dates = Object.keys(tests).sort();
  const lines = [];
  const head = typeof header === 'string' && header.trim() ? header.replace(/\s*$/, '\n\n') : DEFAULT_HEADER;
  lines.push(head.replace(/\n+$/, ''));
  lines.push('');
  lines.push('window.CA_TESTS = {');
  dates.forEach((date, dateIndex) => {
    const set = tests[date] || {};
    lines.push(`  ${json(date)}: {`);
    lines.push(`    name: ${json(String(set.name || ''))},`);
    if (set.details) lines.push(`    details: ${json(String(set.details))},`);
    lines.push('    questions: [');
    const questions = Array.isArray(set.questions) ? set.questions : [];
    questions.forEach((question, index) => {
      const parts = [
        'question: ' + json(String(question.question || '')),
        'options: [' + (question.options || []).map((option) => json(String(option))).join(', ') + ']',
        'correct: ' + Number(question.correct || 0)
      ];
      if (question.explanation) parts.push('explanation: ' + json(String(question.explanation)));
      const comma = index === questions.length - 1 ? '' : ',';
      lines.push(`      { ${parts.join(', ')} }${comma}`);
    });
    lines.push('    ]');
    lines.push(`  }${dateIndex === dates.length - 1 ? '' : ','}`);
  });
  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

export function emptyQuestion() {
  return {
    question: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: ''
  };
}

export function createTestSet({ dateKey, name, details = '' }) {
  return {
    key: dateKey,
    name: name || '',
    details,
    questions: [emptyQuestion()]
  };
}

/** Renames a date key while keeping object order. */
export function renameTest(tests, oldKey, newKey) {
  if (oldKey === newKey) return tests;
  if (tests[newKey]) throw new TestDataError(`A test already exists for ${newKey}`);
  const next = {};
  for (const [key, value] of Object.entries(tests)) {
    next[key === oldKey ? newKey : key] = value;
  }
  return next;
}

/** Parses an explanation/answer-bearing question payload from JSON or CSV. */
export function parseQuestionImport(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new TestDataError('Paste some questions first');

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    let data;
    try {
      data = JSON.parse(trimmed);
    } catch (error) {
      throw new TestDataError('Invalid JSON: ' + error.message);
    }
    const list = Array.isArray(data) ? data : Array.isArray(data.questions) ? data.questions : null;
    if (!list) throw new TestDataError('JSON must be an array of questions or { questions: [...] }');
    return list.map((item, index) => normalizeQuestion(item, index));
  }

  const rows = parseDelimited(trimmed);
  if (rows.length < 2) throw new TestDataError('CSV needs a header row and at least one question');
  const headers = rows[0].map((cell) => cell.trim().toLowerCase());
  const find = (...names) => headers.findIndex((header) => names.includes(header));

  const qIndex = find('question', 'q', 'question text');
  const optionIndexes = headers
    .map((header, index) => (/^(option|opt|answer)?\s*[a-d1-4]$/.test(header) || /^option\s*[1-6]$/.test(header) ? index : -1))
    .filter((index) => index >= 0);
  const correctIndex = find('correct', 'answer', 'correct answer', 'correct option');
  const explanationIndex = find('explanation', 'reason', 'note');
  if (qIndex < 0 || optionIndexes.length < 2) {
    throw new TestDataError('CSV needs a "question" column and at least two option columns (a/b/c/d or option1..)');
  }

  return rows.slice(1).filter((row) => row.some((cell) => cell.trim())).map((row, index) => {
    const options = optionIndexes.map((i) => (row[i] || '').trim()).filter((value, position, all) => value || position < 2);
    let correct = 0;
    if (correctIndex >= 0) {
      const raw = String(row[correctIndex] || '').trim().toLowerCase();
      if (/^[a-f]$/.test(raw)) correct = raw.charCodeAt(0) - 97;
      else if (/^[1-6]$/.test(raw)) correct = Number(raw) - 1;
      else if (raw !== '') correct = Number(raw);
    }
    return normalizeQuestion(
      {
        question: row[qIndex],
        options,
        correct,
        explanation: explanationIndex >= 0 ? row[explanationIndex] : ''
      },
      index
    );
  });
}

function normalizeQuestion(item, index) {
  const options = Array.isArray(item.options)
    ? item.options.map((option) => String(option ?? '').trim())
    : [item.a, item.b, item.c, item.d].filter((value) => value !== undefined).map((value) => String(value ?? '').trim());
  let correct = item.correct;
  if (typeof correct === 'string') {
    const raw = correct.trim().toLowerCase();
    if (/^[a-f]$/.test(raw)) correct = raw.charCodeAt(0) - 97;
    else correct = Number(raw);
  }
  if (!Number.isInteger(correct)) correct = 0;
  if (!options.length) throw new TestDataError(`Question ${index + 1} has no options`);
  return {
    question: String(item.question ?? item.q ?? '').trim(),
    options,
    correct: Math.max(0, Math.min(options.length - 1, correct)),
    explanation: String(item.explanation ?? item.reason ?? '').trim()
  };
}

/** Small CSV/TSV parser that understands quotes. */
export function parseDelimited(text) {
  const delimiter = text.includes('\t') ? '\t' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** JSON export used by the "download questions" button. */
export function testsToJson(tests) {
  return JSON.stringify(tests, null, 2) + '\n';
}
