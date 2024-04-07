import { getTheme } from '$lib/types.js';

export function load({ cookies, locals }) {
  const theme = getTheme(cookies.get('theme'));
  return { theme, user: locals.user };
}
