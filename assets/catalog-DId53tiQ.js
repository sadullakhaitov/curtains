import{b as h,P as m,s as u,p as f}from"./card-u6ed0efS.js";import{b,n as g,t as p}from"./index-D9lPXR-M.js";import{b as $,$ as c,h as y,i as v,l as q,t as w,e as S,a as L,f as k}from"./dom-b7Z3Evsc.js";const P=["all","classic","tulle","roman","zebra","roller","venetian","vertical","pleated"],x={render(e){const a=p(),o=e.type||"all",r=(e.q||"").trim(),n=e.fav==="1",i=t=>{const l=new URLSearchParams;t!=="all"&&l.set("type",t),r&&l.set("q",r),n&&l.set("fav","1");const s=l.toString();return"#/catalog"+(s?"?"+s:"")};return y(`
    <main class="screen catalog has-nav">
      <div class="glow g1" aria-hidden="true"></div>
      <header class="topbar rise">
        <button class="glass icon-btn press" data-back aria-label="${a.back}">${v.back(20)}</button>
        <h1 class="title serif">${n?a.favs:a.catalog}</h1>
        <div class="row gap-8">${q()}${w()}</div>
      </header>

      <form class="search rise d1" role="search">
        <label class="glass search-field">
          ${v.search(19)}
          <input name="q" type="search" value="${S(r)}" placeholder="${a.searchPh}" aria-label="${a.search}" autocomplete="off">
        </label>
      </form>

      <nav class="chips rise d2" aria-label="${a.types}">
        ${P.map(t=>`<a href="${i(t)}" data-replace class="chip-btn press ${t===o?"gold":"glass"}"${t===o?' aria-current="true"':""}>${t==="all"?a.all:a.type[t]}</a>`).join("")}
      </nav>

      <p class="count rise d2" data-count></p>
      <div class="grid rise d3" data-grid></div>
      <div class="empty glass" data-empty hidden>
        <b>${a.emptyTitle}</b>
        <small>${n?a.emptyFav:a.emptySearch}</small>
      </div>
      ${L(n?"fav":"catalog")}
    </main>`)},mount(e,a){$(e),c(e,"[data-back]").addEventListener("click",()=>b("/"));const o=a.type||"all",r=a.fav==="1",n=c(e,"[data-grid]"),i=c(e,"input[name=q]"),t=()=>{const l=i.value.trim().toLowerCase(),s=m.filter(d=>(o==="all"||d.type===o)&&(!r||k.has(d.id))&&(!l||u(d).includes(l)));n.innerHTML=s.map(f).join(""),c(e,"[data-count]").textContent=p().count(s.length),c(e,"[data-empty]").hidden=s.length>0};t(),h(n,()=>r&&t()),i.addEventListener("input",t),c(e,"form").addEventListener("submit",l=>{l.preventDefault();const s=new URLSearchParams(location.hash.split("?")[1]||"");i.value.trim()?s.set("q",i.value.trim()):s.delete("q"),g("/catalog"+(s.toString()?"?"+s:""),!0)})}};export{x as default};
