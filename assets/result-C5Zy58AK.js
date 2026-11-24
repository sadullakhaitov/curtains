import{h as E,$ as p,d as v,g as O,C as U,e as f,i as n}from"./dom-b7Z3Evsc.js";import{b as S,s as M,a as R}from"./sheet-oFd_VuHA.js";import{f as P,P as I,a as N,c as A,d as B}from"./card-u6ed0efS.js";import{n as T,t as b,a as w}from"./index-D9lPXR-M.js";import{s as e}from"./store-BgsYXmR1.js";const F={render(){var u,d;if(!e.resultUrl)return setTimeout(()=>T(e.photo?"/adjust":"/try",!0),0),E('<main class="screen center"><span class="spinner"></span></main>');const a=b(),r=(u=P(e.productId))!=null?u:I[0],g=(d=r.colors[e.colorIndex])!=null?d:r.colors[0],m=w(r.name),s=w(g.name),l=O(a.tgResult(m,s)),c=N(r);return E(`
    <main class="screen result">
      <div class="stage result-stage">
        <div class="compare${e.originalUrl?"":" single"}" data-compare style="--pos:50%">
          ${e.originalUrl?`<img class="cmp-img" src="${e.originalUrl}" alt="${a.noCurtain}" draggable="false">`:""}
          <img class="cmp-img cmp-after" data-after src="${e.resultUrl}" alt="${f(a.onWindow(m,s))}" draggable="false">
          ${e.originalUrl?`<span class="cmp-tag left gp">${a.before}</span><span class="cmp-tag right gp">${a.after}</span>
                 <div class="cmp-line" aria-hidden="true"><span class="cmp-knob gold">${n.back(14)}${n.arrow(14)}</span></div>
                 <input class="cmp-range" type="range" min="0" max="100" value="50" step="1" aria-label="${a.compare}: ${a.before} / ${a.after}">`:""}
        </div>
      </div>

      <header class="topbar overlay rise">
        <button class="gp icon-btn press" data-edit aria-label="${a.backToAdjust}">${n.back(20)}</button>
        <span class="cmp-hint gp chip" ${e.originalUrl?"":"hidden"}>${n.move(14)} ${a.compare}</span>
        <a href="#/" class="gp icon-btn press" aria-label="${a.home}">${n.home(19)}</a>
      </header>

      <section class="sheet res-sheet sheet-in" data-sheet aria-label="${a.save}">
        <button class="sheet-handle" data-sheet-handle aria-expanded="true" aria-label="${a.save}"><span class="grabber" aria-hidden="true"></span><span class="sheet-label" aria-hidden="true">${n.chevUp(16)} ${a.save}</span></button>
        <div class="row gap-12 res-product">
          <span class="dot xl ${c}" style="${A(r,g.hex)}" aria-hidden="true"></span>
          <div class="col grow">
            <b class="serif res-name">${f(m)}</b>
            <small class="muted">${f(s)} · ${B(r)}</small>
          </div>
        </div>
        <div class="grid2">
          <button class="btn gold press" data-save>${n.download(20)} ${a.save}</button>
          <button class="btn glass press" data-share>${n.share(20)} ${a.share}</button>
        </div>
        ${l?`<a class="btn glass press" href="${l}" target="_blank" rel="noopener">${n.send(20)} ${a.orderThis}</a>`:""}
        ${!l&&U.phone?`<a class="btn glass press" href="tel:${U.phone}">${n.phone(20)} ${a.callOrder}</a>`:""}
        <div class="row between res-links">
          <a href="#/adjust" class="link" data-replace>${a.tryOther}</a>
          <a href="#/try" class="link">${a.newPhoto}</a>
        </div>
      </section>
    </main>`)},mount(a){var x;if(!e.result)return;const r=(x=P(e.productId))!=null?x:I[0],g=`newmoon-${r.id}-${Date.now().toString(36)}.jpg`,m=p(a,".result-stage"),s=p(a,"[data-compare]"),l=p(a,"[data-after]"),c=a.querySelector(".cmp-range");let u=0;const d=()=>{const t=l.naturalWidth||4,i=l.naturalHeight||3,h=m.getBoundingClientRect(),o=Math.max(120,h.height-u+26),$=Math.min(h.width/t,o/i),L=t*$,C=i*$;Object.assign(s.style,{width:`${L}px`,height:`${C}px`,left:`${(h.width-L)/2}px`,top:`${Math.max(0,(o-C)/2)}px`})};l.complete?d():l.addEventListener("load",d,{once:!0});const k=new ResizeObserver(d);k.observe(m);const y=t=>{const i=Math.max(0,Math.min(100,t));s.style.setProperty("--pos",`${i}%`),c&&(c.value=String(Math.round(i)))};if(c){c.addEventListener("input",()=>y(Number(c.value)));let t=!1;const i=o=>{const $=s.getBoundingClientRect();y((o.clientX-$.left)/$.width*100)};s.addEventListener("pointerdown",o=>{t=!0,s.setPointerCapture(o.pointerId),s.classList.add("is-dragging"),i(o)}),s.addEventListener("pointermove",o=>{t&&i(o)});const h=()=>{t=!1,s.classList.remove("is-dragging")};s.addEventListener("pointerup",h),s.addEventListener("pointercancel",h)}const j=S(p(a,"[data-sheet]"),{onMove:t=>{u=t,d()}});return p(a,"[data-edit]").addEventListener("click",()=>T("/adjust",!0)),p(a,"[data-save]").addEventListener("click",async()=>{const t=await M(e.result,g);t==="downloaded"?v(b().saved):t==="shared"&&v(b().ready)}),p(a,"[data-share]").addEventListener("click",async()=>{await R(e.result,g,`NewMoon: ${w(r.name)}`)||await M(e.result,g)==="downloaded"&&v(b().shareFallback,"info")}),()=>{j.destroy(),k.disconnect()}}};export{F as default};
