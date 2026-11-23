import { isConvex, type Point } from './homography';

/**
 * Finds a window in an indoor photo without any ML model.
 *
 * Daylight makes the window the brightest large region of almost every indoor photo, and its frame
 * gives it straight sides. So:
 *  1. Downscale, take luminance.
 *  2. Bright mask (top ~15 % of pixels), close small gaps (mullions, plants), take connected regions.
 *  3. Pick the region that looks most like a window: large, compact, bright, in the upper/middle part.
 *  4. Snap each side of that region to the nearest strong straight edge found with a small Hough
 *     transform (near-vertical sides, top/bottom tilted by perspective), so corners land on the frame.
 *
 * Returns corners (TL, TR, BR, BL) in the source canvas' pixels, or null when nothing convincing is found.
 */

const WORK = 320; // working resolution (longest side)
const SLOPES = 17;
const MAX_SLOPE_H = 0.36; // window top/bottom: up to ≈20° from perspective
const MAX_SLOPE_V = 0.16; // window sides stay nearly vertical when the phone is held upright

export interface Line {
  /** Offset at the image centre line; slope is dx/dy for verticals, dy/dx for horizontals. */
  off: number;
  slope: number;
  votes: number;
}

export interface Detection {
  corners: Point[];
  score: number;
  /** Share of the quad covered by the region (1 = a perfect four-sided shape). */
  fill: number;
  /** How many of the four sides snapped to a real straight edge. */
  snapped: number;
}

/** Optional debug sink (used by tests). */
export interface DetectDebug {
  w?: number;
  h?: number;
  k?: number;
  v?: Line[];
  hz?: Line[];
  region?: { x0: number; y0: number; x1: number; y1: number };
}

function luminance(src: CanvasImageSource, sw: number, sh: number) {
  const k = WORK / Math.max(sw, sh);
  const w = Math.max(16, Math.round(sw * k));
  const h = Math.max(16, Math.round(sh * k));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
  return { L, w, h, k };
}

function blur3(L: Float32Array, w: number, h: number) {
  const t = new Float32Array(L.length), o = new Float32Array(L.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      t[y * w + x] = (L[y * w + Math.max(0, x - 1)] + 2 * L[y * w + x] + L[y * w + Math.min(w - 1, x + 1)]) / 4;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      o[y * w + x] = (t[Math.max(0, y - 1) * w + x] + 2 * t[y * w + x] + t[Math.min(h - 1, y + 1) * w + x]) / 4;
  return o;
}

/** Binary dilate (max) or erode (min) with a square of radius r, separable. */
function morph(m: Uint8Array, w: number, h: number, r: number, dilate: boolean) {
  const t = new Uint8Array(m.length), o = new Uint8Array(m.length);
  const want = dilate ? 1 : 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let d = -r; d <= r && v !== want; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < w && m[y * w + xx] === want) v = want;
      }
      t[y * w + x] = v;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let d = -r; d <= r && v !== want; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < h && t[yy * w + x] === want) v = want;
      }
      o[y * w + x] = v;
    }
  return o;
}

function houghPeaks(acc: Float32Array, slopes: number[], size: number, n: number): Line[] {
  const out: Line[] = [];
  const a = acc.slice();
  const rad = Math.max(3, Math.round(size * 0.03));
  for (let k = 0; k < n; k++) {
    let best = 0, bi = -1;
    for (let i = 0; i < a.length; i++) if (a[i] > best) (best = a[i]), (bi = i);
    if (bi < 0) break;
    const s = Math.floor(bi / size), o = bi % size;
    out.push({ off: o, slope: slopes[s], votes: best });
    // One physical edge votes in every slope bin near its offset: suppress the whole band.
    for (let ss = 0; ss < slopes.length; ss++)
      for (let d = -rad; d <= rad; d++) {
        const oo = o + d;
        if (oo >= 0 && oo < size) a[ss * size + oo] = 0;
      }
  }
  return out;
}

/** A 0/1 mask of the window from a segmentation model, at any resolution. */
export interface WindowMask {
  data: Uint8Array;
  w: number;
  h: number;
}

/**
 * Without `mask`, the window is found from light (see above). With a `mask` from a segmentation
 * model, that mask is the region and only the frame snapping and sanity checks run.
 */
export function detectWindow(src: HTMLCanvasElement, debug?: DetectDebug, opts?: { mask?: WindowMask }): Detection | null {
  const { L: raw, w, h, k } = luminance(src, src.width, src.height);
  const L = blur3(raw, w, h);
  const N = w * h;
  const cx = w / 2, cy = h / 2;

  // ---------- 1. candidate regions: model mask, or the brightest areas ----------
  const fromModel = !!opts?.mask;
  let mask = new Uint8Array(N);
  if (opts?.mask) {
    const m = opts.mask;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        mask[y * w + x] = m.data[Math.min(m.h - 1, Math.floor(((y + 0.5) / h) * m.h)) * m.w + Math.min(m.w - 1, Math.floor(((x + 0.5) / w) * m.w))];
  } else {
    const sorted = Float32Array.from(L).sort();
    const p85 = sorted[Math.floor(N * 0.85)];
    const median = sorted[Math.floor(N * 0.5)];
    if (p85 - median < 0.035) return null; // flat, evenly lit photo: nothing stands out
    for (let i = 0; i < N; i++) mask[i] = L[i] >= p85 ? 1 : 0;
  }
  const r = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  mask = morph(morph(mask, w, h, r, true), w, h, r, false);

  const label = new Int32Array(N).fill(-1);
  const stack = new Int32Array(N);
  type Region = { area: number; x0: number; y0: number; x1: number; y1: number; sy: number; sl: number; px: number[] };
  const regions: Region[] = [];
  for (let i = 0; i < N; i++) {
    if (!mask[i] || label[i] >= 0) continue;
    const id = regions.length;
    const reg: Region = { area: 0, x0: w, y0: h, x1: 0, y1: 0, sy: 0, sl: 0, px: [] };
    let sp = 0;
    stack[sp++] = i;
    label[i] = id;
    while (sp) {
      const j = stack[--sp];
      const x = j % w, y = (j - x) / w;
      reg.area++;
      reg.sy += y;
      reg.sl += L[j];
      reg.px.push(j);
      if (x < reg.x0) reg.x0 = x;
      if (x > reg.x1) reg.x1 = x;
      if (y < reg.y0) reg.y0 = y;
      if (y > reg.y1) reg.y1 = y;
      if (x > 0 && mask[j - 1] && label[j - 1] < 0) (label[j - 1] = id), (stack[sp++] = j - 1);
      if (x < w - 1 && mask[j + 1] && label[j + 1] < 0) (label[j + 1] = id), (stack[sp++] = j + 1);
      if (y > 0 && mask[j - w] && label[j - w] < 0) (label[j - w] = id), (stack[sp++] = j - w);
      if (y < h - 1 && mask[j + w] && label[j + w] < 0) (label[j + w] = id), (stack[sp++] = j + w);
    }
    regions.push(reg);
  }

  let best: { reg: Region; score: number } | null = null;
  if (fromModel) {
    for (const reg of regions) if (!best || reg.area > best.reg.area) best = { reg, score: 1 };
    if (best && best.reg.area < N * 0.01) best = null;
  } else for (const reg of regions) {
    const a = reg.area / N;
    const bw = reg.x1 - reg.x0 + 1, bh = reg.y1 - reg.y0 + 1;
    if (a < 0.015 || bw < w * 0.08 || bh < h * 0.1) continue;
    const fill = reg.area / (bw * bh);
    const yc = reg.sy / reg.area / h;
    const pos = yc < 0.5 ? 1 : Math.max(0, 1 - (yc - 0.5) / 0.3);
    const bottom = reg.y1 / h > 0.92 ? 0.4 : 1; // regions reaching the floor are rarely windows
    const lum = reg.sl / reg.area;
    const score = Math.sqrt(a) * (0.35 + fill) * pos * bottom * lum;
    if (!best || score > best.score) best = { reg, score };
  }
  if (!best) return null;
  // A window split by mullions shows up as several bright panes side by side: merge panes that share
  // most of their height with the chosen one and sit close to it.
  const R: Region = { ...best.reg, px: best.reg.px.slice() };
  let merged = !fromModel;
  const done = new Set<Region>([best.reg]);
  while (merged) {
    merged = false;
    for (const reg of regions) {
      if (done.has(reg) || reg.area < N * 0.004) continue;
      // Panes of one window share their top and bottom edges, brightness and roughly their size.
      const gap = Math.max(reg.x0 - R.x1, R.x0 - reg.x1);
      const sameRows = Math.abs(reg.y0 - best.reg.y0) < h * 0.06 && Math.abs(reg.y1 - best.reg.y1) < h * 0.06;
      const sameLight = reg.sl / reg.area > (best.reg.sl / best.reg.area) * 0.92;
      const ratio = reg.area / best.reg.area;
      if (gap > w * 0.06 || !sameRows || !sameLight || ratio < 0.2 || ratio > 3) continue;
      done.add(reg);
      merged = true;
      R.area += reg.area;
      R.sy += reg.sy;
      R.sl += reg.sl;
      for (const j of reg.px) R.px.push(j);
      R.x0 = Math.min(R.x0, reg.x0);
      R.x1 = Math.max(R.x1, reg.x1);
      R.y0 = Math.min(R.y0, reg.y0);
      R.y1 = Math.max(R.y1, reg.y1);
      for (const j of reg.px) mask[j] = 1;
    }
  }
  // Fill the gaps between merged panes in the mask too, so the "mostly bright" check sees one window.
  for (let y = R.y0; y <= R.y1; y++) {
    let first = -1, last = -1;
    for (let x = R.x0; x <= R.x1; x++) if (label[y * w + x] >= 0 && done.has(regions[label[y * w + x]])) (first = first < 0 ? x : first), (last = x);
    for (let x = first; x >= 0 && x <= last; x++) mask[y * w + x] = 1;
  }
  if (debug) debug.region = { x0: R.x0, y0: R.y0, x1: R.x1, y1: R.y1 };

  // ---------- 2. straight edges (Hough) ----------
  const mag = new Float32Array(N);
  const ori = new Uint8Array(N); // 1 = vertical edge, 2 = horizontal edge
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1];
      const gy = L[i + w - 1] + 2 * L[i + w] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - w] - L[i - w + 1];
      mag[i] = Math.hypot(gx, gy);
      const ax = Math.abs(gx), ay = Math.abs(gy);
      ori[i] = ax > ay * 1.4 ? 1 : ay > ax * 1.4 ? 2 : 0;
    }
  const slopesH = Array.from({ length: SLOPES }, (_, i) => -MAX_SLOPE_H + (2 * MAX_SLOPE_H * i) / (SLOPES - 1));
  const slopesV = Array.from({ length: SLOPES }, (_, i) => -MAX_SLOPE_V + (2 * MAX_SLOPE_V * i) / (SLOPES - 1));
  const accV = new Float32Array(SLOPES * w), accH = new Float32Array(SLOPES * h);
  // Only edges in a band around the chosen region vote, so furniture elsewhere cannot win.
  const padX = (R.x1 - R.x0) * 0.25 + w * 0.03, padY = (R.y1 - R.y0) * 0.25 + h * 0.03;
  const bx0 = Math.max(1, Math.floor(R.x0 - padX)), bx1 = Math.min(w - 2, Math.ceil(R.x1 + padX));
  const by0 = Math.max(1, Math.floor(R.y0 - padY)), by1 = Math.min(h - 2, Math.ceil(R.y1 + padY));
  for (let y = by0; y <= by1; y++)
    for (let x = bx0; x <= bx1; x++) {
      const i = y * w + x;
      const m = mag[i];
      if (m < 0.08) continue;
      const v = Math.min(m, 0.5);
      if (ori[i] === 1) {
        for (let s = 0; s < SLOPES; s++) {
          const o = Math.round(x - slopesV[s] * (y - cy));
          if (o >= 0 && o < w) accV[s * w + o] += v;
        }
      } else if (ori[i] === 2) {
        for (let s = 0; s < SLOPES; s++) {
          const o = Math.round(y - slopesH[s] * (x - cx));
          if (o >= 0 && o < h) accH[s * h + o] += v;
        }
      }
    }
  const vLines = houghPeaks(accV, slopesV, w, 12);
  const hLines = houghPeaks(accH, slopesH, h, 12);
  if (debug) Object.assign(debug, { w, h, k, v: vLines, hz: hLines });

  // ---------- 3. region outline → snapped quad ----------
  // Extreme points of the region give a perspective-aware first guess of the corners.
  let tl = 0, tr = 0, br = 0, bl = 0;
  let vtl = Infinity, vtr = -Infinity, vbr = -Infinity, vbl = Infinity;
  for (const j of R.px) {
    const x = j % w, y = (j - x) / w;
    if (x + y < vtl) (vtl = x + y), (tl = j);
    if (x - y > vtr) (vtr = x - y), (tr = j);
    if (x + y > vbr) (vbr = x + y), (br = j);
    if (x - y < vbl) (vbl = x - y), (bl = j);
  }
  const P = (j: number): Point => ({ x: j % w, y: Math.floor(j / w) });
  const guess = [P(tl), P(tr), P(br), P(bl)];

  const midY = (R.y0 + R.y1) / 2, midX = (R.x0 + R.x1) / 2;
  const xAt = (l: Line, y: number) => l.off + l.slope * (y - cy);
  const yAt = (l: Line, x: number) => l.off + l.slope * (x - cx);

  // Strongest straight edge near a side; edges just outside the bright area (the frame) are preferred.
  const pickV = (target: number, outward: number): Line | null => {
    let bestL: Line | null = null, bestS = 0;
    for (const l of vLines) {
      const d = (xAt(l, midY) - target) * outward;
      if (d < -w * 0.04 || d > w * 0.07) continue;
      const s = l.votes * (1 - Math.abs(d) / (w * 0.09));
      if (s > bestS) (bestS = s), (bestL = l);
    }
    return bestL;
  };
  const pickH = (target: number, outward: number): Line | null => {
    let bestL: Line | null = null, bestS = 0;
    for (const l of hLines) {
      const d = (yAt(l, midX) - target) * outward;
      if (d < -h * 0.04 || d > h * 0.07) continue;
      const s = l.votes * (1 - Math.abs(d) / (h * 0.09));
      if (s > bestS) (bestS = s), (bestL = l);
    }
    return bestL;
  };
  const vThrough = (a: Point, b: Point): Line => {
    const slope = b.y !== a.y ? Math.max(-MAX_SLOPE_V, Math.min(MAX_SLOPE_V, (b.x - a.x) / (b.y - a.y))) : 0;
    return { off: (a.x + b.x) / 2 - slope * ((a.y + b.y) / 2 - cy), slope, votes: 0 };
  };
  const hThrough = (a: Point, b: Point): Line => {
    const slope = b.x !== a.x ? Math.max(-MAX_SLOPE_H, Math.min(MAX_SLOPE_H, (b.y - a.y) / (b.x - a.x))) : 0;
    return { off: (a.y + b.y) / 2 - slope * ((a.x + b.x) / 2 - cx), slope, votes: 0 };
  };

  let left = pickV((guess[0].x + guess[3].x) / 2, -1) ?? vThrough(guess[0], guess[3]);
  let right = pickV((guess[1].x + guess[2].x) / 2, 1) ?? vThrough(guess[1], guess[2]);
  let top = pickH((guess[0].y + guess[1].y) / 2, -1) ?? hThrough(guess[0], guess[1]);
  let bottom = pickH((guess[3].y + guess[2].y) / 2, 1) ?? hThrough(guess[3], guess[2]);

  // Opposite sides of a window are close to parallel. If they disagree, keep the better-supported one
  // and lay the other parallel to it through its own side of the region.
  const parallel = (a: Line, b: Line, max: number, through: (l: Line, slope: number) => Line): [Line, Line] => {
    if (Math.abs(a.slope - b.slope) <= max) return [a, b];
    return a.votes >= b.votes ? [a, through(b, a.slope)] : [through(a, b.slope), b];
  };
  const vAt = (l: Line, slope: number): Line => ({ off: xAt(l, midY) - slope * (midY - cy), slope, votes: l.votes * 0.5 });
  const hAt = (l: Line, slope: number): Line => ({ off: yAt(l, midX) - slope * (midX - cx), slope, votes: l.votes * 0.5 });
  [left, right] = parallel(left, right, 0.1, vAt);
  [top, bottom] = parallel(top, bottom, 0.2, hAt);
  const snapped = [left, right, top, bottom].filter((l) => l.votes > 0).length;

  const cross = (v: Line, hz: Line): Point => {
    const x = (v.off + v.slope * (hz.off - cy - hz.slope * cx)) / (1 - v.slope * hz.slope);
    return { x, y: hz.off + hz.slope * (x - cx) };
  };
  let q = [cross(left, top), cross(right, top), cross(right, bottom), cross(left, bottom)];
  const area = (p: Point[]) => Math.abs(p.reduce((s, a, i) => s + a.x * p[(i + 1) % 4].y - p[(i + 1) % 4].x * a.y, 0)) / 2;
  const regionArea = (R.x1 - R.x0 + 1) * (R.y1 - R.y0 + 1);
  if (!isConvex(q) || area(q) < regionArea * 0.5 || area(q) > regionArea * 2.2) q = guess;
  if (!isConvex(q)) return null;

  // Sanity: no sliver-thin quads ...
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    if (Math.hypot(b.x - a.x, b.y - a.y) < Math.min(w, h) * 0.1) return null;
  }
  // ... every corner close to a right angle (perspective allows some skew) ...
  for (let i = 0; i < 4; i++) {
    const a = q[(i + 3) % 4], b = q[i], c = q[(i + 1) % 4];
    const v1x = a.x - b.x, v1y = a.y - b.y, v2x = c.x - b.x, v2y = c.y - b.y;
    const cos = (v1x * v2x + v1y * v2y) / (Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y) || 1);
    if (Math.abs(cos) > 0.58) return null; // outside ≈55°–125°
  }
  // ... and the quad is mostly made of the bright region.
  let hit = 0, tot = 0;
  for (let i = 1; i < 12; i++)
    for (let j = 1; j < 12; j++) {
      const u = i / 12, v = j / 12;
      const x = (1 - v) * ((1 - u) * q[0].x + u * q[1].x) + v * ((1 - u) * q[3].x + u * q[2].x);
      const y = (1 - v) * ((1 - u) * q[0].y + u * q[1].y) + v * ((1 - u) * q[3].y + u * q[2].y);
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 0 || yi < 0 || xi >= w || yi >= h) continue;
      tot++;
      if (mask[yi * w + xi]) hit++;
    }
  if (!tot || hit / tot < 0.4) return null;
  const fill = hit / tot;

  // The bright area is the glass; push the corners out a little so the curtain also covers the frame.
  const mx = (q[0].x + q[1].x + q[2].x + q[3].x) / 4, my = (q[0].y + q[1].y + q[2].y + q[3].y) / 4;
  const grow = fromModel ? 1.02 : 1.04;
  q = q.map((p) => ({ x: mx + (p.x - mx) * grow, y: my + (p.y - my) * grow }));

  const score = best.score * (1 + 0.15 * snapped);
  if (!fromModel && score < 0.33) return null; // weak evidence: better to leave the default corners
  return {
    corners: q.map((p) => ({ x: Math.max(0, Math.min(src.width, p.x / k)), y: Math.max(0, Math.min(src.height, p.y / k)) })),
    score,
    fill,
    snapped,
  };
}

/**
 * Centres (photo pixels) of the most window-like bright areas, best first. Used as starting points
 * for the segmentation model when the light-based detector alone is not sure.
 */
export function brightSpots(src: HTMLCanvasElement, n = 3): Point[] {
  const { L: raw, w, h, k } = luminance(src, src.width, src.height);
  const L = blur3(raw, w, h);
  const N = w * h;
  const sorted = Float32Array.from(L).sort();
  const p85 = sorted[Math.floor(N * 0.85)];
  let mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) mask[i] = L[i] >= p85 ? 1 : 0;
  const r = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  mask = morph(morph(mask, w, h, r, true), w, h, r, false);
  const seen = new Uint8Array(N);
  const stack = new Int32Array(N);
  const spots: { p: Point; s: number }[] = [];
  for (let i = 0; i < N; i++) {
    if (!mask[i] || seen[i]) continue;
    let sp = 0, area = 0, sx = 0, sy = 0, sl = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
    stack[sp++] = i;
    seen[i] = 1;
    while (sp) {
      const j = stack[--sp];
      const x = j % w, y = (j - x) / w;
      area++, (sx += x), (sy += y), (sl += L[j]);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (const nb of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < h - 1 ? j + w : -1])
        if (nb >= 0 && mask[nb] && !seen[nb]) (seen[nb] = 1), (stack[sp++] = nb);
    }
    const a = area / N;
    if (a < 0.008) continue;
    const fill = area / ((x1 - x0 + 1) * (y1 - y0 + 1));
    const yc = sy / area / h;
    const pos = yc < 0.5 ? 1 : Math.max(0.1, 1 - (yc - 0.5) / 0.3);
    spots.push({ p: { x: sx / area / k, y: sy / area / k }, s: Math.sqrt(a) * (0.35 + fill) * pos * (sl / area) });
  }
  return spots.sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.p);
}
