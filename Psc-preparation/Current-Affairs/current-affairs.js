/* Weekly Current Affairs index — a plain list with one entry for EVERY Wednesday
 * (Budhabar) from the series start until today, newest first.
 * The entry label is the Nepali (BS) date of that Wednesday.
 * No HTML edit is ever needed: just add the week's questions in tests.js. */
(function () {
  'use strict';
  var ND = window.NepaliDate;
  var TESTS = window.CA_TESTS || {};

  /* Series starts Wednesday 14 Oct 2026 AD = 28 Ashwin 2083 BS (Set 1). */
  var SERIES_START_AD = new Date(2026, 9, 14); // local midnight
  var EXAM_URL = '/Psc-preparation/Current-Affairs/exam.html';
  var DAY_MS = 86400000;

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

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
    var list = document.getElementById('weeklyTestList');
    if (!list || !ND) return;
    var today = startOfDay(new Date());
    var wednesdays = listWednesdays(today);
    var total = wednesdays.length;

    /* One plain status line above the list. */
    var status = document.getElementById('caStatus');
    if (status) {
      var nextAd = nextWednesday(today);
      var nextBs = ND.adToBs(nextAd);
      status.textContent = nextBs
        ? 'Today: ' + ND.formatBsNp(ND.adToBs(today)) +
          ' · Next test: ' + ND.formatBsNp(nextBs) + ' बुधबार (' + ND.formatAdEn(nextAd) + ')'
        : '';
    }

    list.textContent = '';
    if (!total) {
      var firstBs = ND.adToBs(SERIES_START_AD);
      if (firstBs) {
        list.appendChild(el('li', null, 'The first test opens on ' + ND.formatBsEn(firstBs) + ' (Wednesday).'));
      }
      return;
    }

    wednesdays.forEach(function (adDate, i) {
      var bs = ND.adToBs(adDate);
      if (!bs) return;
      var key = ND.keyOf(bs);
      var set = TESTS[key];

      var item = el('li');
      item.appendChild(el('span', 'ca-test-date',
        'Set ' + (total - i) + ' · ' + ND.formatBsNp(bs) + ' · बुधबार (' + ND.formatAdEn(adDate) + ')'));

      if (set) {
        var a = el('a', 'cta-button', 'Give Exam');
        a.href = EXAM_URL + '?date=' + key;
        a.setAttribute('aria-label', 'Give exam for Weekly Current Affairs Test, ' + ND.formatBsEn(bs));
        item.appendChild(a);
      } else {
        item.appendChild(el('span', 'ca-test-pending', 'Questions coming soon'));
      }
      list.appendChild(item);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
