import { validateUsernameAndPassword } from '$lib/utils';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { UserReadActions } from '$lib/server/graph/user';
import { Argon2id } from 'oslo/password';
import { lucia } from '$lib/server/auth';

export const load = async ({ locals, url }) => {
  const redirectTo = url.searchParams.get('redirectTo');
  if (locals.user !== null) {
    return redirect(302, redirectTo || '/');
  }
  return { redirectTo };
};

export const actions: Actions = {
  default: async ({ request, cookies, locals }) => {
    const formData = await request.formData();

    // logged in users must sign out manually before logging in again
    if (locals.user === null) {
      // validate input data
      const upvr = validateUsernameAndPassword(formData);
      if (upvr.isErr()) {
        return fail(422, { message: upvr.error });
      }
      const [username, password] = upvr.value;

      // find user
      const user = await UserReadActions.perform(act => {
        return act.getUserByUsername(username);
      });
      if (user === undefined) {
        return fail(400, { message: 'Incorrect username or password' });
      }

      // check password
      const passIsValid = await new Argon2id().verify(user.passwordHash, password);
      if (!passIsValid) {
        return fail(400, { message: 'Incorrect username or password' });
      }

      // create and set session
      const session = await lucia.createSession(user.id, {});
      const sCookie = lucia.createSessionCookie(session.id);
      cookies.set(sCookie.name, sCookie.value, { path: '.', ...sCookie.attributes });
    }

    // retirect user where they came from
    const redir = formData.get('redir');
    return redirect(302, typeof redir === 'string' && redir.length > 0 ? redir : '/');
  }
};
