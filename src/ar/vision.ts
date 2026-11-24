import type { ImageSegmenter, InteractiveSegmenterLegacy } from '@mediapipe/tasks-vision';
import type { Point } from './homography';

/**
 * On-device scene understanding with MediaPipe (Apache-2.0), loaded only when the try-on needs it:
 *  - Magic Touch interactive segmenter: given one point, returns the object under it (the window).
 *  - DeepLab v3 (PASCAL VOC classes): finds furniture, plants and people that stand in front of
 *    the curtain so the renderer can keep them in front.
 * The wasm runtime and both models are served from this site (public/mediapipe, public/models).
 */

export interface Mask {
  data: Uint8Array;
  w: number;
  h: number;
}

type MP = typeof import('@mediapipe/tasks-vision');
type WasmFileset = Awaited<ReturnType<MP['FilesetResolver']['forVisionTasks']>>;

const asset = (p: string) => new URL(p, document.baseURI).href;
const WORK = 512; // the models work at about this size; smaller input = faster

let runtime: Promise<{ mp: MP; files: WasmFileset }> | null = null;
let touch: Promise<InteractiveSegmenterLegacy> | null = null;
let objects: Promise<ImageSegmenter> | null = null;

function base() {
  if (!runtime) {
    runtime = (async () => {
      const mp = await import('@mediapipe/tasks-vision');
      const files = await mp.FilesetResolver.forVisionTasks(asset('mediapipe'));
      return { mp, files };
    })();
    runtime.catch(() => (runtime = null));
  }
  return runtime;
}

/** Creates a task on the GPU when possible, otherwise on the CPU. */
async function create<T>(make: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> {
  try {
    return await make('GPU');
  } catch {
    return make('CPU');
  }
}

function getTouch() {
  if (!touch) {
    touch = base().then(({ mp, files }) =>
      create((delegate) =>
        mp.InteractiveSegmenterLegacy.createFromOptions(files, {
          baseOptions: { modelAssetPath: asset('models/magic_touch.tflite'), delegate },
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        }),
      ),
    );
    touch.catch(() => (touch = null));
  }
  return touch;
}

function getObjects() {
  if (!objects) {
    objects = base().then(({ mp, files }) =>
      create((delegate) =>
        mp.ImageSegmenter.createFromOptions(files, {
          baseOptions: { modelAssetPath: asset('models/deeplab_v3.tflite'), delegate },
          runningMode: 'IMAGE',
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        }),
      ),
    );
    objects.catch(() => (objects = null));
  }
  return objects;
}

let prefetched = false;
/**
 * Downloads the runtime and the window model into the browser cache at low priority, without
 * starting anything (no CPU/GPU work), e.g. while the visitor is still looking at a product.
 */
export function prefetchVision() {
  if (prefetched || runtime) return;
  prefetched = true;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  for (const f of ['mediapipe/vision_wasm_internal.js', 'mediapipe/vision_wasm_internal.wasm', 'models/magic_touch.tflite', 'models/deeplab_v3.tflite']) {
    fetch(asset(f), { priority: 'low' } as RequestInit).catch(() => {});
  }
}

/** Starts downloading the runtime and models in the background (e.g. while the camera is open). */
export function preloadVision() {
  getTouch().catch(() => {});
  getObjects().catch(() => {});
}

function small(photo: HTMLCanvasElement) {
  const k = Math.min(1, WORK / Math.max(photo.width, photo.height));
  if (k === 1) return photo;
  const c = document.createElement('canvas');
  c.width = Math.round(photo.width * k);
  c.height = Math.round(photo.height * k);
  c.getContext('2d')!.drawImage(photo, 0, 0, c.width, c.height);
  return c;
}

const cache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
const input = (photo: HTMLCanvasElement) => {
  let s = cache.get(photo);
  if (!s) cache.set(photo, (s = small(photo)));
  return s;
};

/** The object under `point` (photo pixels) as a 0/1 mask, or null. */
export async function segmentAt(photo: HTMLCanvasElement, point: Point): Promise<Mask | null> {
  const seg = await getTouch();
  const img = input(photo);
  const res = seg.segment(img, { keypoint: { x: point.x / photo.width, y: point.y / photo.height } });
  const m = res.categoryMask;
  if (!m) return null;
  const raw = m.getAsUint8Array();
  const data = new Uint8Array(raw.length);
  // The mask marks the selected object with one value and the rest with another: take the side
  // the keypoint itself falls on.
  const kx = Math.min(m.width - 1, Math.round((point.x / photo.width) * m.width));
  const ky = Math.min(m.height - 1, Math.round((point.y / photo.height) * m.height));
  const on = raw[ky * m.width + kx];
  let n = 0;
  for (let i = 0; i < raw.length; i++) if (raw[i] === on) (data[i] = 1), n++;
  const out = { data, w: m.width, h: m.height };
  res.close();
  return n > raw.length * 0.005 ? out : null;
}

// PASCAL VOC classes that stand in front of a wall: bicycle, bird, bottle, cat, chair, dining table,
// dog, person, potted plant, sofa, tv/monitor.
const FRONT = new Set([2, 3, 5, 8, 9, 11, 12, 15, 16, 18, 20]);

/** Pixels of things that stand in front of the wall (furniture, plants, people) as a 0/1 mask. */
export async function frontObjects(photo: HTMLCanvasElement): Promise<Mask | null> {
  const seg = await getObjects();
  const res = seg.segment(input(photo));
  const m = res.categoryMask;
  if (!m) return null;
  const raw = m.getAsUint8Array();
  const data = new Uint8Array(raw.length);
  let n = 0;
  for (let i = 0; i < raw.length; i++) if (FRONT.has(raw[i])) (data[i] = 1), n++;
  const out = { data, w: m.width, h: m.height };
  res.close();
  return n ? out : null;
}
