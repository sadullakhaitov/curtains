import { detectWindow } from '../ar/detect';
import { exportImage } from '../ar/export';
import { defaultCorners, isConvex, type Point } from '../ar/homography';
import { CurtainRenderer, loadFold } from '../ar/renderer';
import { findProduct, PRODUCTS, type Product } from '../data/products';
import { t, tx } from '../i18n';
import { back, navigate, type View } from '../router';
import { session } from '../store';
import { fabricClass } from '../ui/card';
import { $, $$, esc, html, toast } from '../ui/dom';
import { icon } from '../ui/icons';

const product = (): Product => findProduct(session.productId) ?? PRODUCTS[0];
const fabricCls = fabricClass;

function controlsFor(p: Product) {
  const slider = (key: string, label: string, value: number) => `
    <div class="slider">
      <div class="slider-head"><label for="s-${key}">${label}</label><output data-out="${key}">${Math.round(value * 100)}%</output></div>
      <input id="s-${key}" type="range" min="0" max="100" value="${Math.round(value * 100)}" data-s="${key}">
    </div>`;
  return [
    p.type !== 'tulle' ? slider('open', p.type === 'roller' ? t().lift : t().open, session.open) : '',
    p.type === 'classic' ? slider('tulle', t().tulle, session.tulle) : '',
    p.type !== 'roller' ? slider('drop', t().drop, session.drop) : '',
  ].join('');
}

function colorsFor(p: Product) {
  return p.colors
    .map(
      (c, i) =>
        `<button class="swatch sm ${fabricCls(p)} press${i === session.colorIndex ? ' is-on' : ''}" role="radio" aria-checked="${i === session.colorIndex}" aria-label="${esc(tx(c.name))}" data-ci="${i}" style="background-color:${c.hex}"></button>`,
    )
    .join('');
}

const view: View = {
  async render() {
    if (!session.photo) {
      setTimeout(() => navigate('/try', true), 0);
      return html('<main class="screen center"><span class="spinner"></span></main>');
    }
    const T = t();
    const p = product();
    return html(`
    <main class="screen adjust">
      <div class="stage" data-stage>
        <canvas data-canvas aria-label="${T.curtainOnWindow}" role="img"></canvas>
        <div class="handles" data-handles>
          <svg class="quad" aria-hidden="true"><polygon data-poly></polygon></svg>
          ${[0, 1, 2, 3]
            .map((i) => `<button class="handle" data-h="${i}" aria-label="${T.corner(i + 1)}"><i></i></button>`)
            .join('')}
          <div class="loupe" data-loupe hidden><canvas width="240" height="240"></canvas><i></i></div>
        </div>
        <div class="hint stage-hint"><span class="gp chip">${icon.move(15)} ${T.moveHint}</span></div>
        <div class="stage-error glass" data-error hidden></div>
      </div>

      <header class="topbar overlay rise">
        <button class="gp icon-btn press" data-back aria-label="${T.retake}">${icon.back(20)}</button>
        <div class="row gap-8">
          <button class="gp icon-btn press" data-auto aria-label="${T.autoDetect}" title="${T.autoDetect}">${icon.wand(20)}</button>
          <button class="gp chip-lg press" data-toggle aria-pressed="false">${T.preview}</button>
        </div>
        <button class="gold btn-sm press" data-done>${T.done}</button>
      </header>

      <section class="sheet adj-sheet rise d1" aria-label="${T.settings}">
        <div class="grabber" aria-hidden="true"></div>
        <div class="products" role="radiogroup" aria-label="${T.curtain}">
          ${PRODUCTS.map(
            (x) => `
            <button class="prod-pill press${x.id === p.id ? ' is-on' : ''}" role="radio" aria-checked="${x.id === p.id}" data-pid="${x.id}">
              <span class="dot ${fabricCls(x)}" style="background-color:${x.colors[0].hex}"></span>${esc(tx(x.name))}
            </button>`,
          ).join('')}
        </div>
        <div class="row between">
          <div class="swatches" role="radiogroup" aria-label="${T.color}" data-colors>${colorsFor(p)}</div>
          <span class="muted small" data-cname>${esc(tx((p.colors[session.colorIndex] ?? p.colors[0]).name))}</span>
        </div>
        <div class="sliders" data-sliders>${controlsFor(p)}</div>
      </section>
      <div class="busy" data-busy hidden><span class="spinner"></span><b>${T.preparing}</b></div>
    </main>`);
  },

  mount(el) {
    if (!session.photo) return;
    const photo = session.photo;
    const stage = $(el, '[data-stage]');
    const canvas = $<HTMLCanvasElement>(el, '[data-canvas]');
    const handlesBox = $(el, '[data-handles]');
    const handles = $$<HTMLButtonElement>(el, '[data-h]');
    const poly = $<SVGPolygonElement>(el, '[data-poly]');
    const loupe = $(el, '[data-loupe]');
    const loupeCtx = $<HTMLCanvasElement>(loupe, 'canvas').getContext('2d')!;
    // A new photo has no corners yet: start from the default and let the detector look for the window.
    const needsDetect = !session.corners;
    if (!session.corners) session.corners = defaultCorners(photo.width, photo.height);
    const corners = session.corners;
    let renderer: CurtainRenderer | null = null;
    let scale = 1; // CSS px per photo px
    let raf = 0;

    const params = () => {
      const p = product();
      const c = p.colors[session.colorIndex] ?? p.colors[0];
      return { type: p.type, color: c.hex, open: session.open, tulle: session.tulle, drop: session.drop };
    };

    const draw = () => {
      raf = 0;
      renderer?.render(corners, params());
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const placeHandles = () => {
      handles.forEach((h, i) => (h.style.transform = `translate(${corners[i].x * scale}px, ${corners[i].y * scale}px)`));
      poly.setAttribute('points', corners.map((c) => `${c.x * scale},${c.y * scale}`).join(' '));
    };

    // Fit the photo inside the stage (like object-fit: contain) and keep the handle layer on top of it.
    const layout = () => {
      const r = stage.getBoundingClientRect();
      scale = Math.min(r.width / photo.width, r.height / photo.height);
      const w = photo.width * scale, h = photo.height * scale;
      const left = (r.width - w) / 2, top = (r.height - h) / 2;
      for (const n of [canvas, handlesBox]) {
        n.style.width = `${w}px`;
        n.style.height = `${h}px`;
        n.style.left = `${left}px`;
        n.style.top = `${top}px`;
      }
      placeHandles();
    };
    const ro = new ResizeObserver(layout);
    ro.observe(stage);

    loadFold()
      .then((fold) => {
        renderer = new CurtainRenderer(canvas, fold);
        renderer.setPhoto(photo);
        layout();
        draw();
        canvas.classList.add('ready');
        if (needsDetect) setTimeout(() => autoDetect(false), 300);
      })
      .catch((e) => {
        const err = $(el, '[data-error]');
        err.hidden = false;
        err.innerHTML = `<b>${t().drawFail}</b><small>${esc(String(e.message || e))}. ${t().drawFailHint}</small>`;
      });

    // ---- Automatic window detection, with the handles gliding to the result ----
    let anim = 0;
    const animateTo = (target: Point[]) => {
      cancelAnimationFrame(anim);
      const from = corners.map((c) => ({ ...c }));
      const t0 = performance.now();
      const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 520;
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        for (let i = 0; i < 4; i++) corners[i] = { x: from[i].x + (target[i].x - from[i].x) * e, y: from[i].y + (target[i].y - from[i].y) * e };
        placeHandles();
        draw();
        if (p < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };
    const autoDetect = (manual: boolean) => {
      const btn = $(el, '[data-auto]');
      btn.classList.add('spinning');
      // Let the spinner paint before the (short) synchronous analysis.
      setTimeout(() => {
        let found: Point[] | null = null;
        try {
          found = detectWindow(photo)?.corners ?? null;
        } catch {
          found = null;
        }
        btn.classList.remove('spinning');
        if (found) {
          animateTo(found);
          toast(t().autoFound, 'ok', 2800);
        } else {
          if (manual) animateTo(defaultCorners(photo.width, photo.height));
          toast(t().autoNotFound, 'info', 3200);
        }
      }, 30);
    };

    // ---- Dragging corners (pointer events cover mouse, touch and pen) ----
    let active = -1;
    let grab = { dx: 0, dy: 0 };
    const toPhoto = (cx: number, cy: number): Point => {
      const r = handlesBox.getBoundingClientRect();
      return { x: (cx - r.left) / scale, y: (cy - r.top) / scale };
    };
    const clamp = (pt: Point): Point => ({
      x: Math.max(0, Math.min(photo.width, pt.x)),
      y: Math.max(0, Math.min(photo.height, pt.y)),
    });
    const moveCorner = (i: number, pt: Point) => {
      const next = corners.slice();
      next[i] = clamp(pt);
      if (!isConvex(next)) return false;
      corners[i] = next[i];
      placeHandles();
      schedule();
      return true;
    };

    const drawLoupe = (i: number) => {
      const c = corners[i];
      const z = 3; // zoom
      const s = 240 / z;
      loupeCtx.clearRect(0, 0, 240, 240);
      loupeCtx.drawImage(photo, c.x - s / 2, c.y - s / 2, s, s, 0, 0, 240, 240);
      const lx = c.x * scale, ly = c.y * scale;
      const above = ly > 140;
      loupe.style.transform = `translate(${lx - 60}px, ${above ? ly - 150 : ly + 30}px)`;
    };

    handles.forEach((h, i) => {
      h.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        cancelAnimationFrame(anim);
        active = i;
        h.setPointerCapture(e.pointerId);
        const p = toPhoto(e.clientX, e.clientY);
        grab = { dx: corners[i].x - p.x, dy: corners[i].y - p.y };
        el.classList.add('dragging');
        h.classList.add('is-active');
        loupe.hidden = false;
        drawLoupe(i);
      });
      h.addEventListener('pointermove', (e) => {
        if (active !== i) return;
        const p = toPhoto(e.clientX, e.clientY);
        moveCorner(i, { x: p.x + grab.dx, y: p.y + grab.dy });
        drawLoupe(i);
      });
      const end = () => {
        if (active !== i) return;
        active = -1;
        el.classList.remove('dragging');
        h.classList.remove('is-active');
        loupe.hidden = true;
      };
      h.addEventListener('pointerup', end);
      h.addEventListener('pointercancel', end);
      // Keyboard: arrows move 1 px (10 with Shift) in photo space.
      h.addEventListener('keydown', (e) => {
        const step = (e.shiftKey ? 10 : 2) / Math.max(scale, 0.2);
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!d) return;
        e.preventDefault();
        moveCorner(i, { x: corners[i].x + d[0], y: corners[i].y + d[1] });
      });
    });

    // ---- Controls ----
    const bindSliders = () => {
      for (const s of $$<HTMLInputElement>(el, '[data-s]')) {
        s.addEventListener('input', () => {
          const key = s.dataset.s as 'open' | 'tulle' | 'drop';
          session[key] = Number(s.value) / 100;
          $(el, `[data-out="${key}"]`).textContent = `${s.value}%`;
          schedule();
        });
      }
    };
    const bindColors = () => {
      for (const b of $$(el, '[data-ci]')) {
        b.addEventListener('click', () => {
          session.colorIndex = Number(b.dataset.ci);
          for (const o of $$(el, '[data-ci]')) {
            o.classList.toggle('is-on', o === b);
            o.setAttribute('aria-checked', String(o === b));
          }
          $(el, '[data-cname]').textContent = tx(product().colors[session.colorIndex].name);
          schedule();
        });
      }
    };
    bindSliders();
    bindColors();
    const pills = $(el, '.products');
    const on = el.querySelector<HTMLElement>('.prod-pill.is-on');
    if (on) pills.scrollLeft = on.offsetLeft - (pills.clientWidth - on.offsetWidth) / 2;

    for (const b of $$(el, '[data-pid]')) {
      b.addEventListener('click', () => {
        if (session.productId === b.dataset.pid) return;
        session.productId = b.dataset.pid!;
        session.colorIndex = 0;
        const p = product();
        for (const o of $$(el, '[data-pid]')) {
          o.classList.toggle('is-on', o === b);
          o.setAttribute('aria-checked', String(o === b));
        }
        $(el, '[data-colors]').innerHTML = colorsFor(p);
        $(el, '[data-cname]').textContent = tx(p.colors[0].name);
        $(el, '[data-sliders]').innerHTML = controlsFor(p);
        bindColors();
        bindSliders();
        b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        schedule();
      });
    }

    const toggle = $(el, '[data-toggle]');
    toggle.addEventListener('click', () => {
      const hidden = el.classList.toggle('preview');
      toggle.setAttribute('aria-pressed', String(hidden));
      toggle.textContent = hidden ? t().edit : t().preview;
    });

    $(el, '[data-auto]').addEventListener('click', () => autoDetect(true));

    $(el, '[data-back]').addEventListener('click', () => back('/try'));

    $(el, '[data-done]').addEventListener('click', async () => {
      if (!renderer) return;
      const busy = $(el, '[data-busy]');
      busy.hidden = false;
      try {
        const p = product();
        const c = p.colors[session.colorIndex] ?? p.colors[0];
        const blob = await exportImage(canvas, draw, `${tx(p.name)} · ${tx(c.name)}`);
        if (session.resultUrl) URL.revokeObjectURL(session.resultUrl);
        session.result = blob;
        session.resultUrl = URL.createObjectURL(blob);
        if (!session.originalUrl) {
          const orig = await new Promise<Blob | null>((r) => photo.toBlob(r, 'image/jpeg', 0.88));
          if (orig) session.originalUrl = URL.createObjectURL(orig);
        }
        navigate('/result');
      } catch {
        busy.hidden = true;
        toast(t().prepFail, 'info');
      }
    });

    return () => {
      cancelAnimationFrame(anim);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  },
};
export default view;
