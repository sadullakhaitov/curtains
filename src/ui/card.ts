import { formatPrice, TYPE_LABEL, type Product } from '../data/products';
import { esc, favs, swatchStyle } from './dom';
import { icon } from './icons';

/** Product media: interior photo, or the tinted fabric itself when there is no photo. */
export function productMedia(p: Product, colorIndex = 0, eager = false) {
  if (p.image) {
    return `<img src="${p.image}" alt="${esc(p.name)} — interyerda" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }
  const c = p.colors[colorIndex] ?? p.colors[0];
  const cls = p.type === 'roller' ? 'fabric roller' : 'fabric fold';
  return `<div class="${cls}" style="${swatchStyle(c.hex)}" role="img" aria-label="${esc(p.name)}, ${esc(c.name)}"></div>`;
}

export function productCard(p: Product) {
  const fav = favs.has(p.id);
  return `
  <article class="card">
    <a href="#/p/${p.id}" class="card-media zoom press" aria-label="${esc(p.name)}">
      ${productMedia(p)}
      <span class="chip gp card-type">${TYPE_LABEL[p.type]}</span>
    </a>
    <button class="gp icon-btn sm card-fav press${fav ? ' is-on' : ''}" data-fav="${p.id}" aria-pressed="${fav}" aria-label="Sevimlilarga qoʻshish">${icon.heart(16)}</button>
    <a href="#/p/${p.id}" class="card-body">
      <span class="card-name">${esc(p.name)}</span>
      <span class="card-price">${formatPrice(p)}</span>
      <span class="card-dots" aria-label="${p.colors.length} ta rang">${p.colors
        .slice(0, 5)
        .map((c) => `<i style="background:${c.hex}"></i>`)
        .join('')}</span>
    </a>
  </article>`;
}

export function bindFavButtons(root: HTMLElement, onChange?: () => void) {
  root.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('[data-fav]') as HTMLButtonElement | null;
    if (!b) return;
    e.preventDefault();
    const on = favs.toggle(b.dataset.fav!);
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
    onChange?.();
  });
}
