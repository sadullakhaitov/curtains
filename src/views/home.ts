import { PRODUCTS } from '../data/products';
import { navigate, type View } from '../router';
import { bindFavButtons, productCard } from '../ui/card';
import { bindThemeToggle, bottomNav, html, themeButton } from '../ui/dom';
import { icon } from '../ui/icons';

const view: View = {
  render() {
    const popular = PRODUCTS.filter((p) => p.popular);
    return html(`
    <main class="screen home has-nav">
      <div class="glow g1" aria-hidden="true"></div>
      <div class="glow g2" aria-hidden="true"></div>

      <header class="topbar rise">
        <a href="#/" class="brand" aria-label="NewMoon bosh sahifa">
          <img src="images/logo.webp" alt="" width="42" height="38">
          <span class="brand-text"><b>NewMoon</b><small>PARDALAR SALONI</small></span>
        </a>
        <div class="row gap-8">
          ${themeButton()}
          <a href="#/contact" class="glass icon-btn press" aria-label="Aloqa">${icon.phone(20)}</a>
        </div>
      </header>

      <h1 class="display rise d1">Derazangizga<br><em>munosib</em> parda</h1>

      <form class="search rise d2" action="#" role="search">
        <label class="glass search-field">
          ${icon.search(19)}
          <input name="q" type="search" placeholder="Parda, rang yoki mato…" aria-label="Qidirish" autocomplete="off">
        </label>
        <button class="gold icon-btn lg press" aria-label="Qidirish">${icon.arrow(20)}</button>
      </form>

      <a href="#/try" class="hero zoom rise d3">
        <img src="images/hero.webp" alt="Kulrang pardali zamonaviy yotoqxona" fetchpriority="high" decoding="async">
        <span class="hero-shade" aria-hidden="true"></span>
        <span class="chip gp hero-tag">${icon.sparkle()} Kamerada sinash</span>
        <span class="hero-panel gp">
          <span class="col">
            <b class="serif">Derazangizda koʻring</b>
            <small>Tanlang, suratga oling — parda joyida</small>
          </span>
          <span class="gold icon-btn lg" aria-hidden="true">${icon.camera(22)}</span>
        </span>
      </a>

      <nav class="chips rise d4" aria-label="Turlar">
        <a href="#/catalog" class="chip-btn gold press">Barchasi</a>
        <a href="#/catalog?type=classic" class="chip-btn glass press">Klassik</a>
        <a href="#/catalog?type=tulle" class="chip-btn glass press">Tyul</a>
        <a href="#/catalog?type=roller" class="chip-btn glass press">Rulonli</a>
      </nav>

      <div class="section-head rise d5">
        <h2 class="serif">Mashhur pardalar</h2>
        <a href="#/catalog" class="link">Hammasi</a>
      </div>
      <div class="grid rise d5">${popular.map(productCard).join('')}</div>

      <section class="how rise">
        <h2 class="serif">Qanday ishlaydi?</h2>
        <ol>
          <li class="glass"><span class="num">1</span><b>Pardani tanlang</b><small>Katalogdan mato va rangni tanlang</small></li>
          <li class="glass"><span class="num">2</span><b>Derazani suratga oling</b><small>Yoki galereyadan rasm yuklang</small></li>
          <li class="glass"><span class="num">3</span><b>Burchaklarni belgilang</b><small>Parda derazaga aniq tushadi</small></li>
          <li class="glass"><span class="num">4</span><b>Saqlang va ulashing</b><small>Rasm telefoningizda qoladi</small></li>
        </ol>
      </section>

      ${bottomNav('home')}
    </main>`);
  },
  mount(el) {
    bindThemeToggle(el);
    bindFavButtons(el);
    el.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = (new FormData(e.target as HTMLFormElement).get('q') as string).trim();
      navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog');
    });
  },
};
export default view;
