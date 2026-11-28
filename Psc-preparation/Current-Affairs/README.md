# Weekly Current Affairs Test

## For students

A card is listed for every Wednesday from the series start. Published tests show
**Give Exam →** and open the timed exam at a Nepali-date URL such as
`/Psc-preparation/Current-Affairs/exam/date=2083-06-28`. Dates without a question
set show **Questions coming soon** until the set is added.

## Publishing a Wednesday test

1. Edit `tests.js` and add the new test under `window.CA_TESTS`, using that
   Wednesday's Nepali (BS) date as the key in `YYYY-MM-DD` format. For example,
   28 Ashwin 2083 is `"2083-06-28"`.
2. Add the `name`, `details` and `questions`. Each question is shaped like
   `{ question: "…", options: ["…", "…", "…", "…"], correct: 0 }`, where
   `correct` is the right option's zero-based index. An optional `explanation`
   can be included. The time limit is 0.8 minutes per question.
3. Save `tests.js`. The archive card and its exam link are populated from that
   file automatically. **Do not create an exam folder or a dated HTML page.**
   The existing `exam.html` is the sole exam template. Its route is handled by
   `.htaccess` on Apache and by the existing `404.html` fallback on GitHub Pages.
4. Run `node tools/generate-current-affairs-exams.js --check` to validate the
   published dates and question data. The script does not generate files.

### Weeks when no test was held

If a Wednesday test is skipped (public holiday, festival, etc.), add the date
with a `notHeld` note and an empty `questions` array instead of leaving the week
empty. The archive card then shows a **Not held** badge and the reason, and the
dated exam URL shows the same note instead of an exam:

```js
"2083-07-25": {
  name: "Weekly Current Affairs Test — 25 Kartik 2083",
  notHeld: "भाइटीका",
  questions: []
}
```

The Wednesday series starts on 14 October 2026 AD (`2083-06-28` BS). Change
`SERIES_START_AD` in `current-affairs.js` only if the start date changes. Date
conversion and formatting are in `nepali-date.js`.
