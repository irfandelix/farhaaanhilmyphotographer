export const MONTH_MAP_ID_TO_EN = {
  januari: 'January',
  februari: 'February',
  maret: 'March',
  april: 'April',
  mei: 'May',
  juni: 'June',
  juli: 'July',
  agustus: 'August',
  september: 'September',
  oktober: 'October',
  november: 'November',
  desember: 'December',
};

export const MONTH_NAMES_ID = [
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
];

export function translateIndonesianMonths(dateStr) {
  if (!dateStr) return '';
  let result = dateStr;
  for (const [idMonth, enMonth] of Object.entries(MONTH_MAP_ID_TO_EN)) {
    result = result.replace(new RegExp(idMonth, 'gi'), enMonth);
  }
  return result;
}

export function parseIndonesianDateMs(dateStr, fallback = 9999999999999) {
  if (!dateStr) return fallback;
  const d = new Date(translateIndonesianMonths(dateStr));
  return isNaN(d.getTime()) ? fallback : d.getTime();
}

export function parseShootDateTime(dateStr, timeStr) {
  if (!dateStr) return 0;
  let parsedDateStr = translateIndonesianMonths(dateStr.toLowerCase());

  if (timeStr) {
    let cleanTime = timeStr.replace(/WIB|WITA|WIT/gi, '').trim();
    cleanTime = cleanTime.split('-')[0].trim().replace(/\./g, ':');
    parsedDateStr += ` ${cleanTime}`;
  }

  const d = new Date(parsedDateStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}
