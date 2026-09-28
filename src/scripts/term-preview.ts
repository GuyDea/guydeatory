/**
 * Hover / keyboard-focus previews for term links: shows the target's title and short answer.
 * Data comes from data-preview-* attributes rendered at build time (no network requests).
 * Touch devices get no preview: a tap simply follows the link.
 */
const SHOW_DELAY_MS = 250;
const HIDE_DELAY_MS = 120;
const canHover = matchMedia('(hover: hover) and (pointer: fine)');

let tip: HTMLDivElement | null = null;
let current: HTMLAnchorElement | null = null;
let showTimer: number | undefined;
let hideTimer: number | undefined;

function tooltip(): HTMLDivElement {
  if (tip) return tip;
  tip = document.createElement('div');
  tip.id = 'term-preview';
  tip.className = 'term-preview';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  tip.append(document.createElement('strong'), document.createElement('p'));
  tip.addEventListener('mouseenter', () => window.clearTimeout(hideTimer));
  tip.addEventListener('mouseleave', () => scheduleHide());
  document.body.append(tip);
  return tip;
}

function place(el: HTMLDivElement, link: HTMLAnchorElement) {
  const anchor = link.getClientRects()[0] ?? link.getBoundingClientRect();
  const margin = 12;
  const width = Math.min(360, window.innerWidth - margin * 2);
  el.style.width = `${width}px`;
  const left = Math.min(Math.max(margin, anchor.left), window.innerWidth - width - margin);
  const below = anchor.bottom + 8;
  const height = el.offsetHeight;
  const top = below + height > window.innerHeight - margin ? anchor.top - height - 8 : below;
  el.style.left = `${left + window.scrollX}px`;
  el.style.top = `${top + window.scrollY}px`;
}

function show(link: HTMLAnchorElement) {
  const title = link.dataset.previewTitle;
  const summary = link.dataset.previewSummary;
  if (!title || !summary) return;
  window.clearTimeout(hideTimer);
  const el = tooltip();
  el.querySelector('strong')!.textContent = title;
  el.querySelector('p')!.textContent = summary;
  el.hidden = false;
  place(el, link);
  current?.removeAttribute('aria-describedby');
  current = link;
  link.setAttribute('aria-describedby', el.id);
}

function hide() {
  window.clearTimeout(showTimer);
  if (tip) tip.hidden = true;
  current?.removeAttribute('aria-describedby');
  current = null;
}

function scheduleHide() {
  window.clearTimeout(showTimer);
  hideTimer = window.setTimeout(hide, HIDE_DELAY_MS);
}

const termFrom = (target: EventTarget | null) =>
  (target as Element | null)?.closest?.<HTMLAnchorElement>('a[data-preview-summary]') ?? null;

document.addEventListener('mouseover', (event) => {
  const link = termFrom(event.target);
  if (!link || !canHover.matches || link === current) return;
  window.clearTimeout(showTimer);
  window.clearTimeout(hideTimer);
  showTimer = window.setTimeout(() => show(link), SHOW_DELAY_MS);
});

document.addEventListener('mouseout', (event) => {
  const link = termFrom(event.target);
  if (link && !link.contains(event.relatedTarget as Node | null)) scheduleHide();
});

document.addEventListener('focusin', (event) => {
  const link = termFrom(event.target);
  if (link && (event.target as Element).matches(':focus-visible')) show(link);
});

document.addEventListener('focusout', (event) => {
  if (termFrom(event.target)) hide();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hide();
});

window.addEventListener('scroll', () => current && tip && !tip.hidden && place(tip, current), { passive: true });
