import { CONTACT } from '../config';
import { findProduct, formatPrice, TYPE_LABEL } from '../data/products';
import { back, navigate, type View } from '../router';
import { clearResult, session } from '../store';
import { $, $$, bindThemeToggle, esc, favs, html, telegramLink, themeButton, toast } from '../ui/dom';
import { icon } from '../ui/icons';

const view: View = {
  render(params) {
    const p = findProduct(params.id);
    if (!p) {
      return html(`<main class="screen center"><div class="empty glass"><b>Parda topilmadi</b><a class="link" href="#/catalog">Katalogga qaytish</a></div></main>`);
    }
    const ci = session.productId === p.id ? Math.min(session.colorIndex, p.colors.length - 1) : 0;
    const c = p.colors[ci];
    const fav = favs.has(p.id);
    const tg = telegramLink(`Assalomu alaykum! Menga "${p.name}" (${c.name}) pardasi yoqdi. Narxi va oʻlchov haqida maʼlumot bersangiz.`);
    const fabricCls = p.type === 'roller' ? 'fabric roller' : 'fabric fold';

    return html(`
    <main class="screen product">
      <div class="p-hero" data-hero>
        <div class="${fabricCls} sway" data-fabric style="background-color:${c.hex}" role="img" aria-label="${esc(p.name)} matosi, ${esc(c.name)} rang"></div>
        ${p.image ? `<img class="p-photo" data-photo src="${p.image}" alt="${esc(p.name)} interyerda" decoding="async">` : ''}
        <span class="p-hero-shade" aria-hidden="true"></span>
      </div>

      <header class="topbar overlay rise">
        <button class="gp icon-btn press" data-back aria-label="Orqaga">${icon.back(20)}</button>
        <div class="row gap-8">
          ${themeButton('gp')}
          <button class="gp icon-btn press${fav ? ' is-on' : ''}" data-fav aria-pressed="${fav}" aria-label="Sevimlilarga qoʻshish">${icon.heart(20)}</button>
        </div>
      </header>

      ${
        p.image
          ? `<div class="seg gp p-seg rise d1" role="group" aria-label="Koʻrinish">
              <button class="seg-btn is-on" data-mode="fabric" aria-pressed="true">Mato</button>
              <button class="seg-btn" data-mode="photo" aria-pressed="false">Interyer</button>
            </div>`
          : ''
      }

      <section class="sheet p-sheet">
        <div class="grabber" aria-hidden="true"></div>
        <div class="col gap-4 rise d1">
          <span class="eyebrow">${TYPE_LABEL[p.type].toUpperCase()} · ${esc(p.fabric.toUpperCase())}</span>
          <h1 class="p-title serif">${esc(p.name)} <span data-cname class="muted-serif">${esc(c.name)}</span></h1>
          <span class="price">${formatPrice(p)}</span>
          <p class="muted">${esc(p.description)}</p>
        </div>

        <div class="col gap-10 rise d2">
          <span class="label">Rang · <span class="muted" data-cname2>${esc(c.name)}</span></span>
          <div class="swatches" role="radiogroup" aria-label="Rang">
            ${p.colors
              .map(
                (col, i) =>
                  `<button class="swatch ${fabricCls} press${i === ci ? ' is-on' : ''}" role="radio" aria-checked="${i === ci}" aria-label="${esc(col.name)}" data-ci="${i}" style="background-color:${col.hex}"></button>`,
              )
              .join('')}
          </div>
        </div>

        <div class="cta col gap-10 rise d3">
          <button class="btn gold press" data-try>${icon.camera(22)} Derazamda koʻrish</button>
          ${session.photo ? `<button class="btn glass press" data-try-last>${icon.image(20)} Oldingi rasmimda sinash</button>` : ''}
          ${tg ? `<a class="btn glass press" href="${tg}" target="_blank" rel="noopener">${icon.send(20)} Telegram orqali buyurtma</a>` : ''}
          ${!tg && CONTACT.phone ? `<a class="btn glass press" href="tel:${CONTACT.phone}">${icon.phone(20)} Qoʻngʻiroq qilish</a>` : ''}
        </div>
      </section>
    </main>`);
  },

  mount(el, params) {
    const p = findProduct(params.id);
    bindThemeToggle(el);
    $(el, '[data-back]')?.addEventListener('click', () => back('/catalog'));
    if (!p) return;
    let ci = session.productId === p.id ? Math.min(session.colorIndex, p.colors.length - 1) : 0;

    for (const b of $$(el, '[data-ci]')) {
      b.addEventListener('click', () => {
        ci = Number(b.dataset.ci);
        const c = p.colors[ci];
        $(el, '[data-fabric]').style.backgroundColor = c.hex;
        $(el, '[data-cname]').textContent = c.name;
        $(el, '[data-cname2]').textContent = c.name;
        for (const o of $$(el, '[data-ci]')) {
          o.classList.toggle('is-on', o === b);
          o.setAttribute('aria-checked', String(o === b));
        }
        // Colour choice is a fabric thing: switch back to the fabric view if the interior photo is showing.
        setMode('fabric');
      });
    }

    const setMode = (mode: string) => {
      const photo = el.querySelector<HTMLElement>('[data-photo]');
      if (!photo) return;
      photo.classList.toggle('is-on', mode === 'photo');
      for (const s of $$(el, '[data-mode]')) {
        const on = s.dataset.mode === mode;
        s.classList.toggle('is-on', on);
        s.setAttribute('aria-pressed', String(on));
      }
    };
    for (const s of $$(el, '[data-mode]')) s.addEventListener('click', () => setMode(s.dataset.mode!));

    const fav = $(el, '[data-fav]');
    fav.addEventListener('click', () => {
      const on = favs.toggle(p.id);
      fav.classList.toggle('is-on', on);
      fav.setAttribute('aria-pressed', String(on));
      toast(on ? 'Sevimlilarga qoʻshildi' : 'Sevimlilardan olib tashlandi', 'info', 1600);
    });

    const choose = () => {
      session.productId = p.id;
      session.colorIndex = ci;
      clearResult();
    };
    $(el, '[data-try]').addEventListener('click', () => {
      choose();
      navigate(`/try/${p.id}`);
    });
    el.querySelector('[data-try-last]')?.addEventListener('click', () => {
      choose();
      navigate('/adjust');
    });
  },
};
export default view;
