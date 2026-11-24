import{b as i,h as o,C as r,l as n,t as p,i as e,a as h}from"./dom-b7Z3Evsc.js";import{b as d,P as g,p as b}from"./card-u6ed0efS.js";import{n as m,t as $}from"./index-D9lPXR-M.js";const v={render(){const a=$(),l=g.filter(s=>s.popular);return o(`
    <main class="screen home has-nav">
      <div class="glow g1" aria-hidden="true"></div>
      <div class="glow g2" aria-hidden="true"></div>

      <header class="topbar rise">
        <a href="#/" class="brand" aria-label="NewMoon — ${a.home}">
          <img src="images/logo.webp" alt="" width="42" height="38">
          <span class="brand-text"><b>NewMoon</b><small>${a.brandSub}</small></span>
        </a>
        <div class="row gap-8">
          ${n()}
          ${p()}
        </div>
      </header>

      <h1 class="display rise d1">${a.display}</h1>

      <form class="search rise d2" action="#" role="search">
        <label class="glass search-field">
          ${e.search(19)}
          <input name="q" type="search" placeholder="${a.searchPh}" aria-label="${a.search}" autocomplete="off">
        </label>
        <button class="gold icon-btn lg press" aria-label="${a.search}">${e.arrow(20)}</button>
      </form>

      <a href="#/try" class="hero zoom rise d3">
        <img src="images/hero.webp" alt="${a.heroAlt}" fetchpriority="high" decoding="async">
        <span class="hero-shade" aria-hidden="true"></span>
        <span class="chip gp hero-tag">${e.sparkle()} ${a.tryTag}</span>
        <span class="hero-panel gp">
          <span class="col">
            <b class="serif">${a.tryTitle}</b>
            <small>${a.trySub}</small>
          </span>
          <span class="gold icon-btn lg" aria-hidden="true">${e.camera(22)}</span>
        </span>
      </a>

      <nav class="chips rise d4" aria-label="${a.types}">
        <a href="#/catalog" class="chip-btn gold press">${a.all}</a>
        <a href="#/catalog?type=roman" class="chip-btn glass press">${a.type.roman}</a>
        <a href="#/catalog?type=venetian" class="chip-btn glass press">${a.type.venetian}</a>
        <a href="#/catalog?type=vertical" class="chip-btn glass press">${a.type.vertical}</a>
        <a href="#/catalog?type=pleated" class="chip-btn glass press">${a.type.pleated}</a>
        <a href="#/catalog?type=zebra" class="chip-btn glass press">${a.type.zebra}</a>
        <a href="#/catalog?type=classic" class="chip-btn glass press">${a.type.classic}</a>
        <a href="#/catalog?type=tulle" class="chip-btn glass press">${a.type.tulle}</a>
        <a href="#/catalog?type=roller" class="chip-btn glass press">${a.type.roller}</a>
      </nav>

      <div class="section-head rise d5">
        <h2 class="serif">${a.popular}</h2>
        <a href="#/catalog" class="link">${a.seeAll}</a>
      </div>
      <div class="grid rise d5">${l.map(b).join("")}</div>

      <section class="about rise">
        <h2 class="serif">${a.aboutTitle}</h2>
        <ul>
          ${a.about.map(([s,t])=>`<li class="glass"><span class="about-mark gold" aria-hidden="true">${e.check(14)}</span><span class="col"><b>${s}</b><small>${t}</small></span></li>`).join("")}
        </ul>
        <div class="about-links">
          <a class="btn glass press" href="tel:${r.phone}">${e.phone(20)} ${r.phoneDisplay}</a>
          <a class="btn glass press" href="https://instagram.com/${r.instagram}" target="_blank" rel="noopener">${e.instagram(20)} ${a.reviews}</a>
        </div>
      </section>

      <section class="how rise">
        <h2 class="serif">${a.how}</h2>
        <ol>
          ${a.steps.map(([s,t],c)=>`<li class="glass"><span class="num">${c+1}</span><b>${s}</b><small>${t}</small></li>`).join("")}
        </ol>
      </section>

      ${h("home")}
    </main>`)},mount(a){i(a),d(a),a.querySelector("form").addEventListener("submit",l=>{l.preventDefault();const s=new FormData(l.target).get("q").trim();m(s?`/catalog?q=${encodeURIComponent(s)}`:"/catalog")})}};export{v as default};
