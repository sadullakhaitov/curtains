import { detectWindow } from '../ar/detect';
import { findWindow, inFront, refineMask, windowAt, type WindowFind } from '../ar/smart';
import { frontObjects, type Mask } from '../ar/vision';
import { exportImage } from '../ar/export';
import { defaultCorners, isConvex, type Point } from '../ar/homography';
import { CurtainRenderer, loadFold, loadTexture } from '../ar/renderer';
import { findProduct, PRODUCTS, type Product } from '../data/products';
import { t, tx } from '../i18n';
import { back, navigate, type View } from '../router';
import { session } from '../store';
import { fabricClass, fabricStyle } from '../ui/card';
import { $, $$, esc, html, toast } from '../ui/dom';
import { bottomSheet } from '../ui/sheet';
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
    p.type !== 'tulle' ? slider('open', p.type === 'roller' || p.type === 'zebra' ? t().lift : t().open, session.open) : '',
    p.type === 'classic' ? slider('tulle', t().tulle, session.tulle) : '',
    p.type === 'zebra' ? slider('tulle', t().dayNight, session.tulle) : '',
    p.type !== 'roller' && p.type !== 'zebra' ? slider('drop', t().drop, session.drop) : '',
  ].join('');
}

function colorsFor(p: Product) {
  return p.colors
    .map(
      (c, i) =>
        `<button class="swatch sm ${fabricCls(p)} press${i === session.colorIndex ? ' is-on' : ''}" role="radio" aria-checked="${i === session.colorIndex}" aria-label="${esc(tx(c.name))}" data-ci="${i}" style="${fabricStyle(p, c.hex)}"></button>`,
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
        <div class="hint stage-hint"><span class="gp chip" data-status>${icon.move(15)} <span data-status-text>${T.tapHint}</span></span></div>
        <span class="tap-ring" data-tap hidden></span>
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

      <section class="sheet adj-sheet sheet-in" aria-label="${T.settings}" data-sheet>
        <button class="sheet-handle" data-sheet-handle aria-expanded="true" aria-label="${T.settings}"><span class="grabber" aria-hidden="true"></span><span class="sheet-label" aria-hidden="true">${icon.chevUp(16)} ${T.settings}</span></button>
        <div class="products" role="radiogroup" aria-label="${T.curtain}">
          ${PRODUCTS.map(
            (x) => `
            <button class="prod-pill press${x.id === p.id ? ' is-on' : ''}" role="radio" aria-checked="${x.id === p.id}" data-pid="${x.id}">
              <span class="dot ${fabricCls(x)}" style="${fabricStyle(x, x.colors[0].hex)}"></span>${esc(tx(x.name))}
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
    let canvas = $<HTMLCanvasElement>(el, '[data-canvas]');
    const handlesBox = $(el, '[data-handles]');
    const handles = $$<HTMLButtonElement>(el, '[data-h]');
    const poly = $<SVGPolygonElement>(el, '[data-poly]');
    const loupe = $(el, '[data-loupe]');
    const loupeCtx = $<HTMLCanvasElement>(loupe, 'canvas').getContext('2d')!;
    // A new photo has no corners yet: start from the default and let the detector look for the window.
    const needsDetect = !session.corners;
    if (!session.corners) session.corners = defaultCorners(photo.width, photo.height);
    const corners = session.corners;
    // 3D (three.js) when the device can, otherwise the 2D shader renderer; both share this interface.
    type AnyRenderer = Pick<CurtainRenderer, 'setPhoto' | 'setOcclusion' | 'setFabricTexture'> & {
      readonly canvas: HTMLCanvasElement;
      render(corners: Point[], p: ReturnType<typeof params>): void;
    };
    let renderer: AnyRenderer | null = null;
    // Curtain opacity: see-through while corners are being placed so the window frame stays visible.
    let alpha = 1;
    let alphaAnim = 0;
    let scale = 1; // CSS px per photo px
    let raf = 0;

    const params = () => {
      const p = product();
      const c = p.colors[session.colorIndex] ?? p.colors[0];
      return { type: p.type, color: c.hex, open: session.open, tulle: session.tulle, drop: session.drop, alpha, finish: p.finish };
    };

    const draw = () => {
      raf = 0;
      renderer?.render(corners, params());
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    // Photo-textured products (zebra blinds) need their fabric photo on the GPU before drawing.
    const useTexture = () => {
      const p = product();
      if (!p.texture) {
        renderer?.setFabricTexture(null);
        return;
      }
      loadTexture(p.texture)
        .then((img) => {
          if (product().texture !== p.texture) return;
          renderer?.setFabricTexture(img);
          schedule();
        })
        .catch(() => {});
    };

    const placeHandles = () => {
      handles.forEach((h, i) => (h.style.transform = `translate(${corners[i].x * scale}px, ${corners[i].y * scale}px)`));
      poly.setAttribute('points', corners.map((c) => `${c.x * scale},${c.y * scale}`).join(' '));
    };

    // Fit the photo inside the stage (like object-fit: contain) and keep the handle layer on top of it.
    // The photo fits the space above the settings sheet; when the sheet slides down, it grows.
    let sheetVisible = 0;
    const layout = () => {
      const r = stage.getBoundingClientRect();
      const availH = Math.max(120, r.height - sheetVisible + 26);
      scale = Math.min(r.width / photo.width, availH / photo.height);
      const w = photo.width * scale, h = photo.height * scale;
      const left = (r.width - w) / 2, top = Math.max(0, (availH - h) / 2);
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

    const make3D = async (): Promise<AnyRenderer | null> => {
      try {
        const { Curtain3D } = await import('../ar/renderer3d');
        return new Curtain3D(canvas);
      } catch {
        return null;
      }
    };
    const chip = $(el, '[data-status]'), chipText = $(el, '[data-status-text]');
    chipText.textContent = t().loading3d;
    chip.classList.add('busy');
    Promise.all([loadFold(), make3D()])
      .then(([fold, r3]) => {
        if (!alive) return;
        chip.classList.remove('busy');
        chipText.textContent = t().tapHint;
        if (r3) renderer = r3;
        else {
          // a canvas keeps whichever context it got first; give the 2D renderer a fresh one
          const fresh = canvas.cloneNode() as HTMLCanvasElement;
          canvas.replaceWith(fresh);
          canvas = fresh;
          renderer = new CurtainRenderer(canvas, fold);
        }
        renderer.setPhoto(photo);
        useTexture();
        layout();
        draw();
        canvas.classList.add('ready');
        applyOcclusion();
        if (needsDetect) setTimeout(() => autoDetect(false), 300);
        else setTimeout(startFront, 300);
      })
      .catch((e) => {
        const err = $(el, '[data-error]');
        err.hidden = false;
        err.innerHTML = `<b>${t().drawFail}</b><small>${esc(String(e.message || e))}. ${t().drawFailHint}</small>`;
      });

    const fadeTo = (target: number, delay = 0) => {
      cancelAnimationFrame(alphaAnim);
      const from = alpha;
      const t0 = performance.now() + delay;
      const step = (now: number) => {
        const p = Math.max(0, Math.min(1, (now - t0) / 280));
        alpha = from + (target - from) * (1 - Math.pow(1 - p, 2));
        schedule();
        if (p < 1) alphaAnim = requestAnimationFrame(step);
      };
      alphaAnim = requestAnimationFrame(step);
    };
    const SEE_THROUGH = 0.32;

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
        else applyOcclusion();
      };
      anim = requestAnimationFrame(step);
      alpha = SEE_THROUGH;
      fadeTo(1, dur + 250);
    };
    // ---- Status chip under the photo ----
    const statusEl = $(el, '[data-status]');
    const statusText = $(el, '[data-status-text]');
    const setStatus = (text: string, busy: boolean) => {
      statusText.textContent = text;
      statusEl.classList.toggle('busy', busy);
    };

    // ---- Things standing in front of the curtain (furniture, plants) ----
    let front: Mask | null = null;
    const applyOcclusion = () => {
      if (!renderer) return;
      const near = front ? inFront(front, corners, photo.width, photo.height) : null;
      renderer.setOcclusion(near ? refineMask(photo, near) : null, true);
      schedule();
    };
    let alive = true;
    let frontStarted = false;
    const startFront = () => {
      if (frontStarted || !alive) return;
      frontStarted = true;
      frontObjects(photo)
        .then((m) => {
          if (!alive) return;
          front = m;
          applyOcclusion();
        })
        .catch(() => {});
    };

    // ---- Smart window detection ----
    let current: WindowFind | null = null;
    let busy = false;
    const autoDetect = async (manual: boolean) => {
      if (busy) return;
      busy = true;
      const btn = $(el, '[data-auto]');
      btn.classList.add('spinning');
      // 1. Instant light-based guess, so the handles move right away.
      let guess: Point[] | null = null;
      try {
        guess = detectWindow(photo)?.corners ?? null;
      } catch {
        guess = null;
      }
      if (guess) animateTo(guess);
      // 2. The segmentation model refines it (or finds the window the guess missed).
      setStatus(t().aiLoading, true);
      let found: WindowFind | null = null;
      let modelOk = true;
      try {
        const t0 = setTimeout(() => setStatus(t().aiAnalyzing, true), 1200);
        found = await findWindow(photo, guess);
        clearTimeout(t0);
      } catch {
        modelOk = false;
      }
      if (!alive) return;
      btn.classList.remove('spinning');
      busy = false;
      setStatus(t().tapHint, false);
      startFront();
      if (found) {
        current = found;
        animateTo(found.corners);
        toast(t().autoFound, 'ok', 2800);
      } else if (guess && (!modelOk || !manual)) {
        toast(t().autoFound, 'ok', 2800);
      } else {
        if (manual) animateTo(defaultCorners(photo.width, photo.height));
        toast(t().autoNotFound, 'info', 3600);
      }
    };

    // ---- Tap on the window: select it (or add the next pane) ----
    const tapRing = $(el, '[data-tap]');
    stage.addEventListener('click', async (e) => {
      if (busy || el.classList.contains('preview')) return;
      if ((e.target as Element).closest('.handle, button, a')) return;
      const r = handlesBox.getBoundingClientRect();
      const p = { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
      if (p.x < 0 || p.y < 0 || p.x > photo.width || p.y > photo.height) return;
      const sr = stage.getBoundingClientRect();
      tapRing.style.transform = `translate(${e.clientX - sr.left}px, ${e.clientY - sr.top}px)`;
      tapRing.hidden = false;
      tapRing.classList.remove('go');
      void tapRing.offsetWidth;
      tapRing.classList.add('go');
      busy = true;
      setStatus(t().aiAnalyzing, true);
      let found: WindowFind | null = null;
      try {
        found = await windowAt(photo, p, current);
      } catch {
        found = null;
      }
      if (!alive) return;
      busy = false;
      setStatus(t().tapHint, false);
      if (found) {
        current = found;
        animateTo(found.corners);
      } else {
        toast(t().tapNotFound, 'info', 2600);
      }
    });

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
        fadeTo(SEE_THROUGH);
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
        current = null;
        fadeTo(1, 120);
        applyOcclusion();
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
        useTexture();
        bindColors();
        bindSliders();
        b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        schedule();
      });
    }

    const toggle = $(el, '[data-toggle]');
    const sheet = bottomSheet($(el, '[data-sheet]'), {
      onMove: (v) => {
        sheetVisible = v;
        stage.style.setProperty('--sv', `${v}px`);
        layout();
      },
    });
    toggle.addEventListener('click', () => {
      const hidden = el.classList.toggle('preview');
      toggle.setAttribute('aria-pressed', String(hidden));
      toggle.textContent = hidden ? t().edit : t().preview;
      // Preview = the whole photo: tuck the settings away; editing brings them back.
      if (hidden) sheet.close();
      else sheet.open();
    });

    $(el, '[data-auto]').addEventListener('click', () => autoDetect(true));

    $(el, '[data-back]').addEventListener('click', () => back('/try'));

    $(el, '[data-done]').addEventListener('click', async () => {
      if (!renderer) return;
      const busy = $(el, '[data-busy]');
      busy.hidden = false;
      cancelAnimationFrame(alphaAnim);
      alpha = 1;
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
      sheet.destroy();
      alive = false;
      cancelAnimationFrame(anim);
      cancelAnimationFrame(alphaAnim);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  },
};
export default view;
