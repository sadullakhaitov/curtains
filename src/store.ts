import type { Point } from './ar/homography';

/** In-memory app state shared between screens. The photo never leaves the device. */
export interface TrySession {
  productId: string;
  colorIndex: number;
  /** Uploaded/captured photo, already downscaled. */
  photo: HTMLCanvasElement | null;
  /** Window corners in photo pixels: TL, TR, BR, BL. */
  corners: Point[] | null;
  /** 0 = closed, 1 = fully open. */
  open: number;
  /** Tulle strength 0..1 (classic curtains only). */
  tulle: number;
  /** How far below the window the curtain hangs, in window heights. */
  drop: number;
  result: Blob | null;
  resultUrl: string | null;
  originalUrl: string | null;
}

export const session: TrySession = {
  productId: 'barxat',
  colorIndex: 0,
  photo: null,
  corners: null,
  open: 0.55,
  tulle: 0.45,
  drop: 0.35,
  result: null,
  resultUrl: null,
  originalUrl: null,
};

export function setPhoto(photo: HTMLCanvasElement, corners: Point[] | null = null) {
  session.photo = photo;
  session.corners = corners;
  clearResult();
  if (session.originalUrl) URL.revokeObjectURL(session.originalUrl);
  session.originalUrl = null;
}

export function clearResult() {
  if (session.resultUrl) URL.revokeObjectURL(session.resultUrl);
  session.result = null;
  session.resultUrl = null;
}
