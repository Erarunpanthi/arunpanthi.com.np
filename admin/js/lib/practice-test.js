/* Parse and regenerate Psc-preparation/Test/*.html practice tests.
 * These pages embed a `const questionSet = {...}` literal; everything else
 * (head, markup, scripts) is treated as a reusable shell. */

const QUESTION_SET_PATTERN = /(?:const|let|var)\s+questionSet\s*=\s*/;

function skipString(source, start) {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    const char = source[i];
    if (char === '\\') {
      i += 2;
      continue;
    }
    if (char === quote) return i + 1;
    if (quote === '`' && char === '$' && source[i + 1] === '{') {
      let depth = 1;
      i += 2;
      while (i < source.length && depth > 0) {
        if (source[i] === '`') {
          i = skipString(source, i);
          continue;
        }
        if (source[i] === '{') depth += 1;
        if (source[i] === '}') depth -= 1;
        i += 1;
      }
      continue;
    }
    i += 1;
  }
  return source.length;
}

function extractObjectLiteral(source, start) {
  let depth = 0;
  let i = start;
  while (i < source.length) {
    const char = source[i];
    if (char === '"' || char === "'" || char === '`') {
      i = skipString(source, i);
      continue;
    }
    if (char === '/' && source[i + 1] === '/') {
      const newline = source.indexOf('\n', i);
      i = newline === -1 ? source.length : newline;
      continue;
    }
    if (char === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
    i += 1;
  }
  return null;
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export class PracticeTestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PracticeTestError';
  }
}

/**
 * Returns {
 *   data, title, metaDescription, canonical,
 *   literal: {start, end, text, indent},
 *   html
 * }
 */
export function parsePracticeTest(html) {
  if (typeof html !== 'string' || !html.includes('questionSet')) {
    throw new PracticeTestError('This page does not contain a questionSet object');
  }
  const match = QUESTION_SET_PATTERN.exec(html);
  if (!match) throw new PracticeTestError('Could not find `const questionSet = {...}` in this file');

  const literalStart = html.indexOf('{', match.index + match[0].length);
  if (literalStart < 0) throw new PracticeTestError('Could not find the questionSet object');
  const literal = extractObjectLiteral(html, literalStart);
  if (!literal) throw new PracticeTestError('The questionSet object is not closed properly');

  let data;
  try {
    data = new Function('"use strict"; return (' + literal + ');')();
  } catch (error) {
    throw new PracticeTestError('The questionSet object has a JavaScript error: ' + error.message);
  }
  if (!data || typeof data !== 'object') throw new PracticeTestError('questionSet is not an object');
  if (!Array.isArray(data.questions)) throw new PracticeTestError('questionSet.questions must be an array');

  const lineStart = html.lastIndexOf('\n', literalStart) + 1;
  const indentMatch = /^[ \t]*/.exec(html.slice(lineStart, literalStart));
  const indent = indentMatch ? indentMatch[0] : '';

  const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(html);
  const descriptionMatch = /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i.exec(html);
  const canonicalMatch = /<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["']/i.exec(html);

  return {
    data,
    title: titleMatch ? decodeEntities(titleMatch[1].trim()) : '',
    metaDescription: descriptionMatch ? decodeEntities(descriptionMatch[1]) : '',
    canonical: canonicalMatch ? decodeEntities(canonicalMatch[1]) : '',
    literal: {
      start: literalStart,
      end: literalStart + literal.length,
      text: literal,
      indent
    },
    html
  };
}

function jsString(value) {
  const text = String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `'${text}'`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Serialises the questionSet object using the file's existing indentation. */
export function serializeQuestionSet(data, { indent = '    ' } = {}) {
  const inner = indent + '    ';
  const inner2 = inner + '    ';
  const lines = ['{'];
  lines.push(`${inner}name: ${jsString(data.name || '')},`);
  if (data.details) lines.push(`${inner}details: ${jsString(data.details)},`);
  lines.push(`${inner}questions: [`);
  const questions = Array.isArray(data.questions) ? data.questions : [];
  questions.forEach((question, index) => {
    const options = (question.options || []).map((option) => jsString(option)).join(', ');
    const parts = [`question: ${jsString(question.question || '')}`, `options: [${options}]`, `correct: ${Number(question.correct || 0)}`];
    if (question.explanation) parts.push(`explanation: ${jsString(question.explanation)}`);
    const comma = index === questions.length - 1 ? '' : ',';
    lines.push(`${inner2}{ ${parts.join(', ')} }${comma}`);
  });
  lines.push(`${inner}]`);
  lines.push(`${indent}}`);
  return lines.join('\n');
}

function replaceOnce(html, pattern, replacement, label) {
  if (!pattern.test(html)) return html;
  return html.replace(pattern, replacement);
}

/**
 * Rebuilds a practice-test page with new data, title, description and canonical.
 */
export function buildPracticeTest(parsed, { data, title, metaDescription, canonical } = {}) {
  const nextData = data || parsed.data;
  let html = parsed.html;
  const literal = serializeQuestionSet(nextData, { indent: parsed.literal.indent });
  html = html.slice(0, parsed.literal.start) + literal + html.slice(parsed.literal.end);

  const nextTitle = title !== undefined ? title : parsed.title;
  if (nextTitle) {
    html = replaceOnce(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(nextTitle)}</title>`);
  }
  if (metaDescription !== undefined) {
    if (metaDescription && /<meta\s+name=["']description["']/i.test(html)) {
      html = html.replace(
        /(<meta\s+name=["']description["']\s+content=["'])[\s\S]*?(["'])/i,
        (match, before, after) => before + escapeHtml(metaDescription) + after
      );
    } else if (metaDescription) {
      html = html.replace(/<title>/i, `<meta name="description" content="${escapeHtml(metaDescription)}" />\n<title>`);
    }
  }
  if (canonical) {
    html = replaceOnce(
      html,
      /(<link\s+rel=["']canonical["']\s+href=["'])[\s\S]*?(["'])/i,
      (match, before, after) => before + escapeHtml(canonical) + after
    );
  }
  return html;
}

export function createPracticeTestFromTemplate(templateHtml, { title, name, details, questions, canonical, metaDescription }) {
  const parsed = parsePracticeTest(templateHtml);
  const data = {
    name: name || title,
    details: details || '',
    questions: questions && questions.length ? questions : []
  };
  return buildPracticeTest(parsed, {
    data,
    title: title || name,
    metaDescription: metaDescription !== undefined ? metaDescription : parsed.metaDescription,
    canonical
  });
}

/** Inserts a "Start exam" link for a new set into Psc-preparation/Test/index.html. */
export function addTestToIndex(indexHtml, { topicNumber, href, label, title }) {
  if (!indexHtml || typeof indexHtml !== 'string') throw new PracticeTestError('Index page is empty');
  const topicNeedle = `topic-number">${topicNumber}<`;
  const topicIndex = indexHtml.indexOf(topicNeedle);
  if (topicIndex < 0) {
    throw new PracticeTestError(`Topic ${topicNumber} was not found in the index page. Add the link manually in the Files tab.`);
  }

  const ulStart = indexHtml.indexOf('<ul class="resource-list">', topicIndex);
  if (ulStart < 0) throw new PracticeTestError(`Topic ${topicNumber} has no resource list`);

  let depth = 0;
  let ulEnd = -1;
  for (let i = ulStart; i < indexHtml.length; i++) {
    if (indexHtml.startsWith('<ul', i)) depth += 1;
    else if (indexHtml.startsWith('</ul', i)) {
      depth -= 1;
      if (depth === 0) {
        ulEnd = indexHtml.indexOf('>', i) + 1;
        break;
      }
    }
  }
  if (ulEnd < 0) throw new PracticeTestError('Could not find the end of the resource list');

  const existing = (indexHtml.slice(ulStart, ulEnd).match(/<li>/g) || []).length;
  const setLabel = label || `Set ${existing + 1} – ${title || 'New set'}`;
  const safeHref = String(href || '').replace(/"/g, '');
  const safeLabel = escapeHtml(setLabel);
  const safeAria = escapeHtml(`Start exam for topic ${topicNumber}: ${setLabel} (opens in a new tab)`);
  const item =
    `\n                            <li><h4>${safeLabel}</h4>` +
    `<a class="notes-button" href="${safeHref}" aria-label="${safeAria}" target="_blank" rel="noopener">` +
    `Start exam <span aria-hidden="true">→</span></a></li>`;

  let html = indexHtml.slice(0, ulEnd - 4) + item + indexHtml.slice(ulEnd - 4);

  // Update the "(N)" counter in the same topic card.
  const countStart = html.indexOf('<span class="resource-count">(', topicIndex);
  if (countStart >= 0 && countStart < ulEnd + item.length) {
    const countEnd = html.indexOf(')</span>', countStart);
    if (countEnd > 0) {
      html = html.slice(0, countStart + '<span class="resource-count">('.length) + (existing + 1) + html.slice(countEnd);
    }
  }

  return { html, count: existing + 1, label: setLabel, item };
}

/** Extracts the topic number + title pairs from the practice-test index. */
export function listTopics(indexHtml) {
  const topics = [];
  const regex = /<span class="topic-number">([^<]+)<\/span>[\s\S]*?<h3>([\s\S]*?)<\/h3>/g;
  let match;
  while ((match = regex.exec(indexHtml || ''))) {
    topics.push({ number: match[1].trim(), title: decodeEntities(match[2].replace(/<[^>]+>/g, '')).trim() });
  }
  return topics;
}
