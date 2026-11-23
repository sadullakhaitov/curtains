import { CONTACT } from '../config';
import { getTheme, toggleTheme } from '../theme';
import { icon } from './icons';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

/** Builds a single root element from an HTML string. */
export function html(markup: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as HTMLElement;
}

export const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T;
export const $$ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) =>
  Array.from(root.querySelectorAll(sel)) as T[];

/** Theme toggle button markup; wire it with `bindThemeToggle`. */
export const themeButton = (cls = 'glass') => `
  <button class="${cls} icon-btn press" data-theme-toggle aria-label="${getTheme() === 'day' ? 'Tun rejimiga oʻtish' : 'Kun rejimiga oʻtish'}">
    <span class="ti ti-sun">${icon.sun(20)}</span><span class="ti ti-moon">${icon.moon(20)}</span>
  </button>`;

export function bindThemeToggle(root: HTMLElement) {
  for (const b of $$(root, '[data-theme-toggle]')) {
    b.addEventListener('click', () => {
      toggleTheme(b);
      setTimeout(() => b.setAttribute('aria-label', getTheme() === 'day' ? 'Tun rejimiga oʻtish' : 'Kun rejimiga oʻtish'), 0);
    });
  }
}

export const bottomNav = (active: 'home' | 'catalog' | 'fav' | 'contact') => {
  const item = (key: string, href: string, label: string, svg: string) =>
    `<a href="${href}" class="nav-item press${active === key ? ' is-active' : ''}"${active === key ? ' aria-current="page"' : ''}>${svg}<span>${label}</span></a>`;
  return `
  <nav class="bottom-nav glass" aria-label="Asosiy menyu">
    ${item('home', '#/', 'Asosiy', icon.home())}
    ${item('catalog', '#/catalog', 'Katalog', icon.grid())}
    <a href="#/try" class="nav-cam gold press" aria-label="Derazamda sinash">${icon.camera(24)}</a>
    ${item('fav', '#/catalog?fav=1', 'Sevimli', icon.heart())}
    ${item('contact', '#/contact', 'Aloqa', icon.phone())}
  </nav>`;
};

export function toast(message: string, kind: 'ok' | 'info' = 'ok', ms = 2600) {
  document.querySelector('.toast')?.remove();
  const t = html(
    `<div class="toast gp" role="status"><span class="toast-dot ${kind}">${kind === 'ok' ? icon.check(15) : icon.sparkle(13)}</span>${esc(message)}</div>`,
  );
  document.body.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 400);
  }, ms);
}

export const telegramLink = (text: string) =>
  CONTACT.telegram ? `https://t.me/${CONTACT.telegram}?text=${encodeURIComponent(text)}` : '';

/** Inline style for a tinted fabric swatch (fold photo × colour). */
export const swatchStyle = (hex: string) => `background-color:${hex}`;

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
