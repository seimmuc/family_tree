import { validateUsernameAndPassword } from '$lib/server/sutils';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { UserReadActions } from '$lib/server/graph/user';
import { Argon2id } from 'oslo/password';
import { lucia } from '$lib/server/auth';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    // parse and validate input data
    const formData = await request.formData();
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

    const passIsValid = await new Argon2id().verify(user.passwordHash, password);
    if (!passIsValid) {
      return fail(400, { message: 'Incorrect username or password' });
    }

    const session = await lucia.createSession(user.id, {});
    const sCookie = lucia.createSessionCookie(session.id);
    cookies.set(sCookie.name, sCookie.value, { path: '.', ...sCookie.attributes });

    const redir = formData.get('redir');
    return redirect(302, typeof redir === 'string' && redir.length > 0 ? redir : '/');
  }
};
