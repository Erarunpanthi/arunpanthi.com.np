/* Extracts editable text nodes from an HTML document while keeping exact
 * source offsets, so edits can be written back without reformatting the file. */

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'textarea', 'code', 'pre']);
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

const ENTITY_MAP = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  times: '×',
  copy: '©',
  reg: '®',
  deg: '°',
  plusmn: '±',
  frac12: '½',
  middot: '·',
  laquo: '«',
  raquo: '»'
};

export function decodeEntities(text) {
  return String(text || '').replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const code = Number.parseInt(isHex ? entity.slice(2) : entity.slice(1), isHex ? 16 : 10);
      if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return match;
    }
    const value = ENTITY_MAP[entity.toLowerCase()];
    return value === undefined ? match : value;
  });
}

export function encodeText(text) {
  return String(text ?? '')
    .replace(/&(?!(#x?[0-9a-f]+|[a-z][a-z0-9]+);)/gi, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\u00a0/g, '&nbsp;');
}

function findTagEnd(html, start) {
  let quote = null;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '>') return i;
  }
  return -1;
}

function parseAttributes(source) {
  const attrs = {};
  const regex = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = regex.exec(source))) {
    const value = match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : match[4] !== undefined ? match[4] : '';
    attrs[match[1].toLowerCase()] = decodeEntities(value);
  }
  return attrs;
}

function context(stack) {
  const tags = stack.map((entry) => entry.tag);
  return {
    tags,
    inNav: tags.includes('nav'),
    inFooter: tags.includes('footer'),
    inHeader: tags.includes('header'),
    inMain: tags.includes('main'),
    id: [...stack].reverse().find((entry) => entry.attrs && entry.attrs.id)?.attrs.id || '',
    className: [...stack].reverse().find((entry) => entry.attrs && entry.attrs.class)?.attrs.class || ''
  };
}

/**
 * Returns [{ start, end, raw, text, tag, context, heading, isHeading }].
 * Only text nodes outside script/style/pre/etc. and with visible content.
 */
export function extractTextNodes(html, { includeWhitespace = false } = {}) {
  const nodes = [];
  const stack = [];
  let lastHeading = '';
  let lastHeadingLevel = 0;
  let i = 0;

  function addText(source, offset) {
    if (!source) return;
    if (stack.some((entry) => SKIP_TAGS.has(entry.tag) || entry.tag === 'head')) return;
    if (!includeWhitespace && !source.trim()) return;
    const raw = source;
    const text = decodeEntities(raw);
    if (!includeWhitespace && !text.trim()) return;
    const info = context(stack);
    const currentTag = stack.length ? stack[stack.length - 1].tag : '';
    const isHeading = HEADING_TAGS.has(currentTag);
    if (isHeading) {
      lastHeading = text.trim();
      lastHeadingLevel = Number(currentTag[1]) || 0;
    }
    nodes.push({
      start: offset,
      end: offset + raw.length,
      raw,
      text,
      tag: currentTag,
      isHeading,
      heading: lastHeading,
      headingLevel: lastHeadingLevel,
      context: info
    });
  }

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      addText(html.slice(i), i);
      break;
    }
    if (lt > i) addText(html.slice(i, lt), i);

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith('<!', lt) || html.startsWith('<?', lt)) {
      const end = html.indexOf('>', lt + 2);
      i = end === -1 ? html.length : end + 1;
      continue;
    }

    const gt = findTagEnd(html, lt + 1);
    if (gt === -1) {
      addText(html.slice(lt), lt);
      break;
    }
    const tagSource = html.slice(lt + 1, gt);
    const closing = tagSource.trimStart().startsWith('/');
    const selfClosing = tagSource.trimEnd().endsWith('/');
    const nameMatch = /^\/?\s*([a-zA-Z][\w:-]*)/.exec(tagSource);
    const tag = nameMatch ? nameMatch[1].toLowerCase() : '';

    if (closing) {
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].tag === tag) {
          stack.length = s;
          break;
        }
      }
    } else if (tag && !VOID_TAGS.has(tag) && !selfClosing) {
      const attrs = parseAttributes(nameMatch ? tagSource.slice(nameMatch[0].length) : '');
      stack.push({ tag, attrs });
    }
    i = gt + 1;
  }

  return nodes;
}

/** Applies { nodeIndex: newText } edits to the original HTML. */
export function applyTextChanges(html, nodes, changes) {
  const entries = Object.entries(changes || {})
    .map(([index, value]) => ({ node: nodes[Number(index)], value }))
    .filter((entry) => entry.node && entry.node.text !== entry.value)
    .sort((a, b) => b.node.start - a.node.start);

  let output = html;
  for (const entry of entries) {
    output =
      output.slice(0, entry.node.start) +
      encodeText(entry.value) +
      output.slice(entry.node.end);
  }
  return output;
}

/** Groups nodes under their nearest preceding heading, for the page editor. */
export function groupTextNodes(nodes) {
  const groups = [];
  let current = { heading: 'Page header', level: 0, nodes: [] };
  for (const node of nodes) {
    if (node.isHeading) {
      if (current.nodes.length) groups.push(current);
      current = { heading: node.text.trim() || 'Untitled section', level: Number(node.tag[1]) || 1, nodes: [node] };
    } else {
      if (!current.nodes.length) current.heading = node.heading || current.heading;
      current.nodes.push(node);
    }
  }
  if (current.nodes.length) groups.push(current);
  return groups;
}

export function textStats(nodes) {
  return {
    total: nodes.length,
    words: nodes.reduce((sum, node) => sum + node.text.trim().split(/\s+/).filter(Boolean).length, 0)
  };
}
