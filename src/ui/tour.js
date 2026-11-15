// Guided tour: a card with steps; each step puts the app into a prepared state (via `run`)
// and can highlight one element on the page.
import { escapeHtml } from './format.js';

export function createTour(container, { steps, onEnd }) {
  container.innerHTML = `
    <div class="tour-step muted"></div>
    <h2 class="tour-title"></h2>
    <div class="tour-text"></div>
    <div class="tour-nav">
      <button type="button" class="tour-exit">End tour</button>
      <span class="tour-spacer"></span>
      <button type="button" class="tour-back">‹ Back</button>
      <button type="button" class="tour-next">Next ›</button>
    </div>
  `;
  const $ = (sel) => container.querySelector(sel);
  container.hidden = true;
  let index = 0, highlighted = null;

  function clearHighlight() {
    highlighted?.classList.remove('tour-highlight');
    highlighted = null;
  }

  async function show(i) {
    index = i;
    const step = steps[i];
    $('.tour-step').textContent = `Step ${i + 1} of ${steps.length}`;
    $('.tour-title').textContent = step.title;
    $('.tour-text').innerHTML = step.html ?? escapeHtml(step.text);
    $('.tour-back').disabled = i === 0;
    $('.tour-next').textContent = i === steps.length - 1 ? 'Finish ✓' : 'Next ›';
    clearHighlight();
    await step.run?.();
    if (index !== i || container.hidden) return; // user moved on while this step was loading
    if (step.highlight) {
      highlighted = document.querySelector(step.highlight);
      highlighted?.classList.add('tour-highlight');
      highlighted?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    $('.tour-next').focus({ preventScroll: true });
  }

  const api = {
    start() {
      container.hidden = false;
      show(0);
    },
    stop() {
      if (container.hidden) return;
      container.hidden = true;
      clearHighlight();
      onEnd?.();
    },
    get isOpen() { return !container.hidden; },
  };

  $('.tour-next').addEventListener('click', () => (index < steps.length - 1 ? show(index + 1) : api.stop()));
  $('.tour-back').addEventListener('click', () => index > 0 && show(index - 1));
  $('.tour-exit').addEventListener('click', () => api.stop());
  window.addEventListener('keydown', (e) => {
    if (container.hidden) return;
    if (e.key === 'Escape') api.stop();
    if (e.key === 'ArrowRight' && document.activeElement?.tagName !== 'INPUT') $('.tour-next').click();
    if (e.key === 'ArrowLeft' && document.activeElement?.tagName !== 'INPUT') $('.tour-back').click();
  });
  return api;
}
