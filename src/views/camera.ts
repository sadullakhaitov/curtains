import { MAX_PHOTO_SIDE } from '../config';
import { findProduct, PRODUCTS } from '../data/products';
import { t, tx } from '../i18n';
import { back, navigate, type View } from '../router';
import { preloadVision } from '../ar/vision';
import { findLenses, fmtZoom, presets, splitZoom, zoomCaps, type Lens } from '../ar/zoom';
import { session, setPhoto } from '../store';
import { fabricClass, fabricStyle } from '../ui/card';
import { $, esc, html, toast } from '../ui/dom';
import { icon } from '../ui/icons';

/** Draws any image source into a canvas no larger than MAX_PHOTO_SIDE. */
/** Captures the centre 1/zoom of a video frame (digital zoom), no larger than MAX_PHOTO_SIDE. */
function captureVideo(video: HTMLVideoElement, zoom: number) {
  const vw = video.videoWidth, vh = video.videoHeight;
  const cw = vw / zoom, ch = vh / zoom;
  const k = Math.min(1, MAX_PHOTO_SIDE / Math.max(cw, ch));
  const c = document.createElement('canvas');
  c.width = Math.round(cw * k);
  c.height = Math.round(ch * k);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, c.width, c.height);
  return c;
}

function toCanvas(src: CanvasImageSource, w: number, h: number) {
  const k = Math.min(1, MAX_PHOTO_SIDE / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

async function fileToCanvas(file: File) {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      const c = toCanvas(bmp, bmp.width, bmp.height);
      bmp.close();
      return c;
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    return toCanvas(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadSample() {
  const img = new Image();
  img.src = 'images/room-sample.webp';
  await img.decode();
  const c = toCanvas(img, img.naturalWidth, img.naturalHeight);
  // The sample photo's window, measured once (source is 1600×1066).
  const k = c.width / 1600;
  const corners = [
    { x: 243 * k, y: 245 * k },
    { x: 717 * k, y: 245 * k },
    { x: 717 * k, y: 664 * k },
    { x: 243 * k, y: 664 * k },
  ];
  return { c, corners };
}

const view: View = {
  // A live <video> must not be snapshotted by a page transition (iOS shows it black afterwards).
  transition: false,
  render(params) {
    if (params.id && findProduct(params.id)) {
      if (session.productId !== params.id) session.colorIndex = 0;
      session.productId = params.id;
    }
    const T = t();
    const p = findProduct(session.productId) ?? PRODUCTS[0];
    const c = p.colors[session.colorIndex] ?? p.colors[0];
    const fabricCls = fabricClass(p);

    return html(`
    <main class="screen camera">
      <div class="viewfinder">
        <div class="video-slot" data-video-slot data-label="${T.camView}"></div>
        <div class="zoom-bar gp" data-zoom role="group" aria-label="${T.zoom}" hidden></div>
        <div class="cam-off" data-off hidden>
          <span class="cam-off-icon glass">${icon.camera(30)}</span>
          <b>${T.camOff}</b>
          <small data-reason>${T.camOffDefault}</small>
        </div>
        <div class="frame" aria-hidden="true"><i></i><i></i><i></i><i></i><span class="scan"></span></div>
      </div>

      <header class="topbar overlay rise">
        <button class="gp icon-btn press" data-back aria-label="${T.close}">${icon.close(20)}</button>
        <a href="#/catalog" class="gp chip-lg press" aria-label="${T.changeCurtain}">
          <span class="dot ${fabricCls}" style="${fabricStyle(p, c.hex)}"></span>
          <span class="ellipsis">${esc(tx(p.name))}</span>
          <span class="accent">${T.change}</span>
        </a>
        <button class="gp icon-btn press" data-torch aria-label="${T.torch}" hidden>${icon.flash(20)}</button>
        <span class="icon-btn" data-torch-spacer aria-hidden="true"></span>
      </header>

      <div class="hint rise d1"><span class="gp chip"><span class="pulse-dot"></span>${T.frameHint}</span></div>

      <section class="sheet cam-sheet rise d2" aria-label="${T.camControls}">
        <button class="sample-btn press" data-sample>${icon.sparkle()} ${T.sample}</button>
        <div class="cam-controls">
          <label class="thumb-btn press" aria-label="${T.gallery}">
            ${icon.image(24)}
            <input type="file" accept="image/*" data-file hidden>
          </label>
          <button class="shutter press" data-shot aria-label="${T.shoot}"><span class="gold"></span></button>
          <button class="glass icon-btn lg press" data-flip aria-label="${T.flip}">${icon.flip(22)}</button>
        </div>
      </section>
      <div class="busy" data-busy hidden><span class="spinner"></span></div>
    </main>`);
  },

  mount(el) {
    // Created in the live document (not inside a <template>) with every inline-playback flag set
    // before a stream is attached — iOS WebKit otherwise decodes frames but paints the element black.
    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('aria-label', $(el, '[data-video-slot]').dataset.label || '');
    $(el, '[data-video-slot]').replaceWith(video);
    video.addEventListener('loadedmetadata', () => video.play().catch(() => {}));
    const off = $(el, '[data-off]');
    const shot = $<HTMLButtonElement>(el, '[data-shot]');
    const busy = $(el, '[data-busy]');
    let stream: MediaStream | null = null;
    let facing: 'environment' | 'user' = 'environment';
    let torchOn = false;
    let alive = true;

    // ---- zoom state: total = lens factor × hardware × digital ----
    let lenses: Lens[] = [{ id: null, factor: 1 }];
    let lens: Lens = lenses[0];
    let hw: ReturnType<typeof zoomCaps> = null;
    let zoom = 1;
    let digital = 1;
    let range = { values: [1, 2, 3], min: 1, max: 4 };
    const zoomBar = $(el, '[data-zoom]');
    const renderZoom = () => {
      if (facing !== 'environment') {
        zoomBar.hidden = true;
        return;
      }
      zoomBar.hidden = false;
      // the preset nearest the current zoom is the active one and shows the exact value
      let best = 0;
      range.values.forEach((v, i) => {
        if (Math.abs(Math.log(zoom / v)) < Math.abs(Math.log(zoom / range.values[best]))) best = i;
      });
      zoomBar.innerHTML = range.values
        .map((v, i) => {
          const on = i === best;
          return `<button class="zoom-chip${on ? ' is-on' : ''}" data-z="${v}" aria-pressed="${on}" aria-label="${fmtZoom(v)}">${on ? fmtZoom(zoom) : fmtZoom(v)}</button>`;
        })
        .join('');
    };
    const applyZoom = async (z: number, allowLensSwitch = true) => {
      z = Math.min(range.max, Math.max(range.min, z));
      if (allowLensSwitch && lenses.length > 1) {
        // the longest lens that does not overshoot the wanted zoom
        const target = lenses.filter((l) => l.factor <= z + 1e-6).pop() ?? lenses[0];
        if (target !== lens) {
          lens = target;
          zoom = z;
          await start();
          return;
        }
      }
      const rel = Math.max(z / lens.factor, hw ? hw.min : 1);
      const part = splitZoom(rel, hw);
      const track = stream?.getVideoTracks()[0];
      if (part.hw !== null && track) {
        try {
          await track.applyConstraints({ advanced: [{ zoom: part.hw } as MediaTrackConstraintSet] });
        } catch {
          /* some devices refuse in-between values: digital zoom covers it */
        }
      }
      digital = part.digital;
      video.style.transform = digital > 1.001 ? `scale(${digital})` : '';
      zoom = lens.factor * (part.hw ?? 1) * digital;
      renderZoom();
    };
    zoomBar.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-z]');
      if (b) applyZoom(Number(b.dataset.z));
    });

    // pinch to zoom on the preview (within the current lens while pinching; lens change when released)
    const vf = $(el, '.viewfinder');
    const pts = new Map<number, { x: number; y: number }>();
    let pinch0 = 0, zoom0 = 1, pinchRaf = 0, pending = 0;
    const dist = () => {
      const [a, b] = [...pts.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    vf.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        pinch0 = dist();
        zoom0 = zoom;
      }
    });
    vf.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size !== 2 || !pinch0) return;
      pending = zoom0 * (dist() / pinch0);
      if (!pinchRaf)
        pinchRaf = requestAnimationFrame(() => {
          pinchRaf = 0;
          applyZoom(pending, false);
        });
    });
    const pinchEnd = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2 && pinch0) {
        pinch0 = 0;
        applyZoom(zoom, true);
      }
    };
    vf.addEventListener('pointerup', pinchEnd);
    vf.addEventListener('pointercancel', pinchEnd);

    const stop = () => {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      video.srcObject = null;
    };

    const showOff = (reason?: string) => {
      off.hidden = false;
      el.classList.add('no-cam');
      if (reason) $(el, '[data-reason]').textContent = reason;
    };

    const start = async () => {
      stop();
      if (!navigator.mediaDevices?.getUserMedia) {
        showOff(isSecureContext ? t().camNoSupport : t().camInsecure);
        return;
      }
      try {
        const size = { width: { ideal: 1920 }, height: { ideal: 1440 } };
        const s = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: facing === 'environment' && lens.id ? { deviceId: { exact: lens.id }, ...size } : { facingMode: { ideal: facing }, ...size },
        });
        if (!alive) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        video.srcObject = s;
        await video.play().catch(() => {});
        off.hidden = true;
        el.classList.remove('no-cam');
        const track = s.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        const torch = $(el, '[data-torch]');
        torch.hidden = !caps.torch;
        $(el, '[data-torch-spacer]').hidden = !!caps.torch;
        // Lens names are only readable after permission, so look for the other lenses now.
        if (facing === 'environment' && lenses.length === 1 && lenses[0].id === null) {
          const found = await findLenses();
          if (found.length > 1) {
            lenses = found;
            lens = lenses.find((l) => l.factor === 1) ?? lenses[0];
          }
        }
        hw = facing === 'environment' ? zoomCaps(track) : null;
        range = presets(lenses, hw);
        await applyZoom(facing === 'environment' ? zoom : 1, false);
      } catch (e) {
        const name = (e as DOMException).name;
        showOff(name === 'NotAllowedError' ? t().camDenied : undefined);
      }
    };

    const done = (c: HTMLCanvasElement, corners: { x: number; y: number }[] | null = null) => {
      setPhoto(c, corners);
      navigate('/adjust');
    };

    shot.addEventListener('click', () => {
      if (!stream || !video.videoWidth) {
        toast(t().camNotReady, 'info');
        return;
      }
      el.classList.add('flash');
      // what you see is what you get: the digital part of the zoom crops the capture
      done(digital > 1.001 ? captureVideo(video, digital) : toCanvas(video, video.videoWidth, video.videoHeight));
    });

    $<HTMLInputElement>(el, '[data-file]').addEventListener('change', async (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      busy.hidden = false;
      try {
        done(await fileToCanvas(f));
      } catch {
        busy.hidden = true;
        toast(t().badImage, 'info');
      }
    });

    $(el, '[data-sample]').addEventListener('click', async () => {
      busy.hidden = false;
      try {
        const { c, corners } = await loadSample();
        done(c, corners);
      } catch {
        busy.hidden = true;
        toast(t().sampleFail, 'info');
      }
    });

    $(el, '[data-flip]').addEventListener('click', () => {
      facing = facing === 'environment' ? 'user' : 'environment';
      zoom = 1;
      digital = 1;
      video.style.transform = '';
      start();
    });

    $(el, '[data-torch]').addEventListener('click', async () => {
      const track = stream?.getVideoTracks()[0];
      if (!track) return;
      torchOn = !torchOn;
      try {
        await track.applyConstraints({ advanced: [{ torch: torchOn } as MediaTrackConstraintSet] });
      } catch {
        torchOn = false;
      }
    });

    $(el, '[data-back]').addEventListener('click', () => back(`/p/${session.productId}`));

    // The window-recognition model takes a moment to download the first time: start it now,
    // while the visitor is still framing the shot.
    const preloadTimer = setTimeout(() => preloadVision(), 800);

    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    start();

    return () => {
      clearTimeout(preloadTimer);
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  },
};
export default view;
