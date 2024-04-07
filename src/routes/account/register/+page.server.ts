import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { UserWriteActions } from '$lib/server/graph/user';
import { Argon2id } from 'oslo/password';
import { lucia } from '$lib/server/auth';
import { validateUsernameAndPassword } from '$lib/server/sutils';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    // parse and validate input data
    const formData = await request.formData();
    const upvr = validateUsernameAndPassword(formData);
    if (upvr.isErr()) {
      return fail(422, { message: upvr.error });
    }
    const [username, password] = upvr.value;

    // create user
    const passwordHash = await new Argon2id().hash(password);
    const dbUserRes = await UserWriteActions.perform(async act => {
      return await act.addUser({ username, passwordHash, permissions: [] });
    });
    if (dbUserRes.isErr()) {
      return fail(500, { message: 'Server error', err: dbUserRes.error });
    }
    const user = dbUserRes.value;

    // create and set session
    const session = await lucia.createSession(user.id, {});
    const sCookie = lucia.createSessionCookie(session.id);
    cookies.set(sCookie.name, sCookie.value, { path: '.', ...sCookie.attributes });

    // success, redirect user somewhere else
    const redir = formData.get('redir');
    return redirect(302, typeof redir === 'string' && redir.length > 0 ? redir : '/');
  }
};
