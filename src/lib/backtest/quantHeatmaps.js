const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HR = Array.from({ length: 24 }, (_, h) => `${h}`);
const r2 = (v) => Math.round(v * 100) / 100;
const grid = (r, c) => Array.from({ length: r }, () => Array.from({ length: c }, () => [0, 0]));
const avg = (g, min = 3) => g.map((row) => row.map(([s, c]) => (c >= min ? r2(s / c) : null)));
const add = (g, r, c, v) => { g[r][c][0] += v; g[r][c][1]++; };

function corr(a, b) {
  const n = a.length;
  if (n < 10) return null;
  const ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? r2(num / Math.sqrt(da * db)) : null;
}

// Every heatmap QuantBot derives from a candle file (hours are broker/UTC time, returns in basis points)
export function quantHeatmaps(bars) {
  const n = bars.time.length;
  const drift = grid(7, 24), vol = grid(7, 24), up = grid(7, 24), volu = grid(7, 24), absMove = grid(7, 24);
  const months = {}, rets = [];
  for (let i = 1; i < n; i++) {
    const d = new Date(bars.time[i]);
    const wd = (d.getUTCDay() + 6) % 7, h = d.getUTCHours();
    const ret = ((bars.close[i] - bars.close[i - 1]) / bars.close[i - 1]) * 10000;
    rets.push(ret);
    add(drift, wd, h, ret);
    add(absMove, wd, h, Math.abs(ret));
    add(vol, wd, h, ((bars.high[i] - bars.low[i]) / bars.close[i - 1]) * 10000);
    add(up, wd, h, bars.close[i] > bars.open[i] ? 100 : 0);
    if (bars.volume[i]) add(volu, wd, h, bars.volume[i]);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const m = months[key] || (months[key] = { y: d.getUTCFullYear(), m: d.getUTCMonth(), open: bars.open[i], hi: bars.high[i], lo: bars.low[i] });
    m.close = bars.close[i]; m.hi = Math.max(m.hi, bars.high[i]); m.lo = Math.min(m.lo, bars.low[i]);
  }
  const ms = Object.values(months);
  const years = [...new Set(ms.map((m) => m.y))].sort();
  const mRet = years.map(() => Array(12).fill(null)), mRange = years.map(() => Array(12).fill(null));
  for (const m of ms) {
    mRet[years.indexOf(m.y)][m.m] = r2(((m.close - m.open) / m.open) * 100);
    mRange[years.indexOf(m.y)][m.m] = r2(((m.hi - m.lo) / m.open) * 100);
  }
  const lags = Array.from({ length: 10 }, (_, k) => corr(rets.slice(k + 1), rets.slice(0, rets.length - k - 1)));
  const hourly = { rows: WD, cols: HR };
  return [
    { key: 'drift', title: 'Average return by weekday × hour', unit: 'bp', diverging: true, ...hourly, values: avg(drift) },
    { key: 'upPct', title: 'Bullish bar probability by weekday × hour', unit: '%', diverging: true, center: 50, ...hourly, values: avg(up) },
    { key: 'range', title: 'Volatility (bar range) by weekday × hour', unit: 'bp', ...hourly, values: avg(vol) },
    { key: 'absMove', title: 'Average absolute move by weekday × hour', unit: 'bp', ...hourly, values: avg(absMove) },
    { key: 'volume', title: 'Tick volume by weekday × hour', unit: '', ...hourly, values: avg(volu) },
    { key: 'monthRet', title: 'Monthly return by year × month', unit: '%', diverging: true, rows: years.map(String), cols: MO, values: mRet },
    { key: 'monthRange', title: 'Monthly range by year × month', unit: '%', rows: years.map(String), cols: MO, values: mRange },
    { key: 'autocorr', title: 'Return autocorrelation by lag (bars)', unit: '', diverging: true, rows: ['Return'], cols: lags.map((_, k) => `${k + 1}`), values: [lags] },
  ].filter((m) => m.values.some((row) => row.some((v) => v !== null)));
}

// Compact digest of the heatmaps for the script-writing agent: strongest and weakest cells of each
export function quantDigest(maps) {
  const out = {};
  for (const m of maps) {
    const cells = [];
    m.values.forEach((row, r) => row.forEach((v, c) => v !== null && cells.push([`${m.rows[r]} ${m.cols[c]}`, v])));
    cells.sort((a, b) => b[1] - a[1]);
    out[`${m.title} (${m.unit || 'raw'})`] = m.key === 'autocorr'
      ? Object.fromEntries(cells.map(([k, v]) => [k.replace('Return ', 'lag'), v]))
      : { top: cells.slice(0, 4).map((x) => x.join(': ')), bottom: cells.slice(-4).map((x) => x.join(': ')) };
  }
  return out;
}