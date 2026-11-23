export type Cleanup = void | (() => void);

export interface View {
  /** Builds the screen. May be async (e.g. loading textures). */
  render(params: Record<string, string>): HTMLElement | Promise<HTMLElement>;
  /** Runs after the screen is in the document; returns a cleanup for when it leaves. */
  mount?(el: HTMLElement, params: Record<string, string>): Cleanup;
}

interface Route {
  pattern: RegExp;
  keys: string[];
  view: () => Promise<View>;
}

const routes: Route[] = [];
let root: HTMLElement;
let cleanup: Cleanup;
let token = 0;
let rendered = '';
let lastIndex = 0;

export function route(path: string, view: () => Promise<View>) {
  const keys: string[] = [];
  const pattern = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
  routes.push({ pattern, keys, view });
}

const index = (): number => (history.state && typeof history.state.i === 'number' ? history.state.i : 0);
const current = () => location.hash.replace(/^#/, '') || '/';

/** In-app navigation. Every entry remembers its depth so `back()` knows whether there is an in-app page behind it. */
export function navigate(path: string, replace = false) {
  const i = replace ? index() : index() + 1;
  try {
    if (replace) history.replaceState({ i }, '', '#' + path);
    else history.pushState({ i }, '', '#' + path);
  } catch {
    // Some sandboxed frames refuse the History API; plain hash navigation still works.
    location.hash = path;
    return;
  }
  resolve();
}

/** Goes back inside the app; if the visitor landed directly on this screen, goes to `fallback` instead. */
export function back(fallback = '/') {
  if (index() > 0) history.back();
  else navigate(fallback, true);
}

let fade = false;

/** Re-renders the current screen in place (e.g. after a language change) with a cross-fade. */
export function refresh() {
  rendered = '';
  fade = true;
  resolve();
}

async function resolve() {
  const full = current();
  if (full === rendered) return;
  const my = ++token;
  const path = full.split('?')[0];
  const r = routes.find((x) => x.pattern.test(path)) ?? routes[0];
  const m = path.match(r.pattern);
  const params: Record<string, string> = {};
  r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m?.[i + 1] ?? '')));
  new URLSearchParams(full.split('?')[1] || '').forEach((v, k) => (params[k] = v));

  const view = await r.view();
  const el = await view.render(params);
  if (my !== token) return;
  rendered = full;

  const i = index();
  const dir = fade ? 'fade' : i >= lastIndex ? 'forward' : 'back';
  fade = false;
  lastIndex = i;

  const swap = () => {
    if (typeof cleanup === 'function') cleanup();
    cleanup = undefined;
    const keepScroll = dir === 'fade' ? window.scrollY : 0;
    root.replaceChildren(el);
    window.scrollTo(0, keepScroll);
    cleanup = view.mount?.(el, params);
  };

  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (doc.startViewTransition && !reduce && root.childElementCount) {
    document.documentElement.dataset.nav = dir;
    doc.startViewTransition(swap);
  } else {
    swap();
    if (!reduce) el.classList.add('screen-enter');
  }
}

export function startRouter(el: HTMLElement) {
  root = el;
  try {
    if (!history.state) history.replaceState({ i: 0 }, '', location.href);
  } catch {
    /* sandboxed frame: hash navigation only */
  }
  addEventListener('popstate', resolve);
  addEventListener('hashchange', resolve);
  // Plain links like <a href="#/catalog"> go through navigate() so they get history depth + transitions.
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.('a[href^="#/"]') as HTMLAnchorElement | null;
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    e.preventDefault();
    const to = a.getAttribute('href')!.slice(1);
    navigate(to, a.hasAttribute('data-replace'));
  });
  resolve();
}
