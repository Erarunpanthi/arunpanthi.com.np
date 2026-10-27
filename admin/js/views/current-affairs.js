import {
  h,
  icon,
  clear,
  pageHead,
  toast,
  confirmDialog,
  openModal,
  loadingView,
  emptyState,
  notice,
  badge,
  textInput,
  withBusy
} from '../ui.js';
import { state, stage, stagedFor, publicUrl } from '../store.js';
import * as api from '../api.js';
import {
  parseCaTests,
  serializeCaTests,
  validateCaTests,
  createTestSet,
  renameTest
} from '../lib/ca-tests.js';
import { createQuestionsEditor } from '../components/questions.js';
import { stageDependents } from '../lib/cache-bump.js';
import {
  adToBs,
  bsToAd,
  bsMonthLength,
  formatBsEn,
  formatAdEn,
  nextWednesday,
  isWednesday,
  keyOf,
  parseKey,
  today,
  MONTH_EN,
  MIN_BS_YEAR,
  MAX_BS_YEAR
} from '../lib/bs-date.js';

let ctxRef = null;
let listEl = null;
let mainEl = null;
let model = null; // { path, tests, header, savedSource, sha, isDraft }
let selected = null;
let questionsEditor = null;
let dirty = false;
let bumpInput = null;
let searchValue = '';

function path() {
  return state.config.paths.currentAffairs;
}

function setCount(tests) {
  return Object.keys(tests || {}).length;
}

function countQuestions(set) {
  return Array.isArray(set?.questions) ? set.questions.length : 0;
}

export async function render(root, ctx) {
  destroy();
  ctxRef = ctx;
  root.append(
    pageHead('Weekly current affairs', 'A new Wednesday test set, every week. The site builds the buttons from this file.', [
      h('button', { class: 'btn', type: 'button', onClick: () => ctx.navigate('files', { path: path() }) }, icon('code', 15), 'Raw file'),
      h('button', { class: 'btn btn-primary', type: 'button', onClick: () => createSet() }, icon('plus', 16), 'New test set')
    ])
  );

  listEl = h('div', { class: 'ca-list' });
  mainEl = h('div', { class: 'ca-main' }, loadingView('Loading the question bank…'));

  const search = h('input', {
    class: 'input input-sm',
    type: 'search',
    placeholder: 'Search sets…',
    value: searchValue,
    onInput: (event) => {
      searchValue = event.target.value;
      renderList();
    }
  });

  root.append(
    h(
      'div',
      { class: 'ca-layout' },
      h(
        'aside',
        { class: 'card ca-sidebar' },
        h('div', { class: 'tree-search' }, search),
        listEl,
        h(
          'div',
          { class: 'tree-foot' },
          h('button', { class: 'btn btn-sm btn-soft grow', type: 'button', onClick: () => createSet() }, icon('plus', 14), 'New set')
        )
      ),
      mainEl
    )
  );

  state.leaveGuard = async () => {
    if (!dirty) return true;
    return confirmDialog({
      title: 'Discard edits?',
      message: 'This test set has changes that are not saved as a draft.',
      confirmLabel: 'Discard edits',
      danger: true
    });
  };
  state.saveHandler = saveSet;

  await load();

  if (ctx.query.key && model?.tests[ctx.query.key]) select(ctx.query.key);
  else {
    const keys = Object.keys(model?.tests || {}).sort();
    if (keys.length) select(keys[keys.length - 1]);
    else renderEmpty();
  }
}

export function destroy() {
  state.saveHandler = null;
  state.leaveGuard = null;
  questionsEditor = null;
  model = null;
  selected = null;
  dirty = false;
  listEl = null;
  mainEl = null;
  ctxRef = null;
}

async function load() {
  try {
    const staged = stagedFor(path());
    const file = staged?.text !== undefined ? { text: staged.text, sha: staged.originalSha } : await api.getFile(path());
    const parsed = parseCaTests(file.text);
    model = {
      path: path(),
      tests: parsed.tests,
      header: parsed.header,
      issues: parsed.issues,
      savedSource: file.text,
      sha: file.sha,
      isDraft: !!staged
    };
    dirty = false;
    renderList();
  } catch (error) {
    model = null;
    clear(mainEl);
    mainEl.append(
      h(
        'div',
        { class: 'card' },
        h(
          'div',
          { class: 'card-body' },
          emptyState({
            iconName: 'alert',
            title: 'Could not read the question bank',
            message: error.message,
            actionLabel: 'Open raw file',
            onAction: () => ctxRef?.navigate('files', { path: path() })
          })
        )
      )
    );
    if (listEl) clear(listEl);
  }
}

/* ------------------------------------------------------------------ */
/* list                                                               */
/* ------------------------------------------------------------------ */

function renderList() {
  if (!listEl || !model) return;
  clear(listEl);
  const keys = Object.keys(model.tests).sort().reverse();
  const needle = searchValue.trim().toLowerCase();
  const visible = keys.filter((key) => {
    if (!needle) return true;
    return key.includes(needle) || String(model.tests[key]?.name || '').toLowerCase().includes(needle);
  });

  if (!visible.length) {
    listEl.append(h('div', { class: 'tree-empty' }, keys.length ? 'No sets match that search.' : 'No test sets yet.'));
    return;
  }

  const groups = new Map();
  for (const key of visible) {
    const bs = parseKey(key);
    const year = bs ? bs.year : 'Unknown year';
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(key);
  }

  for (const [year, yearKeys] of groups) {
    listEl.append(h('div', { class: 'list-label' }, bsYearLabel(year)));
    for (const key of yearKeys) {
      const set = model.tests[key];
      const bs = parseKey(key);
      const change = stagedFor(path());
      listEl.append(
        h(
          'button',
          {
            class: `ca-item ${selected === key ? 'active' : ''}`,
            type: 'button',
            onClick: () => select(key)
          },
          h(
            'div',
            { class: 'ca-item-top' },
            h('strong', null, bs ? formatBsEn(bs) : key),
            model.isDraft && change ? h('span', { class: 'staged-dot' }) : null
          ),
          h('span', { class: 'ca-item-name' }, set?.name || 'Untitled set'),
          h(
            'span',
            { class: 'ca-item-meta' },
            `${countQuestions(set)} question${countQuestions(set) === 1 ? '' : 's'}`,
            bsToAd(bs) ? h('span', { class: 'dot-sep' }) : null,
            bsToAd(bs) ? formatAdEn(bsToAd(bs)) : h('span', { class: 'warn-text' }, 'invalid date')
          )
        )
      );
    }
  }
}

function bsYearLabel(year) {
  return typeof year === 'number' ? `${year} BS` : String(year);
}

function select(key) {
  if (key === selected) return;
  if (dirty && selected) {
    confirmDialog({
      title: 'Discard unsaved edits?',
      message: 'The set you were editing has changes that are not saved.',
      confirmLabel: 'Discard edits',
      danger: true
    }).then((ok) => {
      if (ok) {
        dirty = false;
        select(key);
      }
    });
    return;
  }
  selected = key;
  dirty = false;
  ctxRef?.setQuery?.({ key });
  renderList();
  renderEditor();
}

/* ------------------------------------------------------------------ */
/* editor                                                             */
/* ------------------------------------------------------------------ */

function renderEmpty() {
  if (!mainEl) return;
  clear(mainEl);
  mainEl.append(
    h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'card-body' },
        emptyState({
          iconName: 'calendar',
          title: 'No test sets yet',
          message: 'Create the first Wednesday current-affairs set. Each set is 10–20 MCQs with four options.',
          actionLabel: 'Create a test set',
          onAction: () => createSet()
        })
      )
    )
  );
}

function renderEditor() {
  if (!mainEl || !model) return;
  const set = model.tests[selected];
  if (!set) {
    renderEmpty();
    return;
  }
  clear(mainEl);
  questionsEditor = null;
  const bs = parseKey(selected);
  const ad = bs ? bsToAd(bs) : null;
  const wednesday = ad ? isWednesday(ad) : false;

  /* --- date picker --- */
  const dateKeyEl = h('span', { class: 'date-preview' });
  const yearOptions = [];
  for (let year = MIN_BS_YEAR; year <= MAX_BS_YEAR; year++) yearOptions.push(year);
  const startYear = bs?.year && !yearOptions.includes(bs.year) ? [bs.year, ...yearOptions] : yearOptions;

  const yearSelect = h(
    'select',
    { class: 'select select-sm', 'aria-label': 'BS year' },
    startYear.map((year) => h('option', { value: String(year), selected: year === bs?.year }, String(year)))
  );
  const monthSelect = h(
    'select',
    { class: 'select select-sm', 'aria-label': 'BS month' },
    MONTH_EN.map((name, index) => h('option', { value: String(index + 1), selected: index + 1 === bs?.month }, `${index + 1} · ${name}`))
  );
  const daySelect = h('select', { class: 'select select-sm', 'aria-label': 'BS day' });

  function fillDays() {
    const year = Number(yearSelect.value);
    const month = Number(monthSelect.value);
    const length = bsMonthLength(year, month) || 32;
    const current = Number(daySelect.value) || bs?.day || 1;
    clear(daySelect);
    for (let day = 1; day <= length; day++) {
      daySelect.append(h('option', { value: String(day), selected: day === Math.min(current, length) }, String(day)));
    }
  }
  fillDays();

  function currentKey() {
    const year = Number(yearSelect.value);
    const month = Number(monthSelect.value);
    const day = Number(daySelect.value);
    return keyOf({ year, month, day });
  }

  function updatePreview() {
    const key = currentKey();
    const candidate = parseKey(key);
    const candidateAd = candidate ? bsToAd(candidate) : null;
    clear(dateKeyEl);
    if (!candidateAd) {
      dateKeyEl.append(badge('Invalid BS date', 'danger'));
    } else if (!isWednesday(candidateAd)) {
      dateKeyEl.append(badge(formatAdEn(candidateAd) + ' is not a Wednesday', 'warn'));
    } else {
      dateKeyEl.append(badge('Wednesday', 'brand'), h('span', { class: 'tiny muted' }, formatAdEn(candidateAd)));
    }
  }

  function applyDate() {
    const nextKey = currentKey();
    if (nextKey === selected) {
      updatePreview();
      return;
    }
    if (model.tests[nextKey]) {
      toast(`A set already exists for ${nextKey}`, { type: 'error' });
      updatePreview();
      return;
    }
    const oldKey = selected;
    model.tests = renameTest(model.tests, oldKey, nextKey);
    selected = nextKey;
    dirty = true;
    ctxRef?.setQuery?.({ key: nextKey });
    renderList();
    updatePreview();
    toast(`Moved the set to ${formatBsEn(parseKey(nextKey))} — save to keep it`, { type: 'info', timeout: 2600 });
  }
  yearSelect.addEventListener('change', () => {
    fillDays();
    applyDate();
  });
  monthSelect.addEventListener('change', () => {
    fillDays();
    applyDate();
  });
  daySelect.addEventListener('change', applyDate);
  updatePreview();

  /* --- fields --- */
  const nameInput = textInput({
    value: set.name || '',
    placeholder: 'Weekly Current Affairs Test — 5 Kartik 2083',
    onInput: (event) => {
      set.name = event.target.value;
      dirty = true;
      markDirty();
      renderList();
    }
  });

  const detailsInput = h('textarea', {
    class: 'textarea',
    rows: 4,
    placeholder: 'Syllabus topic 1.16: …'
  });
  detailsInput.value = set.details || '';
  detailsInput.addEventListener('input', () => {
    set.details = detailsInput.value;
    dirty = true;
    markDirty();
  });

  const editorHost = h('div');
  questionsEditor = createQuestionsEditor({
    questions: set.questions,
    onChange: (questions) => {
      set.questions = questions;
      dirty = true;
      markDirty();
      updateIssues();
      renderList();
    },
    allowExplanation: true,
    minOptions: 2,
    maxOptions: 6,
    emptyMessage: 'No questions yet — add the first one.'
  });
  editorHost.append(questionsEditor.element);

  const issuesEl = h('div', { class: 'issue-list' });
  function updateIssues() {
    const issues = validateCaTests(model.tests).filter((issue) => !issue.date || issue.date === selected);
    clear(issuesEl);
    if (!issues.length) {
      issuesEl.append(h('div', { class: 'issue ok' }, icon('check-circle', 15), 'This set looks good and will publish cleanly.'));
      return;
    }
    for (const issue of issues.slice(0, 12)) {
      issuesEl.append(
        h(
          'div',
          { class: `issue ${issue.level === 'error' ? 'error' : 'warn'}` },
          icon(issue.level === 'error' ? 'x-circle' : 'alert', 15),
          h('span', null, issue.message)
        )
      );
    }
  }

  bumpInput = h('input', { type: 'checkbox', checked: true });
  bumpInput.checked = true;

  const saveButton = h(
    'button',
    { class: 'btn btn-primary', type: 'button', onClick: saveSet },
    icon('save', 16),
    'Save draft'
  );
  const deleteButton = h(
    'button',
    { class: 'btn btn-ghost btn-danger', type: 'button', onClick: deleteSet },
    icon('trash', 15),
    'Delete set'
  );

  mainEl.append(
    h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'card-head card-head-wrap' },
        h(
          'div',
          { class: 'grow' },
          h('h2', { class: 'panel-title' }, bs ? formatBsEn(bs) : selected, model.isDraft ? badge('Draft', 'warn') : null),
          h('div', { class: 'row-wrap small muted' }, h('span', { class: 'mono' }, selected), h('span', { class: 'dot-sep' }), dateKeyEl)
        ),
        h(
          'div',
          { class: 'row-wrap' },
          h(
            'a',
            {
              class: 'btn btn-sm',
              href: publicUrl(`Psc-preparation/Current-Affairs/exam/date=${selected}`),
              target: '_blank',
              rel: 'noopener'
            },
            icon('external', 14),
            'Preview exam'
          ),
          deleteButton,
          saveButton
        )
      ),
      h(
        'div',
        { class: 'card-body stack' },
        !wednesday ? notice('This date is not a Wednesday. The site only shows buttons for Wednesdays.', 'warn', 'alert') : null,
        model.isDraft ? notice('This file has unpublished changes. Publishing replaces the live question bank.', 'warn', 'alert') : null,
        h(
          'div',
          { class: 'form-grid' },
          h(
            'div',
            { class: 'field' },
            h('label', { class: 'label' }, 'Nepali (BS) date'),
            h('div', { class: 'date-row' }, yearSelect, monthSelect, daySelect)
          ),
          h('div', { class: 'field' }, h('label', { class: 'label' }, 'Test name'), nameInput),
          h(
            'div',
            { class: 'field', style: 'grid-column:1/-1' },
            h('label', { class: 'label' }, 'Details / syllabus line'),
            detailsInput,
            h(
              'div',
              { class: 'row-wrap', style: 'margin-top:6px' },
              h(
                'button',
                {
                  class: 'btn btn-sm btn-ghost',
                  type: 'button',
                  onClick: () => {
                    const latest = Object.keys(model.tests).sort().reverse().find((key) => key !== selected && model.tests[key]?.details);
                    if (!latest) {
                      toast('No other set has details to copy', { type: 'info' });
                      return;
                    }
                    detailsInput.value = model.tests[latest].details;
                    set.details = detailsInput.value;
                    dirty = true;
                    markDirty();
                    toast('Details copied from the latest set', { type: 'info' });
                  }
                },
                icon('copy', 14),
                'Copy from latest set'
              )
            )
          )
        ),
        h('div', { class: 'divider' }),
        h('div', { class: 'row-between' }, h('h3', { class: 'panel-title' }, icon('help', 17), 'Questions'), h('span', { class: 'small muted' }, `Set ${selected}`)),
        editorHost,
        issuesEl,
        h(
          'div',
          { class: 'save-bar' },
          h('label', { class: 'checkbox tiny' }, bumpInput, h('span', null, 'Also refresh cache-busting versions on the CA pages')),
          h('span', { class: 'grow' }),
          h(
            'button',
            {
              class: 'btn',
              type: 'button',
              onClick: async () => {
                if (!questionsEditor) return;
                const questions = questionsEditor.getQuestions();
                const set = model.tests[selected];
                openModal({
                  title: 'Export this set',
                  subtitle: formatBsEn(parseKey(selected) || { year: 0, month: 1, day: 1 }),
                  size: 'lg',
                  content: h(
                    'pre',
                    { class: 'code-block', style: 'max-height:50vh;overflow:auto' },
                    JSON.stringify({ [selected]: { ...set, questions } }, null, 2)
                  )
                });
              }
            },
            icon('download', 15),
            'Export JSON'
          )
        )
      )
    )
  );

  updateIssues();
  markDirty();
  updateSaveBar();
}

function markDirty() {
  updateSaveBar();
}

function updateSaveBar() {
  const save = mainEl?.querySelector('.card-head .btn-primary');
  if (save) save.disabled = !dirty;
  const title = mainEl?.querySelector('.panel-title');
  if (!title) return;
  const existing = title.querySelector('.badge-unsaved');
  if (dirty && !existing) {
    title.append(h('span', { class: 'badge warn badge-unsaved' }, 'Unsaved'));
  } else if (!dirty && existing) {
    existing.remove();
  }
}

/* ------------------------------------------------------------------ */
/* actions                                                            */
/* ------------------------------------------------------------------ */

function defaultDetails() {
  const keys = Object.keys(model?.tests || {}).sort();
  const latest = keys.reverse().find((key) => model.tests[key]?.details);
  return latest ? model.tests[latest].details : '';
}

function createSet() {
  if (!model) return;
  const ad = nextWednesday(today(), true);
  let bs = adToBs(ad);
  if (!bs) {
    toast('Could not calculate the next Wednesday in the supported BS range', { type: 'error' });
    return;
  }
  let key = keyOf(bs);
  // if that Wednesday already exists, keep moving forward
  let guard = 0;
  while (model.tests[key] && guard++ < 60) {
    const next = new Date(ad.getFullYear(), ad.getMonth(), ad.getDate() + 7 * guard);
    bs = adToBs(next);
    if (!bs) break;
    key = keyOf(bs);
  }

  const name = `Weekly Current Affairs Test — ${formatBsEn(bs)}`;
  const set = createTestSet({ dateKey: key, name, details: defaultDetails() });
  set.questions = [];
  model.tests[key] = set;
  dirty = true;
  selected = null;
  select(key);
  toast(`Created ${formatBsEn(bs)} — add questions, then save as a draft`, { type: 'info', timeout: 3200 });
  const nameField = mainEl?.querySelector('.field input.input');
  nameField?.focus();
}

async function saveSet() {
  if (!model || !selected) return;
  const set = model.tests[selected];
  if (questionsEditor) set.questions = questionsEditor.getQuestions();

  const issues = validateCaTests(model.tests).filter((issue) => !issue.date || issue.date === selected);
  const errors = issues.filter((issue) => issue.level === 'error');
  if (errors.length) {
    toast(errors[0].message, { type: 'error', title: `${errors.length} problem${errors.length === 1 ? '' : 's'} to fix` });
    return;
  }

  const source = serializeCaTests(model.tests, { header: model.header });
  await withBusy(async () => {
    stage({
      path: path(),
      text: source,
      originalText: model.savedSource,
      originalSha: model.sha,
      size: source.length
    });

    let bumped = [];
    if (bumpInput?.checked) {
      bumped = await stageDependents({
        targetPath: path(),
        candidates: [
          'Psc-preparation/Current-Affairs/index.html',
          'Psc-preparation/Current-Affairs/exam.html'
        ],
        getFile: (candidate) => api.getFile(candidate),
        stage
      });
    }

    model.savedSource = source;
    model.isDraft = true;
    dirty = false;
    renderList();
    updateSaveBar();
    const savedSet = mainEl?.querySelector('.card-head .panel-title');
    if (savedSet && !savedSet.querySelector('.badge')) savedSet.append(badge('Draft', 'warn'));
    toast(
      bumped.length
        ? `Saved as a draft, and refreshed cache versions on ${bumped.length} page${bumped.length === 1 ? '' : 's'}`
        : 'Saved as a draft — publish when you are ready',
      { type: 'success' }
    );
  });
}

async function deleteSet() {
  if (!model || !selected) return;
  const ok = await confirmDialog({
    title: 'Delete this test set?',
    message: `${formatBsEn(parseKey(selected))} and its ${countQuestions(model.tests[selected])} questions will be removed when you publish.`,
    confirmLabel: 'Delete set',
    danger: true
  });
  if (!ok) return;
  delete model.tests[selected];
  selected = null;
  dirty = false;
  const remaining = Object.keys(model.tests).sort();
  if (remaining.length) select(remaining[remaining.length - 1]);
  else {
    renderList();
    renderEmpty();
  }
  const source = serializeCaTests(model.tests, { header: model.header });
  stage({ path: path(), text: source, originalText: model.savedSource, originalSha: model.sha, size: source.length });
  model.savedSource = source;
  dirty = false;
  toast('Deletion saved as a draft', { type: 'success' });
}
