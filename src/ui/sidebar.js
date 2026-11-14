// Left sidebar: site list, custom coordinates, metrics with traffic lights, horizon strip, toggles.
import { horizonSvg } from './horizon.js';
import { formatDuration, formatUtcShort, formatLatLon, formatDeg, escapeHtml } from './format.js';
import { LOOKAHEAD_DAYS, HOURS_WINDOW_DAYS, THRESHOLDS } from '../windows.js';

const STATUS_TEXT = {
  power: { green: 'Sunlight', yellow: 'Grazing sun', red: 'No sunlight' },
  comms: { green: 'Earth in view', yellow: 'Earth grazing', red: 'No direct link' },
  overall: { green: 'Good', yellow: 'Marginal', red: 'Not possible now' },
};

export function createSidebar(container, { sites, categories, onSelect, onCustom, onToggle, onView, onCompare, onTerrain }) {
  const grouped = categories.map((cat) => ({ cat, items: sites.filter((s) => s.category === cat) }));
  container.innerHTML = `
    <button type="button" class="sb-collapse" aria-expanded="true" aria-controls="sb-body" title="Hide panel">‹</button>
    <div id="sb-body" class="sb-body">
      <section class="sb-section">
        <h2>Landing sites</h2>
        <p class="sb-legend muted"><span class="sb-terrain-badge">3D</span> real terrain horizon + 3D terrain view</p>
        ${grouped.map(({ cat, items }) => `
          <h3>${cat}</h3>
          <ul class="sb-sites">
            ${items.map((s) => `
              <li><button type="button" class="sb-site" data-id="${s.id}">
                <span class="dot" data-status-for="${s.id}"></span>
                <span class="sb-site-mission">${escapeHtml(s.mission)}</span>
                <span class="sb-site-name">${escapeHtml(s.name)}</span>
                ${s.terrain ? '<span class="sb-terrain-badge" title="Real terrain horizon and 3D terrain view">3D</span>' : ''}
              </button></li>`).join('')}
          </ul>`).join('')}
      </section>

      <section class="sb-section">
        <h2>Custom point</h2>
        <form class="sb-custom">
          <label>Lat °<input name="lat" type="number" step="any" min="-90" max="90" required placeholder="-85.0" /></label>
          <label>Lon °E<input name="lon" type="number" step="any" min="-180" max="360" required placeholder="30.0" /></label>
          <label>Height km<input name="h" type="number" step="any" placeholder="0" /></label>
          <button type="submit">Show</button>
        </form>
        <p class="sb-hint">…or click anywhere on the Moon.</p>
      </section>

      <section class="sb-section sb-details" aria-live="polite"></section>

      <section class="sb-section">
        <h2>View</h2>
        <label class="sb-toggle"><input type="checkbox" data-toggle="markers" checked /> Show site markers</label>
        <label class="sb-toggle"><input type="checkbox" data-toggle="colors" checked /> Traffic-light colors</label>
        <div class="sb-views">
          <button type="button" data-view="near">Near side</button>
          <button type="button" data-view="south">South pole</button>
          <button type="button" data-view="far">Far side</button>
        </div>
      </section>

      <section class="sb-section sb-about">
        <details>
          <summary>Why is the south pole hard?</summary>
          <p>The Moon's axis is tilted only 1.5° against the Sun, so at the poles the Sun always skims along
          the horizon — never more than about 1.6° up. A small hill can mean months of light; a crater floor
          can stay dark for billions of years. The Earth also hangs low on the horizon there and bobs up and
          down by several degrees each month (libration), so direct radio contact comes and goes.</p>
        </details>
        <details>
          <summary>What do the colors mean?</summary>
          <p><span class="dot green"></span> more than ${THRESHOLDS.green}° above the horizon ·
          <span class="dot yellow"></span> 0–${THRESHOLDS.green}°, grazing: real terrain may block it ·
          <span class="dot red"></span> below the horizon. The overall rating is the worse of power and comms.</p>
        </details>
        <details>
          <summary>Limitations</summary>
          <p>Most sites use a smooth lunar sphere plus the horizon dip of the site's height, so crater rims and
          mountains around them are not modelled. The Shackleton rim site uses a real terrain horizon from a
          NASA LOLA 5 m elevation model, but only terrain within ~6–14 km; distant mountains are still missing.
          Sun and Earth positions agree with NASA JPL Horizons to within 0.004°.</p>
        </details>
      </section>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const details = $('.sb-details');

  container.querySelectorAll('.sb-site').forEach((btn) =>
    btn.addEventListener('click', () => onSelect(sites.find((s) => s.id === btn.dataset.id))));

  $('.sb-custom').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    let lon = Number(form.get('lon'));
    if (lon > 180) lon -= 360;
    onCustom({ lat: Number(form.get('lat')), lon, heightKm: form.get('h') === '' ? null : Number(form.get('h')) });
  });

  details.addEventListener('click', (e) => {
    if (e.target.closest('.sb-compare')) onCompare();
    if (e.target.closest('.sb-terrain')) onTerrain();
  });

  container.querySelectorAll('[data-toggle]').forEach((input) =>
    input.addEventListener('change', () => onToggle(input.dataset.toggle, input.checked)));
  container.querySelectorAll('[data-view]').forEach((btn) =>
    btn.addEventListener('click', () => onView(btn.dataset.view)));

  const collapse = $('.sb-collapse');
  collapse.addEventListener('click', () => {
    const collapsed = container.classList.toggle('collapsed');
    collapse.setAttribute('aria-expanded', String(!collapsed));
    collapse.textContent = collapsed ? '›' : '‹';
    collapse.title = collapsed ? 'Show panel' : 'Hide panel';
  });
  if (window.matchMedia('(max-width: 700px)').matches) collapse.click();

  function eventText(w, date, bodyWord) {
    if (!w.next) {
      return w.elevation > 0
        ? `Stays up for the next ${LOOKAHEAD_DAYS}+ days`
        : `No ${bodyWord}rise in the next ${LOOKAHEAD_DAYS} days`;
    }
    const verb = w.next.type === 'set' ? `${bodyWord}set` : `${bodyWord}rise`;
    return `${verb[0].toUpperCase()}${verb.slice(1)} in <strong>${formatDuration(w.next.at - date)}</strong>
      <span class="muted">(${formatUtcShort(w.next.at)})</span>`;
  }

  function card(kind, title, w, date, bodyWord) {
    const pct = (100 * w.hoursAbove) / (HOURS_WINDOW_DAYS * 24);
    return `
      <div class="sb-card">
        <div class="sb-card-head">
          <span class="dot ${w.status}"></span>
          <span class="sb-card-title">${title}</span>
          <span class="sb-card-status">${STATUS_TEXT[kind][w.status]}</span>
        </div>
        <div class="sb-metric">Above horizon <strong>${formatDeg(w.elevation)}</strong>
          <span class="muted">· azimuth ${w.azimuth.toFixed(0)}°</span></div>
        <div class="sb-metric">${eventText(w, date, bodyWord)}</div>
        <div class="sb-metric">Next ${HOURS_WINDOW_DAYS} days: <strong>${w.hoursAbove.toFixed(0)} h</strong>
          <span class="muted">(${pct.toFixed(0)}%)</span>
          <span class="bar"><span style="width:${pct.toFixed(1)}%"></span></span></div>
      </div>`;
  }

  return {
    setStatuses(statuses) {
      container.querySelectorAll('[data-status-for]').forEach((dot) => {
        dot.className = `dot ${statuses[dot.dataset.statusFor] ?? ''}`;
      });
    },

    setSelected(id) {
      container.querySelectorAll('.sb-site').forEach((btn) =>
        btn.classList.toggle('selected', btn.dataset.id === id));
    },

    showSite(site, windows, date) {
      const heightText = site.horizon
        ? `height ${site.heightKm.toFixed(2)} km · <strong>terrain horizon</strong>`
        : site.heightKm === null || site.heightKm === undefined
          ? '<span class="muted">height not set (smooth horizon)</span>'
          : `height ${site.heightKm.toFixed(2)} km${windows.dip > 0 ? ` · horizon dip ${windows.dip.toFixed(2)}°` : ''}`;
      const source = site.sourceUrl
        ? `<a href="${escapeHtml(site.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(site.source)}</a>`
        : escapeHtml(site.source ?? '');
      details.innerHTML = `
        <div class="sb-title-row">
          <div>
            <h2 class="sb-site-title">${escapeHtml(site.mission)}${site.year ? ` <span class="muted">${site.year}</span>` : ''}</h2>
            <div class="sb-sub">${escapeHtml(site.name)}</div>
          </div>
          <span class="badge ${windows.overall}">${STATUS_TEXT.overall[windows.overall]}</span>
        </div>
        ${site.horizon ? '<button type="button" class="sb-terrain">Open 3D terrain view</button>' : ''}
        <button type="button" class="sb-compare">Compare with another site ⇄</button>
        <div class="sb-sub muted">${formatLatLon(site.lat, site.lon)} · ${heightText}</div>
        ${card('power', 'Power · Sun', windows.power, date, 'sun')}
        ${card('comms', 'Comms · Earth', windows.comms, date, 'Earth')}
        <h3>Sky around the site</h3>
        ${horizonSvg({
            sun: { elevation: windows.power.geometric, azimuth: windows.power.azimuth },
          earth: { elevation: windows.comms.geometric, azimuth: windows.comms.azimuth },
          horizon: site.horizon ?? null,
          dip: windows.dip,
        })}
        <p class="sb-chart-note muted">${site.horizon
          ? 'Skyline: real terrain from the LOLA 5 m DEM (within ~6–14 km).'
          : windows.dip > 0 ? `Skyline: smooth Moon, lowered by the ${windows.dip.toFixed(2)}° horizon dip.` : 'Skyline: smooth Moon.'}</p>
        ${source ? `<p class="sb-source">Source: ${source}</p>` : ''}
      `;
    },
  };
}
