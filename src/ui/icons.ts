// Inline stroke icons (no icon font, no extra requests).
const svg = (body: string, size = 22, extra = '') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${body}</svg>`;

export const icon = {
  back: (s?: number) => svg('<path d="M15 5l-7 7 7 7"/>', s),
  close: (s?: number) => svg('<path d="M6 6l12 12M18 6L6 18"/>', s),
  menu: (s?: number) => svg('<path d="M4 8h16M4 16h10"/>', s),
  search: (s?: number) => svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', s),
  sun: (s?: number) =>
    svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>', s),
  moon: (s?: number) => svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', s),
  camera: (s?: number) => svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', s),
  image: (s?: number) => svg('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M20 16l-5-5-8 8"/>', s),
  home: (s?: number) => svg('<path d="M4 11l8-6 8 6v9h-5v-6H9v6H4z"/>', s),
  grid: (s?: number) =>
    svg('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>', s),
  heart: (s?: number) => svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', s),
  phone: (s?: number) => svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>', s),
  send: (s?: number) => svg('<path d="M21 4L3 11l6 2 2 6 3-4 5 4z"/><path d="M9 13l12-9"/>', s),
  download: (s?: number) => svg('<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>', s),
  share: (s?: number) =>
    svg('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>', s),
  flip: (s?: number) => svg('<path d="M4 12a8 8 0 0 1 13.7-5.7L20 8"/><path d="M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13.7 5.7L4 16"/><path d="M4 20v-4h4"/>', s),
  check: (s?: number) => svg('<path d="M5 12l5 5 9-10"/>', s, ' stroke-width="2.6"'),
  arrow: (s?: number) => svg('<path d="M5 12h14M13 6l6 6-6 6"/>', s),
  sparkle: (s = 14) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>`,
  chevUp: (s?: number) => svg('<path d="M6 15l6-6 6 6"/>', s),
  wand: (s?: number) => svg('<path d="M4 20l11-11"/><path d="M15 9l2-2"/><path d="M14 4v2M20 10h-2M18.5 5.5l-1.4 1.4M10 4.5l.6 1.2M19.5 14l-1.2-.6"/>', s),
  flash: (s?: number) => svg('<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>', s),
  move: (s?: number) => svg('<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>', s),
  reset: (s?: number) => svg('<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/>', s),
};
