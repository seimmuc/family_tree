import { getTheme } from '$lib/types.js';

export function load({ cookies, locals, depends }) {
  const theme = getTheme(cookies.get('theme'));
  depends('data:user');
  return { theme, user: locals.user };
}
