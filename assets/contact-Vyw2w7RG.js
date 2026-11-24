import{b as m,$ as d,i as t,C as s,h as p,l as g,t as h,a as $}from"./dom-b7Z3Evsc.js";import{b,t as v}from"./index-D9lPXR-M.js";const w={render(){const a=v(),e=(n,c,o,i,r=!0)=>`<a class="contact-row glass press" href="${n}"${r?' target="_blank" rel="noopener"':""}>
        <span class="gold icon-btn">${c}</span><span class="col"><b>${o}</b><small>${i}</small></span></a>`,l=[e(`tel:${s.phone}`,t.phone(20),a.phone,s.phoneDisplay,!1),e(`https://t.me/${s.telegram}`,t.send(20),"Telegram",`@${s.telegram}`),e(`https://instagram.com/${s.instagram}`,t.instagram(20),a.instagram,`@${s.instagram}`)].filter(Boolean);return p(`
    <main class="screen contact has-nav">
      <div class="glow g1" aria-hidden="true"></div>
      <header class="topbar rise">
        <button class="glass icon-btn press" data-back aria-label="${a.back}">${t.back(20)}</button>
        <h1 class="title serif">${a.contact}</h1>
        <div class="row gap-8">${g()}${h()}</div>
      </header>
      <div class="contact-hero rise d1">
        <img src="images/logo.webp" alt="${a.logoAlt}" width="120" height="108">
        <h2 class="display sm">${a.contactTitle}</h2>
        <p class="muted">${a.contactText}</p>
      </div>
      <div class="col gap-10 rise d2">
        ${l.length?l.join(""):`<div class="empty glass"><b>${a.contactSoon}</b><small>${a.contactSoonText}</small></div>`}
        <div class="contact-row glass"><span class="gold icon-btn">${t.check(20)}</span><span class="col"><b>${a.serviceArea}</b><small>Made in Turkey · VIP / Premium</small></span></div>
      </div>
      ${$("contact")}
    </main>`)},mount(a){m(a),d(a,"[data-back]").addEventListener("click",()=>b("/"))}};export{w as default};
