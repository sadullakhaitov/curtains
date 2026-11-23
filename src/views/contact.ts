import { CONTACT } from '../config';
import { back, type View } from '../router';
import { $, bindThemeToggle, bottomNav, html, themeButton } from '../ui/dom';
import { icon } from '../ui/icons';

const view: View = {
  render() {
    const items = [
      CONTACT.telegram &&
        `<a class="contact-row glass press" href="https://t.me/${CONTACT.telegram}" target="_blank" rel="noopener">
          <span class="gold icon-btn">${icon.send(20)}</span><span class="col"><b>Telegram</b><small>@${CONTACT.telegram}</small></span></a>`,
      CONTACT.phone &&
        `<a class="contact-row glass press" href="tel:${CONTACT.phone}">
          <span class="gold icon-btn">${icon.phone(20)}</span><span class="col"><b>Telefon</b><small>${CONTACT.phone}</small></span></a>`,
    ].filter(Boolean);

    return html(`
    <main class="screen contact has-nav">
      <div class="glow g1" aria-hidden="true"></div>
      <header class="topbar rise">
        <button class="glass icon-btn press" data-back aria-label="Orqaga">${icon.back(20)}</button>
        <h1 class="title serif">Aloqa</h1>
        ${themeButton()}
      </header>
      <div class="contact-hero rise d1">
        <img src="images/logo.webp" alt="NewMoon logotipi" width="120" height="108">
        <h2 class="display sm">Oʻlchov va buyurtma</h2>
        <p class="muted">Usta uyingizga kelib, derazangizni oʻlchab beradi. Parda oʻlchamingiz boʻyicha tikiladi.</p>
      </div>
      <div class="col gap-10 rise d2">
        ${items.length ? items.join('') : '<div class="empty glass"><b>Aloqa maʼlumotlari tez orada</b><small>Telefon va Telegram manzili shu yerda boʻladi.</small></div>'}
      </div>
      ${bottomNav('contact')}
    </main>`);
  },
  mount(el) {
    bindThemeToggle(el);
    $(el, '[data-back]').addEventListener('click', () => back('/'));
  },
};
export default view;
