import { PRODUCTS } from '../data/products';
import { t } from '../i18n';
import { navigate, type View } from '../router';
import { bindFavButtons, productCard } from '../ui/card';
import { bindHeader, bottomNav, html, langSwitch, themeButton } from '../ui/dom';
import { icon } from '../ui/icons';

const view: View = {
  render() {
    const T = t();
    const popular = PRODUCTS.filter((p) => p.popular);
    return html(`
    <main class="screen home has-nav">
      <div class="glow g1" aria-hidden="true"></div>
      <div class="glow g2" aria-hidden="true"></div>

      <header class="topbar rise">
        <a href="#/" class="brand" aria-label="NewMoon — ${T.home}">
          <img src="images/logo.webp" alt="" width="42" height="38">
          <span class="brand-text"><b>NewMoon</b><small>${T.brandSub}</small></span>
        </a>
        <div class="row gap-8">
          ${langSwitch()}
          ${themeButton()}
        </div>
      </header>

      <h1 class="display rise d1">${T.display}</h1>

      <form class="search rise d2" action="#" role="search">
        <label class="glass search-field">
          ${icon.search(19)}
          <input name="q" type="search" placeholder="${T.searchPh}" aria-label="${T.search}" autocomplete="off">
        </label>
        <button class="gold icon-btn lg press" aria-label="${T.search}">${icon.arrow(20)}</button>
      </form>

      <a href="#/try" class="hero zoom rise d3">
        <img src="images/hero.webp" alt="${T.heroAlt}" fetchpriority="high" decoding="async">
        <span class="hero-shade" aria-hidden="true"></span>
        <span class="chip gp hero-tag">${icon.sparkle()} ${T.tryTag}</span>
        <span class="hero-panel gp">
          <span class="col">
            <b class="serif">${T.tryTitle}</b>
            <small>${T.trySub}</small>
          </span>
          <span class="gold icon-btn lg" aria-hidden="true">${icon.camera(22)}</span>
        </span>
      </a>

      <nav class="chips rise d4" aria-label="${T.types}">
        <a href="#/catalog" class="chip-btn gold press">${T.all}</a>
        <a href="#/catalog?type=classic" class="chip-btn glass press">${T.type.classic}</a>
        <a href="#/catalog?type=tulle" class="chip-btn glass press">${T.type.tulle}</a>
        <a href="#/catalog?type=roller" class="chip-btn glass press">${T.type.roller}</a>
      </nav>

      <div class="section-head rise d5">
        <h2 class="serif">${T.popular}</h2>
        <a href="#/catalog" class="link">${T.seeAll}</a>
      </div>
      <div class="grid rise d5">${popular.map(productCard).join('')}</div>

      <section class="how rise">
        <h2 class="serif">${T.how}</h2>
        <ol>
          ${T.steps.map(([b, s], i) => `<li class="glass"><span class="num">${i + 1}</span><b>${b}</b><small>${s}</small></li>`).join('')}
        </ol>
      </section>

      ${bottomNav('home')}
    </main>`);
  },
  mount(el) {
    bindHeader(el);
    bindFavButtons(el);
    el.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = (new FormData(e.target as HTMLFormElement).get('q') as string).trim();
      navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog');
    });
  },
};
export default view;
