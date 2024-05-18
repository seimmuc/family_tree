import { addConfigAdmin } from '$lib/server/sutils.js';
import { getTheme } from '$lib/types/other.js';

export function load({ cookies, locals, depends }) {
  const theme = getTheme(cookies.get('theme'));
  depends('data:user');
  const user = locals.user;
  if (user) {
    addConfigAdmin(user);
  }
  return { theme, user };
}
