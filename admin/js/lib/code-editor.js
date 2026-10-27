/* Dependency-free code editor: transparent textarea over a highlighted <pre>,
 * with line numbers, find, tab handling and auto-indent. */

import { h } from '../ui.js';

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function span(kind, text) {
  return `<span class="hl-${kind}">${escapeHtml(text)}</span>`;
}

function highlightAttributes(source) {
  let output = '';
  let last = 0;
  const regex = /([\w:-]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)?/g;
  let match;
  while ((match = regex.exec(source))) {
    output += escapeHtml(source.slice(last, match.index));
    output += span('attr', match[1]);
    if (match[2]) output += escapeHtml(match[2]);
    if (match[3]) output += span('string', match[3]);
    last = match.index + match[0].length;
  }
  output += escapeHtml(source.slice(last));
  return output;
}

function highlightHtml(code) {
  let output = '';
  let last = 0;
  const regex = /(<!--[\s\S]*?-->)|(<\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?>)/g;
  let match;
  while ((match = regex.exec(code))) {
    output += escapeHtml(code.slice(last, match.index));
    if (match[1]) {
      output += span('comment', match[1]);
    } else {
      output += span('punct', match[2]);
      output += span('tag', match[3]);
      output += highlightAttributes(match[4] || '');
      output += span('punct', match[5]);
    }
    last = match.index + match[0].length;
  }
  output += escapeHtml(code.slice(last));
  return output;
}

function highlightCss(code) {
  let output = '';
  let last = 0;
  const regex = /(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(@[\w-]+)|([-\w]+)(?=\s*:)|([^{}]+?)(?=\s*\{)/g;
  let match;
  while ((match = regex.exec(code))) {
    if (match.index < last) continue;
    output += escapeHtml(code.slice(last, match.index));
    if (match[1]) output += span('comment', match[1]);
    else if (match[2]) output += span('string', match[2]);
    else if (match[3]) output += span('at', match[3]);
    else if (match[4]) output += span('prop', match[4]);
    else if (match[5]) output += span('selector', match[5]);
    last = match.index + match[0].length;
  }
  output += escapeHtml(code.slice(last));
  return output;
}

function highlightJs(code) {
  let output = '';
  let last = 0;
  const regex =
    /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|(`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|async|await|import|export|from|default|try|catch|finally|throw|typeof|instanceof|in|of|delete|void|yield|static|get|set|null|undefined|true|false|this)\b|\b(\d+(?:\.\d+)?)\b/g;
  let match;
  while ((match = regex.exec(code))) {
    output += escapeHtml(code.slice(last, match.index));
    if (match[1]) output += span('comment', match[1]);
    else if (match[2]) output += span('string', match[2]);
    else if (match[3]) output += span('keyword', match[3]);
    else if (match[4]) output += span('number', match[4]);
    last = match.index + match[0].length;
  }
  output += escapeHtml(code.slice(last));
  return output;
}

function highlightJson(code) {
  let output = '';
  let last = 0;
  const regex = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/gi;
  let match;
  while ((match = regex.exec(code))) {
    output += escapeHtml(code.slice(last, match.index));
    if (match[1]) {
      output += span(match[2] ? 'attr' : 'string', match[1]);
      if (match[2]) output += escapeHtml(match[2]);
    } else if (match[3]) {
      output += span('keyword', match[3]);
    } else if (match[4]) {
      output += span('number', match[4]);
    }
    last = match.index + match[0].length;
  }
  output += escapeHtml(code.slice(last));
  return output;
}

function highlightMarkdown(code) {
  let output = '';
  let last = 0;
  const regex = /(^#{1,6}[^\n]*$)|(```[\s\S]*?```|`[^`\n]+`)|(\*\*[^*\n]+\*\*|__[^_\n]+__)|(\[[^\]\n]+\]\([^)\n]+\))/gm;
  let match;
  while ((match = regex.exec(code))) {
    output += escapeHtml(code.slice(last, match.index));
    if (match[1]) output += span('heading', match[1]);
    else if (match[2]) output += span('string', match[2]);
    else if (match[3]) output += span('keyword', match[3]);
    else if (match[4]) output += span('link', match[4]);
    last = match.index + match[0].length;
  }
  output += escapeHtml(code.slice(last));
  return output;
}

export function highlightCode(code, language) {
  switch (language) {
    case 'html':
    case 'xml':
      return highlightHtml(code);
    case 'css':
      return highlightCss(code);
    case 'javascript':
    case 'js':
      return highlightJs(code);
    case 'json':
      return highlightJson(code);
    case 'markdown':
      return highlightMarkdown(code);
    default:
      return escapeHtml(code);
  }
}

export function createCodeEditor({
  value = '',
  language = 'text',
  onChange,
  onCaret,
  readOnly = false,
  wrap = false,
  placeholder = '',
  height = null,
  highlightLimit = 400000
} = {}) {
  let currentLanguage = language;
  let raf = 0;
  let findMatches = 0;
  let findIndex = -1;

  const gutter = h('div', { class: 'code-gutter', 'aria-hidden': 'true' });
  const highlight = h('pre', { class: 'code-highlight', 'aria-hidden': 'true' });
  const textarea = h('textarea', {
    class: 'code-input',
    spellcheck: 'false',
    autocapitalize: 'off',
    autocomplete: 'off',
    wrap: 'off',
    placeholder,
    readOnly,
    'aria-label': 'File contents'
  });
  textarea.value = value;

  const findInput = h('input', { class: 'input input-sm', placeholder: 'Find in file…', 'aria-label': 'Find in file' });
  const findCount = h('span', { class: 'tiny muted' }, '');
  const findBar = h(
    'div',
    { class: 'find-bar', hidden: true },
    findInput,
    findCount,
    h('button', { class: 'btn btn-sm', type: 'button', onClick: () => runFind(-1) }, 'Prev'),
    h('button', { class: 'btn btn-sm', type: 'button', onClick: () => runFind(1) }, 'Next'),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close find', onClick: () => closeFind() }, '×')
  );

  const area = h('div', { class: 'code-area' }, highlight, textarea);
  const main = h('div', { class: 'code-main' }, gutter, area);
  const root = h('div', { class: `code-editor ${wrap ? 'wrap' : ''} ${readOnly ? 'readonly' : ''}` }, findBar, main);
  if (height) root.style.height = height;

  function lineCount(text) {
    let count = 1;
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) count += 1;
    return count;
  }

  function updateGutter() {
    const lines = lineCount(textarea.value);
    let numbers = '';
    for (let i = 1; i <= lines; i++) numbers += i + '\n';
    gutter.textContent = numbers;
  }

  function updateHighlight() {
    const text = textarea.value;
    if (text.length > highlightLimit) {
      highlight.textContent = text;
      return;
    }
    highlight.innerHTML = highlightCode(text, currentLanguage) + '\n';
  }

  function scheduleHighlight() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      updateHighlight();
      updateGutter();
    });
  }

  function caretInfo() {
    const position = textarea.selectionStart || 0;
    const before = textarea.value.slice(0, position);
    const line = before.split('\n').length;
    const column = position - before.lastIndexOf('\n');
    return { line, column, position };
  }

  function notifyCaret() {
    if (onCaret) onCaret(caretInfo());
  }

  function refresh() {
    updateHighlight();
    updateGutter();
    notifyCaret();
  }

  function setValue(next, { silent = false } = {}) {
    textarea.value = next ?? '';
    refresh();
    if (!silent && onChange) onChange(textarea.value);
  }

  function insertText(text, { selectOffset = null } = {}) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.setRangeText(text, start, end, 'end');
    if (selectOffset !== null) textarea.setSelectionRange(start + selectOffset, start + selectOffset);
    refresh();
    if (onChange) onChange(textarea.value);
  }

  function indentSelection(outdent = false) {
    const { selectionStart, selectionEnd, value: text } = textarea;
    const lineStart = text.lastIndexOf('\n', selectionStart - 1) + 1;
    const lineEnd = text.indexOf('\n', selectionEnd);
    const end = lineEnd === -1 ? text.length : lineEnd;
    const block = text.slice(lineStart, end);
    const lines = block.split('\n');
    const changed = lines.map((line) => {
      if (outdent) {
        if (line.startsWith('  ')) return line.slice(2);
        if (line.startsWith('\t')) return line.slice(1);
        return line;
      }
      return '  ' + line;
    });
    const nextBlock = changed.join('\n');
    textarea.setRangeText(nextBlock, lineStart, end, 'preserve');
    textarea.setSelectionRange(lineStart, lineStart + nextBlock.length);
    refresh();
    if (onChange) onChange(textarea.value);
  }

  function handleKeydown(event) {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === 's') {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent('admin:save'));
      return;
    }
    if (mod && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      openFind();
      return;
    }
    if (event.key === 'Escape' && !findBar.hidden) {
      closeFind();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      indentSelection(event.shiftKey);
      return;
    }
    if (event.key === 'Enter' && !mod) {
      const position = textarea.selectionStart;
      const text = textarea.value;
      const lineStart = text.lastIndexOf('\n', position - 1) + 1;
      const currentLine = text.slice(lineStart, position);
      const indentMatch = /^[ \t]*/.exec(currentLine);
      let indent = indentMatch ? indentMatch[0] : '';
      if (/[{\[(]\s*$/.test(currentLine)) indent += '  ';
      if (/<\/[a-zA-Z][\w:-]*>\s*$/.test(currentLine)) indent = indent.slice(0, Math.max(0, indent.length - 2));
      if (indent) {
        event.preventDefault();
        insertText('\n' + indent);
        return;
      }
    }
    if (event.key === '}' || event.key === ']' || event.key === ')') {
      /* allow default */
    }
  }

  function updateFindCount() {
    const query = findInput.value;
    if (!query) {
      findMatches = 0;
      findIndex = -1;
      findCount.textContent = '';
      return;
    }
    findMatches = textarea.value.split(query).length - 1;
    findCount.textContent = findMatches ? `${Math.max(0, findIndex + 1)} / ${findMatches}` : 'No matches';
  }

  function runFind(direction = 1) {
    const query = findInput.value;
    if (!query) return;
    const text = textarea.value;
    let index;
    if (direction > 0) {
      index = text.indexOf(query, textarea.selectionEnd);
      if (index < 0) index = text.indexOf(query);
    } else {
      index = text.lastIndexOf(query, Math.max(0, textarea.selectionStart - 1));
      if (index < 0) index = text.lastIndexOf(query);
    }
    if (index >= 0) {
      textarea.focus();
      textarea.setSelectionRange(index, index + query.length);
      const before = text.slice(0, index);
      const line = before.split('\n').length;
      const fontSize = parseInt(getComputedStyle(textarea).fontSize, 10) || 13;
      const lineHeight = Math.round(fontSize * 1.55);
      textarea.scrollTop = Math.max(0, (line - 1) * lineHeight - textarea.clientHeight / 3);
      highlight.scrollTop = textarea.scrollTop;
      gutter.scrollTop = textarea.scrollTop;
      findIndex = text.slice(0, index).split(query).length - 1;
    }
    updateFindCount();
  }

  function openFind() {
    findBar.hidden = false;
    findInput.focus();
    findInput.select();
  }

  function closeFind() {
    findBar.hidden = true;
    textarea.focus();
  }

  textarea.addEventListener('input', () => {
    scheduleHighlight();
    notifyCaret();
    if (onChange) onChange(textarea.value);
    if (!findBar.hidden) updateFindCount();
  });
  textarea.addEventListener('keydown', handleKeydown);
  textarea.addEventListener('click', notifyCaret);
  textarea.addEventListener('keyup', notifyCaret);
  textarea.addEventListener('scroll', () => {
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
    gutter.scrollTop = textarea.scrollTop;
  });
  findInput.addEventListener('input', () => {
    findIndex = -1;
    updateFindCount();
  });
  findInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runFind(event.shiftKey ? -1 : 1);
    }
    if (event.key === 'Escape') closeFind();
  });

  refresh();

  return {
    element: root,
    textarea,
    getValue: () => textarea.value,
    setValue,
    setLanguage(next) {
      currentLanguage = next;
      updateHighlight();
    },
    setReadOnly(next) {
      textarea.readOnly = next;
      root.classList.toggle('readonly', next);
    },
    setWrap(next) {
      root.classList.toggle('wrap', !!next);
    },
    getCaret: caretInfo,
    focus: () => textarea.focus(),
    insertText,
    gotoLine(line) {
      const lines = textarea.value.split('\n');
      const target = Math.max(1, Math.min(lines.length, Number(line) || 1));
      let index = 0;
      for (let i = 0; i < target - 1; i++) index += lines[i].length + 1;
      textarea.focus();
      textarea.setSelectionRange(index, index);
      const fontSize = parseInt(getComputedStyle(textarea).fontSize, 10) || 13;
      textarea.scrollTop = Math.max(0, (target - 1) * Math.round(fontSize * 1.55) - 40);
      textarea.dispatchEvent(new Event('scroll'));
    },
    openFind,
    destroy() {
      cancelAnimationFrame(raf);
    }
  };
}
