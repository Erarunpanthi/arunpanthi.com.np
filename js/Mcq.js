/**
 * Mcq.js - "Show Answer" controller for the MCQ practice pages.
 *
 * The answer blocks are collapsed by css/Mcq.css (.answer { max-height: 0 }),
 * so this script is what makes the "Show Answer" buttons work at all.
 * It is intentionally defensive:
 *   - navigation buttons (onclick="location.href='#...'") are never hijacked,
 *   - running twice (or next to mcq-script.js) is harmless,
 *   - markup is left untouched, only classes / ARIA attributes are updated.
 */

(function () {
  'use strict';

  var SHOW_LABEL = 'Show Answer';
  var HIDE_LABEL = 'Hide Answer';

  function isNavigationButton(button) {
    var onclick = button.getAttribute('onclick') || '';
    var href = button.getAttribute('href') || '';
    return onclick.indexOf('location') !== -1 || href.length > 0;
  }

  function answerFor(button) {
    var card = button.closest('.card, .question, .faq-item');
    if (card) {
      var inCard = card.querySelector('.answer');
      if (inCard) return inCard;
    }
    // Fallback: the answer block that directly follows the button's wrapper.
    var node = button.parentElement;
    while (node && node !== document.body) {
      var next = node.nextElementSibling;
      if (next && next.classList && next.classList.contains('answer')) return next;
      node = node.nextElementSibling;
      if (node && node.classList && node.classList.contains('answer')) return node;
      if (node && node.classList && node.classList.contains('card')) break;
    }
    return null;
  }

  function setLabel(button, isOpen) {
    var icon = button.querySelector('i');
    if (!icon) {
      icon = document.createElement('i');
      icon.setAttribute('aria-hidden', 'true');
      button.insertBefore(icon, button.firstChild);
    }
    icon.className = isOpen ? 'fas fa-eye-slash' : 'fas fa-eye';

    var text = button.querySelector('span.mcq-btn-label');
    if (!text) {
      // Read the existing label once, then replace the loose text nodes with a
      // single span so the label can be swapped without duplicating text.
      var raw = '';
      for (var i = button.childNodes.length - 1; i >= 0; i--) {
        var node = button.childNodes[i];
        if (node.nodeType === 3) {
          raw = node.nodeValue + raw;
          button.removeChild(node);
        }
      }
      text = document.createElement('span');
      text.className = 'mcq-btn-label';
      button.appendChild(text);
      raw = raw.replace(/\s+/g, ' ').trim();
      if (raw) {
        // Remember the wording used by the page ("Show Answer" / "Show Solution").
        button.dataset.showLabel = /hide/i.test(raw) ? SHOW_LABEL : raw;
      }
    }

    var showLabel = button.dataset.showLabel || SHOW_LABEL;
    var hideLabel = showLabel.replace(/^show/i, 'Hide');
    if (hideLabel === showLabel) hideLabel = HIDE_LABEL;
    text.textContent = isOpen ? hideLabel : showLabel;
    button.setAttribute('aria-label', text.textContent);
  }

  /* Reveal / collapse the answer.
     The exact pixel height is applied inline so the open panel is never clipped
     and the 0.4s max-height transition still animates smoothly. */
  function setOpen(answer, isOpen) {
    if (isOpen) {
      answer.classList.add('show', 'visible');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    } else {
      // Freeze the current height first so collapsing animates instead of jumping.
      answer.style.maxHeight = answer.scrollHeight + 'px';
      /* eslint-disable no-unused-expressions */
      answer.offsetHeight;
      answer.classList.remove('show', 'visible');
      answer.style.maxHeight = '';
    }
  }

  function toggle(button, force) {
    var answer = answerFor(button);
    if (!answer) return;

    var isOpen = typeof force === 'boolean' ? force : !answer.classList.contains('show');

    setOpen(answer, isOpen);
    answer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    var card = button.closest('.card');
    if (card) card.classList.toggle('viewed', isOpen);

    setLabel(button, isOpen);
  }

  function enhance(button) {
    if (button.dataset.mcqReady === 'true') return;   // already wired
    if (isNavigationButton(button)) return;           // section shortcut, leave it alone

    var answer = answerFor(button);
    if (!answer) return;                              // nothing to toggle, leave it alone

    button.dataset.mcqReady = 'true';
    button.setAttribute('type', 'button');
    button.setAttribute('aria-expanded', answer.classList.contains('show') ? 'true' : 'false');

    if (!answer.id) {
      answer.id = 'answer-' + Math.random().toString(36).slice(2, 9);
    }
    button.setAttribute('aria-controls', answer.id);
    answer.setAttribute('aria-hidden', answer.classList.contains('show') ? 'false' : 'true');

    setLabel(button, answer.classList.contains('show'));

    button.addEventListener('click', function (event) {
      event.preventDefault();
      toggle(button);
    });
  }

  // Keep open answers fully visible when the text reflows (rotation / resize).
  function refreshOpenAnswers() {
    var open = document.querySelectorAll('.answer.show');
    for (var i = 0; i < open.length; i++) {
      open[i].style.maxHeight = open[i].scrollHeight + 'px';
    }
  }

  function init() {
    var buttons = document.querySelectorAll('.nav-btn, .show-answer, button.answer-toggle');
    for (var i = 0; i < buttons.length; i++) enhance(buttons[i]);
  }

  if (!window.__mcqResizeBound) {
    window.__mcqResizeBound = true;
    window.addEventListener('resize', refreshOpenAnswers);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // The partials (navbar / footer) load after DOMContentLoaded; re-run once they
  // are in place so dynamically added MCQ blocks are wired up too.
  window.addEventListener('load', init);
})();
