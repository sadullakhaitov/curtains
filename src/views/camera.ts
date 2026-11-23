import { MAX_PHOTO_SIDE } from '../config';
import { findProduct, PRODUCTS } from '../data/products';
import { back, navigate, type View } from '../router';
import { session, setPhoto } from '../store';
import { $, esc, html, toast } from '../ui/dom';
import { icon } from '../ui/icons';

/** Draws any image source into a canvas no larger than MAX_PHOTO_SIDE. */
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
  render(params) {
    if (params.id && findProduct(params.id)) {
      if (session.productId !== params.id) session.colorIndex = 0;
      session.productId = params.id;
    }
    const p = findProduct(session.productId) ?? PRODUCTS[0];
    const c = p.colors[session.colorIndex] ?? p.colors[0];
    const fabricCls = p.type === 'roller' ? 'fabric roller' : 'fabric fold';

    return html(`
    <main class="screen camera">
      <div class="viewfinder">
        <video playsinline muted autoplay aria-label="Kamera koʻrinishi"></video>
        <div class="cam-off" data-off hidden>
          <span class="cam-off-icon glass">${icon.camera(30)}</span>
          <b>Kamera ochilmadi</b>
          <small data-reason>Galereyadan rasm yuklang yoki namuna xonada sinab koʻring.</small>
        </div>
        <div class="frame" aria-hidden="true"><i></i><i></i><i></i><i></i><span class="scan"></span></div>
      </div>

      <header class="topbar overlay rise">
        <button class="gp icon-btn press" data-back aria-label="Yopish">${icon.close(20)}</button>
        <a href="#/catalog" class="gp chip-lg press" aria-label="Pardani almashtirish">
          <span class="dot ${fabricCls}" style="background-color:${c.hex}"></span>
          <span class="ellipsis">${esc(p.name)}</span>
          <span class="accent">Almashtirish</span>
        </a>
        <button class="gp icon-btn press" data-torch aria-label="Chiroq" hidden>${icon.sparkle(18)}</button>
        <span class="icon-btn" data-torch-spacer aria-hidden="true"></span>
      </header>

      <div class="hint rise d1"><span class="gp chip"><span class="pulse-dot"></span>Derazani toʻliq kadrga oling</span></div>

      <section class="sheet cam-sheet rise d2" aria-label="Kamera boshqaruvi">
        <button class="sample-btn press" data-sample>${icon.sparkle()} Kamera yoʻqmi? Namuna xonada sinash</button>
        <div class="cam-controls">
          <label class="thumb-btn press" aria-label="Galereyadan yuklash">
            ${icon.image(24)}
            <input type="file" accept="image/*" data-file hidden>
          </label>
          <button class="shutter press" data-shot aria-label="Suratga olish"><span class="gold"></span></button>
          <button class="glass icon-btn lg press" data-flip aria-label="Kamerani almashtirish">${icon.flip(22)}</button>
        </div>
      </section>
      <div class="busy" data-busy hidden><span class="spinner"></span></div>
    </main>`);
  },

  mount(el) {
    const video = $<HTMLVideoElement>(el, 'video');
    const off = $(el, '[data-off]');
    const shot = $<HTMLButtonElement>(el, '[data-shot]');
    const busy = $(el, '[data-busy]');
    let stream: MediaStream | null = null;
    let facing: 'environment' | 'user' = 'environment';
    let torchOn = false;
    let alive = true;

    const stop = () => {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    };

    const showOff = (reason?: string) => {
      off.hidden = false;
      el.classList.add('no-cam');
      if (reason) $(el, '[data-reason]').textContent = reason;
    };

    const start = async () => {
      stop();
      if (!navigator.mediaDevices?.getUserMedia) {
        showOff(
          isSecureContext
            ? 'Bu brauzer kamerani qoʻllamaydi. Galereyadan rasm yuklang.'
            : 'Kamera faqat xavfsiz (https) saytda ishlaydi. Galereyadan rasm yuklang.',
        );
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
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
      } catch (e) {
        const name = (e as DOMException).name;
        showOff(
          name === 'NotAllowedError'
            ? 'Kameraga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering yoki galereyadan rasm yuklang.'
            : undefined,
        );
      }
    };

    const done = (c: HTMLCanvasElement, corners: { x: number; y: number }[] | null = null) => {
      setPhoto(c, corners);
      navigate('/adjust');
    };

    shot.addEventListener('click', () => {
      if (!stream || !video.videoWidth) {
        toast('Kamera tayyor emas — galereyadan rasm yuklang', 'info');
        return;
      }
      el.classList.add('flash');
      done(toCanvas(video, video.videoWidth, video.videoHeight));
    });

    $<HTMLInputElement>(el, '[data-file]').addEventListener('change', async (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      busy.hidden = false;
      try {
        done(await fileToCanvas(f));
      } catch {
        busy.hidden = true;
        toast('Rasmni ochib boʻlmadi', 'info');
      }
    });

    $(el, '[data-sample]').addEventListener('click', async () => {
      busy.hidden = false;
      try {
        const { c, corners } = await loadSample();
        done(c, corners);
      } catch {
        busy.hidden = true;
        toast('Namuna rasm yuklanmadi', 'info');
      }
    });

    $(el, '[data-flip]').addEventListener('click', () => {
      facing = facing === 'environment' ? 'user' : 'environment';
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

    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    start();

    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  },
};
export default view;
