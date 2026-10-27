/* Bikram Sambat <-> Gregorian conversion, mirroring
 * Psc-preparation/Current-Affairs/nepali-date.js (2070–2090 BS). */

const BS_MONTHS = {
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2085: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2086: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30]
};

export const MONTH_EN = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
export const MONTH_NP = ['बैशाख', 'जेठ', 'असर', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'];
export const WEEKDAY_NP = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
const NP_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const DAY_MS = 86400000;
const EPOCH_AD_UTC = Date.UTC(1943, 3, 14); // 1 Baisakh 2000 BS
const DAYS_2000_TO_2069 = 25568;

export const MIN_BS_YEAR = 2070;
export const MAX_BS_YEAR = 2090;

const pad = (n) => (n < 10 ? '0' : '') + n;

export function toNepaliDigits(value) {
  return String(value).replace(/\d/g, (digit) => NP_DIGITS[Number(digit)]);
}

export function bsMonthLength(year, month) {
  const months = BS_MONTHS[year];
  return months ? months[month - 1] : 0;
}

export function bsMonthNames() {
  return MONTH_EN.map((name, index) => ({ index: index + 1, en: name, np: MONTH_NP[index] }));
}

/** AD Date -> BS { year, month, day, weekday } (or null outside 2070–2090). */
export function adToBs(adDate) {
  if (!(adDate instanceof Date) || Number.isNaN(adDate.getTime())) return null;
  const utc = Date.UTC(adDate.getFullYear(), adDate.getMonth(), adDate.getDate());
  let days = Math.round((utc - EPOCH_AD_UTC) / DAY_MS);
  if (days < DAYS_2000_TO_2069) return null;
  days -= DAYS_2000_TO_2069;
  let year = MIN_BS_YEAR;
  while (BS_MONTHS[year]) {
    const yearLength = BS_MONTHS[year].reduce((sum, value) => sum + value, 0);
    if (days < yearLength) break;
    days -= yearLength;
    year += 1;
  }
  if (!BS_MONTHS[year]) return null;
  let month = 0;
  while (month < 12 && days >= BS_MONTHS[year][month]) {
    days -= BS_MONTHS[year][month];
    month += 1;
  }
  return { year, month: month + 1, day: days + 1, weekday: adDate.getDay() };
}

/** BS { year, month, day } -> AD Date at local midnight (or null). */
export function bsToAd(bs) {
  if (!bs) return null;
  const year = Number(bs.year);
  const month = Number(bs.month);
  const day = Number(bs.day);
  if (!BS_MONTHS[year] || month < 1 || month > 12) return null;
  if (day < 1 || day > BS_MONTHS[year][month - 1]) return null;

  let days = 0;
  for (let y = MIN_BS_YEAR; y < year; y++) {
    days += BS_MONTHS[y].reduce((sum, value) => sum + value, 0);
  }
  for (let m = 0; m < month - 1; m++) days += BS_MONTHS[year][m];
  days += day - 1;
  days += DAYS_2000_TO_2069;

  const utc = new Date(EPOCH_AD_UTC + days * DAY_MS);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

export function keyOf(bs) {
  return `${bs.year}-${pad(bs.month)}-${pad(bs.day)}`;
}

export function parseKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function formatBsEn(bs) {
  return `${bs.day} ${MONTH_EN[bs.month - 1]} ${bs.year} BS`;
}

export function formatBsNp(bs) {
  return `${toNepaliDigits(bs.day)} ${MONTH_NP[bs.month - 1]} ${toNepaliDigits(bs.year)}`;
}

export function formatAdEn(adDate) {
  return adDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatAdInput(adDate) {
  return `${adDate.getFullYear()}-${pad(adDate.getMonth() + 1)}-${pad(adDate.getDate())}`;
}

export function weekdayNp(weekday) {
  return WEEKDAY_NP[weekday];
}

/** Today at local midnight. */
export function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Next Wednesday strictly after `from` (or on/after when includeToday). */
export function nextWednesday(from = today(), includeToday = false) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (date.getDay() !== 3) date.setDate(date.getDate() + 1);
  if (!includeToday && date.getTime() === new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) {
    date.setDate(date.getDate() + 7);
  }
  return date;
}

export function isWednesday(adDate) {
  return adDate instanceof Date && adDate.getDay() === 3;
}
