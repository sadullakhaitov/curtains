import { brightSpots, detectWindow } from './detect';
import { invert, squareToQuad, type Point } from './homography';
import { segmentAt, type Mask } from './vision';

/**
 * Window finding with the segmentation model:
 *  1. Try a few starting points (the light-based guess, the brightest window-like areas, the centre).
 *  2. For each, Magic Touch returns the object under that point; we fit a four-sided frame to it
 *     and score how window-like it is (four-sided, brighter than its surroundings, sensible size).
 *  3. Windows made of several panes: look one pane to the left and right and merge panes that
 *     share the same top and bottom.
 */

export interface WindowFind {
  corners: Point[];
  mask: Mask;
  score: number;
  /** Inside-vs-surroundings brightness, -1..1 (daylit glass is clearly brighter than the wall). */
  bright: number;
  fill: number;
  /** Passes the rules for an automatic pick (a tapped selection may not). */
  plausible: boolean;
}

const centre = (q: Point[]) => ({ x: (q[0].x + q[1].x + q[2].x + q[3].x) / 4, y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4 });

/** Mean luminance inside / outside the mask, on a photo copy at the mask's resolution. */
function contrast(photo: HTMLCanvasElement, m: Mask) {
  const c = document.createElement('canvas');
  c.width = m.w;
  c.height = m.h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(photo, 0, 0, m.w, m.h);
  const d = ctx.getImageData(0, 0, m.w, m.h).data;
  let si = 0, ni = 0, so = 0, no = 0, border = 0;
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x;
      const l = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      if (m.data[i]) {
        si += l;
        ni++;
        if (x === 0 || y === 0 || x === m.w - 1 || y === m.h - 1) border++;
      } else {
        so += l;
        no++;
      }
    }
  return { inside: ni ? si / ni : 0, outside: no ? so / no : 0, area: ni / (m.w * m.h), border: border / (2 * (m.w + m.h)) };
}

/** Optional trace of every candidate (used by tests to tune the scoring). */
export const trace: { on: boolean; log: Record<string, unknown>[] } = { on: false, log: [] };

function evaluate(photo: HTMLCanvasElement, mask: Mask, strict: boolean, tag = ''): WindowFind | null {
  const st = contrast(photo, mask);
  const det = st.area < 0.008 || st.area > (strict ? 0.6 : 0.85) ? null : detectWindow(photo, undefined, { mask });
  const bright = Math.max(-1, Math.min(1, (st.inside - st.outside) / 0.15));
  let score = -9, plausible = false, aspect = 0;
  if (det) {
    const q = det.corners;
    const qw = (Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) + Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y)) / 2;
    const qh = (Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y) + Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y)) / 2;
    aspect = qw / Math.max(qh, 1);
    // A wide, low band hugging the top of the frame is the ceiling line, not a window.
    const ceiling = top(q) < photo.height * 0.1 && aspect > 1.8;
    plausible = bright >= 0.25 && det.fill >= 0.82 && aspect > 0.25 && aspect < 2.5 && !ceiling && st.border < 0.12;
    score = det.fill + 0.9 * bright + 0.08 * det.snapped - (st.area > 0.45 ? 0.4 : 0) - st.border * 1.5 - (ceiling ? 1 : 0);
  }
  if (trace.on) trace.log.push({ tag, area: +st.area.toFixed(3), border: +st.border.toFixed(2), bright: +bright.toFixed(2), fill: det && +det.fill.toFixed(2), snapped: det?.snapped, aspect: +aspect.toFixed(2), plausible, score: +score.toFixed(2) });
  return det ? { corners: det.corners, mask, score, bright, fill: det.fill, plausible } : null;
}

function union(a: Mask, b: Mask): Mask | null {
  if (a.w !== b.w || a.h !== b.h) return null;
  const data = new Uint8Array(a.data.length);
  for (let i = 0; i < data.length; i++) data[i] = a.data[i] | b.data[i];
  return { data, w: a.w, h: a.h };
}

const top = (q: Point[]) => (q[0].y + q[1].y) / 2;
const bottom = (q: Point[]) => (q[2].y + q[3].y) / 2;
const left = (q: Point[]) => (q[0].x + q[3].x) / 2;
const right = (q: Point[]) => (q[1].x + q[2].x) / 2;

/** Two panes of one window: same top and bottom, side by side. */
function samePaneRow(a: Point[], b: Point[], ph: number, pw: number) {
  const ha = bottom(a) - top(a), hb = bottom(b) - top(b);
  const gap = Math.max(left(b) - right(a), left(a) - right(b));
  return Math.abs(top(a) - top(b)) < ph * 0.06 && Math.abs(bottom(a) - bottom(b)) < ph * 0.06 && hb / ha > 0.75 && hb / ha < 1.33 && gap < pw * 0.12;
}

async function extendPanes(photo: HTMLCanvasElement, f: WindowFind): Promise<WindowFind> {
  const pw = photo.width, ph = photo.height;
  const qw = right(f.corners) - left(f.corners);
  const qh = bottom(f.corners) - top(f.corners);
  // Only a tall, narrow shape is likely one pane of a wider window; anything else is the whole window.
  if (qw > pw * 0.45 || qh / qw < 1.25) return f;
  const midY = (top(f.corners) + bottom(f.corners)) / 2;
  for (const x of [left(f.corners) - qw * 0.55, right(f.corners) + qw * 0.55]) {
    if (x < pw * 0.02 || x > pw * 0.98) continue;
    const m = await segmentAt(photo, { x, y: midY }).catch(() => null);
    if (!m) continue;
    const e = evaluate(photo, m, true, 'pane');
    // A neighbouring pane is as bright as this one; a wall, a picture or a door is not.
    if (!e || !e.plausible || Math.abs(e.bright - f.bright) > 0.6 || !samePaneRow(f.corners, e.corners, ph, pw)) continue;
    const u = union(f.mask, m);
    const merged = u && evaluate(photo, u, false, 'merged');
    if (merged && merged.fill >= 0.85 && merged.score >= f.score - 0.1) f = { ...merged, plausible: true };
  }
  return f;
}

/**
 * Best window in the photo, or null. `guess` is the light-based detector's result, if any.
 * Throws when the model cannot be loaded (caller falls back to the guess).
 */
export async function findWindow(photo: HTMLCanvasElement, guess: Point[] | null): Promise<WindowFind | null> {
  const pts: Point[] = [];
  const far = (p: Point) => pts.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > Math.max(photo.width, photo.height) * 0.1);
  if (guess) pts.push(centre(guess));
  for (const p of brightSpots(photo, 3)) if (far(p)) pts.push(p);
  const mid = { x: photo.width * 0.5, y: photo.height * 0.42 };
  if (far(mid)) pts.push(mid);

  let best: WindowFind | null = null;
  for (const p of pts.slice(0, 3)) {
    const m = await segmentAt(photo, p);
    if (!m) continue;
    const e = evaluate(photo, m, true, `cand ${Math.round(p.x)},${Math.round(p.y)}`);
    if (e && e.plausible && (!best || e.score > best.score)) best = e;
    // Each model run costs real time on a phone: stop as soon as the answer is clear.
    if (best && best.score >= 1.45) break;
  }
  // Nothing convincing: better to ask the visitor to tap the window than to guess wrong.
  if (!best || best.score < 1.2) return null;
  return extendPanes(photo, best);
}

/** The window under a point the visitor tapped; adds a neighbouring pane to `current` when it fits. */
export async function windowAt(photo: HTMLCanvasElement, p: Point, current: WindowFind | null): Promise<WindowFind | null> {
  const m = await segmentAt(photo, p);
  if (!m) return null;
  const e = evaluate(photo, m, false, 'tap');
  // The visitor pointed at it, so brightness is not required, but it must be roughly four-sided.
  if (!e || e.fill < 0.7) return null;
  if (current && samePaneRow(current.corners, e.corners, photo.height, photo.width)) {
    const u = union(current.mask, m);
    const merged = u && evaluate(photo, u, false, 'tap-merged');
    if (merged && merged.fill >= 0.8) return merged;
  }
  return e;
}

/**
 * Keeps only the objects that really stand in front of the curtain: anything that reaches outside
 * the window area (a chair, a sofa, a plant on the sill). Objects seen entirely through the glass
 * (a car or a person outside) are behind the curtain and are dropped.
 */
export function inFront(front: Mask, corners: Point[], pw: number, ph: number): Mask | null {
  const Hi = invert(squareToQuad(corners));
  const { w, h, data } = front;
  const out = new Uint8Array(data.length);
  const seen = new Uint8Array(data.length);
  const stack = new Int32Array(data.length);
  const comp: number[] = [];
  let any = false;
  for (let i = 0; i < data.length; i++) {
    if (!data[i] || seen[i]) continue;
    comp.length = 0;
    let sp = 0, outside = false;
    stack[sp++] = i;
    seen[i] = 1;
    while (sp) {
      const j = stack[--sp];
      comp.push(j);
      const x = j % w, y = (j - x) / w;
      if (!outside) {
        const X = ((x + 0.5) / w) * pw, Y = ((y + 0.5) / h) * ph;
        const z = Hi[6] * X + Hi[7] * Y + Hi[8];
        const u = (Hi[0] * X + Hi[1] * Y + Hi[2]) / z, v = (Hi[3] * X + Hi[4] * Y + Hi[5]) / z;
        if (u < -0.03 || u > 1.03 || v < -0.03 || v > 1.03) outside = true;
      }
      if (x > 0 && data[j - 1] && !seen[j - 1]) (seen[j - 1] = 1), (stack[sp++] = j - 1);
      if (x < w - 1 && data[j + 1] && !seen[j + 1]) (seen[j + 1] = 1), (stack[sp++] = j + 1);
      if (y > 0 && data[j - w] && !seen[j - w]) (seen[j - w] = 1), (stack[sp++] = j - w);
      if (y < h - 1 && data[j + w] && !seen[j + w]) (seen[j + w] = 1), (stack[sp++] = j + w);
    }
    // Tiny specks are usually misclassified floor or rug; ignore them.
    if (outside && comp.length > data.length * 0.002) {
      any = true;
      for (const j of comp) out[j] = 1;
    }
  }
  if (!any) return null;
  // Shrink by one pixel: the model tends to spill a little onto the wall around objects.
  const eroded = new Uint8Array(out.length);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      eroded[i] = out[i] & out[i - 1] & out[i + 1] & out[i - w] & out[i + w];
    }
  return { data: eroded, w, h };
}

/**
 * Snaps a coarse object mask to the photo's real edges with a guided filter (He et al.): the result
 * follows the outline of the chair or plant in the photo instead of the model's blobby low-res mask.
 * Returns a soft 0..255 mask at up to 640 px.
 */
export function refineMask(photo: HTMLCanvasElement, m: Mask): Mask {
  const k = Math.min(1, 640 / Math.max(photo.width, photo.height));
  const w = Math.max(8, Math.round(photo.width * k)), h = Math.max(8, Math.round(photo.height * k));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(photo, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const N = w * h;
  const I = new Float32Array(N), P = new Float32Array(N);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      I[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
      // bilinear sample of the coarse mask
      const fx = ((x + 0.5) / w) * m.w - 0.5, fy = ((y + 0.5) / h) * m.h - 0.5;
      const x0 = Math.max(0, Math.min(m.w - 1, Math.floor(fx))), y0 = Math.max(0, Math.min(m.h - 1, Math.floor(fy)));
      const x1 = Math.min(m.w - 1, x0 + 1), y1 = Math.min(m.h - 1, y0 + 1);
      const tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0));
      const v = (a: number, b: number) => (m.data[b * m.w + a] ? 1 : 0);
      P[i] = (v(x0, y0) * (1 - tx) + v(x1, y0) * tx) * (1 - ty) + (v(x0, y1) * (1 - tx) + v(x1, y1) * tx) * ty;
    }
  const r = Math.max(3, Math.round(Math.max(w, h) / 80));
  const box = (src: Float32Array) => {
    // integral image box mean with radius r
    const S = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        row += src[y * w + x];
        S[(y + 1) * (w + 1) + x + 1] = S[y * (w + 1) + x + 1] + row;
      }
    }
    const out = new Float32Array(N);
    for (let y = 0; y < h; y++) {
      const ya = Math.max(0, y - r), yb = Math.min(h, y + r + 1);
      for (let x = 0; x < w; x++) {
        const xa = Math.max(0, x - r), xb = Math.min(w, x + r + 1);
        const sum = S[yb * (w + 1) + xb] - S[ya * (w + 1) + xb] - S[yb * (w + 1) + xa] + S[ya * (w + 1) + xa];
        out[y * w + x] = sum / ((yb - ya) * (xb - xa));
      }
    }
    return out;
  };
  const II = new Float32Array(N), IP = new Float32Array(N);
  for (let i = 0; i < N; i++) (II[i] = I[i] * I[i]), (IP[i] = I[i] * P[i]);
  const mI = box(I), mP = box(P), mII = box(II), mIP = box(IP);
  const eps = 0.0008;
  const A = new Float32Array(N), B = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const varI = mII[i] - mI[i] * mI[i];
    const cov = mIP[i] - mI[i] * mP[i];
    A[i] = cov / (varI + eps);
    B[i] = mP[i] - A[i] * mI[i];
  }
  const mA = box(A), mB = box(B);
  const data = new Uint8Array(N);
  for (let i = 0; i < N; i++) data[i] = Math.max(0, Math.min(255, Math.round((mA[i] * I[i] + mB[i]) * 255)));
  return { data, w, h };
}
