const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./renderer3d-BkHvR6oA.js","./homography-CZPP2D1A.js","./renderer-YDwPMoWE.js","./vision-VZTEfPOE.js","./index-D9lPXR-M.js"])))=>i.map(i=>d[i]);
import{b as N,_,a as i,t as E,n as q}from"./index-D9lPXR-M.js";import{b as U,$ as g,c as L,f as D,d as X,h as F,g as Y,C as O,e as d,i as $,l as z,t as W}from"./dom-b7Z3Evsc.js";import{f as R,a as G,c as V,t as J,d as K}from"./card-u6ed0efS.js";import{s as l,c as Q}from"./store-BgsYXmR1.js";const sa={render(s){const e=E(),a=R(s.id);if(!a)return F(`<main class="screen center"><div class="empty glass"><b>${e.notFound}</b><a class="link" href="#/catalog">${e.backToCatalog}</a></div></main>`);const c=l.productId===a.id?Math.min(l.colorIndex,a.colors.length-1):0,n=a.colors[c],p=i(a.name),h=D.has(a.id),u=Y(e.tgProduct(p,i(n.name))),v=G(a);return F(`
    <main class="screen product">
      <div class="p-hero">
        <div class="${v} sway" data-fabric style="${V(a,n.hex)}" role="img" aria-label="${d(e.fabricOf(p,i(n.name)))}"></div>
        <canvas class="p-3d" data-3d aria-label="${d(p)} — 3D"></canvas>
        <span class="p-3d-hint gp chip" data-3d-hint hidden>${$.move(14)} ${e.rotateHint}</span>
        ${a.image?`<img class="p-photo" data-photo src="${a.image}" alt="${d(p)} — ${e.inInterior}" decoding="async">`:""}
        <span class="p-hero-shade" aria-hidden="true"></span>
      </div>

      <header class="topbar overlay rise">
        <button class="gp icon-btn press" data-back aria-label="${e.back}">${$.back(20)}</button>
        <div class="row gap-8">
          ${z("gp")}
          ${W("gp")}
          <button class="gp icon-btn press${h?" is-on":""}" data-fav aria-pressed="${h}" aria-label="${e.addFav}">${$.heart(20)}</button>
        </div>
      </header>

      ${a.image?`<div class="seg gp p-seg rise d1" role="group" aria-label="${e.view}">
              <button class="seg-btn is-on" data-mode="fabric" aria-pressed="true">${e.fabricTab}</button>
              <button class="seg-btn" data-mode="photo" aria-pressed="false">${e.interiorTab}</button>
            </div>`:""}

      <section class="sheet p-sheet">
        <div class="grabber" aria-hidden="true"></div>
        <div class="col gap-4 rise d1">
          <span class="eyebrow">${J(a.type).toUpperCase()} · ${d(i(a.fabric).toUpperCase())}</span>
          <h1 class="p-title serif">${d(p)} <span data-cname class="muted-serif">${d(i(n.name))}</span></h1>
          <span class="price">${K(a)}</span>
          <p class="muted">${d(i(a.description))}</p>
        </div>

        <div class="col gap-10 rise d2">
          <span class="label">${e.color} · <span class="muted" data-cname2>${d(i(n.name))}</span></span>
          <div class="swatches" role="radiogroup" aria-label="${e.color}">
            ${a.colors.map((y,b)=>`<button class="swatch ${v} press${b===c?" is-on":""}" role="radio" aria-checked="${b===c}" aria-label="${d(i(y.name))}" data-ci="${b}" style="${V(a,y.hex)}"></button>`).join("")}
          </div>
        </div>

        <div class="cta col gap-10 rise d3">
          <button class="btn gold press" data-try>${$.camera(22)} ${e.tryOnWindow}</button>
          ${l.photo?`<button class="btn glass press" data-try-last>${$.image(20)} ${e.tryLast}</button>`:""}
          ${u?`<a class="btn glass press" href="${u}" target="_blank" rel="noopener">${$.send(20)} ${e.orderTg}</a>`:""}
          ${!u&&O.phone?`<a class="btn glass press" href="tel:${O.phone}">${$.phone(20)} ${e.call}</a>`:""}
        </div>
      </section>
    </main>`)},mount(s,e){var S,M;const a=R(e.id);if(U(s),(S=g(s,"[data-back]"))==null||S.addEventListener("click",()=>N("/catalog")),!a)return;let c=l.productId===a.id?Math.min(l.colorIndex,a.colors.length-1):0;const n=g(s,"[data-3d]"),p=n.parentElement;let h=null,u=.35,v=.05,y=!0,b=0,x=!0;const j=()=>{var m;const t=(m=a.colors[c])!=null?m:a.colors[0],r=a.type==="roller"||a.type==="zebra"||a.type==="pleated"||a.type==="roman",o=a.type==="venetian"||a.type==="vertical";return{type:a.type,color:t.hex,open:a.type==="roman"?.3:r?.12:o?.04:.3,tulle:a.type==="tulle"?.9:o?.36:r?.25:.35,drop:.2,alpha:1,finish:a.finish}},k=()=>{b=0,h==null||h.renderStudio(u,v,j())},T=()=>{b||(b=requestAnimationFrame(k))},B=performance.now(),C=t=>{if(!x||!y)return;const r=(t-B)/1e3;u=.35*Math.cos(r*.6),k(),r<7?requestAnimationFrame(C):y=!1};(async()=>{try{const[{Curtain3D:t},r]=await Promise.all([_(()=>import("./renderer3d-BkHvR6oA.js"),__vite__mapDeps([0,1]),import.meta.url),_(()=>import("./renderer-YDwPMoWE.js"),__vite__mapDeps([2,1]),import.meta.url)]);if(!x)return;const o=new t(n),m=p.getBoundingClientRect();o.setStudio(m.width,m.height),a.texture&&o.setFabricTexture(await r.loadTexture(a.texture)),a.pattern&&o.setPattern(await r.loadTexture(a.pattern)),h=o,k(),p.classList.add("has-3d"),setTimeout(()=>_(()=>import("./vision-VZTEfPOE.js"),__vite__mapDeps([3,4]),import.meta.url).then(H=>H.prefetchVision()),2500),s.querySelector("[data-3d-hint]").hidden=!1,requestAnimationFrame(C)}catch{n.remove()}})();let f=null;n.addEventListener("pointerdown",t=>{var r;y=!1,n.setPointerCapture(t.pointerId),f={x:t.clientX,y:t.clientY,yaw:u,pitch:v},(r=s.querySelector("[data-3d-hint]"))==null||r.classList.add("gone")}),n.addEventListener("pointermove",t=>{f&&(u=Math.max(-.85,Math.min(.85,f.yaw+(t.clientX-f.x)*.006)),v=Math.max(-.2,Math.min(.3,f.pitch+(t.clientY-f.y)*.004)),T())});const I=()=>f=null;n.addEventListener("pointerup",I),n.addEventListener("pointercancel",I);const A=t=>{const r=s.querySelector("[data-photo]");if(r){r.classList.toggle("is-on",t==="photo");for(const o of L(s,"[data-mode]")){const m=o.dataset.mode===t;o.classList.toggle("is-on",m),o.setAttribute("aria-pressed",String(m))}}};for(const t of L(s,"[data-mode]"))t.addEventListener("click",()=>A(t.dataset.mode));for(const t of L(s,"[data-ci]"))t.addEventListener("click",()=>{c=Number(t.dataset.ci);const r=a.colors[c];l.productId=a.id,l.colorIndex=c,g(s,"[data-fabric]").style.backgroundColor=r.hex,T(),g(s,"[data-cname]").textContent=i(r.name),g(s,"[data-cname2]").textContent=i(r.name);for(const o of L(s,"[data-ci]"))o.classList.toggle("is-on",o===t),o.setAttribute("aria-checked",String(o===t));A("fabric")});const w=g(s,"[data-fav]");w.addEventListener("click",()=>{const t=D.toggle(a.id);w.classList.toggle("is-on",t),w.setAttribute("aria-pressed",String(t)),X(t?E().favAdded:E().favRemoved,"info",1600)});const P=()=>{l.productId=a.id,l.colorIndex=c,Q()};return g(s,"[data-try]").addEventListener("click",()=>{P(),q(`/try/${a.id}`)}),(M=s.querySelector("[data-try-last]"))==null||M.addEventListener("click",()=>{P(),q("/adjust")}),()=>{x=!1}}};export{sa as default};
