// Shareable links: the app state lives in the URL hash, e.g.
//   #site=shackleton&t=2026-11-23T20:00Z&view=compare&b=im1
//   #lat=-85.2&lon=30.5&h=1.2&site=custom&t=2026-11-23T20:00Z
const VIEWS = ['compare', 'terrain', 'ranking'];

const pad = (n) => String(n).padStart(2, '0');
// Minute precision is plenty and keeps links short.
export function formatLinkTime(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
    + `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}Z`;
}

// state: { siteId, time: Date, view?: 'compare'|'terrain'|'ranking', compareB?, custom?: { lat, lon, heightKm } }
export function buildPermalink({ siteId, time, view = null, compareB = null, custom = null }) {
  const params = new URLSearchParams();
  if (custom) {
    params.set('lat', String(+custom.lat.toFixed(4)));
    params.set('lon', String(+custom.lon.toFixed(4)));
    if (Number.isFinite(custom.heightKm)) params.set('h', String(+custom.heightKm.toFixed(3)));
  }
  if (siteId) params.set('site', siteId);
  if (time) params.set('t', formatLinkTime(time));
  if (view && VIEWS.includes(view)) params.set('view', view);
  if (view === 'compare' && compareB) params.set('b', compareB);
  // URLSearchParams escapes ':' — harmless, but plain colons read better in a shared link.
  return params.toString().replace(/%3A/g, ':');
}

// Returns only the fields that are present and valid; anything malformed is ignored.
export function parsePermalink(hash) {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  const out = {};
  const site = params.get('site');
  if (site && /^[a-z0-9-]{1,40}$/.test(site)) out.siteId = site;

  const t = params.get('t');
  if (t) {
    const ms = Date.parse(t);
    if (Number.isFinite(ms)) out.time = new Date(ms);
  }

  const view = params.get('view');
  if (VIEWS.includes(view)) out.view = view;
  const b = params.get('b');
  if (out.view === 'compare' && b && /^[a-z0-9-]{1,40}$/.test(b)) out.compareB = b;

  const lat = Number(params.get('lat')), lon = Number(params.get('lon'));
  if (params.has('lat') && params.has('lon') && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90) {
    const h = Number(params.get('h'));
    out.custom = {
      lat,
      lon: ((((lon + 180) % 360) + 360) % 360) - 180,
      heightKm: params.has('h') && Number.isFinite(h) ? h : null,
    };
  }
  return out;
}
