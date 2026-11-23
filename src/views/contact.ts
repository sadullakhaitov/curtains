import { CONTACT } from '../config';
import { t } from '../i18n';
import { back, type View } from '../router';
import { $, bindHeader, bottomNav, html, langSwitch, themeButton } from '../ui/dom';
import { icon } from '../ui/icons';

const view: View = {
  render() {
    const T = t();
    const items = [
      CONTACT.telegram &&
        `<a class="contact-row glass press" href="https://t.me/${CONTACT.telegram}" target="_blank" rel="noopener">
          <span class="gold icon-btn">${icon.send(20)}</span><span class="col"><b>Telegram</b><small>@${CONTACT.telegram}</small></span></a>`,
      CONTACT.phone &&
        `<a class="contact-row glass press" href="tel:${CONTACT.phone}">
          <span class="gold icon-btn">${icon.phone(20)}</span><span class="col"><b>${T.phone}</b><small>${CONTACT.phone}</small></span></a>`,
    ].filter(Boolean);

    return html(`
    <main class="screen contact has-nav">
      <div class="glow g1" aria-hidden="true"></div>
      <header class="topbar rise">
        <button class="glass icon-btn press" data-back aria-label="${T.back}">${icon.back(20)}</button>
        <h1 class="title serif">${T.contact}</h1>
        <div class="row gap-8">${langSwitch()}${themeButton()}</div>
      </header>
      <div class="contact-hero rise d1">
        <img src="images/logo.webp" alt="${T.logoAlt}" width="120" height="108">
        <h2 class="display sm">${T.contactTitle}</h2>
        <p class="muted">${T.contactText}</p>
      </div>
      <div class="col gap-10 rise d2">
        ${items.length ? items.join('') : `<div class="empty glass"><b>${T.contactSoon}</b><small>${T.contactSoonText}</small></div>`}
      </div>
      ${bottomNav('contact')}
    </main>`);
  },
  mount(el) {
    bindHeader(el);
    $(el, '[data-back]').addEventListener('click', () => back('/'));
  },
};
export default view;
