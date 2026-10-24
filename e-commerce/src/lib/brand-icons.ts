/** BLACK HEM / Cut — original 24-unit icon masters, shared by UI and SVG exports. */
export const brandIconPaths = {
  "arrow-right": ["M4 12h15M13 5l7 7-7 7"],
  "arrow-left": ["M20 12H5M11 5l-7 7 7 7"],
  "arrow-up": ["M12 20V5M5 11l7-7 7 7"],
  "arrow-down": ["M12 4v15M5 13l7 7 7-7"],
  "external-link": ["M13 4h7v7M20 4 10 14M9 5H5l-1 1v13l1 1h13l1-1v-4"],
  search: ["M9 3h5l4 4v6l-4 4H8l-5-4V7Z", "m16 16 5 5"],
  "zoom-in": ["M9 3h5l4 4v6l-4 4H8l-5-4V7Z", "m16 16 5 5M7 10h7M10.5 6.5v7"],
  "zoom-out": ["M9 3h5l4 4v6l-4 4H8l-5-4V7Z", "m16 16 5 5M7 10h7"],
  grid: ["M4 3h5v6H3V4ZM15 3h6v6h-6ZM3 15h6v6H3ZM15 15h6v5l-1 1h-5Z"],
  layers: ["m12 3 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"],
  tag: ["M3 4h9l9 9-8 8-10-10ZM7 8h1"],
  menu: ["M3 6h18M3 12h12M3 18h18"],
  close: ["m5 5 14 14M19 5 5 19"],
  plus: ["M4 12h16M12 4v16"],
  minus: ["M4 12h16"],
  check: ["m4 12 5 5L20 6"],
  filter: ["M3 5h18M6 12h12M9 19h6", "M7 3v4M16 10v4M12 17v4"],
  heart: ["m12 6 3-3h4l3 3v5L12 21 2 11V6l3-3h4Z"],
  bag: ["M5 8h14l2 12-1 1H4l-1-1ZM8 8V5l2-2h4l2 2v3"],
  info: ["M8 3h8l5 5v8l-5 5H8l-5-5V8ZM12 10v7M12 6v1"],
} as const;

export type BrandIconName = keyof typeof brandIconPaths;
