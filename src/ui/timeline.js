// Bottom timeline: slider over a 30-day window, UTC date field, play/pause, speed.
// Owns the current simulation time and reports every change through onChange(date).
const HOUR_MS = 3600e3;
const DAY_MS = 24 * HOUR_MS;
const WINDOW_DAYS = 30;

// Simulated time per real second.
const SPEEDS = [
  { label: '1 h/s', msPerSecond: HOUR_MS },
  { label: '6 h/s', msPerSecond: 6 * HOUR_MS },
  { label: '1 day/s', msPerSecond: DAY_MS },
  { label: '3 days/s', msPerSecond: 3 * DAY_MS },
];
const DEFAULT_SPEED = 2;

const pad = (n) => String(n).padStart(2, '0');
const toInputValue = (d) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
const formatUtc = (d) => `${toInputValue(d).replace('T', ' ')} UTC`;
const formatDay = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function createTimeline(container, { start = new Date(), onChange }) {
  container.innerHTML = `
    <div class="timeline-controls">
      <button type="button" class="tl-play" aria-label="Play">▶</button>
      <select class="tl-speed" aria-label="Playback speed">
        ${SPEEDS.map((s, i) => `<option value="${i}"${i === DEFAULT_SPEED ? ' selected' : ''}>${s.label}</option>`).join('')}
      </select>
      <input type="datetime-local" class="tl-date" aria-label="Date and time (UTC)" />
      <span class="tl-utc">UTC</span>
      <button type="button" class="tl-now">Now</button>
      <span class="tl-readout" aria-live="off"></span>
    </div>
    <div class="timeline-track">
      <span class="tl-edge tl-edge-start"></span>
      <input type="range" class="tl-slider" min="0" max="${WINDOW_DAYS * 24}" step="any" aria-label="Time within the 30-day window" />
      <span class="tl-edge tl-edge-end"></span>
    </div>
  `;
  const $ = (sel) => container.querySelector(sel);
  const playBtn = $('.tl-play');
  const speedSel = $('.tl-speed');
  const dateInput = $('.tl-date');
  const slider = $('.tl-slider');
  const readout = $('.tl-readout');

  let time = start.getTime();
  let windowStart = 0;
  let playing = false;

  // The window starts half a day-window before the chosen time so you can scrub back and forth.
  function recenter() {
    windowStart = time - (WINDOW_DAYS / 2) * DAY_MS;
    $('.tl-edge-start').textContent = formatDay(new Date(windowStart));
    $('.tl-edge-end').textContent = formatDay(new Date(windowStart + WINDOW_DAYS * DAY_MS));
  }

  function setTime(ms, { fromSlider = false } = {}) {
    time = ms;
    if (!fromSlider && (time < windowStart || time > windowStart + WINDOW_DAYS * DAY_MS)) recenter();
    const date = new Date(time);
    if (!fromSlider) slider.value = String((time - windowStart) / HOUR_MS);
    if (document.activeElement !== dateInput) dateInput.value = toInputValue(date);
    readout.textContent = formatUtc(date);
    onChange(date);
  }

  function setPlaying(value) {
    playing = value;
    playBtn.textContent = playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  playBtn.addEventListener('click', () => setPlaying(!playing));
  slider.addEventListener('input', () => setTime(windowStart + Number(slider.value) * HOUR_MS, { fromSlider: true }));
  dateInput.addEventListener('change', () => {
    const ms = Date.parse(`${dateInput.value}:00Z`);
    if (Number.isFinite(ms)) {
      time = ms;
      recenter();
      setTime(ms);
    }
  });
  $('.tl-now').addEventListener('click', () => {
    time = Date.now();
    recenter();
    setTime(time);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      setPlaying(!playing);
    }
  });

  recenter();
  setTime(time);

  return {
    // Call once per animation frame with the elapsed real time.
    tick(dtSeconds) {
      if (!playing || dtSeconds <= 0) return;
      setTime(time + dtSeconds * SPEEDS[Number(speedSel.value)].msPerSecond);
    },
    get date() { return new Date(time); },
    // Remote control for the guided tour.
    setPlaying,
    setSpeed(label) {
      const i = SPEEDS.findIndex((sp) => sp.label === label);
      if (i >= 0) speedSel.value = String(i);
    },
    // Jump to a time from outside (e.g. a click in the comparison chart).
    setDate(date) {
      time = date.getTime();
      recenter();
      setTime(time);
    },
  };
}
