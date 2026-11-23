export type Theme = 'day' | 'night';

export const getTheme = (): Theme => (document.documentElement.dataset.theme === 'day' ? 'day' : 'night');

const META = { day: '#F3EEE4', night: '#0A101C' };

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[t]);
  try {
    localStorage.setItem('nm-theme', t);
  } catch {
    /* private mode: theme just isn't remembered */
  }
  document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
}

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Toggles the theme with a circular reveal from the pressed button (View Transitions), or a plain cross-fade. */
export function toggleTheme(from?: HTMLElement) {
  const next: Theme = getTheme() === 'day' ? 'night' : 'day';
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || reduceMotion()) {
    apply(next);
    return;
  }
  const r = from?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : innerWidth / 2;
  const y = r ? r.top + r.height / 2 : 0;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.documentElement.classList.add('theme-vt');
  const vt = doc.startViewTransition(() => apply(next));
  vt.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
  setTimeout(() => document.documentElement.classList.remove('theme-vt'), 800);
}

export function initTheme() {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[getTheme()]);
  // Follow the system setting until the visitor picks a theme themselves.
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('nm-theme');
    } catch {
      /* ignore */
    }
    if (!saved) apply(e.matches ? 'day' : 'night');
  });
}
