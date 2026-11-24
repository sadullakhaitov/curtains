/**
 * A bottom sheet that follows the finger like a phone's control centre: drag the handle down to
 * hide the settings and see the whole photo, drag it up (or tap it) to bring them back.
 * The sheet keeps a small "peek" strip with the handle so it can always be pulled back.
 */
export interface Sheet {
  open(): void;
  close(): void;
  toggle(): void;
  readonly isOpen: boolean;
  destroy(): void;
}

export function bottomSheet(
  sheet: HTMLElement,
  opts: { peek?: number; onMove?: (visible: number) => void; onToggle?: (open: boolean) => void } = {},
): Sheet {
  const peek = opts.peek ?? 56;
  const handle = sheet.querySelector<HTMLElement>('[data-sheet-handle]')!;
  let offset = 0; // px the sheet is pushed down
  let anim = 0;
  let isOpen = true;

  const max = () => Math.max(0, sheet.offsetHeight - peek);
  const apply = (o: number) => {
    offset = o;
    sheet.style.transform = `translate3d(0, ${o}px, 0)`;
    const collapsed = o > max() * 0.5;
    sheet.classList.toggle('is-collapsed', collapsed);
    opts.onMove?.(Math.max(peek, sheet.offsetHeight - o));
  };

  const animateTo = (target: number) => {
    cancelAnimationFrame(anim);
    const from = offset;
    const t0 = performance.now();
    const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 380;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4); // ease-out, like iOS sheets
      apply(from + (target - from) * e);
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };

  const setOpen = (v: boolean) => {
    isOpen = v;
    handle.setAttribute('aria-expanded', String(v));
    animateTo(v ? 0 : max());
    opts.onToggle?.(v);
  };

  // ---- dragging ----
  let startY = 0, startOff = 0, lastY = 0, lastT = 0, vel = 0, moved = false, pid = -1;
  const down = (e: PointerEvent) => {
    cancelAnimationFrame(anim);
    pid = e.pointerId;
    handle.setPointerCapture(pid);
    startY = lastY = e.clientY;
    startOff = offset;
    lastT = performance.now();
    vel = 0;
    moved = false;
    sheet.classList.add('is-dragging');
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== pid) return;
    const dy = e.clientY - startY;
    if (Math.abs(dy) > 4) moved = true;
    let o = startOff + dy;
    const m = max();
    // rubber band past the ends
    if (o < 0) o = -Math.sqrt(-o) * 2;
    if (o > m) o = m + Math.sqrt(o - m) * 2;
    apply(o);
    const now = performance.now();
    vel = (e.clientY - lastY) / Math.max(1, now - lastT);
    lastY = e.clientY;
    lastT = now;
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== pid) return;
    pid = -1;
    sheet.classList.remove('is-dragging');
    if (!moved) {
      setOpen(!isOpen);
      return;
    }
    // a quick flick decides; otherwise a quarter of the way is enough to switch
    if (vel > 0.45) setOpen(false);
    else if (vel < -0.45) setOpen(true);
    else setOpen(isOpen ? offset < max() * 0.25 : offset < max() * 0.75);
  };
  handle.addEventListener('pointerdown', down);
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', up);
  handle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(!isOpen);
    }
  });

  // content height can change (other product, other sliders): keep the closed position right
  const ro = new ResizeObserver(() => apply(isOpen ? 0 : max()));
  ro.observe(sheet);
  apply(0);

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!isOpen),
    get isOpen() {
      return isOpen;
    },
    destroy() {
      cancelAnimationFrame(anim);
      ro.disconnect();
    },
  };
}
