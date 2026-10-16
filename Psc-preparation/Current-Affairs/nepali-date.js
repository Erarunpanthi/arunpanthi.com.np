/* Nepali (Bikram Sambat) date helpers — no library needed.
 * BS month lengths 2070–2090 BS (source data: nepali-date-converter calendar table).
 * Anchor: 1 Baisakh 2000 BS = 14 April 1943 AD. */
(function (global) {
  'use strict';
  var BS_MONTHS = {
    2070:[31,31,31,32,31,31,29,30,30,29,30,30],2071:[31,31,32,31,31,31,30,29,30,29,30,30],
    2072:[31,32,31,32,31,30,30,29,30,29,30,30],2073:[31,32,31,32,31,30,30,30,29,29,30,31],
    2074:[31,31,31,32,31,31,30,29,30,29,30,30],2075:[31,31,32,31,31,31,30,29,30,29,30,30],
    2076:[31,32,31,32,31,30,30,30,29,29,30,30],2077:[31,32,31,32,31,30,30,30,29,30,29,31],
    2078:[31,31,31,32,31,31,30,29,30,29,30,30],2079:[31,31,32,31,31,31,30,29,30,29,30,30],
    2080:[31,32,31,32,31,30,30,30,29,29,30,30],2081:[31,32,31,32,31,30,30,30,29,30,29,31],
    2082:[31,31,32,31,31,31,30,29,30,29,30,30],2083:[31,31,32,31,31,31,30,29,30,29,30,30],
    2084:[31,32,31,32,31,30,30,30,29,29,30,31],2085:[30,32,31,32,31,30,30,30,29,30,29,31],
    2086:[31,31,32,31,31,31,30,29,30,29,30,30],2087:[31,31,32,31,31,31,30,30,29,30,30,30],
    2088:[30,31,32,32,30,31,30,30,29,30,30,30],2089:[30,32,31,32,31,30,30,30,29,30,30,30],
    2090:[30,32,31,32,31,30,30,30,29,30,30,30]
  };
  var MONTH_EN = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
  var MONTH_NP = ['बैशाख','जेठ','असार','साउन','भदौ','असोज','कात्तिक','मंसिर','पुस','माघ','फागुन','चैत'];
  var WEEKDAY_NP = ['आइतबार','सोमबार','मंगलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
  var NP_DIGITS = ['०','१','२','३','४','५','६','७','८','९'];
  var EPOCH_AD_UTC = Date.UTC(1943, 3, 14); // 1 Baisakh 2000 BS
  var DAY_MS = 86400000;

  function toNepaliDigits(value) {
    return String(value).replace(/\d/g, function (d) { return NP_DIGITS[+d]; });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* AD Date -> {year, month (1-12), day, weekday} in BS. Returns null outside 2070–2090 BS. */
  function adToBs(adDate) {
    var utc = Date.UTC(adDate.getFullYear(), adDate.getMonth(), adDate.getDate());
    var days = Math.round((utc - EPOCH_AD_UTC) / DAY_MS); // 0 = 1 Baisakh 2000
    if (days < 0) return null;
    // Skip whole BS years before our table starts (2000 -> 2070).
    var year = 2000;
    // Lengths before 2070 are computed from the same calendar by walking year lengths
    // stored only from 2070, so walk from 2070 using a 2000-2069 offset constant:
    // total days in BS 2000..2069 = 25568 (summed from the calendar table).
    var DAYS_2000_TO_2069 = 25568;
    if (days < DAYS_2000_TO_2069) return null;
    days -= DAYS_2000_TO_2069; year = 2070;
    while (BS_MONTHS[year]) {
      var yearLen = BS_MONTHS[year].reduce(function (a, b) { return a + b; }, 0);
      if (days < yearLen) break;
      days -= yearLen; year++;
    }
    if (!BS_MONTHS[year]) return null;
    var month = 0;
    while (month < 12 && days >= BS_MONTHS[year][month]) { days -= BS_MONTHS[year][month]; month++; }
    return { year: year, month: month + 1, day: days + 1, weekday: adDate.getDay() };
  }

  function keyOf(bs) { return bs.year + '-' + pad(bs.month) + '-' + pad(bs.day); }
  function formatBsEn(bs) { return bs.day + ' ' + MONTH_EN[bs.month - 1] + ' ' + bs.year + ' BS'; }
  function formatBsNp(bs) { return toNepaliDigits(bs.day) + ' ' + MONTH_NP[bs.month - 1] + ' ' + toNepaliDigits(bs.year); }
  function formatAdEn(adDate) {
    return adDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  global.NepaliDate = {
    adToBs: adToBs, keyOf: keyOf, formatBsEn: formatBsEn, formatBsNp: formatBsNp,
    formatAdEn: formatAdEn, toNepaliDigits: toNepaliDigits,
    weekdayNp: function (weekday) { return WEEKDAY_NP[weekday]; },
    MONTH_EN: MONTH_EN, MONTH_NP: MONTH_NP
  };
})(window);
