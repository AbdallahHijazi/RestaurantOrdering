/**
 * Central icon registry. Every icon is a 24x24 outline glyph (stroke only, round caps) so the whole
 * application shares one visual language. The project has no icon package, so paths live here.
 */
export const ICON_PATHS = {
  save: ['M5 3h11l3 3v15H5z', 'M8 3v6h8V3', 'M8 21v-7h8v7'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  /** Standard pencil (Lucide-style): the familiar edit glyph. */
  pencil: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z', 'M15 5l4 4'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6', 'M10 11v6', 'M14 11v6'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  refresh: ['M21 12a9 9 0 1 1-3-6.7', 'M21 3v6h-6'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M21 21l-4.3-4.3'],
  'arrow-up': ['M12 19V5', 'M5 12l7-7 7 7'],
  'arrow-down': ['M12 5v14', 'M19 12l-7 7-7-7'],
  archive: ['M3 4h18v4H3z', 'M5 8v12h14V8', 'M10 12h4'],
  restore: ['M3 7v6h6', 'M3 13a9 9 0 1 0 3-7.7'],
  'user-check': ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M16 11l2 2 4-4'],
  'user-x': ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M17 8l5 5', 'M22 8l-5 5'],
  'image-off': ['M3 3l18 18', 'M21 15V5a2 2 0 0 0-2-2H9', 'M3 9v10a2 2 0 0 0 2 2h14', 'M14 14l-3-3-4 5'],
  copy: ['M9 9h11v11H9z', 'M5 15V4h11'],
  print: ['M6 9V3h12v6', 'M6 18H4v-7h16v7h-2', 'M6 14h12v7H6z'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 21h16'],
  qr: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h3v3h-3z', 'M20 14v7h-4'],
  play: ['M7 4l13 8-13 8z'],
  logout: ['M9 21H5V3h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  table: ['M3 5h18v14H3z', 'M3 10h18', 'M9 10v9'],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  cart: ['M3 4h2l2.5 11h10L20 7H6', 'M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  'chevron-down': ['M6 9l6 6 6-6'],
  'chevron-up': ['M6 15l6-6 6 6'],
  link: ['M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1', 'M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1'],
  send: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'],
  move: ['M12 3v18', 'M8 7l4-4 4 4', 'M8 17l4 4 4-4'],
  'eye-off': ['M3 3l18 18', 'M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.9', 'M6.6 6.7A17 17 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 4.2-1', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  power: ['M12 3v9', 'M6.4 6.4a8 8 0 1 0 11.2 0'],
  phone: ['M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2.1z'],
  'map-pin': ['M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  message: ['M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l1.9-5.4A8.4 8.4 0 1 1 21 11.5z'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICON_PATHS;
