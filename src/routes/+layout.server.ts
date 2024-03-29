import { getTheme, type Theme } from '$lib/types.js';

export function load({ cookies }) {
  const theme = getTheme(cookies.get('theme'));
  return { theme };
}
