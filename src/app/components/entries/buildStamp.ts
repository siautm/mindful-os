/** Injected at build time via vite `define` (Vercel commit SHA or dev). */
declare const __ENTRIES_UI_BUILD__: string | undefined;

export const ENTRIES_UI_BUILD =
  typeof __ENTRIES_UI_BUILD__ !== "undefined" ? __ENTRIES_UI_BUILD__ : "dev";

export const SHOW_ENTRIES_BUILD = import.meta.env.DEV;
