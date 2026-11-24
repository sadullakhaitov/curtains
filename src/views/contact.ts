import { CONTACT } from '../config';
import { t } from '../i18n';
import { back, type View } from '../router';
import { $, bindHeader, bottomNav, html, langSwitch, themeButton } from '../ui/dom';
import { icon } from '../ui/icons';

const view: View = {
  render() {
    const T = t();
    const row = (href: string, ic: string, title: string, sub: string, ext = true) =>
      `<a class="contact-row glass press" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>
        <span class="gold icon-btn">${ic}</span><span class="col"><b>${title}</b><small>${sub}</small></span></a>`;
    const items = [
      CONTACT.phone && row(`tel:${CONTACT.phone}`, icon.phone(20), T.phone, CONTACT.phoneDisplay || CONTACT.phone, false),
      CONTACT.telegram && row(`https://t.me/${CONTACT.telegram}`, icon.send(20), 'Telegram', `@${CONTACT.telegram}`),
      CONTACT.instagram && row(`https://instagram.com/${CONTACT.instagram}`, icon.instagram(20), T.instagram, `@${CONTACT.instagram}`),
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
        <div class="contact-row glass"><span class="gold icon-btn">${icon.check(20)}</span><span class="col"><b>${T.serviceArea}</b><small>Made in Turkey · VIP / Premium</small></span></div>
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
