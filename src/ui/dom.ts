import { CONTACT } from '../config';
import { getLang, setLang, t, type Lang } from '../i18n';
import { refresh } from '../router';
import { getTheme, toggleTheme } from '../theme';
import { icon } from './icons';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

/** Builds a single root element from an HTML string. */
export function html(markup: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  return tpl.content.firstElementChild as HTMLElement;
}

export const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T;
export const $$ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) =>
  Array.from(root.querySelectorAll(sel)) as T[];

const themeLabel = () => (getTheme() === 'day' ? t().toNight : t().toDay);

/** Theme toggle button markup; wire it with `bindHeader`. */
export const themeButton = (cls = 'glass') => `
  <button class="${cls} icon-btn press" data-theme-toggle aria-label="${themeLabel()}">
    <span class="ti ti-sun">${icon.sun(20)}</span><span class="ti ti-moon">${icon.moon(20)}</span>
  </button>`;

/** UZ | RU switch; wire it with `bindHeader`. */
export const langSwitch = (cls = 'glass') => {
  const l = getLang();
  const b = (code: Lang, label: string, full: string) =>
    `<button class="lang-btn${l === code ? ' is-on' : ''}" data-lang="${code}" lang="${code}" aria-pressed="${l === code}" aria-label="${full}">${label}</button>`;
  return `<div class="lang ${cls}" role="group" aria-label="${t().langLabel}">${b('uz', 'UZ', 'Oʻzbekcha')}${b('ru', 'RU', 'Русский')}</div>`;
};

/** Wires theme toggles and language switches inside a screen. */
export function bindHeader(root: HTMLElement) {
  for (const b of $$(root, '[data-theme-toggle]')) {
    b.addEventListener('click', () => {
      toggleTheme(b);
      setTimeout(() => b.setAttribute('aria-label', themeLabel()), 0);
    });
  }
  for (const b of $$(root, '[data-lang]')) {
    b.addEventListener('click', () => {
      const next = b.dataset.lang as Lang;
      if (next === getLang()) return;
      setLang(next);
      refresh();
    });
  }
}

export const bottomNav = (active: 'home' | 'catalog' | 'fav' | 'contact') => {
  const T = t();
  const item = (key: string, href: string, label: string, svg: string) =>
    `<a href="${href}" class="nav-item press${active === key ? ' is-active' : ''}"${active === key ? ' aria-current="page"' : ''}>${svg}<span>${label}</span></a>`;
  return `
  <nav class="bottom-nav glass" aria-label="${T.navMenu}">
    ${item('home', '#/', T.navHome, icon.home())}
    ${item('catalog', '#/catalog', T.navCatalog, icon.grid())}
    <a href="#/try" class="nav-cam gold press" aria-label="${T.navTry}">${icon.camera(24)}</a>
    ${item('fav', '#/catalog?fav=1', T.navFav, icon.heart())}
    ${item('contact', '#/contact', T.navContact, icon.phone())}
  </nav>`;
};

export function toast(message: string, kind: 'ok' | 'info' = 'ok', ms = 2600) {
  document.querySelector('.toast')?.remove();
  const el = html(
    `<div class="toast gp" role="status"><span class="toast-dot ${kind}">${kind === 'ok' ? icon.check(15) : icon.sparkle(13)}</span>${esc(message)}</div>`,
  );
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 400);
  }, ms);
}

export const telegramLink = (text: string) =>
  CONTACT.telegram ? `https://t.me/${CONTACT.telegram}?text=${encodeURIComponent(text)}` : '';

/** Favourites live in localStorage on this device only. */
export const favs = {
  get(): string[] {
    try {
      return JSON.parse(localStorage.getItem('nm-favs') || '[]');
    } catch {
      return [];
    }
  },
  has(id: string) {
    return this.get().includes(id);
  },
  toggle(id: string) {
    const list = this.get();
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    try {
      localStorage.setItem('nm-favs', JSON.stringify(next));
    } catch {
      /* ignore */
    }
    return next.includes(id);
  },
};
