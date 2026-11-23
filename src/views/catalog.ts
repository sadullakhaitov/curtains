import { PRODUCTS, searchText, type CurtainType } from '../data/products';
import { t } from '../i18n';
import { back, navigate, type View } from '../router';
import { bindFavButtons, productCard } from '../ui/card';
import { $, bindHeader, bottomNav, esc, favs, html, langSwitch, themeButton } from '../ui/dom';
import { icon } from '../ui/icons';

const TYPES: (CurtainType | 'all')[] = ['all', 'zebra', 'classic', 'tulle', 'roller'];

const view: View = {
  render(params) {
    const T = t();
    const type = (params.type as CurtainType) || 'all';
    const q = (params.q || '').trim();
    const favOnly = params.fav === '1';
    const query = (ty: string) => {
      const sp = new URLSearchParams();
      if (ty !== 'all') sp.set('type', ty);
      if (q) sp.set('q', q);
      if (favOnly) sp.set('fav', '1');
      const s = sp.toString();
      return '#/catalog' + (s ? '?' + s : '');
    };

    return html(`
    <main class="screen catalog has-nav">
      <div class="glow g1" aria-hidden="true"></div>
      <header class="topbar rise">
        <button class="glass icon-btn press" data-back aria-label="${T.back}">${icon.back(20)}</button>
        <h1 class="title serif">${favOnly ? T.favs : T.catalog}</h1>
        <div class="row gap-8">${langSwitch()}${themeButton()}</div>
      </header>

      <form class="search rise d1" role="search">
        <label class="glass search-field">
          ${icon.search(19)}
          <input name="q" type="search" value="${esc(q)}" placeholder="${T.searchPh}" aria-label="${T.search}" autocomplete="off">
        </label>
      </form>

      <nav class="chips rise d2" aria-label="${T.types}">
        ${TYPES.map(
          (ty) =>
            `<a href="${query(ty)}" data-replace class="chip-btn press ${ty === type ? 'gold' : 'glass'}"${ty === type ? ' aria-current="true"' : ''}>${ty === 'all' ? T.all : T.type[ty]}</a>`,
        ).join('')}
      </nav>

      <p class="count rise d2" data-count></p>
      <div class="grid rise d3" data-grid></div>
      <div class="empty glass" data-empty hidden>
        <b>${T.emptyTitle}</b>
        <small>${favOnly ? T.emptyFav : T.emptySearch}</small>
      </div>
      ${bottomNav(favOnly ? 'fav' : 'catalog')}
    </main>`);
  },
  mount(el, params) {
    bindHeader(el);
    $(el, '[data-back]').addEventListener('click', () => back('/'));
    const type = params.type || 'all';
    const favOnly = params.fav === '1';
    const grid = $(el, '[data-grid]');
    const input = $<HTMLInputElement>(el, 'input[name=q]');

    const draw = () => {
      const q = input.value.trim().toLowerCase();
      const list = PRODUCTS.filter(
        (p) => (type === 'all' || p.type === type) && (!favOnly || favs.has(p.id)) && (!q || searchText(p).includes(q)),
      );
      grid.innerHTML = list.map(productCard).join('');
      $(el, '[data-count]').textContent = t().count(list.length);
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
