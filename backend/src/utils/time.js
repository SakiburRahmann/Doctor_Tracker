/**
 * UTC calendar helpers shared by the analytics routes.
 *
 * MongoDB's $dateToString buckets in UTC unless given a timezone, so the
 * series keys the server generates must be UTC too — otherwise a host east or
 * west of Greenwich shifts the month/day boundaries and the chart loses (or
 * mislabels) the rows at the edges. Everything here is pinned to UTC; the
 * browser is free to localise the labels it renders.
 */

/** Start of the first month in a trailing N-month window (UTC). */
function monthWindowStart(months, from = new Date()) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - (months - 1), 1));
}

/** Continuous { key, label } pairs for the trailing N calendar months (UTC). */
function monthKeys(months, from = new Date()) {
  const keys = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - i, 1));
    keys.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    });
  }
  return keys;
}

/** Start of the first day in a trailing N-day window (UTC midnight). */
function dayWindowStart(days, from = new Date()) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() - (days - 1)));
}

module.exports = { monthWindowStart, monthKeys, dayWindowStart };
