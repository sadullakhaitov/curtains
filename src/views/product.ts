import { CONTACT } from '../config';
import { findProduct, formatPrice, typeLabel } from '../data/products';
import { t, tx } from '../i18n';
import { back, navigate, type View } from '../router';
import { clearResult, session } from '../store';
import { fabricClass, fabricStyle } from '../ui/card';
import { $, $$, bindHeader, esc, favs, html, langSwitch, telegramLink, themeButton, toast } from '../ui/dom';
import { icon } from '../ui/icons';

const view: View = {
  render(params) {
    const T = t();
    const p = findProduct(params.id);
    if (!p) {
      return html(`<main class="screen center"><div class="empty glass"><b>${T.notFound}</b><a class="link" href="#/catalog">${T.backToCatalog}</a></div></main>`);
    }
    const ci = session.productId === p.id ? Math.min(session.colorIndex, p.colors.length - 1) : 0;
    const c = p.colors[ci];
    const name = tx(p.name);
    const fav = favs.has(p.id);
    const tg = telegramLink(T.tgProduct(name, tx(c.name)));
    const fc = fabricClass(p);

    return html(`
    <main class="screen product">
      <div class="p-hero">
        <div class="${fc} sway" data-fabric style="${fabricStyle(p, c.hex)}" role="img" aria-label="${esc(T.fabricOf(name, tx(c.name)))}"></div>
        <canvas class="p-3d" data-3d aria-label="${esc(name)} — 3D"></canvas>
        <span class="p-3d-hint gp chip" data-3d-hint hidden>${icon.move(14)} ${T.rotateHint}</span>
        ${p.image ? `<img class="p-photo" data-photo src="${p.image}" alt="${esc(name)} — ${T.inInterior}" decoding="async">` : ''}
        <span class="p-hero-shade" aria-hidden="true"></span>
      </div>

      <header class="topbar overlay rise">
        <button class="gp icon-btn press" data-back aria-label="${T.back}">${icon.back(20)}</button>
        <div class="row gap-8">
          ${langSwitch('gp')}
          ${themeButton('gp')}
          <button class="gp icon-btn press${fav ? ' is-on' : ''}" data-fav aria-pressed="${fav}" aria-label="${T.addFav}">${icon.heart(20)}</button>
        </div>
      </header>

      ${
        p.image
          ? `<div class="seg gp p-seg rise d1" role="group" aria-label="${T.view}">
              <button class="seg-btn is-on" data-mode="fabric" aria-pressed="true">${T.fabricTab}</button>
              <button class="seg-btn" data-mode="photo" aria-pressed="false">${T.interiorTab}</button>
            </div>`
          : ''
      }

      <section class="sheet p-sheet">
        <div class="grabber" aria-hidden="true"></div>
        <div class="col gap-4 rise d1">
          <span class="eyebrow">${typeLabel(p.type).toUpperCase()} · ${esc(tx(p.fabric).toUpperCase())}</span>
          <h1 class="p-title serif">${esc(name)} <span data-cname class="muted-serif">${esc(tx(c.name))}</span></h1>
          <span class="price">${formatPrice(p)}</span>
          <p class="muted">${esc(tx(p.description))}</p>
        </div>

        <div class="col gap-10 rise d2">
          <span class="label">${T.color} · <span class="muted" data-cname2>${esc(tx(c.name))}</span></span>
          <div class="swatches" role="radiogroup" aria-label="${T.color}">
            ${p.colors
              .map(
                (col, i) =>
                  `<button class="swatch ${fc} press${i === ci ? ' is-on' : ''}" role="radio" aria-checked="${i === ci}" aria-label="${esc(tx(col.name))}" data-ci="${i}" style="${fabricStyle(p, col.hex)}"></button>`,
              )
              .join('')}
          </div>
        </div>

        <div class="cta col gap-10 rise d3">
          <button class="btn gold press" data-try>${icon.camera(22)} ${T.tryOnWindow}</button>
          ${session.photo ? `<button class="btn glass press" data-try-last>${icon.image(20)} ${T.tryLast}</button>` : ''}
          ${tg ? `<a class="btn glass press" href="${tg}" target="_blank" rel="noopener">${icon.send(20)} ${T.orderTg}</a>` : ''}
          ${!tg && CONTACT.phone ? `<a class="btn glass press" href="tel:${CONTACT.phone}">${icon.phone(20)} ${T.call}</a>` : ''}
        </div>
      </section>
    </main>`);
  },

  mount(el, params) {
    const p = findProduct(params.id);
    bindHeader(el);
    $(el, '[data-back]')?.addEventListener('click', () => back('/catalog'));
    if (!p) return;
    let ci = session.productId === p.id ? Math.min(session.colorIndex, p.colors.length - 1) : 0;

    // ---- 3D showroom: the curtain in a virtual room, turned with a finger ----
    const cv = $<HTMLCanvasElement>(el, '[data-3d]');
    const hero = cv.parentElement as HTMLElement;
    let view3d: { renderStudio: (y: number, pi: number, q: Record<string, unknown>) => void; setFabricTexture: (i: HTMLImageElement | null) => void } | null = null;
    let yaw = 0.35, pitch = 0.05, auto = true, raf3 = 0, alive3 = true;
    const studioParams = () => {
      const col = p.colors[ci] ?? p.colors[0];
      const flat = p.type === 'roller' || p.type === 'zebra';
      return { type: p.type, color: col.hex, open: flat ? 0.12 : 0.3, tulle: p.type === 'tulle' ? 0.9 : flat ? 0.25 : 0.35, drop: 0.2, alpha: 1, finish: p.finish };
    };
    const draw3d = () => {
      raf3 = 0;
      view3d?.renderStudio(yaw, pitch, studioParams());
    };
    const redraw3d = () => {
      if (!raf3) raf3 = requestAnimationFrame(draw3d);
    };
    const t0 = performance.now();
    const spin = (now: number) => {
      if (!alive3 || !auto) return;
      const k = (now - t0) / 1000;
      yaw = 0.35 * Math.cos(k * 0.6);
      draw3d();
      if (k < 7) requestAnimationFrame(spin);
      else auto = false;
    };
    (async () => {
      try {
        const [{ Curtain3D }, rmod] = await Promise.all([import('../ar/renderer3d'), import('../ar/renderer')]);
        if (!alive3) return;
        const r = new Curtain3D(cv);
        const b = hero.getBoundingClientRect();
        r.setStudio(b.width, b.height);
        if (p.texture) r.setFabricTexture(await rmod.loadTexture(p.texture));
        view3d = r as unknown as typeof view3d;
        draw3d();
        hero.classList.add('has-3d');
        // likely next step is "try on my window": fetch the recognition models quietly meanwhile
        setTimeout(() => import('../ar/vision').then((v) => v.prefetchVision()), 2500);
        el.querySelector<HTMLElement>('[data-3d-hint]')!.hidden = false;
        requestAnimationFrame(spin);
      } catch {
        cv.remove();
      }
    })();
    let drag: { x: number; y: number; yaw: number; pitch: number } | null = null;
    cv.addEventListener('pointerdown', (e) => {
      auto = false;
      cv.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, yaw, pitch };
      el.querySelector<HTMLElement>('[data-3d-hint]')?.classList.add('gone');
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drag) return;
      yaw = Math.max(-0.85, Math.min(0.85, drag.yaw + (e.clientX - drag.x) * 0.006));
      pitch = Math.max(-0.2, Math.min(0.3, drag.pitch + (e.clientY - drag.y) * 0.004));
      redraw3d();
    });
    const endDrag = () => (drag = null);
    cv.addEventListener('pointerup', endDrag);
    cv.addEventListener('pointercancel', endDrag);

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

    for (const b of $$(el, '[data-ci]')) {
      b.addEventListener('click', () => {
        ci = Number(b.dataset.ci);
        const c = p.colors[ci];
        session.productId = p.id;
        session.colorIndex = ci;
        $(el, '[data-fabric]').style.backgroundColor = c.hex;
        redraw3d();
        $(el, '[data-cname]').textContent = tx(c.name);
        $(el, '[data-cname2]').textContent = tx(c.name);
        for (const o of $$(el, '[data-ci]')) {
          o.classList.toggle('is-on', o === b);
          o.setAttribute('aria-checked', String(o === b));
        }
        // Colour is a fabric thing: switch back to the fabric view if the interior photo is showing.
        setMode('fabric');
      });
    }

    const fav = $(el, '[data-fav]');
    fav.addEventListener('click', () => {
      const on = favs.toggle(p.id);
      fav.classList.toggle('is-on', on);
      fav.setAttribute('aria-pressed', String(on));
      toast(on ? t().favAdded : t().favRemoved, 'info', 1600);
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
    return () => {
      alive3 = false;
    };
  },
};
export default view;
