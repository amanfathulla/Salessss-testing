export type Theme = { id: string; name: string; accent: string; swatch: string };

export const THEMES: Theme[] = [
  { id: "blue", name: "Biru", accent: "#38bdf8", swatch: "#38bdf8" },
  { id: "green", name: "Hijau", accent: "#22c55e", swatch: "#22c55e" },
  { id: "purple", name: "Ungu", accent: "#a855f7", swatch: "#a855f7" },
  { id: "amber", name: "Amber", accent: "#f59e0b", swatch: "#f59e0b" },
  { id: "rose", name: "Rose", accent: "#f43f5e", swatch: "#f43f5e" },
];

const THEME_KEY = "sp_theme";

export function getTheme(): string {
  return localStorage.getItem(THEME_KEY) || "blue";
}

export function applyTheme(id: string): void {
  document.documentElement.setAttribute("data-theme", id);
  localStorage.setItem(THEME_KEY, id);
}

export function initTheme(): void {
  applyTheme(getTheme());
}
