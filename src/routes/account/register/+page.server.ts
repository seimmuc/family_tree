import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { UserWriteActions } from '$lib/server/graph/user';
import { Argon2id } from 'oslo/password';
import { lucia } from '$lib/server/auth';
import { parseConfigBool } from '$lib/server/sutils';
import { validateUsernameAndPassword } from '$lib/utils';
import type { UserPermission } from '$lib/types';
import { USERS_MAKE_FIRST_ADMIN } from '$env/static/private';

const makeFirstUserAdmin = parseConfigBool(USERS_MAKE_FIRST_ADMIN);

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

    // must be signed out to create a new user
    if (locals.user === null) {
      // validate input data
      const upvr = validateUsernameAndPassword(formData);
      if (upvr.isErr()) {
        return fail(422, { message: upvr.error });
      }
      const [username, password] = upvr.value;

      // create user
      const passwordHash = await new Argon2id().hash(password);
      const dbUserRes = await UserWriteActions.perform(async act => {
        const permissions: UserPermission[] = [];
        if (makeFirstUserAdmin) {
          const userCount = await act.getUserCount();
          if (userCount < 1) {
            permissions.push('admin');
          }
        }
        return await act.addUser({ username, passwordHash, permissions });
      });
      if (dbUserRes.isErr()) {
        if (dbUserRes.error === 'username is already in use') {
          return fail(400, { message: 'Username is already in use' });
        }
        return fail(500, { message: 'Server error', err: dbUserRes.error });
      }
      const user = dbUserRes.value;

      // create and set session
      const session = await lucia.createSession(user.id, {});
      const sCookie = lucia.createSessionCookie(session.id);
      cookies.set(sCookie.name, sCookie.value, { path: '.', ...sCookie.attributes });
    }

    // redirect user where they came from
    const redir = formData.get('redir');
    return redirect(302, typeof redir === 'string' && redir.length > 0 ? redir : '/');
  }
};
