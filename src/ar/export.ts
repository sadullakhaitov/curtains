let logo: Promise<HTMLImageElement | null> | null = null;
function loadLogo() {
  if (!logo) {
    logo = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = 'images/logo.webp';
    });
  }
  return logo;
}

/**
 * Copies the freshly rendered WebGL canvas into a JPEG with a small NewMoon badge.
 * `draw` must render the WebGL frame; it is called right before the copy so the
 * drawing buffer is still valid (no preserveDrawingBuffer needed).
 */
export async function exportImage(gl: HTMLCanvasElement, draw: () => void, caption: string): Promise<Blob> {
  const mark = await loadLogo();
  const out = document.createElement('canvas');
  out.width = gl.width;
  out.height = gl.height;
  const ctx = out.getContext('2d')!;
  draw();
  ctx.drawImage(gl, 0, 0);

  // Badge: rounded dark glass pill bottom-right with logo + name + product.
  const s = Math.max(out.width, out.height) / 1000;
  const pad = 14 * s, h = 44 * s, r = h / 2;
  ctx.font = `700 ${16 * s}px "Playfair Display", Georgia, serif`;
  const nameW = ctx.measureText('NewMoon').width;
  ctx.font = `600 ${12 * s}px Manrope, system-ui, sans-serif`;
  const capW = ctx.measureText(caption).width;
  const logoW = mark ? h * 0.7 * (mark.width / mark.height) : 0;
  const w = pad + logoW + (mark ? 8 * s : 0) + Math.max(nameW, capW) + pad;
  const x = out.width - w - 18 * s, y = out.height - h - 18 * s;
  ctx.fillStyle = 'rgba(10,14,22,0.55)';
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.fill();
  let tx = x + pad;
  if (mark) {
    ctx.drawImage(mark, tx, y + h * 0.15, logoW, h * 0.7);
    tx += logoW + 8 * s;
  }
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#F3D57E';
  ctx.font = `700 ${16 * s}px "Playfair Display", Georgia, serif`;
  ctx.fillText('NewMoon', tx, y + h * 0.47);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `600 ${12 * s}px Manrope, system-ui, sans-serif`;
  ctx.fillText(caption, tx, y + h * 0.8);

  return new Promise((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('Rasm yaratilmadi'))), 'image/jpeg', 0.9),
  );
}

/** Saves to the gallery where possible: the share sheet on phones ("Save image"), a download elsewhere. */
export async function saveImage(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: blob.type });
  const mobile = matchMedia('(pointer: coarse)').matches;
  if (mobile && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

export async function shareImage(blob: Blob, filename: string, text: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
