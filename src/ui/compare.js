// Comparison view: two sites, Sun and Earth elevation over 30 days, metrics side by side.
import { elevationSeries, seriesStats, bothAboveHours, THRESHOLDS, LOOKAHEAD_DAYS } from '../windows.js';
import { formatUtcShort, escapeHtml } from './format.js';

// W follows the panel width (see render) so tick labels keep their size on phones.
let W = 1000;
const H = 170;
const PAD = { left: 44, right: 12, top: 12, bottom: 24 };
const COLORS = { a: '#ff8a3c', b: '#3cc8ff' };
const DAY_MS = 864e5;

const fmtHours = (h) => (h >= 48 ? `${(h / 24).toFixed(1)} d` : `${Math.round(h)} h`);
const fmtDay = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function chartSvg(kind, times, a, b, focus) {
  let lo = Math.min(...a, ...b, 0), hi = Math.max(...a, ...b, THRESHOLDS.green);
  if (focus) { lo = Math.max(lo, -5); hi = Math.min(hi, 5); }
  const pad = (hi - lo) * 0.08;
  lo -= pad; hi += pad;
  const x = (i) => PAD.left + (i / (times.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v) => PAD.top + ((hi - Math.max(lo, Math.min(hi, v))) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  // Area between the curve and the horizon, only where the body is up.
  const area = (vals) => `${line(vals.map((v) => Math.max(v, 0)))}L${x(vals.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;

  const step = niceStep((hi - lo) / 4);
  const yTicks = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) yTicks.push(+t.toFixed(6));
  const dayTicks = [];
  const firstDay = Math.ceil(times[0] / DAY_MS) * DAY_MS;
  for (let ms = firstDay; ms <= times[times.length - 1]; ms += DAY_MS) {
    const i = (ms - times[0]) / 3600e3;
    const major = Math.round((ms - firstDay) / DAY_MS) % (W < 600 ? 10 : 5) === 0;
    dayTicks.push(`<line x1="${x(i)}" x2="${x(i)}" y1="${PAD.top}" y2="${H - PAD.bottom}" class="cmp-grid${major ? ' major' : ''}" />`
      + (major ? `<text x="${x(i)}" y="${H - 8}" class="cmp-tick" text-anchor="middle">${fmtDay(ms)}</text>` : ''));
  }

  return `
    <svg viewBox="0 0 ${W} ${H}" class="cmp-svg" data-kind="${kind}" role="img"
      aria-label="${kind === 'sun' ? 'Sun' : 'Earth'} elevation over ${LOOKAHEAD_DAYS} days for both sites">
      <rect x="${PAD.left}" y="${y(THRESHOLDS.green)}" width="${W - PAD.left - PAD.right}"
        height="${Math.max(0, y(0) - y(THRESHOLDS.green))}" class="cmp-grazing" />
      ${dayTicks.join('')}
      ${yTicks.map((t) => `<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(t)}" y2="${y(t)}" class="cmp-grid" />
        <text x="${PAD.left - 6}" y="${y(t) + 4}" class="cmp-tick" text-anchor="end">${t}°</text>`).join('')}
      <path d="${area(a)}" fill="${COLORS.a}" class="cmp-area" />
      <path d="${area(b)}" fill="${COLORS.b}" class="cmp-area" />
      <line x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(0)}" y2="${y(0)}" class="cmp-horizon" />
      <path d="${line(a)}" stroke="${COLORS.a}" class="cmp-line" />
      <path d="${line(b)}" stroke="${COLORS.b}" class="cmp-line" />
      <line class="cmp-now" y1="${PAD.top}" y2="${H - PAD.bottom}" x1="-10" x2="-10" />
      <line class="cmp-cursor" y1="${PAD.top}" y2="${H - PAD.bottom}" x1="-10" x2="-10" />
      <rect class="cmp-hit" x="${PAD.left}" y="${PAD.top}" width="${W - PAD.left - PAD.right}" height="${H - PAD.top - PAD.bottom}" />
    </svg>`;
}

function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * pow;
}

export function createCompare(container, { getSites, onPickTime }) {
  container.innerHTML = `
    <div class="cmp-head">
      <h2>Compare sites</h2>
      <label class="cmp-pick"><span class="swatch" style="background:${COLORS.a}"></span><select data-slot="a" aria-label="Site A"></select></label>
      <button type="button" class="cmp-swap" title="Swap sites" aria-label="Swap sites">⇄</button>
      <label class="cmp-pick"><span class="swatch" style="background:${COLORS.b}"></span><select data-slot="b" aria-label="Site B"></select></label>
      <label class="cmp-focus"><input type="checkbox" /> Zoom to ±5°</label>
      <button type="button" class="cmp-close" aria-label="Close comparison">✕</button>
    </div>
    <p class="cmp-window muted"></p>
    <div class="cmp-charts">
      <div class="cmp-chart"><div class="cmp-chart-title">Power · Sun elevation <span class="cmp-readout" data-kind="sun"></span></div><div class="cmp-svg-wrap" data-kind="sun"></div></div>
      <div class="cmp-chart"><div class="cmp-chart-title">Comms · Earth elevation <span class="cmp-readout" data-kind="earth"></span></div><div class="cmp-svg-wrap" data-kind="earth"></div></div>
    </div>
    <p class="cmp-hint muted">White line: current time · shaded: above the horizon · yellow band: grazing (0–${THRESHOLDS.green}°) · click a chart to jump to that time.</p>
    <table class="cmp-table"></table>
  `;
  const $ = (sel) => container.querySelector(sel);
  const selects = { a: $('[data-slot="a"]'), b: $('[data-slot="b"]') };
  const focusBox = $('.cmp-focus input');
  // The 30-day window stays put while the simulation time moves inside it (a "now" line marks
  // the time); it only re-anchors when the time leaves the window or the view is reopened.
  let state = { a: null, b: null, date: new Date(), windowStart: null, data: null };
  const HOUR_MS = 3600e3;

  function fillSelects() {
    const sites = getSites();
    for (const slot of ['a', 'b']) {
      selects[slot].innerHTML = sites.map((s) =>
        `<option value="${s.id}">${escapeHtml(s.mission)} · ${escapeHtml(s.name)}</option>`).join('');
      if (state[slot] && sites.some((s) => s.id === state[slot])) selects[slot].value = state[slot];
    }
  }

  function render() {
    if (container.hidden) return;
    const sites = getSites();
    const siteA = sites.find((s) => s.id === state.a);
    const siteB = sites.find((s) => s.id === state.b);
    if (!siteA || !siteB) return;
    const withH = (s) => ({ ...s, heightKm: s.heightKm ?? 0 });
    W = Math.max(320, Math.min(1100, container.querySelector('.cmp-charts').clientWidth || 1000));
    if (state.windowStart === null) state.windowStart = state.date.getTime();
    const start = state.windowStart;
    const A = elevationSeries(withH(siteA), start);
    const B = elevationSeries(withH(siteB), start);
    state.data = { A, B, siteA, siteB };

    $('.cmp-window').textContent = `${LOOKAHEAD_DAYS} days from ${formatUtcShort(new Date(start))} · smooth horizon`
      + (siteA.heightKm || siteB.heightKm ? ' + horizon dip where a height is set' : '');
    for (const kind of ['sun', 'earth']) {
      $(`.cmp-svg-wrap[data-kind="${kind}"]`).innerHTML = chartSvg(kind, A.times, A[kind], B[kind], focusBox.checked);
    }
    bindHover();
    renderTable(A, B, siteA, siteB);
    moveNowLine();
  }

  function moveNowLine() {
    if (!state.data) return;
    const { times } = state.data.A;
    const i = (state.date.getTime() - times[0]) / HOUR_MS;
    const cx = PAD.left + (i / (times.length - 1)) * (W - PAD.left - PAD.right);
    container.querySelectorAll('.cmp-now').forEach((line) => {
      line.setAttribute('x1', cx);
      line.setAttribute('x2', cx);
    });
  }

  function renderTable(A, B, siteA, siteB) {
    const sa = seriesStats(A.sun), sb = seriesStats(B.sun);
    const ea = seriesStats(A.earth), eb = seriesStats(B.earth);
    const total = sa.hoursTotal;
    const pct = (h) => `${Math.round((100 * h) / total)}%`;
    const run = (s) => (s.longestBelow === 0 ? 'none' : `${s.runOpen ? '≥ ' : ''}${fmtHours(s.longestBelow)}`);
    const both = [bothAboveHours(A.sun, A.earth), bothAboveHours(B.sun, B.earth)];
    // [label, valueA, valueB, textA, textB, higherIsBetter]
    const rows = [
      ['Sunlight', sa.hoursAbove, sb.hoursAbove, `${fmtHours(sa.hoursAbove)} (${pct(sa.hoursAbove)})`, `${fmtHours(sb.hoursAbove)} (${pct(sb.hoursAbove)})`, true],
      ['Longest darkness', sa.longestBelow, sb.longestBelow, run(sa), run(sb), false],
      ['Earth in view', ea.hoursAbove, eb.hoursAbove, `${fmtHours(ea.hoursAbove)} (${pct(ea.hoursAbove)})`, `${fmtHours(eb.hoursAbove)} (${pct(eb.hoursAbove)})`, true],
      ['Longest Earth blackout', ea.longestBelow, eb.longestBelow, run(ea), run(eb), false],
      ['Sun and Earth together', both[0], both[1], `${fmtHours(both[0])} (${pct(both[0])})`, `${fmtHours(both[1])} (${pct(both[1])})`, true],
    ];
    const cell = (v, other, text, higher) => {
      const better = Math.abs(v - other) > 0.5 && (higher ? v > other : v < other);
      return `<td class="${better ? 'win' : ''}">${text}${better ? ' ✓' : ''}</td>`;
    };
    $('.cmp-table').innerHTML = `
      <thead><tr><th></th>
        <th><span class="swatch" style="background:${COLORS.a}"></span>${escapeHtml(siteA.mission)}</th>
        <th><span class="swatch" style="background:${COLORS.b}"></span>${escapeHtml(siteB.mission)}</th></tr></thead>
      <tbody>${rows.map(([label, va, vb, ta, tb, higher]) =>
        `<tr><th>${label}</th>${cell(va, vb, ta, higher)}${cell(vb, va, tb, higher)}</tr>`).join('')}</tbody>`;
  }

  function bindHover() {
    const svgs = [...container.querySelectorAll('.cmp-svg')];
    const { A, B, siteA, siteB } = state.data;
    const n = A.times.length;
    const indexAt = (svg, clientX) => {
      const r = svg.getBoundingClientRect();
      const px = ((clientX - r.left) / r.width) * W;
      return Math.max(0, Math.min(n - 1, Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (n - 1))));
    };
    const show = (i) => {
      for (const svg of svgs) {
        const cx = PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right);
        const cursor = svg.querySelector('.cmp-cursor');
        cursor.setAttribute('x1', cx);
        cursor.setAttribute('x2', cx);
        const kind = svg.dataset.kind;
        container.querySelector(`.cmp-readout[data-kind="${kind}"]`).innerHTML = i === null ? '' : `· ${formatUtcShort(new Date(A.times[i]))}:
          <span style="color:${COLORS.a}">${escapeHtml(siteA.mission)} ${A[kind][i].toFixed(2)}°</span>
          <span style="color:${COLORS.b}">${escapeHtml(siteB.mission)} ${B[kind][i].toFixed(2)}°</span>`;
      }
    };
    for (const svg of svgs) {
      const hit = svg.querySelector('.cmp-hit');
      hit.addEventListener('pointermove', (e) => show(indexAt(svg, e.clientX)));
      hit.addEventListener('click', (e) => onPickTime(new Date(A.times[indexAt(svg, e.clientX)])));
    }
  }

  for (const slot of ['a', 'b']) {
    selects[slot].addEventListener('change', () => { state[slot] = selects[slot].value; render(); });
  }
  $('.cmp-swap').addEventListener('click', () => {
    state = { ...state, a: state.b, b: state.a };
    fillSelects();
    render();
  });
  focusBox.addEventListener('change', render);
  $('.cmp-close').addEventListener('click', () => api.close());

  const api = {
    open(siteAId, siteBId) {
      container.hidden = false;
      state.a = siteAId;
      state.b = siteBId;
      state.windowStart = null;
      fillSelects();
      render();
    },
    close() { container.hidden = true; },
    get isOpen() { return !container.hidden; },
    // New simulation time: moves the "now" line, re-anchors the window only when needed.
    setDate(date) {
      state.date = date;
      const t = date.getTime();
      const end = state.windowStart + (LOOKAHEAD_DAYS * 24 - 1) * HOUR_MS;
      if (state.windowStart === null || t < state.windowStart || t > end) {
        state.windowStart = null;
        render();
      } else moveNowLine();
    },
    refreshSites() {
      if (!container.hidden) fillSelects();
    },
  };
  container.hidden = true;
  return api;
}
