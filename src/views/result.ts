import { CONTACT } from '../config';
import { saveImage, shareImage } from '../ar/export';
import { findProduct, formatPrice, PRODUCTS } from '../data/products';
import { t, tx } from '../i18n';
import { navigate, type View } from '../router';
import { session } from '../store';
import { fabricClass, fabricStyle } from '../ui/card';
import { $, esc, html, telegramLink, toast } from '../ui/dom';
import { bottomSheet } from '../ui/sheet';
import { icon } from '../ui/icons';

const view: View = {
  render() {
    if (!session.resultUrl) {
      setTimeout(() => navigate(session.photo ? '/adjust' : '/try', true), 0);
      return html('<main class="screen center"><span class="spinner"></span></main>');
    }
    const T = t();
    const p = findProduct(session.productId) ?? PRODUCTS[0];
    const c = p.colors[session.colorIndex] ?? p.colors[0];
    const name = tx(p.name), cname = tx(c.name);
    const tg = telegramLink(T.tgResult(name, cname));
    const fabricCls = fabricClass(p);

    return html(`
    <main class="screen result">
      <div class="stage result-stage">
        <div class="compare${session.originalUrl ? '' : ' single'}" data-compare style="--pos:50%">
          ${session.originalUrl ? `<img class="cmp-img" src="${session.originalUrl}" alt="${T.noCurtain}" draggable="false">` : ''}
          <img class="cmp-img cmp-after" data-after src="${session.resultUrl}" alt="${esc(T.onWindow(name, cname))}" draggable="false">
          ${
            session.originalUrl
              ? `<span class="cmp-tag left gp">${T.before}</span><span class="cmp-tag right gp">${T.after}</span>
                 <div class="cmp-line" aria-hidden="true"><span class="cmp-knob gold">${icon.back(14)}${icon.arrow(14)}</span></div>
                 <input class="cmp-range" type="range" min="0" max="100" value="50" step="1" aria-label="${T.compare}: ${T.before} / ${T.after}">`
              : ''
          }
        </div>
      </div>

      <header class="topbar overlay rise">
        <button class="gp icon-btn press" data-edit aria-label="${T.backToAdjust}">${icon.back(20)}</button>
        <span class="cmp-hint gp chip" ${session.originalUrl ? '' : 'hidden'}>${icon.move(14)} ${T.compare}</span>
        <a href="#/" class="gp icon-btn press" aria-label="${T.home}">${icon.home(19)}</a>
      </header>

      <section class="sheet res-sheet sheet-in" data-sheet aria-label="${T.save}">
        <button class="sheet-handle" data-sheet-handle aria-expanded="true" aria-label="${T.save}"><span class="grabber" aria-hidden="true"></span><span class="sheet-label" aria-hidden="true">${icon.chevUp(16)} ${T.save}</span></button>
        <div class="row gap-12 res-product">
          <span class="dot xl ${fabricCls}" style="${fabricStyle(p, c.hex)}" aria-hidden="true"></span>
          <div class="col grow">
            <b class="serif res-name">${esc(name)}</b>
            <small class="muted">${esc(cname)} · ${formatPrice(p)}</small>
          </div>
        </div>
        <div class="grid2">
          <button class="btn gold press" data-save>${icon.download(20)} ${T.save}</button>
          <button class="btn glass press" data-share>${icon.share(20)} ${T.share}</button>
        </div>
        ${tg ? `<a class="btn glass press" href="${tg}" target="_blank" rel="noopener">${icon.send(20)} ${T.orderThis}</a>` : ''}
        ${!tg && CONTACT.phone ? `<a class="btn glass press" href="tel:${CONTACT.phone}">${icon.phone(20)} ${T.callOrder}</a>` : ''}
        <div class="row between res-links">
          <a href="#/adjust" class="link" data-replace>${T.tryOther}</a>
          <a href="#/try" class="link">${T.newPhoto}</a>
        </div>
      </section>
    </main>`);
  },

  mount(el) {
    if (!session.result) return;
    const p = findProduct(session.productId) ?? PRODUCTS[0];
    const name = `newmoon-${p.id}-${Date.now().toString(36)}.jpg`;

    // ---- Before / after: a divider over the photo. Left of the line = before, right = after,
    // so dragging it left reveals the curtain, dragging it right shows the bare window.
    const stage = $(el, '.result-stage');
    const cmp = $(el, '[data-compare]');
    const afterImg = $<HTMLImageElement>(el, '[data-after]');
    const range = el.querySelector<HTMLInputElement>('.cmp-range');
    let sheetVisible = 0;
    const fit = () => {
      const iw = afterImg.naturalWidth || 4, ih = afterImg.naturalHeight || 3;
      const r = stage.getBoundingClientRect();
      const availH = Math.max(120, r.height - sheetVisible + 26);
      const k = Math.min(r.width / iw, availH / ih);
      const w = iw * k, h = ih * k;
      Object.assign(cmp.style, { width: `${w}px`, height: `${h}px`, left: `${(r.width - w) / 2}px`, top: `${Math.max(0, (availH - h) / 2)}px` });
    };
    if (afterImg.complete) fit();
    else afterImg.addEventListener('load', fit, { once: true });
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    const setPos = (pct: number) => {
      const v = Math.max(0, Math.min(100, pct));
      cmp.style.setProperty('--pos', `${v}%`);
      if (range) range.value = String(Math.round(v));
    };
    if (range) {
      range.addEventListener('input', () => setPos(Number(range.value)));
      let dragging = false;
      const at = (e: PointerEvent) => {
        const b = cmp.getBoundingClientRect();
        setPos(((e.clientX - b.left) / b.width) * 100);
      };
      cmp.addEventListener('pointerdown', (e) => {
        dragging = true;
        cmp.setPointerCapture(e.pointerId);
        cmp.classList.add('is-dragging');
        at(e);
      });
      cmp.addEventListener('pointermove', (e) => {
        if (dragging) at(e);
      });
      const end = () => {
        dragging = false;
        cmp.classList.remove('is-dragging');
      };
      cmp.addEventListener('pointerup', end);
      cmp.addEventListener('pointercancel', end);
    }

    const sheet = bottomSheet($(el, '[data-sheet]'), {
      onMove: (v) => {
        sheetVisible = v;
        fit();
      },
    });
    $(el, '[data-edit]').addEventListener('click', () => navigate('/adjust', true));

    $(el, '[data-save]').addEventListener('click', async () => {
      const r = await saveImage(session.result!, name);
      if (r === 'downloaded') toast(t().saved);
      else if (r === 'shared') toast(t().ready);
    });

    $(el, '[data-share]').addEventListener('click', async () => {
      const ok = await shareImage(session.result!, name, `NewMoon: ${tx(p.name)}`);
      if (!ok) {
        const r = await saveImage(session.result!, name);
        if (r === 'downloaded') toast(t().shareFallback, 'info');
      }
    });
    return () => {
      sheet.destroy();
      ro.disconnect();
    };
  },
};
export default view;
