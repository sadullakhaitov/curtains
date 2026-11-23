import { CONTACT } from '../config';
import { saveImage, shareImage } from '../ar/export';
import { findProduct, formatPrice, PRODUCTS } from '../data/products';
import { t, tx } from '../i18n';
import { navigate, type View } from '../router';
import { session } from '../store';
import { fabricClass } from '../ui/card';
import { $, $$, esc, html, telegramLink, toast } from '../ui/dom';
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
        ${session.originalUrl ? `<img class="res-img before" src="${session.originalUrl}" alt="${T.noCurtain}">` : ''}
        <img class="res-img after is-on" src="${session.resultUrl}" alt="${esc(T.onWindow(name, cname))}">
      </div>

      <header class="topbar overlay rise">
        <button class="gp icon-btn press" data-edit aria-label="${T.backToAdjust}">${icon.back(20)}</button>
        ${
          session.originalUrl
            ? `<div class="seg gp" role="group" aria-label="${T.compare}">
                <button class="seg-btn" data-show="before" aria-pressed="false">${T.before}</button>
                <button class="seg-btn is-on" data-show="after" aria-pressed="true">${T.after}</button>
              </div>`
            : '<span></span>'
        }
        <a href="#/" class="gp icon-btn press" aria-label="${T.home}">${icon.home(19)}</a>
      </header>

      <section class="sheet res-sheet rise d1">
        <div class="grabber" aria-hidden="true"></div>
        <div class="row gap-12 res-product">
          <span class="dot xl ${fabricCls}" style="background-color:${c.hex}" aria-hidden="true"></span>
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

    for (const b of $$(el, '[data-show]')) {
      b.addEventListener('click', () => {
        const after = b.dataset.show === 'after';
        el.querySelector('.after')!.classList.toggle('is-on', after);
        el.querySelector('.before')?.classList.toggle('is-on', !after);
        for (const o of $$(el, '[data-show]')) {
          o.classList.toggle('is-on', o === b);
          o.setAttribute('aria-pressed', String(o === b));
        }
      });
    }

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
  },
};
export default view;
