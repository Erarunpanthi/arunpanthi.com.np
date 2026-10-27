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
import { state, treeFiles, stage, stagedFor, publicUrl, siteUrl } from '../store.js';
import * as api from '../api.js';
import {
  parsePracticeTest,
  buildPracticeTest,
  createPracticeTestFromTemplate,
  addTestToIndex,
  listTopics
} from '../lib/practice-test.js';
import { createQuestionsEditor } from '../components/questions.js';
import { stageDependents } from '../lib/cache-bump.js';

let ctxRef = null;
let listEl = null;
let mainEl = null;
let selected = null;
let current = null; // { path, parsed, sha, source, isDraft }
let questionsEditor = null;
let dirty = false;
let bumpInput = null;
let searchValue = '';

const dir = () => state.config.paths.practiceTestDir;
const indexPath = () => state.config.paths.practiceTestIndex;
const templatePath = () => state.config.paths.practiceTestTemplate;

function testFiles() {
  return treeFiles()
    .filter((file) => file.path.startsWith(dir() + '/') && /\.html?$/i.test(file.path) && !/\/index\.html$/i.test(file.path))
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
}

function topicOf(path) {
  const name = path.split('/').pop() || '';
  const match = /^(\d+(?:\.\d+)?)-(\d+)\.html?$/i.exec(name);
  return match ? { topic: match[1], set: Number(match[2]) } : { topic: 'other', set: 0 };
}

function titleOf(path) {
  const { topic, set } = topicOf(path);
  return `Topic ${topic} · Set ${set || '?'}`;
}

export async function render(root, ctx) {
  destroy();
  ctxRef = ctx;
  if (!state.tree) await ctx.refreshTree({ silent: true });

  root.append(
    pageHead('Practice tests', 'Timed subject-wise test sets shown on the PSC preparation page.', [
      h('button', { class: 'btn', type: 'button', onClick: () => ctx.navigate('files', { path: indexPath() }) }, icon('layers', 15), 'Test index'),
      h('button', { class: 'btn btn-primary', type: 'button', onClick: openWizard }, icon('plus', 16), 'New test set')
    ])
  );

  const search = h('input', {
    class: 'input input-sm',
    type: 'search',
    placeholder: 'Search test sets…',
    value: searchValue,
    onInput: (event) => {
      searchValue = event.target.value;
      renderList();
    }
  });

  listEl = h('div', { class: 'ca-list' });
  mainEl = h('div', { class: 'ca-main' }, loadingView('Loading test sets…'));

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
          h('button', { class: 'btn btn-sm btn-soft grow', type: 'button', onClick: openWizard }, icon('plus', 14), 'New test')
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
  state.saveHandler = saveTest;

  renderList();
  if (ctx.query.path) await openTest(ctx.query.path);
  else {
    const first = testFiles()[0];
    if (first) await openTest(first.path);
    else renderEmpty();
  }
}

export function destroy() {
  state.saveHandler = null;
  state.leaveGuard = null;
  questionsEditor = null;
  current = null;
  selected = null;
  dirty = false;
  listEl = null;
  mainEl = null;
  ctxRef = null;
}

function renderList() {
  if (!listEl) return;
  clear(listEl);
  const files = testFiles();
  const needle = searchValue.trim().toLowerCase();
  const visible = files.filter((file) => !needle || file.path.toLowerCase().includes(needle) || titleOf(file.path).toLowerCase().includes(needle));

  if (!visible.length) {
    listEl.append(h('div', { class: 'tree-empty' }, files.length ? 'No test sets match that search.' : 'No test sets yet.'));
    return;
  }

  let currentTopic = null;
  for (const file of visible) {
    const { topic, set } = topicOf(file.path);
    if (topic !== currentTopic) {
      currentTopic = topic;
      listEl.append(h('div', { class: 'list-label' }, `Topic ${topic}`));
    }
    listEl.append(
      h(
        'button',
        {
          class: `ca-item ${selected === file.path ? 'active' : ''}`,
          type: 'button',
          onClick: () => requestOpen(file.path)
        },
        h(
          'div',
          { class: 'ca-item-top' },
          h('strong', null, `Set ${set || '?'}`),
          stagedFor(file.path) ? h('span', { class: 'staged-dot' }) : null
        ),
        h('span', { class: 'ca-item-name mono' }, file.path.split('/').pop())
      )
    );
  }
}

async function requestOpen(path) {
  if (path === selected) return;
  if (dirty) {
    const ok = await confirmDialog({
      title: 'Discard unsaved edits?',
      message: 'The current test set has changes that are not saved as a draft.',
      confirmLabel: 'Discard edits',
      danger: true
    });
    if (!ok) return;
  }
  await openTest(path);
}

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
          iconName: 'book',
          title: 'No practice test sets yet',
          message: 'Create a set from the shared template — it will be added to the test index automatically.',
          actionLabel: 'Create a test set',
          onAction: openWizard
        })
      )
    )
  );
}

async function openTest(path) {
  if (!mainEl) return;
  selected = path;
  dirty = false;
  ctxRef?.setQuery?.({ path });
  renderList();
  clear(mainEl);
  mainEl.append(loadingView('Loading ' + path + '…'));

  try {
    const staged = stagedFor(path);
    const file = staged?.text !== undefined ? { text: staged.text, sha: staged.originalSha } : await api.getFile(path);
    const parsed = parsePracticeTest(file.text);
    current = { path, parsed, sha: file.sha, source: file.text, isDraft: !!staged };
    renderEditor();
  } catch (error) {
    current = null;
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
            title: 'This page cannot be edited as a test set',
            message: error.message,
            actionLabel: 'Open in the file editor',
            onAction: () => ctxRef?.navigate('files', { path })
          })
        )
      )
    );
  }
}

function renderEditor() {
  if (!mainEl || !current) return;
  const { parsed, path } = current;
  const data = parsed.data;
  questionsEditor = null;

  const nameInput = textInput({
    value: data.name || '',
    placeholder: 'Physical Geography of Nepal - Practice Questions',
    onInput: (event) => {
      data.name = event.target.value;
      setDirty();
    }
  });
  const titleInput = textInput({
    value: parsed.title || '',
    placeholder: 'Page title',
    onInput: (event) => {
      parsed.title = event.target.value;
      setDirty();
    }
  });
  const descriptionInput = h('textarea', { class: 'textarea', rows: 3 });
  descriptionInput.value = parsed.metaDescription || '';
  descriptionInput.addEventListener('input', () => {
    parsed.metaDescription = descriptionInput.value;
    setDirty();
  });
  const canonicalInput = textInput({
    value: parsed.canonical || '',
    placeholder: 'https://arunpanthi.com.np/' + path,
    onInput: (event) => {
      parsed.canonical = event.target.value;
      setDirty();
    }
  });
  const detailsInput = h('textarea', { class: 'textarea', rows: 3 });
  detailsInput.value = data.details || '';
  detailsInput.addEventListener('input', () => {
    data.details = detailsInput.value;
    setDirty();
  });

  const editorHost = h('div');
  questionsEditor = createQuestionsEditor({
    questions: data.questions,
    onChange: (questions) => {
      data.questions = questions;
      setDirty();
      updateCount();
    },
    allowExplanation: true,
    minOptions: 2,
    maxOptions: 6,
    emptyMessage: 'No questions yet — add the first one.'
  });
  editorHost.append(questionsEditor.element);

  const countEl = h('span', { class: 'small muted' });
  function updateCount() {
    const questions = questionsEditor ? questionsEditor.getQuestions() : data.questions;
    const emptyOptions = questions.filter((question) => (question.options || []).some((option) => !String(option || '').trim())).length;
    clear(countEl);
    countEl.append(
      `${questions.length} question${questions.length === 1 ? '' : 's'}`,
      emptyOptions ? h('span', { class: 'warn-text' }, ` · ${emptyOptions} with empty options`) : ''
    );
  }

  bumpInput = h('input', { type: 'checkbox', checked: true });

  const saveButton = h('button', { class: 'btn btn-primary', type: 'button', onClick: saveTest }, icon('save', 16), 'Save draft');

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
          h('h2', { class: 'panel-title' }, titleOf(path), current.isDraft ? badge('Draft', 'warn') : null),
          h('div', { class: 'mono tiny muted' }, path)
        ),
        h(
          'div',
          { class: 'row-wrap' },
          h('a', { class: 'btn btn-sm', href: publicUrl(path), target: '_blank', rel: 'noopener' }, icon('external', 14), 'Open page'),
          h('button', { class: 'btn btn-sm', type: 'button', onClick: () => ctxRef?.navigate('files', { path }) }, icon('code', 14), 'Raw HTML'),
          saveButton
        )
      ),
      h(
        'div',
        { class: 'card-body stack' },
        current.isDraft ? notice('Showing your draft. Publish to update the live test.', 'warn', 'alert') : null,
        !data.questions.length
          ? notice('This set has no questions yet. Add at least one before publishing — otherwise the exam opens with an empty paper.', 'danger', 'alert')
          : null,
        h(
          'div',
          { class: 'form-grid' },
          h('div', { class: 'field' }, h('label', { class: 'label' }, 'Set name'), nameInput),
          h('div', { class: 'field' }, h('label', { class: 'label' }, 'Page title (`<title>`)'), titleInput),
          h('div', { class: 'field', style: 'grid-column:1/-1' }, h('label', { class: 'label' }, 'Description'), descriptionInput),
          h('div', { class: 'field', style: 'grid-column:1/-1' }, h('label', { class: 'label' }, 'Details shown above the exam'), detailsInput),
          h(
            'div',
            { class: 'field', style: 'grid-column:1/-1' },
            h('label', { class: 'label' }, 'Canonical URL'),
            canonicalInput,
            h('span', { class: 'hint' }, 'Absolute URL used by search engines. Usually this page’s own address.')
          )
        ),
        h('div', { class: 'divider' }),
        h('div', { class: 'row-between' }, h('h3', { class: 'panel-title' }, icon('help', 17), 'Questions'), countEl),
        editorHost,
        h(
          'div',
          { class: 'save-bar' },
          h('label', { class: 'checkbox tiny' }, bumpInput, h('span', null, 'Refresh cache-busting versions on the test index')),
          h('span', { class: 'grow' }),
          h('span', { class: 'tiny muted' }, 'Publishes as one commit with the index link unchanged')
        )
      )
    )
  );

  updateCount();
  updateSaveButton();
}

function setDirty() {
  dirty = true;
  updateSaveButton();
}

function updateSaveButton() {
  const save = mainEl?.querySelector('.card-head .btn-primary');
  if (save) save.disabled = !dirty;
  const title = mainEl?.querySelector('.panel-title');
  if (!title) return;
  const existing = title.querySelector('.badge-unsaved');
  if (dirty && !existing) title.append(h('span', { class: 'badge warn badge-unsaved' }, 'Unsaved'));
  else if (!dirty && existing) existing.remove();
}

async function saveTest() {
  if (!current) return;
  const { parsed } = current;
  const data = { ...parsed.data };
  if (questionsEditor) data.questions = questionsEditor.getQuestions();

  if (!data.questions.length) {
    toast('Add at least one question before saving', { type: 'warn' });
    return;
  }
  const broken = data.questions.findIndex(
    (question) => !String(question.question || '').trim() || (question.options || []).some((option) => !String(option || '').trim())
  );
  if (broken >= 0) {
    toast(`Question ${broken + 1} is incomplete`, { type: 'warn' });
    return;
  }

  await withBusy(async () => {
    const html = buildPracticeTest(parsed, {
      data,
      title: parsed.title,
      metaDescription: parsed.metaDescription,
      canonical: parsed.canonical
    });
    stage({
      path: current.path,
      text: html,
      originalText: current.source,
      originalSha: current.sha,
      size: html.length
    });

    let bumped = [];
    if (bumpInput?.checked) {
      bumped = await stageDependents({
        targetPath: current.path,
        candidates: [indexPath()],
        getFile: (candidate) => api.getFile(candidate),
        stage
      });
    }

    parsed.data = data;
    current.source = html;
    current.isDraft = true;
    dirty = false;
    updateSaveButton();
    renderList();
    if (bumped.length) toast('Saved as a draft and refreshed the index cache version', { type: 'success' });
    else toast('Saved as a draft — publish when ready', { type: 'success' });
  });
}

/* ------------------------------------------------------------------ */
/* new test wizard                                                    */
/* ------------------------------------------------------------------ */

async function openWizard() {
  const topicSelect = h('select', { class: 'select' });
  const status = h('div', { class: 'muted small' }, 'Loading topics from the test index…');
  let topics = [];

  const nameInput = textInput({ placeholder: 'Set 5 – Rivers and Lakes' });
  const titleInput = textInput({ placeholder: 'Rivers and Lakes of Nepal - Practice Questions' });
  const detailsInput = h('textarea', { class: 'textarea', rows: 3, placeholder: 'What this set covers…' });

  const modal = openModal({
    title: 'New practice test set',
    subtitle: 'Creates the page and adds a “Start exam” link to the test index.',
    size: 'lg',
    content: h(
      'div',
      { class: 'stack-sm' },
      h('label', { class: 'label' }, 'Topic'),
      topicSelect,
      status,
      h('label', { class: 'label' }, 'Set name'),
      nameInput,
      h('label', { class: 'label' }, 'Page title'),
      titleInput,
      h('label', { class: 'label' }, 'Details'),
      detailsInput,
      notice('The new set starts with one empty question. Add the rest in the editor after creating it.', 'info', 'info')
    ),
    actions: [
      { label: 'Cancel', variant: 'ghost' },
      {
        label: 'Create draft',
        variant: 'primary',
        iconName: 'plus',
        onClick: async (close) => {
          const topic = topicSelect.value;
          if (!topic) {
            toast('Choose a topic', { type: 'warn' });
            return false;
          }
          await createTest({ topic, name: nameInput.value, title: titleInput.value, details: detailsInput.value, close });
        }
      }
    ]
  });

  try {
    const index = stagedFor(indexPath())?.text ?? (await api.getFile(indexPath())).text;
    topics = listTopics(index);
    clear(topicSelect);
    if (!topics.length) {
      status.textContent = 'No topics were found in the index page. Use the file editor instead.';
      return;
    }
    for (const topic of topics) {
      topicSelect.append(h('option', { value: topic.number }, `${topic.number} — ${topic.title}`));
    }
    const lastTopic = topics[topics.length - 1];
    topicSelect.value = lastTopic.number;
    status.textContent = `${topics.length} topics available`;
    nameInput.placeholder = `Set ${nextSetNumber(topics[0].number)} – …`;
  } catch (error) {
    status.textContent = 'Could not read the test index: ' + error.message;
    status.className = 'notice danger';
  }

  return modal;
}

function nextSetNumber(topicNumber) {
  const sets = testFiles()
    .map((file) => topicOf(file.path))
    .filter((info) => info.topic === String(topicNumber))
    .map((info) => info.set);
  return sets.length ? Math.max(...sets) + 1 : 1;
}

async function createTest({ topic, name, title, details, close }) {
  const setNumber = nextSetNumber(topic);
  const fileName = `${topic}-${setNumber}.html`;
  const path = `${dir()}/${fileName}`;
  if (treeFiles().some((file) => file.path === path)) {
    toast('That file already exists', { type: 'error' });
    return false;
  }

  await withBusy(async () => {
    const template = await api.getFile(templatePath());
    const indexFile = stagedFor(indexPath())?.text !== undefined ? { text: stagedFor(indexPath()).text } : await api.getFile(indexPath());

    const setTitle = title.trim() || name.trim() || `Topic ${topic} Set ${setNumber}`;
    const html = createPracticeTestFromTemplate(template.text, {
      title: setTitle,
      name: name.trim() || setTitle,
      details: details.trim(),
      questions: [],
      canonical: `${siteUrl().replace(/\/$/, '')}/${path}`,
      metaDescription: details.trim().slice(0, 160)
    });

    let indexHtml = indexFile.text;
    try {
      const result = addTestToIndex(indexHtml, {
        topicNumber: topic,
        href: `/${path.replace(/\.html$/i, '')}`,
        label: name.trim() || setTitle,
        title: setTitle
      });
      indexHtml = result.html;
    } catch (error) {
      toast(error.message, { type: 'error', title: 'Index not updated' });
    }

    stage({ path, text: html, originalText: '', size: html.length });
    stage({ path: indexPath(), text: indexHtml, originalText: indexFile.text, size: indexHtml.length });
    toast(`Created ${fileName} and linked it from the test index`, { type: 'success' });
    close();
    await openTest(path);
  });
  return true;
}
