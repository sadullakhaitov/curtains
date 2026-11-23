import { PRODUCTS, TYPE_LABEL, type CurtainType } from '../data/products';
import { back, navigate, type View } from '../router';
import { bindFavButtons, productCard } from '../ui/card';
import { $, bindThemeToggle, bottomNav, esc, favs, html, themeButton } from '../ui/dom';
import { icon } from '../ui/icons';

const TYPES: (CurtainType | 'all')[] = ['all', 'classic', 'tulle', 'roller'];

const view: View = {
  render(params) {
    const type = (params.type as CurtainType) || 'all';
    const q = (params.q || '').trim();
    const favOnly = params.fav === '1';
    const query = (t: string) => {
      const sp = new URLSearchParams();
      if (t !== 'all') sp.set('type', t);
      if (q) sp.set('q', q);
      if (favOnly) sp.set('fav', '1');
      const s = sp.toString();
      return '#/catalog' + (s ? '?' + s : '');
    };

    return html(`
    <main class="screen catalog has-nav">
      <div class="glow g1" aria-hidden="true"></div>
      <header class="topbar rise">
        <button class="glass icon-btn press" data-back aria-label="Orqaga">${icon.back(20)}</button>
        <h1 class="title serif">${favOnly ? 'Sevimlilar' : 'Katalog'}</h1>
        ${themeButton()}
      </header>

      <form class="search rise d1" role="search">
        <label class="glass search-field">
          ${icon.search(19)}
          <input name="q" type="search" value="${esc(q)}" placeholder="Parda, rang yoki mato…" aria-label="Qidirish" autocomplete="off">
        </label>
      </form>

      <nav class="chips rise d2" aria-label="Turlar">
        ${TYPES.map(
          (t) =>
            `<a href="${query(t)}" data-replace class="chip-btn press ${t === type ? 'gold' : 'glass'}"${t === type ? ' aria-current="true"' : ''}>${t === 'all' ? 'Barchasi' : TYPE_LABEL[t]}</a>`,
        ).join('')}
      </nav>

      <p class="count rise d2" data-count></p>
      <div class="grid rise d3" data-grid></div>
      <div class="empty glass" data-empty hidden>
        <b>Hech narsa topilmadi</b>
        <small>${favOnly ? 'Yurakcha belgisini bosib pardalarni sevimlilarga qoʻshing.' : 'Boshqa soʻz yoki turni sinab koʻring.'}</small>
      </div>
      ${bottomNav(favOnly ? 'fav' : 'catalog')}
    </main>`);
  },
  mount(el, params) {
    bindThemeToggle(el);
    $(el, '[data-back]').addEventListener('click', () => back('/'));
    const type = params.type || 'all';
    const favOnly = params.fav === '1';
    const grid = $(el, '[data-grid]');
    const input = $<HTMLInputElement>(el, 'input[name=q]');

    const draw = () => {
      const q = input.value.trim().toLowerCase();
      const list = PRODUCTS.filter(
        (p) =>
          (type === 'all' || p.type === type) &&
          (!favOnly || favs.has(p.id)) &&
          (!q ||
            [p.name, p.fabric, TYPE_LABEL[p.type], ...p.colors.map((c) => c.name)].join(' ').toLowerCase().includes(q)),
      );
      grid.innerHTML = list.map(productCard).join('');
      $(el, '[data-count]').textContent = `${list.length} ta parda`;
      $(el, '[data-empty]').hidden = list.length > 0;
    };
    draw();
    bindFavButtons(grid, () => favOnly && draw());
    input.addEventListener('input', draw);
    $(el, 'form').addEventListener('submit', (e) => {
      e.preventDefault();
      const sp = new URLSearchParams(location.hash.split('?')[1] || '');
      if (input.value.trim()) sp.set('q', input.value.trim());
      else sp.delete('q');
      navigate('/catalog' + (sp.toString() ? '?' + sp : ''), true);
    });
  },
};
export default view;
