// Ranking of all sites for the next 30 days: which site has the most sun, Earth, or both?
import { elevationSeries, seriesStats, bothAboveHours, siteStatus, THRESHOLDS, LOOKAHEAD_DAYS } from '../windows.js';
import { formatUtcShort, escapeHtml } from './format.js';

const fmtHours = (h) => (h >= 48 ? `${(h / 24).toFixed(1)} d` : `${Math.round(h)} h`);

// [key, header, tooltip, higher is better]
const COLUMNS = [
  ['good', 'Good', `Sun and Earth both more than ${THRESHOLDS.green}° above the horizon`, true],
  ['sun', 'Sunlight', 'Sun above the horizon (power)', true],
  ['earth', 'Earth in view', 'Earth above the horizon (direct radio link)', true],
  ['dark', 'Longest darkness', 'Longest continuous stretch without sun (battery must bridge it)', false],
];

export function createRanking(container, { getSites, onSelect }) {
  container.innerHTML = `
    <div class="cmp-head">
      <h2>Best sites</h2>
      <label class="cmp-focus"><input type="checkbox" class="rk-pole" /> South pole only</label>
      <button type="button" class="cmp-close" aria-label="Close ranking">✕</button>
    </div>
    <p class="rk-window muted"></p>
    <div class="rk-scroll"><table class="cmp-table rk-table"></table></div>
    <p class="cmp-hint muted">Click a column to sort, click a site to select it.
      “Good” = Sun and Earth both above ${THRESHOLDS.green}°, the same rule as the traffic lights.</p>
  `;
  const $ = (sel) => container.querySelector(sel);
  container.hidden = true;
  let state = { date: new Date(), windowStart: null, rows: [], sortKey: 'good', poleOnly: false };

  function compute() {
    state.windowStart = state.date.getTime();
    state.rows = getSites().map((site) => {
      const s = { ...site, heightKm: site.heightKm ?? 0 };
      const series = elevationSeries(s, state.windowStart);
      const sun = seriesStats(series.sun), earth = seriesStats(series.earth);
      const total = sun.hoursTotal;
      return {
        site,
        total,
        good: bothAboveHours(series.sun, series.earth, THRESHOLDS.green),
        sun: sun.hoursAbove,
        earth: earth.hoursAbove,
        dark: sun.longestBelow,
        darkOpen: sun.runOpen,
        now: siteStatus(s, state.date).overall,
      };
    });
  }

  function render() {
    if (container.hidden) return;
    $('.rk-window').textContent = `${LOOKAHEAD_DAYS} days from ${formatUtcShort(new Date(state.windowStart))}`
      + ' · terrain skyline for 3D sites, smooth horizon elsewhere';
    const [, , , higher] = COLUMNS.find(([k]) => k === state.sortKey);
    const rows = state.rows
      .filter((r) => !state.poleOnly || r.site.southPole)
      .sort((a, b) => (higher ? b[state.sortKey] - a[state.sortKey] : a[state.sortKey] - b[state.sortKey])
        || b.good - a.good);
    const pct = (h, total) => Math.round((100 * h) / total);
    const bar = (h, total, cls) => `<span class="rk-bar ${cls}"><span style="width:${pct(h, total)}%"></span></span>`;
    const head = COLUMNS.map(([key, label, tip]) =>
      `<th class="rk-sort${key === state.sortKey ? ' active' : ''}" data-sort="${key}" title="${tip}" scope="col">
        <button type="button">${label}${key === state.sortKey ? ' ▾' : ''}</button></th>`).join('');
    $('.rk-table').innerHTML = `
      <thead><tr><th scope="col">#</th><th scope="col">Site</th>${head}<th scope="col">Now</th></tr></thead>
      <tbody>${rows.map((r, i) => `
        <tr class="rk-row" data-id="${r.site.id}" tabindex="0">
          <td class="muted">${i + 1}</td>
          <td><strong>${escapeHtml(r.site.mission)}</strong>${r.site.terrain ? ' <span class="sb-terrain-badge">3D</span>' : ''}
            <div class="muted rk-sub">${escapeHtml(r.site.name)}</div></td>
          <td>${pct(r.good, r.total)}% ${bar(r.good, r.total, 'good')}</td>
          <td>${pct(r.sun, r.total)}% ${bar(r.sun, r.total, 'sun')}</td>
          <td>${pct(r.earth, r.total)}% ${bar(r.earth, r.total, 'earth')}</td>
          <td>${r.dark === 0 ? 'none' : `${r.darkOpen ? '≥ ' : ''}${fmtHours(r.dark)}`}</td>
          <td><span class="dot ${r.now}"></span></td>
        </tr>`).join('')}</tbody>`;
  }

  $('.rk-table').addEventListener('click', (e) => {
    const sort = e.target.closest('[data-sort]');
    if (sort) {
      state.sortKey = sort.dataset.sort;
      render();
      return;
    }
    const row = e.target.closest('.rk-row');
    if (row) onSelect(getSites().find((s) => s.id === row.dataset.id));
  });
  $('.rk-table').addEventListener('keydown', (e) => {
    const row = e.target.closest('.rk-row');
    if (row && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect(getSites().find((s) => s.id === row.dataset.id));
    }
  });
  $('.rk-pole').addEventListener('change', (e) => {
    state.poleOnly = e.target.checked;
    render();
  });
  $('.cmp-close').addEventListener('click', () => api.close());

  const api = {
    open() {
      container.hidden = false;
      compute();
      render();
    },
    close() { container.hidden = true; },
    get isOpen() { return !container.hidden; },
    // Same idea as the comparison: the 30-day window stays put until the time leaves it.
    setDate(date) {
      state.date = date;
      if (container.hidden) return;
      const t = date.getTime();
      if (t < state.windowStart || t > state.windowStart + (LOOKAHEAD_DAYS * 24 - 1) * 3600e3) {
        compute();
        render();
      }
    },
    // Terrain profiles arrive asynchronously; recompute so 3D sites use their skyline.
    refresh() {
      if (!container.hidden) { compute(); render(); }
    },
  };
  return api;
}
