/* Weekly Current Affairs index — a new test button is generated automatically
 * for EVERY Wednesday (Budhabar) from the series start until today.
 * The button label is the Nepali (BS) date of that Wednesday.
 * No HTML edit is ever needed: just add the week's questions in tests.js. */
(function () {
  'use strict';
  var ND = window.NepaliDate;
  var TESTS = window.CA_TESTS || {};

  /* Series starts Wednesday 14 Oct 2026 AD = 28 Ashwin 2083 BS (Set 1). */
  var SERIES_START_AD = new Date(2026, 9, 14); // local midnight
  var EXAM_URL = '/Psc-preparation/Current-Affairs/exam/date=';
  var DAY_MS = 86400000;

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function daysBetween(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS); }

  /* All Wednesdays from the series start up to (and including) today, newest first. */
  function listWednesdays(today) {
    var list = [];
    var d = new Date(SERIES_START_AD);
    // Safety: move forward to the first Wednesday on/after the start date.
    while (d.getDay() !== 3) d = new Date(d.getTime() + DAY_MS);
    while (d <= today) { list.push(new Date(d)); d = new Date(d.getTime() + 7 * DAY_MS); }
    return list.reverse();
  }
  function nextWednesday(today) {
    var d = new Date(SERIES_START_AD);
    while (d.getDay() !== 3) d = new Date(d.getTime() + DAY_MS);
    while (d <= today) d = new Date(d.getTime() + 7 * DAY_MS);
    return d;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function render() {
    var grid = document.getElementById('weeklyTestGrid');
    if (!grid || !ND) return;
    var today = startOfDay(new Date());
    var wednesdays = listWednesdays(today);
    var total = wednesdays.length;

    /* ---- Hero / status strip ---- */
    var todayBs = ND.adToBs(today);
    var todayEl = document.getElementById('caTodayBs');
    if (todayEl && todayBs) {
      todayEl.textContent = 'आज: ' + ND.formatBsNp(todayBs) + ' (' + ND.weekdayNp(today.getDay()) + ') · ' + ND.formatAdEn(today);
    }
    var next = nextWednesday(today);
    var nextBs = ND.adToBs(next);
    var nextEl = document.getElementById('caNextTest');
    if (nextEl && nextBs) {
      var inDays = daysBetween(today, next);
      nextEl.textContent = 'Next test: ' + ND.formatBsNp(nextBs) + ' बुधबार (' + ND.formatAdEn(next) + ') — in ' + inDays + (inDays === 1 ? ' day' : ' days');
    }
    var countEl = document.getElementById('caTestCount');
    if (countEl) countEl.textContent = total + (total === 1 ? ' weekly test' : ' weekly tests') + ' so far';

    /* ---- Wednesday cards (auto-generated) ---- */
    grid.textContent = '';
    if (!total) {
      grid.appendChild(el('p', null, 'The first Weekly Current Affairs Test opens on ' + ND.formatBsNp(ND.adToBs(SERIES_START_AD)) + ' (Wednesday).'));
      return;
    }
    wednesdays.forEach(function (adDate, i) {
      var setNo = total - i;
      var bs = ND.adToBs(adDate);
      if (!bs) return;
      var key = ND.keyOf(bs);
      var set = TESTS[key];
      var isToday = daysBetween(adDate, today) === 0;
      var isLatest = i === 0;

      var card = el('article', 'topic-card available ca-card');

      var top = el('div', 'topic-top');
      top.appendChild(el('span', 'topic-number', 'Set ' + setNo));
      var badge = el('span', isToday ? 'ca-badge ca-live' : 'ca-badge',
        isToday ? '● Live today' : (isLatest ? 'Latest test' : 'Wednesday'));
      top.appendChild(badge);
      card.appendChild(top);

      card.appendChild(el('h3', null, 'Current Affairs Test — ' + ND.formatBsNp(bs)));
      var sub = el('p', null,
        ND.formatBsEn(bs) + ' · बुधबार (Wednesday)\n' + ND.formatAdEn(adDate) +
        (set ? ' · ' + set.questions.length + ' questions · ' + Math.round(set.questions.length * 0.8) + ' min' : ''));
      sub.style.whiteSpace = 'pre-line';
      card.appendChild(sub);

      if (set) {
        var a = el('a', 'notes-button', isLatest ? 'Give Exam →' : 'Start exam →');
        a.href = EXAM_URL + key;
        a.setAttribute('aria-label', 'Give exam for Weekly Current Affairs Test, ' + ND.formatBsEn(bs) + ' (opens the timed exam)');
        card.appendChild(a);
      } else {
        card.appendChild(el('span', 'coming-soon', 'Questions coming soon'));
      }
      grid.appendChild(card);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
