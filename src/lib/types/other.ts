export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(theme: string | undefined): boolean {
  return THEMES.includes(theme as Theme);
}
export function getTheme(theme: string | undefined): Theme {
  return THEMES.includes(theme as Theme) ? (theme as Theme) : THEMES[0];
}
