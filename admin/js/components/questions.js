/* Reusable multiple-choice question editor (current affairs + practice tests). */

import { h, icon, toast, clear, openModal, downloadText, confirmDialog, emptyState } from '../ui.js';
import { emptyQuestion, parseQuestionImport } from '../lib/ca-tests.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function validateQuestions(questions, { minQuestions = 1 } = {}) {
  const issues = [];
  const list = Array.isArray(questions) ? questions : [];
  if (list.length < minQuestions) {
    issues.push({ level: 'error', message: `Add at least ${minQuestions === 1 ? 'one question' : minQuestions + ' questions'}` });
    return issues;
  }
  const seen = new Map();
  list.forEach((question, index) => {
    const label = `Q${index + 1}`;
    const text = String(question?.question || '').trim();
    if (!text) issues.push({ level: 'error', index, message: `${label}: question text is empty` });
    else if (seen.has(text)) issues.push({ level: 'warn', index, message: `${label}: duplicates ${seen.get(text)}` });
    else seen.set(text, label);

    const options = Array.isArray(question?.options) ? question.options : [];
    if (options.length < 2) {
      issues.push({ level: 'error', index, message: `${label}: needs at least two options` });
    } else {
      if (options.some((option) => !String(option ?? '').trim())) {
        issues.push({ level: 'error', index, message: `${label}: every option needs text` });
      }
      const normalized = options.map((option) => String(option).trim().toLowerCase());
      if (new Set(normalized).size !== normalized.length) {
        issues.push({ level: 'warn', index, message: `${label}: duplicate option text` });
      }
    }
    if (!Number.isInteger(question?.correct) || question.correct < 0 || question.correct >= options.length) {
      issues.push({ level: 'error', index, message: `${label}: choose the correct option` });
    }
    if (question?.explanation && typeof question.explanation !== 'string') {
      issues.push({ level: 'warn', index, message: `${label}: explanation should be text` });
    }
  });
  return issues;
}

export function createQuestionsEditor({
  questions = [],
  onChange,
  allowExplanation = true,
  minOptions = 2,
  maxOptions = 6,
  emptyMessage = 'No questions yet'
} = {}) {
  let list = Array.isArray(questions) && questions.length ? structuredClone(questions) : [emptyQuestion()];
  const collapsed = new Set();
  const uid = 'q' + Math.random().toString(36).slice(2, 8);

  const summary = h('span', { class: 'small muted' });
  const listEl = h('div', { class: 'stack-sm' });

  const addButton = h(
    'button',
    { class: 'btn btn-sm btn-soft', type: 'button', onClick: () => addQuestion() },
    icon('plus', 15),
    'Add question'
  );
  const collapseButton = h(
    'button',
    { class: 'btn btn-sm btn-ghost', type: 'button', onClick: () => toggleCollapseAll() },
    icon('layers', 15),
    'Collapse all'
  );
  const importButton = h(
    'button',
    { class: 'btn btn-sm', type: 'button', onClick: () => openImport() },
    icon('upload', 15),
    'Import'
  );
  const exportButton = h(
    'button',
    { class: 'btn btn-sm', type: 'button', onClick: () => exportJson() },
    icon('download', 15),
    'Export'
  );

  const toolbar = h(
    'div',
    { class: 'q-toolbar' },
    summary,
    h('span', { class: 'spacer' }),
    collapseButton,
    importButton,
    exportButton,
    addButton
  );

  const root = h('div', { class: 'q-editor' }, toolbar, listEl);

  function notify() {
    updateSummary();
    if (onChange) onChange(list.map((question) => structuredClone(question)));
  }

  function updateSummary() {
    const complete = list.filter((question) => {
      const options = Array.isArray(question.options) ? question.options : [];
      return (
        String(question.question || '').trim() &&
        options.length >= 2 &&
        options.every((option) => String(option || '').trim()) &&
        Number.isInteger(question.correct) &&
        question.correct >= 0 &&
        question.correct < options.length
      );
    }).length;
    summary.textContent = `${list.length} question${list.length === 1 ? '' : 's'} · ${complete} ready`;
  }

  function addQuestion(index = list.length) {
    list.splice(index, 0, emptyQuestion());
    collapsed.delete(index);
    render();
    notify();
    const cards = listEl.querySelectorAll('.q-card');
    const card = cards[Math.min(index, cards.length - 1)];
    if (card) {
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      card.querySelector('textarea')?.focus();
    }
  }

  function removeQuestion(index) {
    const question = list[index];
    const doRemove = () => {
      if (list.length === 1) list = [emptyQuestion()];
      else list.splice(index, 1);
      render();
      notify();
    };
    if (question && String(question.question || '').trim()) {
      confirmDialog({
        title: 'Delete this question?',
        message: 'The question and its options will be removed from this draft.',
        confirmLabel: 'Delete question',
        danger: true
      }).then((ok) => {
        if (ok) doRemove();
      });
    } else {
      doRemove();
    }
  }

  function moveQuestion(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    render();
    notify();
  }

  function duplicateQuestion(index) {
    list.splice(index + 1, 0, structuredClone(list[index]));
    render();
    notify();
    toast('Question duplicated', { type: 'info', timeout: 1800 });
  }

  function toggleCollapseAll() {
    if (collapsed.size === list.length) collapsed.clear();
    else list.forEach((_, index) => collapsed.add(index));
    render();
  }

  function buildCard(question, index) {
    const isCollapsed = collapsed.has(index);
    const card = h('article', { class: `q-card ${isCollapsed ? 'collapsed' : ''}` });

    const preview = h('span', { class: 'q-preview' }, String(question.question || '').trim() || 'Untitled question');
    const toggle = h(
      'button',
      {
        class: 'q-toggle',
        type: 'button',
        onClick: () => {
          if (collapsed.has(index)) collapsed.delete(index);
          else collapsed.add(index);
          card.classList.toggle('collapsed');
          toggle.querySelector('svg')?.remove();
          toggle.prepend(icon(card.classList.contains('collapsed') ? 'chevron-right' : 'chevron-down', 14));
        }
      },
      icon(isCollapsed ? 'chevron-right' : 'chevron-down', 14),
      h('span', { class: 'q-num' }, `Q${index + 1}`),
      preview
    );

    const actions = h(
      'div',
      { class: 'q-actions' },
      h('button', { class: 'icon-btn', type: 'button', title: 'Move up', 'aria-label': 'Move up', onClick: () => moveQuestion(index, -1) }, icon('arrow-up', 15)),
      h('button', { class: 'icon-btn', type: 'button', title: 'Move down', 'aria-label': 'Move down', onClick: () => moveQuestion(index, 1) }, icon('arrow-down', 15)),
      h('button', { class: 'icon-btn', type: 'button', title: 'Duplicate', 'aria-label': 'Duplicate', onClick: () => duplicateQuestion(index) }, icon('copy', 15)),
      h('button', { class: 'icon-btn danger', type: 'button', title: 'Delete', 'aria-label': 'Delete', onClick: () => removeQuestion(index) }, icon('trash', 15))
    );

    const head = h('div', { class: 'q-head' }, toggle, actions);

    const questionInput = h('textarea', {
      class: 'textarea',
      rows: 2,
      placeholder: 'Type the question…',
      value: question.question || '',
      onInput: (event) => {
        question.question = event.target.value;
        preview.textContent = event.target.value.trim() || 'Untitled question';
        notify();
      }
    });

    const optionsWrap = h('div', { class: 'q-options' });
    const optionInputs = [];

    function renderOptions() {
      clear(optionsWrap);
      optionInputs.length = 0;
      question.options.forEach((option, optionIndex) => {
        const input = h('input', {
          class: 'input',
          type: 'text',
          value: option || '',
          placeholder: `Option ${LETTERS[optionIndex] || optionIndex + 1}`,
          onInput: (event) => {
            question.options[optionIndex] = event.target.value;
            notify();
          }
        });
        optionInputs.push(input);
        const radio = h('input', {
          type: 'radio',
          name: `${uid}-${index}`,
          checked: question.correct === optionIndex,
          'aria-label': `Option ${LETTERS[optionIndex]} is correct`,
          onChange: () => {
            question.correct = optionIndex;
            optionsWrap.querySelectorAll('.q-option').forEach((row, rowIndex) => {
              row.classList.toggle('correct', rowIndex === optionIndex);
            });
            notify();
          }
        });
        const removeButton = h(
          'button',
          {
            class: 'icon-btn',
            type: 'button',
            title: 'Remove option',
            'aria-label': 'Remove option',
            onClick: () => {
              if (question.options.length <= minOptions) {
                toast(`Keep at least ${minOptions} options`, { type: 'warn' });
                return;
              }
              question.options.splice(optionIndex, 1);
              if (question.correct >= question.options.length) question.correct = 0;
              renderOptions();
              notify();
            }
          },
          icon('x', 14)
        );
        optionsWrap.append(
          h(
            'div',
            { class: `q-option ${question.correct === optionIndex ? 'correct' : ''}` },
            radio,
            h('span', { class: 'opt-letter' }, LETTERS[optionIndex] || String(optionIndex + 1)),
            input,
            removeButton
          )
        );
      });

      if (question.options.length < maxOptions) {
        optionsWrap.append(
          h(
            'button',
            {
              class: 'btn btn-sm btn-ghost',
              style: 'width:fit-content',
              type: 'button',
              onClick: () => {
                question.options.push('');
                renderOptions();
                notify();
                optionInputs[optionInputs.length - 1]?.focus();
              }
            },
            icon('plus', 14),
            'Add option'
          )
        );
      }
    }
    renderOptions();

    const explanationInput = allowExplanation
      ? h('textarea', {
          class: 'textarea',
          rows: 2,
          placeholder: 'Explanation shown after the exam (optional)',
          value: question.explanation || '',
          onInput: (event) => {
            question.explanation = event.target.value;
            notify();
          }
        })
      : null;

    const body = h(
      'div',
      { class: 'q-body' },
      h('div', { class: 'q-field' }, h('span', null, 'Question'), questionInput),
      h(
        'div',
        { class: 'q-field' },
        h('span', null, 'Options — select the correct one'),
        optionsWrap,
        h('span', { class: 'q-hint' }, 'Click the circle on the left of the correct answer.')
      ),
      explanationInput ? h('div', { class: 'q-field' }, h('span', null, 'Explanation'), explanationInput) : null
    );

    card.append(head, body);
    return card;
  }

  function render() {
    clear(listEl);
    if (!list.length) {
      listEl.append(emptyState({ iconName: 'help', title: 'No questions yet', actionLabel: 'Add question', onAction: () => addQuestion(0) }));
    } else {
      list.forEach((question, index) => listEl.append(buildCard(question, index)));
    }
    updateSummary();
  }

  function openImport() {
    const textarea = h('textarea', {
      class: 'textarea mono',
      rows: 12,
      placeholder:
        'Paste JSON:\n[{"question":"…","options":["A","B","C","D"],"correct":0,"explanation":"…"}]\n\nor CSV with a header row:\nquestion,a,b,c,d,correct,explanation'
    });
    const mode = h(
      'select',
      { class: 'select' },
      h('option', { value: 'append' }, 'Add to existing questions'),
      h('option', { value: 'replace' }, 'Replace all questions')
    );
    openModal({
      title: 'Import questions',
      subtitle: 'JSON array or CSV / tab-separated text',
      size: 'lg',
      content: h('div', { class: 'stack-sm' }, textarea, h('label', { class: 'label' }, 'Import mode'), mode),
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: 'Import',
          variant: 'primary',
          iconName: 'upload',
          onClick: () => {
            try {
              const parsed = parseQuestionImport(textarea.value);
              if (!parsed.length) throw new Error('No questions found');
              if (mode.value === 'replace') list = parsed;
              else {
                if (list.length === 1 && !String(list[0].question || '').trim() && !list[0].options.some((option) => String(option || '').trim())) list = [];
                list = [...list, ...parsed];
              }
              render();
              notify();
              toast(`Imported ${parsed.length} question${parsed.length === 1 ? '' : 's'}`);
            } catch (error) {
              toast(error.message, { type: 'error', title: 'Import failed' });
              return false;
            }
          }
        }
      ]
    });
  }

  function exportJson() {
    downloadText(JSON.stringify(list, null, 2) + '\n', 'questions.json', 'application/json');
  }

  render();

  return {
    element: root,
    getQuestions: () => list.map((question) => structuredClone(question)),
    setQuestions(next) {
      list = Array.isArray(next) && next.length ? structuredClone(next) : [emptyQuestion()];
      collapsed.clear();
      render();
    },
    addQuestion,
    validate({ mark = true } = {}) {
      const issues = validateQuestions(list);
      if (mark) {
        const cards = [...listEl.querySelectorAll('.q-card')];
        cards.forEach((card) => card.classList.remove('invalid'));
        for (const issue of issues) {
          if (issue.level === 'error' && Number.isInteger(issue.index) && cards[issue.index]) {
            cards[issue.index].classList.add('invalid');
          }
        }
      }
      return issues;
    },
    focus() {
      listEl.querySelector('textarea, input')?.focus();
    }
  };
}
