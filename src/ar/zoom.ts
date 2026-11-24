/**
 * Camera zoom that works with whatever the phone has:
 *  - separate lenses (iPhone: "Back Ultra Wide Camera" 0.5×, "Back Camera" 1×, "Back Telephoto Camera" 2×+),
 *    found by name after camera permission is granted;
 *  - hardware zoom on the track (most Android phones, incl. < 1× on some);
 *  - digital zoom (scale the preview, crop the capture) when neither is available or beyond the maximum.
 * Total zoom = lens factor × hardware zoom × digital zoom.
 */

export interface Lens {
  id: string | null;
  factor: number;
}

type ZoomCaps = { min: number; max: number; step: number } | null;

const VIRTUAL = /dual|triple|двойн|тройн/i;
const ULTRA = /ultra|сверхширок|ультра/i;
const TELE = /tele|телефото/i;
const BACK = /back|rear|environment|задн|основн/i;

/** Back-facing lenses with their zoom factor; one entry (the default camera) if the phone exposes only that. */
export async function findLenses(): Promise<Lens[]> {
  let devices: MediaDeviceInfo[] = [];
  try {
    devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
  } catch {
    return [{ id: null, factor: 1 }];
  }
  const lenses: Lens[] = [];
  for (const d of devices) {
    const label = d.label || '';
    if (!label || VIRTUAL.test(label) || !BACK.test(label)) continue;
    const factor = ULTRA.test(label) ? 0.5 : TELE.test(label) ? 2 : 1;
    if (!lenses.some((l) => l.factor === factor)) lenses.push({ id: d.deviceId, factor });
  }
  if (!lenses.some((l) => l.factor === 1)) lenses.push({ id: null, factor: 1 });
  return lenses.sort((a, b) => a.factor - b.factor);
}

export function zoomCaps(track: MediaStreamTrack | undefined): ZoomCaps {
  const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { zoom?: { min: number; max: number; step?: number } };
  if (!caps.zoom || !(caps.zoom.max > caps.zoom.min)) return null;
  return { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 };
}

/** Splits a wanted relative zoom (for the current lens) into hardware and digital parts. */
export function splitZoom(rel: number, hw: ZoomCaps) {
  if (!hw) return { hw: null as number | null, digital: Math.max(1, rel) };
  const h = Math.min(hw.max, Math.max(hw.min, rel));
  return { hw: Math.round(h / hw.step) * hw.step, digital: Math.max(1, rel / h) };
}

/** Preset buttons, like a phone camera app: the lenses, then 2×/3×/5× where reachable. */
export function presets(lenses: Lens[], hw: ZoomCaps, maxDigital = 4): { values: number[]; min: number; max: number } {
  const lensMax = lenses[lenses.length - 1].factor;
  const lensMin = lenses[0].factor;
  const min = Math.min(lensMin, hw ? hw.min : 1);
  const max = lensMax * (hw ? hw.max : 1) * maxDigital;
  const set = new Set<number>(lenses.map((l) => l.factor));
  if (hw && hw.min < 1 && lensMin >= 1) set.add(Math.round(hw.min * 10) / 10);
  for (const v of [1, 2, 3, 5, 10]) if (v <= Math.min(max, 10)) set.add(v);
  const values = [...set].sort((a, b) => a - b).filter((v, i, arr) => i === 0 || v / arr[i - 1] > 1.2).slice(0, 5);
  return { values, min, max };
}

export const fmtZoom = (z: number) => (z < 1 ? z.toFixed(1).replace(/^0/, '') : z < 10 ? (Math.round(z * 10) / 10).toString() : Math.round(z).toString()) + '×';
