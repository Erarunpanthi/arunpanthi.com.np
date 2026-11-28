(() => {
  'use strict';

  // These PSC pages contain question cards with labelled options and answers.
  const pages = ['1.1', '1.8', '1.12', '2.1', '2.1.1', '2.1.2'];
  const dateInput = document.getElementById('quiz-date');
  const status = document.getElementById('status');
  const quiz = document.getElementById('quiz');
  const fields = document.getElementById('fields');
  let questions = [];

  function lines(element) {
    const copy = element.cloneNode(true);
    copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    return copy.textContent.split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }

  function extract(html, page) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('.card')).flatMap(card => {
      const paragraph = card.querySelector('p');
      const answer = card.querySelector('.answer');
      if (!paragraph || !answer) return [];
      const content = lines(paragraph);
      const firstOption = content.findIndex(line => /^a\)\s+/i.test(line));
      if (firstOption < 1 || content.length !== firstOption + 4) return [];
      const optionLines = content.slice(firstOption);
      if (!optionLines.every((line, i) => line.toLowerCase().startsWith('abcd'[i] + ')'))) return [];
      const options = optionLines.map(line => line.slice(2).trim());
      if (options.some(option => !option || /^option [a-d]$/i.test(option))) return [];
      const match = (lines(answer)[0] || '').match(/^([a-d])\)\s*(.+)/i);
      if (!match) return [];
      const correct = 'abcd'.indexOf(match[1].toLowerCase());
      // Avoid cards where the answer text and corresponding option do not match.
      if (match[2].trim().toLowerCase() !== options[correct].toLowerCase()) return [];
      return [{ question: content.slice(0, firstOption).join(' '), options, correct, page }];
    });
  }

  function nepalDate() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const value = type => parts.find(part => part.type === type).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }

  async function copyText(text) {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      status.textContent = 'Copied. Paste it into the matching WhatsApp field.';
    } catch (_) {
      status.textContent = 'Copy unavailable. Select the text and copy it manually.';
    }
  }

  function addField(label, value) {
    const row = document.createElement('div');
    row.className = 'field';
    const text = document.createElement('p');
    const heading = document.createElement('strong');
    heading.textContent = `${label}: `;
    text.append(heading, document.createTextNode(value));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', `Copy ${label.toLowerCase()}`);
    button.addEventListener('click', () => copyText(value));
    row.append(text, button);
    fields.append(row);
  }

  function showQuestion() {
    const date = dateInput.value;
    if (!date || !questions.length) { quiz.hidden = true; return; }
    const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
    if (!Number.isFinite(day)) { quiz.hidden = true; return; }
    const item = questions[((day % questions.length) + questions.length) % questions.length];
    fields.replaceChildren();
    addField('Question', item.question);
    item.options.forEach((option, index) => addField(`Option ${'ABCD'[index]}`, option));
    document.getElementById('answer').textContent = `${'ABCD'[item.correct]}) ${item.options[item.correct]}`;
    document.getElementById('source').href = `/Psc-preparation/MCQ/${item.page}`;
    status.textContent = `Quiz for ${date} · ${questions.length} available questions`;
    quiz.hidden = false;
  }

  dateInput.value = nepalDate();
  dateInput.addEventListener('change', showQuestion);
  Promise.all(pages.map(async page => {
    const response = await fetch(`/Psc-preparation/MCQ/${page}.html`);
    if (!response.ok) throw new Error(`Could not load ${page}`);
    return extract(await response.text(), page);
  })).then(groups => {
    questions = groups.flat();
    if (!questions.length) throw new Error('No compatible questions found');
    showQuestion();
  }).catch(() => {
    status.textContent = 'Could not load the PSC questions. Check your connection and reload this page.';
  });
})();
