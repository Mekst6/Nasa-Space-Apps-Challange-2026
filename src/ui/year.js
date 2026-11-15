// Year overview: a calendar heatmap (one row per month, one cell per day) for one site.
import { yearOverview, THRESHOLDS } from '../windows.js';
import { escapeHtml } from './format.js';

const DAY_MS = 864e5;
const MODES = {
  good: { label: 'Good', hint: `Sun and Earth both above ${THRESHOLDS.green}°`, cls: 'good' },
  sun: { label: 'Sunlight', hint: 'Sun above the horizon', cls: 'sun' },
  earth: { label: 'Earth in view', hint: 'Earth above the horizon', cls: 'earth' },
};
const fmtDay = (ms) => new Date(ms).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtMonth = (ms) => new Date(ms).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const pct = (a, b) => Math.round((100 * a) / b);

export function createYearView(container, { onPickDay }) {
  container.innerHTML = `
    <div class="cmp-head">
      <h2>Year overview <span class="yr-site muted"></span></h2>
      <div class="yr-modes" role="group" aria-label="What to show">
        ${Object.entries(MODES).map(([k, m]) => `<button type="button" data-mode="${k}" title="${m.hint}">${m.label}</button>`).join('')}
      </div>
      <button type="button" class="cmp-close" aria-label="Close year overview">✕</button>
    </div>
    <div class="yr-totals"></div>
    <div class="yr-scroll"><div class="yr-grid" role="grid"></div></div>
    <div class="yr-foot">
      <span class="yr-legend"><span class="muted">0 h</span><span class="yr-ramp"></span><span class="muted">24 h per day</span></span>
      <span class="yr-readout muted">Hover a day for details, click to jump there.</span>
    </div>
  `;
  const $ = (sel) => container.querySelector(sel);
  container.hidden = true;
  let state = { site: null, date: new Date(), mode: 'good', data: null };

  function compute() {
    state.data = yearOverview({ ...state.site, heightKm: state.site.heightKm ?? 0 }, state.date);
  }

  function render() {
    const { data, mode, site } = state;
    const m = MODES[mode];
    $('.yr-site').textContent = `· ${site.mission}`;
    container.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    container.querySelector('.yr-ramp').className = `yr-ramp ${m.cls}`;

    const t = data.totals;
    const dark = data.longestDark;
    const darkText = dark.longestBelow === 0 ? 'none' : `${dark.runOpen ? '≥ ' : ''}${(dark.longestBelow / 24).toFixed(1)} d`;
    $('.yr-totals').innerHTML = `
      <span><strong>${pct(t.good, t.hours)}%</strong> good</span>
      <span><strong>${pct(t.sun, t.hours)}%</strong> sunlight</span>
      <span><strong>${pct(t.earth, t.hours)}%</strong> Earth in view</span>
      <span>longest darkness <strong>${darkText}</strong></span>
      <span class="muted">${fmtMonth(data.start)} – ${fmtMonth(data.end - DAY_MS)} · terrain skyline for 3D sites</span>`;

    // Group days by month.
    const months = [];
    for (const d of data.days) {
      const date = new Date(d.t);
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      if (!months.length || months[months.length - 1].key !== key) months.push({ key, t: d.t, days: [] });
      months[months.length - 1].days.push(d);
    }
    const today = Math.floor(state.date.getTime() / DAY_MS) * DAY_MS;
    $('.yr-grid').innerHTML = `
      <div class="yr-row yr-head" role="row"><span></span>${Array.from({ length: 31 }, (_, i) =>
        `<span class="yr-dnum">${(i + 1) % 5 === 0 || i === 0 ? i + 1 : ''}</span>`).join('')}<span class="yr-mpct">month</span></div>
      ${months.map((mo) => {
        const share = pct(mo.days.reduce((a, d) => a + d[mode], 0), mo.days.reduce((a, d) => a + d.hours, 0));
        return `<div class="yr-row" role="row"><span class="yr-mlabel">${fmtMonth(mo.t)}</span>${
          Array.from({ length: 31 }, (_, i) => {
            const d = mo.days[i];
            if (!d) return '<span class="yr-cell empty"></span>';
            const v = d[mode] / d.hours;
            return `<button type="button" class="yr-cell ${m.cls}${d.t === today ? ' today' : ''}" data-t="${d.t}"
              style="--v:${v.toFixed(3)}" aria-label="${fmtDay(d.t)}: ${d[mode]} h ${m.label.toLowerCase()}"></button>`;
          }).join('')}<span class="yr-mpct">${share}%</span></div>`;
      }).join('')}`;
  }

  // Only the "today" outline moves while the time stays inside the shown year.
  function moveToday() {
    const today = Math.floor(state.date.getTime() / DAY_MS) * DAY_MS;
    container.querySelectorAll('.yr-cell.today').forEach((c) => c.classList.remove('today'));
    container.querySelector(`.yr-cell[data-t="${today}"]`)?.classList.add('today');
  }

  $('.yr-grid').addEventListener('pointerover', (e) => {
    const cell = e.target.closest('.yr-cell[data-t]');
    if (!cell) return;
    const d = state.data.days.find((x) => x.t === Number(cell.dataset.t));
    $('.yr-readout').innerHTML = `<strong>${fmtDay(d.t)}</strong>: sun ${d.sun} h · Earth ${d.earth} h · good ${d.good} h`;
  });
  $('.yr-grid').addEventListener('click', (e) => {
    const cell = e.target.closest('.yr-cell[data-t]');
    if (cell) onPickDay(new Date(Number(cell.dataset.t)));
  });
  container.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    state.mode = b.dataset.mode;
    render();
  }));
  $('.cmp-close').addEventListener('click', () => api.close());

  const api = {
    open(site, date) {
      state.site = site;
      state.date = date;
      container.hidden = false;
      compute();
      render();
    },
    close() { container.hidden = true; },
    get isOpen() { return !container.hidden; },
    get site() { return state.site; },
    setDate(date) {
      state.date = date;
      if (container.hidden || !state.data) return;
      const t = date.getTime();
      if (t < state.data.start || t >= state.data.end) {
        compute();
        render();
      } else moveToday();
    },
    // Terrain profiles arrive asynchronously; recompute so 3D sites use their skyline.
    refresh() {
      if (!container.hidden) { compute(); render(); }
    },
  };
  return api;
}
