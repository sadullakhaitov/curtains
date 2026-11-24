import { formatPrice, typeLabel, type Product } from '../data/products';
import { t, tx } from '../i18n';
import { esc, favs } from './dom';
import { icon } from './icons';

const SWATCH: Partial<Record<Product['type'], string>> = { roller: 'fabric roller', zebra: 'fabric roller', venetian: 'fabric slats', vertical: 'fabric vanes', pleated: 'fabric pleats' };
export const fabricClass = (p: Product) => (p.texture ? 'fabric photo' : SWATCH[p.type] ?? 'fabric fold');

/** Inline style for a fabric swatch: the colour, plus the real fabric photo when the product has one. */
export const fabricStyle = (p: Product, hex: string) => `background-color:${hex}${p.texture ? `;background-image:url(${p.texture})` : ''}`;

/** Product media: interior photo, or the tinted fabric itself when there is no photo. */
export function productMedia(p: Product, colorIndex = 0) {
  const name = tx(p.name);
  if (p.image) {
    return `<img src="${p.image}" alt="${esc(name)} — ${t().inInterior}" loading="lazy" decoding="async">`;
  }
  const c = p.colors[colorIndex] ?? p.colors[0];
  return `<div class="${fabricClass(p)}" style="${fabricStyle(p, c.hex)}" role="img" aria-label="${esc(name)}, ${esc(tx(c.name))}"></div>`;
}

export function productCard(p: Product) {
  const fav = favs.has(p.id);
  const name = esc(tx(p.name));
  return `
  <article class="card">
    <a href="#/p/${p.id}" class="card-media zoom press" aria-label="${name}">
      ${productMedia(p)}
      <span class="chip gp card-type">${typeLabel(p.type)}</span>
    </a>
    <button class="gp icon-btn sm card-fav press${fav ? ' is-on' : ''}" data-fav="${p.id}" aria-pressed="${fav}" aria-label="${t().addFav}">${icon.heart(16)}</button>
    <a href="#/p/${p.id}" class="card-body">
      <span class="card-name">${name}</span>
      <span class="card-price">${formatPrice(p)}</span>
      <span class="card-dots" aria-label="${t().colorsCount(p.colors.length)}">${p.colors
        .slice(0, 5)
        .map((c) => `<i style="background:${c.hex}"></i>`)
        .join('')}</span>
    </a>
  </article>`;
}

export function bindFavButtons(root: HTMLElement, onChange?: () => void) {
  root.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('[data-fav]') as HTMLButtonElement | null;
    if (!b || !b.dataset.fav) return;
    e.preventDefault();
    const on = favs.toggle(b.dataset.fav);
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
    onChange?.();
  });
}
